const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const xlsx = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET in backend/.env. Backend startup aborted.');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI in backend/.env. Backend startup aborted.');
  process.exit(1);
}

const app = express();
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Schéma utilisateur
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'CANTEEN_MANAGER', 'PARENT'], default: 'SCHOOL_ADMIN' },
  first_name: String,
  last_name: String,
  phone: String,
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  is_temporary_password: { type: Boolean, default: false },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Schéma école
const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  admin_name: { type: String, required: true },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  student_count: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_at: { type: Date, default: Date.now }
});

const School = mongoose.model('School', schoolSchema);

// Schéma enfant
const childSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  birth_date: { type: Date, required: true },
  grade: { type: String, required: true },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  student_code: { type: String },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  created_at: { type: Date, default: Date.now }
});

const Child = mongoose.model('Child', childSchema);

// Schéma registre des élèves (import PDF)
const studentRegistrySchema = new mongoose.Schema({
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  student_code: { type: String, required: true },
  birth_date: { type: Date, required: true },
  class_name: { type: String, required: true },
  norm_first_name: { type: String, required: true },
  norm_last_name: { type: String, required: true },
  norm_student_code: { type: String, required: true },
  norm_birth_date: { type: String, required: true },
  norm_class_name: { type: String, required: true },
  source_file_name: { type: String },
  imported_at: { type: Date, default: Date.now },
  imported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const StudentRegistry = mongoose.model('StudentRegistry', studentRegistrySchema);

// Schéma abonnement
const subscriptionSchema = new mongoose.Schema({
  child_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
  plan_type: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled', 'PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED'], default: 'PENDING_PAYMENT' },
  payment_method: { type: String, enum: ['ORANGE_MONEY', 'MOOV_MONEY', 'WAVE', 'CASH'], default: null },
  payment_status: { type: String, enum: ['PENDING', 'WAITING_ADMIN_VALIDATION', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  payment_reference: { type: String, default: null },
  payment_date: { type: Date, default: null },
  transaction_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
// Schema paiement
const paymentSchema = new mongoose.Schema({
  subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  child_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['ORANGE_MONEY', 'MOOV_MONEY', 'WAVE', 'CASH'], required: true },
  status: { type: String, enum: ['PENDING', 'WAITING_ADMIN_VALIDATION', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  verification_code: { type: String, default: null },
  transaction_id: { type: String, default: null },
  paid_at: { type: Date, default: null },
  validated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  validated_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);

// Schéma menu
const menuSchema = new mongoose.Schema({
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  date: { type: Date, required: true },
  meal_type: { type: String, required: true, enum: ['BREAKFAST', 'LUNCH', 'DINNER'] },
  meal_name: String,
  description: String,
  items: [{ name: String, emoji: String }],
  allergens: [String],
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  submitted_at: Date,
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: Date,
  rejection_reason: String,
  annual_key: String,
  is_annual: { type: Boolean, default: false }
}, { timestamps: true });

const Menu = mongoose.model('Menu', menuSchema);

// Schéma présence
const attendanceSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
  menu_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
  date: { type: Date, default: Date.now },
  present: { type: Boolean, default: true },
  justified: { type: Boolean, default: false },
  reason: String,
  marked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

// Schéma notifications
const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  week_start: { type: Date },
  week_end: { type: Date },
  week_key: { type: String },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'INFO' },
  read: { type: Boolean, default: false },
  data: { type: Object },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

// Auth helpers
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: 'Accès non autorisé' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Acces refuse. Role actuel: ${req.user.role}. Roles autorises: ${roles.join(', ')}`,
    });
  }
  next();
};

const generateTemporaryPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const isValidGmailEmail = (email) => {
  const emailRegex = /^[^\s@]+@gmail\.com$/;
  return emailRegex.test(email);
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidStrongPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

const normalizeEmail = (email) => {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildCaseInsensitiveEmailFilter = (email) => {
  return { $regex: `^${escapeRegExp(email)}$`, $options: 'i' };
};

const startOfDay = (dateInput) => {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (dateInput) => {
  const date = new Date(dateInput);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getSameWeekdayDatesInRange = (startInput, endInput) => {
  const dates = [];
  const cursor = new Date(startInput);
  const end = new Date(endInput);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
};

const formatDateKey = (dateInput) => {
  const date = new Date(dateInput);
  if (isNaN(date)) return '';
  return date.toISOString().slice(0, 10);
};

const getWeekRange = (dateInput) => {
  const date = startOfDay(dateInput);
  const day = date.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return {
    weekStart: startOfDay(monday),
    weekEnd: endOfDay(friday),
  };
};

const mealTypeOrder = ['LUNCH', 'BREAKFAST', 'DINNER'];
const orderMealType = (value) => {
  const idx = mealTypeOrder.indexOf(value);
  return idx >= 0 ? idx : mealTypeOrder.length;
};

const normalizeText = (value) => {
  if (!value) return '';
  return String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const normalizeName = (value) => normalizeText(value).toLowerCase().replace(/\s+/g, ' ');
const normalizeClass = (value) => normalizeText(value).toUpperCase().replace(/\s+/g, ' ');
const normalizeCode = (value) => normalizeText(value).toUpperCase().replace(/[\s-]/g, '');
const normalizeLooseToken = (value) => normalizeText(value).toUpperCase().replace(/[^A-Z0-9]/g, '');

const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split(/[-/]/);
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split(/[-/]/);
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed)) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
};

const HEADER_ALIASES = {
  first_name: ['first name', 'firstname', 'prenom', 'first'],
  last_name: ['last name', 'lastname', 'nom', 'surname', 'last'],
  student_code: ['student code', 'studentcode', 'code eleve', 'matricule', 'code'],
  birth_date: ['birth date', 'birthdate', 'date de naissance', 'date naissance', 'dob', 'date'],
  class_name: ['class name', 'classe', 'class', 'niveau']
};

const normalizeHeader = (value) => normalizeText(value).toLowerCase().replace(/\s+/g, ' ').trim();

const buildHeaderIndex = (headerRow) => {
  const index = {};
  const normalizedAliases = {};

  Object.keys(HEADER_ALIASES).forEach((key) => {
    normalizedAliases[key] = HEADER_ALIASES[key].map((alias) => normalizeHeader(alias));
  });

  headerRow.forEach((cell, idx) => {
    const normalized = normalizeHeader(cell);
    if (!normalized) return;
    Object.keys(normalizedAliases).forEach((key) => {
      if (normalizedAliases[key].includes(normalized)) {
        index[key] = idx;
      }
    });
  });

  return index;
};

const extractStudentsFromRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { students: [], invalidRows: [] };
  }

  const headerIndex = buildHeaderIndex(rows[0] || []);
  const hasHeader = Object.keys(headerIndex).length >= 3;
  const students = [];
  const invalidRows = [];

  for (let i = hasHeader ? 1 : 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const normalizedRow = row.map((cell) => String(cell ?? '').trim());
    if (normalizedRow.every((value) => value === '')) continue;

    let firstName = '';
    let lastName = '';
    let studentCode = '';
    let birthDate = '';
    let className = '';

    if (hasHeader) {
      firstName = normalizedRow[headerIndex.first_name] || '';
      lastName = normalizedRow[headerIndex.last_name] || '';
      studentCode = normalizedRow[headerIndex.student_code] || '';
      birthDate = normalizedRow[headerIndex.birth_date] || '';
      className = normalizedRow[headerIndex.class_name] || '';
    } else {
      if (normalizedRow.length < 5) {
        invalidRows.push(row);
        continue;
      }
      [firstName, lastName, studentCode, birthDate, ...className] = normalizedRow;
      className = className.join(' ').trim();
    }

    if (!firstName || !lastName || !studentCode || !birthDate || !className) {
      invalidRows.push(row);
      continue;
    }

    students.push({
      first_name: firstName,
      last_name: lastName,
      student_code: studentCode,
      birth_date: birthDate,
      class_name: className
    });
  }

  return { students, invalidRows };
};

const parseCsvLine = (line, delimiter) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
};

const detectDelimiter = (line) => {
  const counts = {
    ';': (line.match(/;/g) || []).length,
    ',': (line.match(/,/g) || []).length,
    '\t': (line.match(/\t/g) || []).length
  };
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : ';';
};

const parseStudentCsv = (text) => {
  let cleanText = String(text || '');
  if (cleanText.charCodeAt(0) == 0xFEFF) {
    cleanText = cleanText.slice(1);
  }
  const lines = cleanText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], invalidLines: [] };

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((line) => parseCsvLine(line, delimiter));
  return { rows, invalidLines: [] };
};

const parseStudentXlsx = (buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows: [] };
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  return { rows };
};

const parseStudentPdf = (text) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = [];
  const invalidLines = [];

  for (const line of lines) {
    const lower = normalizeText(line).toLowerCase();
    if (lower.includes('first name') && lower.includes('last name')) continue;
    if (lower.includes('student code') && lower.includes('birth date')) continue;
    if (lower.includes('prenom') && lower.includes('nom')) continue;

    let parts = line.split(/\s{2,}|\t|\s+\|\s+/).filter(Boolean);
    if (parts.length < 5 && /[;,]/.test(line)) {
      parts = line.split(/[;,]/).map((part) => part.trim()).filter(Boolean);
    }

    if (parts.length < 5) {
      invalidLines.push(line);
      continue;
    }

    const [firstName, lastName, studentCode, birthDate, ...classParts] = parts;
    const className = classParts.join(' ').trim();

    rows.push([firstName, lastName, studentCode, birthDate, className]);
  }

  return { rows, invalidLines };
};

const resolveSchoolIdForUser = async (userId) => {
  if (!userId) return null;
  const user = await User.findById(userId).select('school_id');
  if (user?.school_id) return user.school_id;
  const school = await School.findOne({ admin_id: userId }).select('_id');
  return school?._id || null;
};

const resolveSchoolIdInput = async (value) => {
  if (!value) return null;
  if (mongoose.Types.ObjectId.isValid(value)) return value;
  const schoolByName = await School.findOne({ name: value }).select('_id');
  return schoolByName?._id?.toString?.() || null;
};

const resolveAccessibleSchoolIds = async (user) => {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN') return null;
  if (user.role === 'SCHOOL_ADMIN') {
    const schoolId = await resolveSchoolIdForUser(user.id);
    return schoolId ? [schoolId.toString()] : [];
  }
  if (user.role === 'CANTEEN_MANAGER') {
    const manager = await User.findById(user.id).select('school_id');
    return manager?.school_id ? [manager.school_id.toString()] : [];
  }
  if (user.role === 'PARENT') {
    const children = await Child.find({ parent_id: user.id }).select('school_id');
    const rawIds = children.map((child) => child.school_id?.toString()).filter(Boolean);
    return [...new Set(rawIds)];
  }
  return [];
};

const notifyMenuChange = async ({ action, actorId, schoolId, mealName, date, isAnnual }) => {
  try {
    if (!schoolId) return;

    const [superAdmins, schoolAdmins, managers, parentIds, actor] = await Promise.all([
      User.find({ role: 'SUPER_ADMIN' }).select('_id'),
      User.find({ role: 'SCHOOL_ADMIN', school_id: schoolId }).select('_id'),
      User.find({ role: 'CANTEEN_MANAGER', school_id: schoolId }).select('_id'),
      Child.distinct('parent_id', { school_id: schoolId }),
      actorId ? User.findById(actorId).select('first_name last_name role') : null,
    ]);

    const actorIdStr = actorId?.toString?.() || String(actorId || '');
    const recipientIds = [
      ...new Set([
        ...superAdmins.map((u) => u?._id?.toString?.()),
        ...schoolAdmins.map((u) => u?._id?.toString?.()),
        ...managers.map((u) => u?._id?.toString?.()),
        ...parentIds.map((id) => id?.toString?.()),
      ].filter(Boolean).filter((id) => id !== actorIdStr))
    ];

    if (!recipientIds.length) return;

    const actorName = `${actor?.first_name || ''} ${actor?.last_name || ''}`.trim() || 'Un utilisateur';
    const actionLabel = action === 'delete' ? 'supprime' : 'modifie';
    const title = action === 'delete' ? 'Menu supprime' : 'Menu modifie';
    const dateKey = date ? formatDateKey(date) : null;
    const periodLabel = isAnnual ? 'pour toute l\'annee' : (dateKey ? `(${dateKey})` : '');
    const safeMealName = mealName || 'Menu';

    await Notification.insertMany(
      recipientIds.map((userId) => ({
        user_id: userId,
        school_id: schoolId,
        title,
        message: `${actorName} a ${actionLabel} le menu "${safeMealName}" ${periodLabel}.`,
        type: action === 'delete' ? 'MENU_DELETED' : 'MENU_UPDATED',
        data: {
          action,
          school_id: schoolId?.toString?.() || schoolId,
          meal_name: safeMealName,
          date: dateKey,
          is_annual: !!isAnnual,
        }
      }))
    );
  } catch (error) {
    console.error('Menu change notification error:', error);
  }
};
const mapChildResponse = (child) => {
  const obj = child?.toObject ? child.toObject() : child;
  return {
    ...obj,
    id: obj?._id?.toString?.() || obj?.id,
    date_of_birth: obj?.birth_date ? new Date(obj.birth_date).toISOString().slice(0, 10) : null,
    class_name: obj?.grade || obj?.class_name
  };
};

const normalizeSubscriptionType = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();
  if (['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'].includes(normalized)) {
    return normalized;
  }
  if (normalized === 'TRIMESTRIEL') return 'QUARTERLY';
  if (normalized === 'ANNUEL') return 'YEARLY';
  return null;
};

const normalizeSubscriptionStatus = (value) => {
  if (!value) return 'PENDING_PAYMENT';
  const normalized = String(value).trim().toUpperCase();
  if (['PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED'].includes(normalized)) {
    return normalized;
  }
  if (normalized === 'ACTIVE' || normalized === 'ACTIF') return 'ACTIVE';
  if (normalized === 'EXPIRED' || normalized === 'EXPIRE') return 'EXPIRED';
  if (normalized === 'CANCELLED' || normalized === 'CANCELED' || normalized === 'ANNULE') return 'CANCELLED';
  return 'PENDING_PAYMENT';
};

const calculateSubscriptionEndDate = (startDate, type) => {
  const date = new Date(startDate);
  switch (type) {
    case 'DAILY':
      date.setDate(date.getDate() + 1);
      break;
    case 'WEEKLY':
      date.setDate(date.getDate() + 7);
      break;
    case 'MONTHLY':
      date.setDate(date.getDate() + 30);
      break;
    case 'QUARTERLY':
      date.setDate(date.getDate() + 90);
      break;
    case 'YEARLY':
      date.setDate(date.getDate() + 365);
      break;
    default:
      date.setDate(date.getDate() + 30);
      break;
  }
  return date;
};

const PAYMENT_METHODS = ['ORANGE_MONEY', 'MOOV_MONEY', 'WAVE', 'CASH'];
const MOBILE_MONEY_METHODS = ['ORANGE_MONEY', 'MOOV_MONEY', 'WAVE'];

const normalizePaymentMethod = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();
  return PAYMENT_METHODS.includes(normalized) ? normalized : null;
};

const mapPaymentResponse = (payment) => {
  const obj = payment?.toObject ? payment.toObject() : payment;
  const childObj = obj?.child_id?.toObject ? obj.child_id.toObject() : obj?.child_id;
  const parentObj = obj?.parent_id?.toObject ? obj.parent_id.toObject() : obj?.parent_id;

  return {
    id: obj?._id?.toString?.() || obj?.id,
    subscriptionId: obj?.subscription_id?._id?.toString?.() || obj?.subscription_id?.toString?.() || null,
    childId: childObj?._id?.toString?.() || obj?.child_id?.toString?.() || null,
    parentId: parentObj?._id?.toString?.() || obj?.parent_id?.toString?.() || null,
    childName: childObj ? `${childObj.first_name || ''} ${childObj.last_name || ''}`.trim() : null,
    amount: obj?.amount ?? 0,
    method: obj?.method || null,
    status: obj?.status || 'PENDING',
    transactionId: obj?.transaction_id || null,
    paidAt: obj?.paid_at ? new Date(obj.paid_at).toISOString() : null,
    validatedAt: obj?.validated_at ? new Date(obj.validated_at).toISOString() : null,
    createdAt: obj?.created_at ? new Date(obj.created_at).toISOString() : new Date().toISOString(),
  };
};

const mapSubscriptionResponse = (subscription, child) => {
  const obj = subscription?.toObject ? subscription.toObject() : subscription;
  const childObj = child?.toObject ? child.toObject() : child;
  const type = normalizeSubscriptionType(obj?.plan_type || obj?.subscription_type || obj?.type) || 'MONTHLY';
  const status = normalizeSubscriptionStatus(obj?.status);
  const paymentMethod = normalizePaymentMethod(obj?.payment_method || obj?.paymentMethod);
  const childPayload = childObj ? {
    id: childObj?._id?.toString?.() || childObj?.id,
    first_name: childObj?.first_name || '',
    last_name: childObj?.last_name || '',
    class_name: childObj?.grade || childObj?.class_name || '',
    school_id: childObj?.school_id?.toString?.() || childObj?.school_id || null,
    student_code: childObj?.student_code || null,
  } : null;

  return {
    id: obj?._id?.toString?.() || obj?.id,
    childId: childObj?._id?.toString?.() || obj?.child_id?.toString?.() || obj?.childId || '',
    parentId: childObj?.parent_id?.toString?.() || obj?.parent_id?.toString?.() || obj?.parentId || '',
    type,
    amount: obj?.amount ?? 0,
    startDate: obj?.start_date ? new Date(obj.start_date).toISOString() : new Date().toISOString(),
    endDate: obj?.end_date ? new Date(obj.end_date).toISOString() : new Date().toISOString(),
    status,
    paymentMethod,
    paymentDate: obj?.payment_date ? new Date(obj.payment_date).toISOString() : null,
    transactionId: obj?.transaction_id || null,
    paymentDetails: {
      method: paymentMethod,
      status: obj?.payment_status || 'PENDING',
      reference: obj?.payment_reference || null,
    },
    createdAt: obj?.created_at ? new Date(obj.created_at).toISOString() : new Date().toISOString(),
    updatedAt: obj?.updated_at ? new Date(obj.updated_at).toISOString() : new Date().toISOString(),
    child: childPayload
  };
};

const mapNotificationResponse = (notification) => {
  const obj = notification?.toObject ? notification.toObject() : notification;
  return {
    id: obj?._id?.toString?.() || obj?.id,
    title: obj?.title,
    message: obj?.message,
    type: obj?.type || 'INFO',
    read: !!obj?.read,
    data: obj?.data || null,
    schoolId: obj?.school_id?.toString?.() || obj?.schoolId || null,
    weekStart: obj?.week_start ? new Date(obj.week_start).toISOString().slice(0, 10) : null,
    weekEnd: obj?.week_end ? new Date(obj.week_end).toISOString().slice(0, 10) : null,
    createdAt: obj?.created_at ? new Date(obj.created_at).toISOString() : new Date().toISOString(),
    updatedAt: obj?.updated_at ? new Date(obj.updated_at).toISOString() : new Date().toISOString()
  };
};

const toMenuModel = (menu) => {
  const obj = menu?.toObject ? menu.toObject() : menu;
  const items = Array.isArray(obj?.items)
    ? obj.items.map((item) => (typeof item === 'string' ? item : item?.name)).filter(Boolean)
    : [];

  return {
    id: obj?._id?.toString?.() || obj?.id,
    date: obj?.date ? new Date(obj.date).toISOString().slice(0, 10) : '',
    mainDish: obj?.meal_name || obj?.name || obj?.description || '',
    sideDishes: items,
    fruits: [],
    drinks: [],
    schoolId: obj?.school_id?._id?.toString?.() || obj?.school_id?.toString?.() || '',
    notes: obj?.description || null,
    isAvailable: obj?.status === 'APPROVED',
    createdAt: obj?.created_at ? new Date(obj.created_at).toISOString() : (obj?.createdAt ? new Date(obj.createdAt).toISOString() : null),
    updatedAt: obj?.updated_at ? new Date(obj.updated_at).toISOString() : (obj?.updatedAt ? new Date(obj.updatedAt).toISOString() : null)
  };
};

const mapMenu = (menu) => {
  const obj = menu?.toObject ? menu.toObject() : menu;
  const createdBy = obj?.created_by;
  const school = obj?.school_id;
  return {
    ...obj,
    id: obj?._id?.toString?.() || obj?.id,
    school_name: school?.name || obj?.school_name,
    creator_first_name: createdBy?.first_name || obj?.creator_first_name,
    creator_last_name: createdBy?.last_name || obj?.creator_last_name,
  };
};

// Route login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    
    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email et mot de passe requis.' });
    }

    console.log(' Login attempt:', normalizedEmail);
    
    const user = await User.findOne({ email: buildCaseInsensitiveEmailFilter(normalizedEmail) });
    if (!user) {
      console.log(' User not found:', normalizedEmail);
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(' Invalid password for:', normalizedEmail);
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }
    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    let schoolId = user.school_id ? user.school_id.toString() : null;
    let schoolName = null;
    if (schoolId) {
      const school = await School.findById(schoolId);
      schoolName = school?.name || null;
    } else if (user.role === 'SCHOOL_ADMIN') {
      const school = await School.findOne({ admin_id: user._id });
      if (school) {
        schoolId = school._id.toString();
        schoolName = school.name || null;
        await User.findByIdAndUpdate(user._id, { school_id: school._id });
      }
    }
    
    console.log(' Login successful:', normalizedEmail);
    
    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        schoolId,
        schoolName
      }
    });
  } catch (error) {
    console.error(' Login error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour créer un utilisateur (inscription)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, role = 'PARENT' } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password || !first_name || !last_name) {
      return res.status(400).json({ success: false, message: 'Email, mot de passe, prénom et nom sont requis.' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Format d email invalide.' });
    }
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email: buildCaseInsensitiveEmailFilter(normalizedEmail) });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Créer l'utilisateur
    const user = new User({
      email: normalizedEmail,
      password: hashedPassword,
      role,
      first_name,
      last_name
    });
    
    await user.save();
    
    // Créer le token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    res.json({
      success: true,
      message: 'Compte créé avec succès',
      token,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        name: `${user.first_name} ${user.last_name}`
      }
    });
  } catch (error) {
    console.error(' Register error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/auth/update-credentials', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié.' });
    }

    const {
      current_password,
      new_email,
      new_password,
      confirm_new_password,
    } = req.body || {};

    const normalizedCurrentPassword = typeof current_password === 'string' ? current_password : '';
    const normalizedNewEmail = normalizeEmail(new_email);
    const normalizedNewPassword = typeof new_password === 'string' ? new_password : '';
    const normalizedConfirmNewPassword =
      typeof confirm_new_password === 'string' ? confirm_new_password : '';

    if (!normalizedCurrentPassword) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel requis.' });
    }

    const wantsEmailChange = new_email !== undefined;
    const wantsPasswordChange = new_password !== undefined || confirm_new_password !== undefined;

    if (!wantsEmailChange && !wantsPasswordChange) {
      return res.status(400).json({
        success: false,
        message: 'Fournissez un nouvel email et/ou un nouveau mot de passe.',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(normalizedCurrentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect.' });
    }

    const updates = {};

    if (wantsEmailChange) {
      if (!normalizedNewEmail || !isValidEmail(normalizedNewEmail)) {
        return res.status(400).json({ success: false, message: 'Nouvel email invalide.' });
      }

      if (normalizedNewEmail !== normalizeEmail(user.email)) {
        const duplicate = await User.findOne({
          _id: { $ne: user._id },
          email: buildCaseInsensitiveEmailFilter(normalizedNewEmail),
        });
        if (duplicate) {
          return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });
        }
        updates.email = normalizedNewEmail;
      }
    }

    if (wantsPasswordChange) {
      if (!normalizedNewPassword || !normalizedConfirmNewPassword) {
        return res.status(400).json({
          success: false,
          message: 'Nouveau mot de passe et confirmation requis.',
        });
      }

      if (normalizedNewPassword !== normalizedConfirmNewPassword) {
        return res.status(400).json({ success: false, message: 'Les mots de passe ne correspondent pas.' });
      }

      if (!isValidStrongPassword(normalizedNewPassword)) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe doit contenir 8 caractères minimum, une majuscule, une minuscule et un chiffre.',
        });
      }

      const isSamePassword = await bcrypt.compare(normalizedNewPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'Le nouveau mot de passe doit être différent de l actuel.',
        });
      }

      updates.password = await bcrypt.hash(normalizedNewPassword, 12);
      updates.is_temporary_password = false;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Aucune modification détectée.' });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    const refreshedToken = jwt.sign(
      { userId: updatedUser._id, email: updatedUser.email, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    let schoolId = updatedUser.school_id ? updatedUser.school_id.toString() : null;
    let schoolName = null;
    if (schoolId) {
      const school = await School.findById(schoolId);
      schoolName = school?.name || null;
    } else if (updatedUser.role === 'SCHOOL_ADMIN') {
      const school = await School.findOne({ admin_id: updatedUser._id });
      if (school) {
        schoolId = school._id.toString();
        schoolName = school.name || null;
        await User.findByIdAndUpdate(updatedUser._id, { school_id: school._id });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Identifiants mis à jour avec succès.',
      token: refreshedToken,
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        role: updatedUser.role,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        name: `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim(),
        schoolId,
        schoolName,
      },
    });
  } catch (error) {
    console.error(' Update credentials error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour obtenir les écoles
app.get('/api/schools/public', async (req, res) => {
  try {
    const schools = await School.find().select('name address city status');
    res.json({
      success: true,
      data: schools.map((school) => ({
        id: school._id,
        name: school.name,
        address: school.address,
        city: school.city,
        status: school.status
      }))
    });
  } catch (error) {
    console.error('Get public schools error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/schools', async (req, res) => {
  try {
    const schools = await School.find();
    res.json({
      success: true,
      data: schools
    });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour créer une école
app.post('/api/schools', async (req, res) => {
  try {
    const {
      name,
      address,
      city,
      adminName,
      admin_name,
      createWithAdmin,
      adminFirstName,
      adminLastName,
      adminPhone
    } = req.body;

    const resolvedAdminName = (admin_name || adminName || `${adminFirstName || ''} ${adminLastName || ''}`.trim()).trim();

    if (!name || !address || !city) {
      return res.status(400).json({ success: false, message: 'Nom, adresse et ville sont requis' });
    }

    if (!resolvedAdminName) {
      return res.status(400).json({ success: false, message: 'Nom de l\'admin requis' });
    }

    let admin = null;
    let credentials = null;

    if (createWithAdmin) {
      if (!adminFirstName || !adminLastName) {
        return res.status(400).json({ success: false, message: 'Prénom et nom de l\'admin requis' });
      }

      const generateEmail = (firstName, lastName, schoolName) => {
        const cleanFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const cleanLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
        const cleanSchoolName = schoolName.toLowerCase().replace(/[^a-z]/g, '').replace(/\s+/g, '');
        return `admin.${cleanFirstName}.${cleanLastName}@${cleanSchoolName}.dabali.bf`;
      };

      const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };

      const adminEmail = generateEmail(adminFirstName, adminLastName, name);
      const existingAdmin = await User.findOne({ email: adminEmail });
      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          message: 'Email généré déjà utilisé. Essayez d\'autres noms.'
        });
      }

      const adminPassword = generatePassword();
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      admin = new User({
        email: adminEmail,
        password: hashedPassword,
        role: 'SCHOOL_ADMIN',
        first_name: adminFirstName,
        last_name: adminLastName,
        phone: adminPhone || null
      });

      await admin.save();

      credentials = {
        email: adminEmail,
        temporaryPassword: adminPassword,
        message: 'Veuillez conserver ces identifiants et les transmettre à l\'admin. Changer le mot de passe après la première connexion.'
      };
    }

    const school = new School({
      name,
      address,
      city,
      admin_name: resolvedAdminName,
      admin_id: admin ? admin._id : undefined
    });

    await school.save();

    if (admin) {
      admin.school_id = school._id;
      await admin.save();
    }

    res.json({
      success: true,
      data: {
        school,
        credentials
      },
      message: createWithAdmin ? 'École et admin créés avec succès' : 'École créée avec succès'
    });
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour les étudiants (registre importé)
app.put('/api/schools/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'School ID invalide.' });
    }

    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'Ecole non trouvee.' });
    }

    const updates = {};
    const { name, address, city, status, adminName, admin_name, admin_id, studentCount, student_count } = req.body || {};

    if (name !== undefined) updates.name = String(name).trim();
    if (address !== undefined) updates.address = String(address).trim();
    if (city !== undefined) updates.city = String(city).trim();
    if (status !== undefined) {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (!['active', 'inactive'].includes(normalizedStatus)) {
        return res.status(400).json({ success: false, message: 'Statut invalide.' });
      }
      updates.status = normalizedStatus;
    }
    if (studentCount !== undefined || student_count !== undefined) {
      const rawCount = studentCount ?? student_count;
      const parsedCount = Number(rawCount);
      if (!Number.isFinite(parsedCount) || parsedCount < 0) {
        return res.status(400).json({ success: false, message: 'Nombre d eleves invalide.' });
      }
      updates.student_count = Math.floor(parsedCount);
    }

    const explicitAdminName = (admin_name ?? adminName);
    if (explicitAdminName !== undefined) {
      updates.admin_name = String(explicitAdminName).trim();
    }

    const previousAdminId = school.admin_id?.toString?.();

    if (admin_id !== undefined) {
      if (!admin_id) {
        updates.admin_id = undefined;
      } else {
        if (!mongoose.Types.ObjectId.isValid(admin_id)) {
          return res.status(400).json({ success: false, message: 'admin_id invalide.' });
        }
        const adminUser = await User.findById(admin_id);
        if (!adminUser) {
          return res.status(404).json({ success: false, message: 'Admin non trouve.' });
        }
        if (adminUser.role !== 'SCHOOL_ADMIN') {
          return res.status(400).json({ success: false, message: 'L utilisateur selectionne doit etre SCHOOL_ADMIN.' });
        }

        updates.admin_id = adminUser._id;
        if (!updates.admin_name) {
          updates.admin_name = `${adminUser.first_name || ''} ${adminUser.last_name || ''}`.trim();
        }
      }
    }

    const updatedSchool = await School.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedSchool) {
      return res.status(404).json({ success: false, message: 'Ecole non trouvee.' });
    }

    const nextAdminId = updatedSchool.admin_id?.toString?.();
    if (previousAdminId && previousAdminId !== nextAdminId) {
      await User.findByIdAndUpdate(previousAdminId, { $unset: { school_id: 1 } }).catch(() => null);
    }
    if (nextAdminId) {
      await User.findByIdAndUpdate(nextAdminId, { school_id: updatedSchool._id }).catch(() => null);
    }

    res.json({
      success: true,
      message: 'Ecole mise a jour avec succes.',
      data: updatedSchool
    });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.delete('/api/schools/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'School ID invalide.' });
    }

    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'Ecole non trouvee.' });
    }

    const schoolId = school._id;
    const childIds = await Child.find({ school_id: schoolId }).distinct('_id');
    const menuIds = await Menu.find({ school_id: schoolId }).distinct('_id');

    await User.deleteMany({ school_id: schoolId, role: { $in: ['SCHOOL_ADMIN', 'CANTEEN_MANAGER'] } });
    await User.updateMany({ school_id: schoolId, role: { $nin: ['SCHOOL_ADMIN', 'CANTEEN_MANAGER'] } }, { $unset: { school_id: 1 } });

    if (Array.isArray(childIds) && childIds.length > 0) {
      await Subscription.deleteMany({ child_id: { $in: childIds } });
      await Attendance.deleteMany({ student_id: { $in: childIds } });
    }
    if (Array.isArray(menuIds) && menuIds.length > 0) {
      await Attendance.deleteMany({ menu_id: { $in: menuIds } });
    }

    await Notification.deleteMany({ school_id: schoolId });
    await StudentRegistry.deleteMany({ school_id: schoolId });
    await Menu.deleteMany({ school_id: schoolId });
    await Child.deleteMany({ school_id: schoolId });
    await School.findByIdAndDelete(schoolId);

    res.json({
      success: true,
      message: 'Ecole supprimee avec succes.'
    });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
app.get('/api/students', requireAuth, async (req, res) => {
  try {
    const { school_id } = req.query;
    let schoolId = school_id;

    if (!schoolId && req.user?.role === 'SCHOOL_ADMIN') {
      schoolId = await resolveSchoolIdForUser(req.user.id);
    }

    if (schoolId && !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'School ID invalide.' });
    }

    const filter = schoolId ? { school_id: schoolId } : {};
    const students = await StudentRegistry.find(filter).sort({ last_name: 1, first_name: 1 });
    res.json({ success: true, data: students });
  } catch (error) {
    console.error('Get students registry error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Import PDF des élèves
// Import des eleves (PDF/CSV/XLSX)
app.post('/api/students/import', requireAuth, requireRole('SCHOOL_ADMIN'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Fichier requis (PDF, CSV, XLSX).' });
    }

    const explicitSchoolId = req.body?.school_id;
    let schoolId = explicitSchoolId;

    if (!schoolId) {
      schoolId = await resolveSchoolIdForUser(req.user.id);
    }

    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ success: false, message: 'Aucune ecole associee a cet admin.' });
    }

    const fileName = req.file.originalname || '';
    const lowerName = fileName.toLowerCase();
    const mime = req.file.mimetype || '';

    let rows = [];
    let invalidLines = [];

    if (lowerName.endsWith('.pdf') || mime === 'application/pdf') {
      const parsed = await pdfParse(req.file.buffer);
      ({ rows, invalidLines } = parseStudentPdf(parsed?.text || ''));
    } else if (lowerName.endsWith('.csv') || mime.includes('csv') || lowerName.endsWith('.txt')) {
      const csvText = req.file.buffer.toString('utf8');
      ({ rows, invalidLines } = parseStudentCsv(csvText));
    } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || mime.includes('spreadsheet') || mime.includes('excel')) {
      ({ rows } = parseStudentXlsx(req.file.buffer));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Format non supporte. Utilisez un PDF, CSV ou XLSX.'
      });
    }

    const { students: parsedStudents, invalidRows } = extractStudentsFromRows(rows);

    if (!parsedStudents.length) {
      return res.status(400).json({
        success: false,
        message: 'Aucune donnee valide trouvee dans le fichier.',
        data: { invalidCount: invalidLines.length + invalidRows.length }
      });
    }

    const docs = [];
    const seen = new Set();

    for (const row of parsedStudents) {
      const normBirthDate = normalizeDate(row.birth_date);
      const normFirstName = normalizeName(row.first_name);
      const normLastName = normalizeName(row.last_name);
      const normStudentCode = normalizeCode(row.student_code);
      const normClassName = normalizeClass(row.class_name);

      if (!normBirthDate || !normFirstName || !normLastName || !normStudentCode || !normClassName) {
        invalidRows.push(row);
        continue;
      }

      const key = `${normFirstName}|${normLastName}|${normStudentCode}|${normBirthDate}|${normClassName}`;
      if (seen.has(key)) continue;
      seen.add(key);

      docs.push({
        school_id: schoolId,
        first_name: row.first_name,
        last_name: row.last_name,
        student_code: row.student_code,
        birth_date: new Date(normBirthDate),
        class_name: row.class_name,
        norm_first_name: normFirstName,
        norm_last_name: normLastName,
        norm_student_code: normStudentCode,
        norm_birth_date: normBirthDate,
        norm_class_name: normClassName,
        source_file_name: fileName,
        imported_by: req.user.id
      });
    }

    if (!docs.length) {
      return res.status(400).json({
        success: false,
        message: 'Aucune ligne valide apres normalisation.',
        data: { invalidCount: invalidLines.length + invalidRows.length }
      });
    }

    await StudentRegistry.deleteMany({ school_id: schoolId });
    const inserted = await StudentRegistry.insertMany(docs);
    await School.findByIdAndUpdate(schoolId, { student_count: inserted.length }).catch(() => null);

    res.json({
      success: true,
      message: 'Import termine avec succes.',
      data: {
        importedCount: inserted.length,
        invalidCount: invalidLines.length + invalidRows.length,
        duplicateCount: Math.max(0, parsedStudents.length - docs.length),
        fileName
      }
    });
  } catch (error) {
    console.error('Import students error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'import.' });
  }
});

// Route pour les enfants
app.get('/api/children', requireAuth, async (req, res) => {
  try {
    const { parent_id } = req.query;
    const filter = {};

    if (req.user?.role === 'PARENT') {
      filter.parent_id = req.user.id;
    } else if (parent_id) {
      filter.parent_id = parent_id;
    }

    const children = await Child.find(filter)
      .populate('parent_id', 'first_name last_name email')
      .populate('school_id', 'name');

    res.json({ success: true, data: children.map(mapChildResponse) });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour créer un enfant (validation via PDF)
app.post('/api/children', requireAuth, requireRole('PARENT'), async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      date_of_birth,
      birth_date,
      class_name,
      grade,
      student_code,
      school_id,
      school_name
    } = req.body || {};

    let schoolId = school_id;
    if (!schoolId && school_name) {
      const school = await School.findOne({ name: school_name });
      if (school) schoolId = school._id;
    }

    if (schoolId && !mongoose.Types.ObjectId.isValid(schoolId)) {
      const school = await School.findOne({ name: schoolId });
      if (school) {
        schoolId = school._id;
      }
    }

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'École requise.' });
    }

    const providedBirthDate = date_of_birth || birth_date;
    const providedClass = class_name || grade;

    if (!first_name || !last_name || !providedBirthDate || !providedClass || !student_code) {
      return res.status(400).json({
        success: false,
        message: 'Prénom, nom, code élève, date de naissance et classe sont requis.'
      });
    }

    const normBirthDate = normalizeDate(providedBirthDate);
    const normFirstName = normalizeName(first_name);
    const normLastName = normalizeName(last_name);
    const normStudentCode = normalizeCode(student_code);
    const normClassName = normalizeClass(providedClass);

    if (!normBirthDate) {
      return res.status(400).json({ success: false, message: 'Date de naissance invalide.' });
    }

    const registryCount = await StudentRegistry.countDocuments({ school_id: schoolId });
    if (!registryCount) {
      return res.status(400).json({
        success: false,
        message: 'Aucune liste d\'élèves importée pour cette école.'
      });
    }

    let registryMatch = await StudentRegistry.findOne({
      school_id: schoolId,
      norm_first_name: normFirstName,
      norm_last_name: normLastName,
      norm_student_code: normStudentCode,
      norm_birth_date: normBirthDate,
      norm_class_name: normClassName
    });

    if (!registryMatch) {
      const candidates = await StudentRegistry.find({
        school_id: schoolId,
        norm_student_code: normStudentCode,
        norm_birth_date: normBirthDate
      }).limit(20);

      if (candidates.length === 1) {
        registryMatch = candidates[0];
      } else if (candidates.length > 1) {
        const providedClassToken = normalizeLooseToken(providedClass);
        const providedFirstNameToken = normalizeLooseToken(first_name);
        const providedLastNameToken = normalizeLooseToken(last_name);

        const classMatches = providedClassToken
          ? candidates.filter((candidate) => normalizeLooseToken(candidate.class_name) === providedClassToken)
          : [];

        if (classMatches.length === 1) {
          registryMatch = classMatches[0];
        } else {
          const basePool = classMatches.length > 0 ? classMatches : candidates;
          const nameMatches = basePool.filter((candidate) =>
            normalizeLooseToken(candidate.first_name) === providedFirstNameToken &&
            normalizeLooseToken(candidate.last_name) === providedLastNameToken
          );

          if (nameMatches.length === 1) {
            registryMatch = nameMatches[0];
          }
        }
      }
    }

    if (!registryMatch) {
      return res.status(400).json({
        success: false,
        message: 'Identifiants de l\'enfant incorrects.'
      });
    }

    const existingChild = await Child.findOne({
      school_id: schoolId,
      student_code: registryMatch.student_code
    });

    if (existingChild) {
      return res.status(409).json({
        success: false,
        message: 'Cet élève est déjà associé à un parent.'
      });
    }

    const child = new Child({
      first_name: registryMatch.first_name,
      last_name: registryMatch.last_name,
      birth_date: registryMatch.birth_date,
      grade: registryMatch.class_name,
      parent_id: req.user.id,
      school_id: schoolId,
      student_code: registryMatch.student_code,
      status: 'APPROVED'
    });

    await child.save();
    const populatedChild = await Child.findById(child._id)
      .populate('parent_id', 'first_name last_name email')
      .populate('school_id', 'name');

    res.json({
      success: true,
      data: mapChildResponse(populatedChild),
      message: 'Enfant ajouté avec succès'
    });
  } catch (error) {
    console.error('Create child error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour les abonnements
app.get('/api/subscriptions', requireAuth, async (req, res) => {
  try {
    const { child_id, school_id } = req.query;
    const filter = {};

    let parentChildIds = null;
    let parentChildIdSet = null;
    if (req.user?.role === 'PARENT') {
      parentChildIds = await Child.find({ parent_id: req.user.id }).distinct('_id');
      parentChildIdSet = new Set(parentChildIds.map((id) => id.toString()));
      if (parentChildIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
    }

    if (child_id) {
      if (parentChildIdSet && !parentChildIdSet.has(child_id.toString())) {
        return res.json({ success: true, data: [] });
      }
      filter.child_id = child_id;
    }

    let resolvedSchoolId = school_id;
    if (!resolvedSchoolId && (req.user?.role === 'SCHOOL_ADMIN' || req.user?.role === 'CANTEEN_MANAGER')) {
      resolvedSchoolId = await resolveSchoolIdForUser(req.user.id);
    }

    if (resolvedSchoolId) {
      if (!mongoose.Types.ObjectId.isValid(resolvedSchoolId)) {
        return res.status(400).json({ success: false, message: 'School ID invalide.' });
      }

      if (req.user?.role === 'SCHOOL_ADMIN') {
        const school = await School.findById(resolvedSchoolId).select('admin_id');
        if (!school || school.admin_id?.toString() !== req.user.id?.toString()) {
          return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
        }
      }

      if (req.user?.role === 'CANTEEN_MANAGER') {
        const manager = await User.findById(req.user.id).select('school_id');
        if (!manager?.school_id || manager.school_id.toString() !== resolvedSchoolId.toString()) {
          return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
        }
      }

      let childIds = await Child.find({ school_id: resolvedSchoolId }).distinct('_id');
      if (parentChildIdSet) {
        childIds = childIds.filter((id) => parentChildIdSet.has(id.toString()));
      }
      if (filter.child_id) {
        const isAllowed = childIds.some((id) => id.toString() === filter.child_id.toString());
        if (!isAllowed) {
          return res.json({ success: true, data: [] });
        }
      } else {
        filter.child_id = { $in: childIds };
      }
    }

    if (!filter.child_id && parentChildIds) {
      filter.child_id = { $in: parentChildIds };
    }

    const subscriptions = await Subscription.find(filter)
      .populate('child_id', 'first_name last_name parent_id school_id grade class_name student_code');
    const mapped = subscriptions.map((sub) => mapSubscriptionResponse(sub, sub.child_id));
    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour récupérer les abonnements d'un enfant (compatibilité mobile)
app.get('/api/subscriptions/student/:childId', requireAuth, async (req, res) => {
  try {
    const { childId } = req.params;
    const subscriptions = await Subscription.find({ child_id: childId }).populate('child_id', 'first_name last_name parent_id');
    const mapped = subscriptions.map((sub) => mapSubscriptionResponse(sub, sub.child_id));
    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Get subscriptions by child error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/subscriptions/child/:childId', requireAuth, async (req, res) => {
  try {
    const { childId } = req.params;
    const subscriptions = await Subscription.find({ child_id: childId }).populate('child_id', 'first_name last_name parent_id');
    const mapped = subscriptions.map((sub) => mapSubscriptionResponse(sub, sub.child_id));
    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Get subscriptions by child error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour créer un abonnement
app.post('/api/subscriptions', requireAuth, requireRole('PARENT'), async (req, res) => {
  try {
    const {
      child_id,
      subscription_type,
      plan_type,
      type,
      amount,
      start_date,
      end_date
    } = req.body || {};

    if (!child_id) {
      return res.status(400).json({ success: false, message: 'Child ID requis.' });
    }

    const child = await Child.findById(child_id);
    if (!child) {
      return res.status(404).json({ success: false, message: 'Enfant non trouvé.' });
    }

    if (child.parent_id?.toString?.() !== req.user.id?.toString()) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à cet enfant.' });
    }

    const childStatus = String(child.status || '').toUpperCase();
    if (!(childStatus === 'APPROVED' || childStatus === 'ACTIVE')) {
      return res.status(400).json({ success: false, message: 'Enfant non approuvé pour l\'abonnement.' });
    }

    const resolvedType = normalizeSubscriptionType(subscription_type || plan_type || type);
    if (!resolvedType) {
      return res.status(400).json({ success: false, message: 'Type d\'abonnement invalide.' });
    }

    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = end_date ? new Date(end_date) : calculateSubscriptionEndDate(startDate, resolvedType);

    const subscription = new Subscription({
      child_id,
      plan_type: resolvedType,
      start_date: startDate,
      end_date: endDate,
      amount: amount ?? 0,
      status: 'PENDING_PAYMENT'
    });

    await subscription.save();
    const populatedSubscription = await Subscription.findById(subscription._id).populate('child_id', 'first_name last_name parent_id');

    res.json({
      success: true,
      data: mapSubscriptionResponse(populatedSubscription, populatedSubscription?.child_id),
      message: 'Abonnement créé avec succès'
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour initier un paiement d'abonnement
app.post('/api/subscriptions/:subscriptionId/payment', requireAuth, requireRole('PARENT'), async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const paymentMethod = normalizePaymentMethod(req.body?.paymentMethod || req.body?.payment_method || req.body?.method);

    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({ success: false, message: 'Subscription ID invalide.' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: 'Methode de paiement invalide.' });
    }

    const subscription = await Subscription.findById(subscriptionId).populate('child_id', 'parent_id first_name last_name');
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Abonnement introuvable.' });
    }

    const child = subscription.child_id;
    if (!child || child.parent_id?.toString?.() !== req.user.id?.toString()) {
      return res.status(403).json({ success: false, message: 'Acces non autorise a cet abonnement.' });
    }

    const paymentStatus = paymentMethod === 'CASH' ? 'WAITING_ADMIN_VALIDATION' : 'PENDING';
    const verificationCode = paymentMethod === 'CASH' ? null : '1234';

    const payment = new Payment({
      subscription_id: subscription._id,
      child_id: child._id,
      parent_id: req.user.id,
      amount: subscription.amount ?? 0,
      method: paymentMethod,
      status: paymentStatus,
      verification_code: verificationCode,
    });

    await payment.save();

    await Subscription.findByIdAndUpdate(subscription._id, {
      status: 'PENDING_PAYMENT',
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      payment_reference: payment._id.toString(),
      payment_date: null,
      transaction_id: null,
      updated_at: new Date(),
    });

    const populatedSubscription = await Subscription.findById(subscription._id).populate('child_id', 'first_name last_name parent_id');

    return res.status(201).json({
      success: true,
      message: paymentMethod === 'CASH'
        ? 'Paiement cash enregistre. En attente de validation par l administration.'
        : 'Paiement initie. Entrez le code a 4 chiffres (1234) pour valider.',
      data: {
        payment: mapPaymentResponse(payment),
        subscription: mapSubscriptionResponse(populatedSubscription, populatedSubscription?.child_id),
        codeRequired: paymentMethod !== 'CASH',
      }
    });
  } catch (error) {
    console.error('Initiate subscription payment error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour confirmer un paiement mobile money
app.post('/api/subscriptions/:subscriptionId/payment/confirm', requireAuth, requireRole('PARENT'), async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const paymentMethod = normalizePaymentMethod(req.body?.paymentMethod || req.body?.payment_method || req.body?.method);
    const code = String(req.body?.code || req.body?.verification_code || '').trim();

    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return res.status(400).json({ success: false, message: 'Subscription ID invalide.' });
    }

    if (!paymentMethod || paymentMethod === 'CASH') {
      return res.status(400).json({ success: false, message: 'La confirmation par code est reservee au mobile money.' });
    }

    if (!code) {
      return res.status(400).json({ success: false, message: 'Le code a 4 chiffres est requis.' });
    }

    const subscription = await Subscription.findById(subscriptionId).populate('child_id', 'parent_id first_name last_name');
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Abonnement introuvable.' });
    }

    const child = subscription.child_id;
    if (!child || child.parent_id?.toString?.() !== req.user.id?.toString()) {
      return res.status(403).json({ success: false, message: 'Acces non autorise a cet abonnement.' });
    }

    const payment = await Payment.findOne({
      subscription_id: subscription._id,
      parent_id: req.user.id,
      method: paymentMethod,
      status: 'PENDING',
    }).sort({ created_at: -1 });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Aucun paiement en attente de confirmation.' });
    }

    const expectedCode = String(payment.verification_code || '1234');
    if (code !== expectedCode) {
      return res.status(400).json({ success: false, message: 'Code invalide. Utilisez 1234 pour ce prototype.' });
    }

    const transactionId = String(req.body?.transactionId || req.body?.transaction_id || `TXN-${Date.now()}`);
    const paidAt = new Date();

    payment.status = 'COMPLETED';
    payment.transaction_id = transactionId;
    payment.paid_at = paidAt;
    await payment.save();

    await Subscription.findByIdAndUpdate(subscription._id, {
      status: 'ACTIVE',
      payment_method: paymentMethod,
      payment_status: 'COMPLETED',
      payment_date: paidAt,
      payment_reference: payment._id.toString(),
      transaction_id: transactionId,
      updated_at: new Date(),
    });

    const populatedSubscription = await Subscription.findById(subscription._id).populate('child_id', 'first_name last_name parent_id');

    return res.json({
      success: true,
      message: 'Paiement valide. L enfant est maintenant abonne.',
      data: {
        payment: mapPaymentResponse(payment),
        subscription: mapSubscriptionResponse(populatedSubscription, populatedSubscription?.child_id),
      }
    });
  } catch (error) {
    console.error('Confirm subscription payment error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Historique des paiements d'abonnement
app.get('/api/subscriptions/payments/history', requireAuth, async (req, res) => {
  try {
    const { childId, subscriptionId, limit } = req.query;
    const query = {};

    if (req.user?.role === 'PARENT') {
      query.parent_id = req.user.id;
    }

    if (childId && mongoose.Types.ObjectId.isValid(String(childId))) {
      query.child_id = String(childId);
    }

    if (subscriptionId && mongoose.Types.ObjectId.isValid(String(subscriptionId))) {
      query.subscription_id = String(subscriptionId);
    }

    const parsedLimit = Math.max(1, Math.min(Number(limit) || 20, 100));

    let payments = await Payment.find(query)
      .populate('child_id', 'first_name last_name school_id')
      .populate('parent_id', 'first_name last_name email')
      .sort({ created_at: -1 })
      .limit(parsedLimit);

    if (req.user?.role === 'SCHOOL_ADMIN') {
      const schoolId = await resolveSchoolIdForUser(req.user.id);
      payments = payments.filter((payment) => payment?.child_id?.school_id?.toString?.() === schoolId?.toString?.());
    }

    res.json({ success: true, data: payments.map(mapPaymentResponse) });
  } catch (error) {
    console.error('Get subscription payments history error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour les menus (simulation)
// === MENUS ROUTES ===
app.get('/api/menus', requireAuth, async (req, res) => {
  try {
    const { school_id, date, status } = req.query;
    const query = {};
    const requestedSchoolId = await resolveSchoolIdInput(school_id);
    if (school_id && !requestedSchoolId) {
      return res.status(400).json({ success: false, message: 'School not found.' });
    }
    if (school_id && !requestedSchoolId) {
      return res.status(400).json({ success: false, message: 'School not found.' });
    }
    const allowedSchoolIds = await resolveAccessibleSchoolIds(req.user);

    if (allowedSchoolIds && !allowedSchoolIds.length) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }

    if (requestedSchoolId) {
      if (allowedSchoolIds && !allowedSchoolIds.includes(requestedSchoolId)) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
      }
      query.school_id = requestedSchoolId;
    } else if (allowedSchoolIds) {
      query.school_id = { $in: allowedSchoolIds };
    }

    if (req.user.role === 'PARENT') {
      query.status = 'APPROVED';
    } else if (status) {
      query.status = status;
    }
    if (date) {
      query.date = { $gte: startOfDay(date), $lte: endOfDay(date) };
    }

    const menus = await Menu.find(query)
      .populate('school_id', 'name city')
      .populate('created_by', 'first_name last_name')
      .populate('approved_by', 'first_name last_name')
      .sort({ date: -1, meal_type: 1 });

    res.json({ success: true, data: menus.map(mapMenu) });
  } catch (error) {
    console.error('Get menus error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Menu du jour pour les parents
app.get('/api/menus/today', requireAuth, async (req, res) => {
  try {
    const { schoolId, school_id } = req.query;
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    let schoolIds = [];

    if (schoolId || school_id) {
      const selectedId = schoolId || school_id;
      const resolvedId = await resolveSchoolIdInput(selectedId);
      if (!resolvedId) {
        return res.status(400).json({ success: false, message: 'School not found.' });
      }
      if (resolvedId) schoolIds = [resolvedId];
    } else if (req.user.role === 'PARENT') {
      const children = await Child.find({ parent_id: req.user.id }).select('school_id');
      const rawIds = children.map((child) => child.school_id?.toString()).filter(Boolean);
      const resolvedIds = [];
      for (const rawId of rawIds) {
        if (mongoose.Types.ObjectId.isValid(rawId)) {
          resolvedIds.push(rawId);
        } else {
          const schoolByName = await School.findOne({ name: rawId }).select('_id');
          if (schoolByName) {
            resolvedIds.push(schoolByName._id.toString());
          }
        }
      }
      schoolIds = [...new Set(resolvedIds)];
    } else if (req.user.role === 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, message: 'School ID requis pour le super admin.' });
    } else if (req.user.role === 'SCHOOL_ADMIN') {
      const schoolIdForAdmin = await resolveSchoolIdForUser(req.user.id);
      if (schoolIdForAdmin) schoolIds = [schoolIdForAdmin.toString()];
    } else if (req.user.role === 'CANTEEN_MANAGER') {
      const manager = await User.findById(req.user.id).select('school_id');
      if (manager?.school_id) schoolIds = [manager.school_id.toString()];
    }

    const allowedSchoolIds = await resolveAccessibleSchoolIds(req.user);
    if (allowedSchoolIds && !allowedSchoolIds.length) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }
    if (allowedSchoolIds && schoolIds.length && !allowedSchoolIds.includes(schoolIds[0])) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
    }

    if (!schoolIds.length) {
      return res.status(404).json({ success: false, message: 'Aucune école trouvée pour cet utilisateur.' });
    }

    const menus = await Menu.find({
      school_id: { $in: schoolIds },
      status: 'APPROVED',
      date: { $gte: dayStart, $lte: dayEnd }
    }).sort({ meal_type: 1 });

    if (!menus.length) {
      return res.status(404).json({ success: false, message: 'Aucun menu validé pour aujourd\'hui.' });
    }

    const order = ['LUNCH', 'BREAKFAST', 'DINNER'];
    const orderIndex = (value) => {
      const idx = order.indexOf(value);
      return idx >= 0 ? idx : order.length;
    };
    menus.sort((a, b) => orderIndex(a.meal_type) - orderIndex(b.meal_type));
    const selected = menus[0];

    res.json({ success: true, data: toMenuModel(selected) });
  } catch (error) {
    console.error('Get today menu error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/menus/week', requireAuth, async (req, res) => {
  try {
    const { school_id, start_date } = req.query;
    if (!start_date) {
      return res.status(400).json({ success: false, message: 'School ID and start date are required.' });
    }

    const requestedSchoolId = await resolveSchoolIdInput(school_id);
    const allowedSchoolIds = await resolveAccessibleSchoolIds(req.user);

    if (allowedSchoolIds && !allowedSchoolIds.length) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }

    let resolvedSchoolId = requestedSchoolId;
    if (!resolvedSchoolId) {
      if (allowedSchoolIds === null) {
        return res.status(400).json({ success: false, message: 'School ID is required for SUPER_ADMIN.' });
      }
      if (allowedSchoolIds.length === 1) {
        resolvedSchoolId = allowedSchoolIds[0];
      } else {
        return res.status(400).json({ success: false, message: 'School ID requis.' });
      }
    } else if (allowedSchoolIds && !allowedSchoolIds.includes(resolvedSchoolId)) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
    }

    const startDate = startOfDay(start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    const menus = await Menu.find({
      school_id: resolvedSchoolId,
      date: { $gte: startDate, $lte: endDate },
      status: 'APPROVED'
    })
      .populate('school_id', 'name')
      .sort({ date: 1, meal_type: 1 });

    res.json({ success: true, data: menus.map(mapMenu) });
  } catch (error) {
    console.error('Get weekly menus error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Rapport hebdomadaire (lundi -> vendredi)
app.get('/api/menus/week-report', requireAuth, async (req, res) => {
  try {
    const { schoolId, school_id, start_date } = req.query;
    const baseDate = start_date ? new Date(start_date) : new Date();
    const { weekStart, weekEnd } = getWeekRange(baseDate);

    let schoolIds = [];

    if (schoolId || school_id) {
      const selectedId = schoolId || school_id;
      const resolvedId = await resolveSchoolIdInput(selectedId);
      if (!resolvedId) {
        return res.status(400).json({ success: false, message: 'School not found.' });
      }
      if (resolvedId) schoolIds = [resolvedId];
    } else if (req.user.role === 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, message: 'School ID requis pour le super admin.' });
    } else if (req.user.role === 'PARENT') {
      const children = await Child.find({ parent_id: req.user.id }).select('school_id');
      const rawIds = children.map((child) => child.school_id?.toString()).filter(Boolean);
      const resolvedIds = [];
      for (const rawId of rawIds) {
        if (mongoose.Types.ObjectId.isValid(rawId)) {
          resolvedIds.push(rawId);
        } else {
          const schoolByName = await School.findOne({ name: rawId }).select('_id');
          if (schoolByName) {
            resolvedIds.push(schoolByName._id.toString());
          }
        }
      }
      schoolIds = [...new Set(resolvedIds)];
    } else if (req.user.role === 'SCHOOL_ADMIN') {
      const schoolIdForAdmin = await resolveSchoolIdForUser(req.user.id);
      if (schoolIdForAdmin) schoolIds = [schoolIdForAdmin.toString()];
    } else if (req.user.role === 'CANTEEN_MANAGER') {
      const manager = await User.findById(req.user.id).select('school_id');
      if (manager?.school_id) schoolIds = [manager.school_id.toString()];
    }

    if (!schoolIds.length) {
      return res.status(404).json({ success: false, message: 'Aucune école trouvée pour cet utilisateur.' });
    }

    const selectedSchoolId = schoolIds[0];
    const weeklyMenus = await Menu.find({
      school_id: selectedSchoolId,
      status: 'APPROVED',
      date: { $gte: weekStart, $lte: weekEnd }
    }).sort({ date: 1, meal_type: 1 });

    const dailyMenus = new Map();
    weeklyMenus.forEach((item) => {
      const key = formatDateKey(item.date);
      if (!key) return;
      const current = dailyMenus.get(key) || [];
      current.push(item);
      dailyMenus.set(key, current);
    });

    const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const reportDays = [];
    const missingDays = [];

    for (let i = 0; i < 5; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + i);
      const key = formatDateKey(dayDate);
      const menusForDay = (dailyMenus.get(key) || []).sort((a, b) => orderMealType(a.meal_type) - orderMealType(b.meal_type));
      if (!menusForDay.length) {
        missingDays.push(weekdays[i]);
        reportDays.push({
          day: weekdays[i],
          date: key,
          mainDish: null,
          items: []
        });
        continue;
      }

      const selected = menusForDay[0];
      const mainDish = selected.meal_name || selected.name || selected.description || 'Menu validé';
      const extras = Array.isArray(selected.items)
        ? selected.items.map((it) => (typeof it === 'string' ? it : it?.name)).filter(Boolean)
        : [];

      reportDays.push({
        day: weekdays[i],
        date: key,
        mainDish,
        items: extras,
        menuId: selected._id?.toString?.()
      });
    }

    const school = await School.findById(selectedSchoolId).select('name');

    res.json({
      success: true,
      data: {
        schoolId: selectedSchoolId,
        schoolName: school?.name || null,
        weekStart: formatDateKey(weekStart),
        weekEnd: formatDateKey(weekEnd),
        days: reportDays,
        missingDays
      }
    });
  } catch (error) {
    console.error('Get week report error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/menus', requireAuth, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN', 'CANTEEN_MANAGER'), async (req, res) => {
  try {
    const { school_id, date, meal_type, meal_name, name, description, items, allergens } = req.body;
    const resolvedMealName = meal_name || name;
    if (!school_id || !date || !meal_type) {
      return res.status(400).json({ success: false, message: 'School ID, date, and meal type are required.' });
    }

    const school = await School.findById(school_id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found.' });
    }

    if (req.user.role === 'SCHOOL_ADMIN') {
      const adminSchoolId = await resolveSchoolIdForUser(req.user.id);
      if (!adminSchoolId) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé: aucune école associée.' });
      }
      if (adminSchoolId.toString() !== school_id.toString()) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
      }
    }

    if (req.user.role === 'CANTEEN_MANAGER') {
      const creator = await User.findById(req.user.id).select('school_id');
      if (!creator?.school_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: no school assigned to this canteen manager account.',
        });
      }
      if (creator.school_id.toString() !== school_id.toString()) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
      }
    }

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const rangeStart = startOfDay(date);
    const rangeEnd = new Date(rangeStart.getFullYear(), 11, 31);
    const dates = getSameWeekdayDatesInRange(rangeStart, rangeEnd);
    const annualKey = new mongoose.Types.ObjectId().toString();
    const approvalDate = new Date();
    const payload = {
      school_id,
      meal_type,
      meal_name: resolvedMealName,
      description,
      items: Array.isArray(items) ? items : [],
      allergens: allergens || [],
      status: 'APPROVED',
      created_by: req.user.id,
      approved_by: req.user.id,
      approved_at: approvalDate,
      annual_key: annualKey,
      is_annual: true
    };

    const operations = dates.map((day) => ({
      updateOne: {
        filter: {
          school_id,
          meal_type,
          date: { $gte: startOfDay(day), $lte: endOfDay(day) }
        },
        update: { $set: { ...payload, date: new Date(day) } },
        upsert: true
      }
    }));

    if (operations.length) {
      await Menu.bulkWrite(operations);
    }

    const populatedMenu = await Menu.findOne({
      school_id,
      meal_type,
      annual_key: annualKey,
      date: { $gte: dayStart, $lte: dayEnd }
    })
      .populate('school_id', 'name city')
      .populate('created_by', 'first_name last_name');

    res.status(201).json({
      success: true,
      message: 'Menu created and approved successfully for the year.',
      data: mapMenu(populatedMenu)
    });
  } catch (error) {
    console.error('Create menu error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.put('/api/menus/:id', requireAuth, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN', 'CANTEEN_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid menu id.' });
    }
    const updates = { ...req.body };
    if (updates.name && !updates.meal_name) {
      updates.meal_name = updates.name;
    }
    delete updates.name;
    delete updates._id;
    delete updates.created_by;
    delete updates.approved_by;
    delete updates.approved_at;
    delete updates.created_at;

    const menu = await Menu.findById(id);
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found.' });
    }
    
        if (req.user.role === 'SCHOOL_ADMIN') {
      const adminSchoolId = await resolveSchoolIdForUser(req.user.id);
      if (!adminSchoolId || adminSchoolId.toString() !== menu.school_id?.toString()) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
      }
    }

    if (req.user.role === 'CANTEEN_MANAGER') {
      const manager = await User.findById(req.user.id).select('school_id');
      if (!manager?.school_id || manager.school_id.toString() !== menu.school_id?.toString()) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
      }
    }

    const isAnnual = Boolean(menu.annual_key || menu.is_annual);
    if (isAnnual) {
      delete updates.date;
      await Menu.updateMany(
        { annual_key: menu.annual_key },
        {
          $set: {
            ...updates,
            status: 'APPROVED',
            approved_by: req.user.id,
            approved_at: new Date(),
            updated_at: new Date()
          }
        }
      );
    } else {
      Object.assign(menu, updates, { updated_at: new Date() });
      await menu.save();
    }

    const populatedMenu = await Menu.findById(menu._id)
      .populate('school_id', 'name city')
      .populate('created_by', 'first_name last_name')
      .populate('approved_by', 'first_name last_name');

    const updatedMealName = populatedMenu?.meal_name || menu?.meal_name || updates?.meal_name || updates?.description || 'Menu';
    const updatedDate = populatedMenu?.date || menu?.date || updates?.date || null;
    await notifyMenuChange({
      action: 'update',
      actorId: req.user.id,
      schoolId: menu.school_id,
      mealName: updatedMealName,
      date: updatedDate,
      isAnnual,
    });

    res.json({ success: true, message: 'Menu updated successfully.', data: mapMenu(populatedMenu) });
  } catch (error) {
    console.error('Update menu error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.delete('/api/menus/week', requireAuth, requireRole('CANTEEN_MANAGER'), async (req, res) => {
  try {
    const { school_id, start_date } = req.query;
    let resolvedSchoolId = school_id;
    if (!resolvedSchoolId) {
      resolvedSchoolId = await resolveSchoolIdForUser(req.user.id);
    }
    if (!resolvedSchoolId || !start_date) {
      return res.status(400).json({ success: false, message: 'School ID and start date are required.' });
    }

    const school = await School.findById(resolvedSchoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found.' });
    }

    if (req.user.role === 'SCHOOL_ADMIN') {
      if (!school.admin_id || school.admin_id.toString() !== req.user.id?.toString()) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
      }
    }

    if (req.user.role === 'CANTEEN_MANAGER') {
      const manager = await User.findById(req.user.id).select('school_id');
      if (!manager?.school_id || manager.school_id.toString() !== resolvedSchoolId.toString()) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
      }
    }

    const startDate = startOfDay(start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 4);
    endDate.setHours(23, 59, 59, 999);

    const baseQuery = {
      school_id: resolvedSchoolId,
      date: { $gte: startDate, $lte: endDate },
    };

    if (req.user.role === 'CANTEEN_MANAGER') {
      baseQuery.status = 'PENDING';
      baseQuery.created_by = req.user.id;
    }

    const deleteResult = await Menu.deleteMany(baseQuery);
    res.json({
      success: true,
      message: 'Menus supprimés pour la semaine.',
      data: { deletedCount: deleteResult.deletedCount }
    });
  } catch (error) {
    console.error('Delete weekly menus error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.delete('/api/menus/:id', requireAuth, requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN', 'CANTEEN_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid menu id.' });
    }
    const menu = await Menu.findById(id);
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found.' });
    }

    if (req.user.role === 'SCHOOL_ADMIN') {
      const adminSchoolId = await resolveSchoolIdForUser(req.user.id);
      if (!adminSchoolId || adminSchoolId.toString() !== menu.school_id?.toString()) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
      }
    }

    if (req.user.role === 'CANTEEN_MANAGER') {
      const manager = await User.findById(req.user.id).select('school_id');
      if (!manager?.school_id || manager.school_id.toString() !== menu.school_id?.toString()) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
      }
    }

    const deletedMenuName = menu.meal_name || menu.name || menu.description || 'Menu';
    const deletedMenuDate = menu.date || null;
    const isAnnualMenu = Boolean(menu.annual_key || menu.is_annual);

    if (isAnnualMenu) {
      await Menu.deleteMany({ annual_key: menu.annual_key });
    } else {
      await Menu.findByIdAndDelete(id);
    }

    await notifyMenuChange({
      action: 'delete',
      actorId: req.user.id,
      schoolId: menu.school_id,
      mealName: deletedMenuName,
      date: deletedMenuDate,
      isAnnual: isAnnualMenu,
    });

    res.json({ success: true, message: 'Menu deleted successfully.' });
  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/menus/submit-week', requireAuth, requireRole('CANTEEN_MANAGER', 'SCHOOL_ADMIN'), async (req, res) => {
  try {
    const { school_id, start_date } = req.body;
    if (!school_id || !start_date) {
      return res.status(400).json({ success: false, message: 'School ID and start date are required.' });
    }

    const school = await School.findById(school_id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found.' });
    }

    const actor = await User.findById(req.user.id).select('school_id first_name last_name role');
    if (!actor) {
      return res.status(401).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    if (req.user.role === 'CANTEEN_MANAGER') {
      if (!actor.school_id || actor.school_id.toString() !== school_id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied for this school.' });
      }
    }

    if (req.user.role === 'SCHOOL_ADMIN') {
      const adminSchoolId = await resolveSchoolIdForUser(req.user.id);
      if (!adminSchoolId || adminSchoolId.toString() !== school_id.toString()) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
      }
    }

    const startDate = startOfDay(start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 4);
    endDate.setHours(23, 59, 59, 999);

    const query = {
      school_id,
      date: { $gte: startDate, $lte: endDate }
    };

    if (req.user.role === 'CANTEEN_MANAGER') {
      query.created_by = req.user.id;
    }

    const count = await Menu.countDocuments(query);
    if (!count) {
      return res.status(404).json({ success: false, message: 'No menus to submit for this week.' });
    }

    const submittedAt = new Date();
    await Menu.updateMany(query, { $set: { submitted_at: submittedAt } });

    const { weekStart, weekEnd } = getWeekRange(startDate);
    const weekStartKey = formatDateKey(weekStart);
    const weekEndKey = formatDateKey(weekEnd);
    const weekKey = `MENU_SUBMIT:${school_id.toString()}:${weekStartKey}`;    const schoolAdmins = await User.find({ role: 'SCHOOL_ADMIN', school_id }).select('_id');
    const superAdmins = await User.find({ role: 'SUPER_ADMIN' }).select('_id');
    const actorIdStr = req.user?.id?.toString?.() || String(req.user?.id || '');
    const recipientIds = [
      ...new Set(
        [...schoolAdmins, ...superAdmins]
          .map((u) => u?._id?.toString?.())
          .filter(Boolean)
          .filter((id) => id !== actorIdStr)
      )
    ];

    if (recipientIds.length) {
      const actorName = `${actor?.first_name || ''} ${actor?.last_name || ''}`.trim() || (req.user.role === 'SCHOOL_ADMIN' ? 'School admin' : 'Canteen manager');
      const operations = recipientIds.map((userId) => ({
        updateOne: {
          filter: {
            user_id: userId,
            type: 'MENU_SUBMITTED',
            week_key: weekKey,
          },
          update: {
            $set: {
              user_id: userId,
              school_id,
              week_start: weekStart,
              week_end: weekEnd,
              week_key: weekKey,
              title: 'Menus sauvegardes et transmis',
              message: `${actorName} a sauvegarde les menus du ${weekStartKey} au ${weekEndKey}.`,
              type: 'MENU_SUBMITTED',
              read: false,
              data: {
                school_id: school_id.toString(),
                week_start: weekStartKey,
                week_end: weekEndKey,
                submitted_count: count,
                submitted_at: submittedAt.toISOString()
              }
            },
            $setOnInsert: {
              created_at: new Date(),
            }
          },
          upsert: true,
        }
      }));

      if (operations.length) {
        await Notification.bulkWrite(operations);
      }
    }

    res.json({
      success: true,
      message: 'Menus sauvegardes et transmis au school admin et au super admin.',
      data: { submittedCount: count }
    });
  } catch (error) {
    console.error('Submit weekly menus error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/menus/pending', requireAuth, requireRole('CANTEEN_MANAGER'), async (req, res) => {
  try {
    const { school_id } = req.query;
    const query = { status: 'PENDING' };
    if (school_id) query.school_id = school_id;

    const menus = await Menu.find(query)
      .populate('school_id', 'name city')
      .populate('created_by', 'first_name last_name')
      .sort({ date: -1, meal_type: 1 });

    res.json({ success: true, data: menus.map(mapMenu) });
  } catch (error) {
    console.error('Get pending menus error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.put('/api/menus/:id/approve', requireAuth, requireRole('CANTEEN_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, rejection_reason } = req.body;

    if (approved === undefined) {
      return res.status(400).json({ success: false, message: 'Approval status is required.' });
    }

    if (!approved && !rejection_reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required when rejecting a menu.' });
    }

    const menu = await Menu.findById(id);
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found.' });
    }

    if (menu.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Menu is not pending approval.' });
    }

    menu.status = approved ? 'APPROVED' : 'REJECTED';
    menu.approved_by = req.user.id;
    menu.approved_at = new Date();
    menu.rejection_reason = approved ? null : rejection_reason;
    await menu.save();

    if (approved) {
      const { weekStart, weekEnd } = getWeekRange(menu.date);
      const weekStartKey = formatDateKey(weekStart);
      const weekEndKey = formatDateKey(weekEnd);

      const weeklyMenus = await Menu.find({
        school_id: menu.school_id,
        status: 'APPROVED',
        date: { $gte: weekStart, $lte: weekEnd }
      }).sort({ date: 1, meal_type: 1 });

      const dailyMenus = new Map();
      weeklyMenus.forEach((item) => {
        const key = formatDateKey(item.date);
        if (!key) return;
        const current = dailyMenus.get(key) || [];
        current.push(item);
        dailyMenus.set(key, current);
      });

      const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
      const missingDays = [];
      const reportLines = [];
      const reportData = [];

      for (let i = 0; i < 5; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + i);
        const key = formatDateKey(dayDate);
        const menusForDay = (dailyMenus.get(key) || []).sort((a, b) => orderMealType(a.meal_type) - orderMealType(b.meal_type));
        if (!menusForDay.length) {
          missingDays.push(weekdays[i]);
          continue;
        }

        const selected = menusForDay[0];
        const mainDish = selected.meal_name || selected.name || selected.description || 'Menu validé';
        const extras = Array.isArray(selected.items)
          ? selected.items.map((it) => (typeof it === 'string' ? it : it?.name)).filter(Boolean)
          : [];
        const extrasText = extras.length ? ` - ${extras.join(', ')}` : '';

        reportLines.push(`${weekdays[i]} (${key}) : ${mainDish}${extrasText}`);
        reportData.push({
          day: weekdays[i],
          date: key,
          mainDish,
          items: extras,
          menuId: selected._id?.toString?.()
        });
      }

      if (!missingDays.length) {
        const parentIds = await Child.distinct('parent_id', { school_id: menu.school_id });
        const weekKey = `${menu.school_id.toString()}:${weekStartKey}`;

        const existing = await Notification.find({
          user_id: { $in: parentIds },
          type: 'WEEK_MENU_AVAILABLE',
          week_key: weekKey
        }).select('user_id');

        const alreadyNotified = new Set(existing.map((item) => item.user_id?.toString?.()));
        const newParents = parentIds.filter((id) => id && !alreadyNotified.has(id.toString()));

        const notifications = newParents.map((parentId) => ({
          user_id: parentId,
          school_id: menu.school_id,
          week_start: weekStart,
          week_end: weekEnd,
          week_key: weekKey,
          title: 'Menus de la semaine disponibles',
          message: `Menus validés du ${weekStartKey} au ${weekEndKey} :\n${reportLines.join('\n')}`,
          type: 'WEEK_MENU_AVAILABLE',
          data: {
            week_start: weekStartKey,
            week_end: weekEndKey,
            menus: reportData
          }
        }));

        if (notifications.length) {
          await Notification.insertMany(notifications);
        }
      }
    }

    res.json({
      success: true,
      message: `Menu ${approved ? 'approved' : 'rejected'} successfully.`,
      data: mapMenu(menu)
    });
  } catch (error) {
    console.error('Approve menu error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// === ATTENDANCE ROUTES ===
app.get('/api/attendance', requireAuth, requireRole('SCHOOL_ADMIN', 'CANTEEN_MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { school_id, date } = req.query;
    let resolvedSchoolId = school_id;

    if (!resolvedSchoolId && req.user?.role !== 'SUPER_ADMIN') {
      resolvedSchoolId = await resolveSchoolIdForUser(req.user.id);
    }

    if (resolvedSchoolId && !mongoose.Types.ObjectId.isValid(resolvedSchoolId)) {
      return res.status(400).json({ success: false, message: 'School ID invalide.' });
    }

    const query = {};
    if (date) {
      query.date = { $gte: startOfDay(date), $lte: endOfDay(date) };
    }

    const attendance = await Attendance.find(query)
      .populate('student_id', 'first_name last_name grade class_name school_id')
      .populate('menu_id', 'date meal_type meal_name status school_id')
      .sort({ date: -1 });

    let filteredAttendance = attendance;
    if (resolvedSchoolId) {
      filteredAttendance = attendance.filter((log) =>
        log?.student_id?.school_id && log.student_id.school_id.toString() === resolvedSchoolId.toString()
      );
    }

    res.json({ success: true, data: filteredAttendance });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du chargement des présences.' });
  }
});

app.post('/api/attendance/mark', requireAuth, requireRole('CANTEEN_MANAGER'), async (req, res) => {
  try {
    const { student_id, menu_id, present, justified, reason } = req.body;

    if (!student_id || !menu_id || present === undefined) {
      return res.status(400).json({ success: false, message: 'Student ID, menu ID et présence sont requis.' });
    }

    if (!mongoose.Types.ObjectId.isValid(student_id) || !mongoose.Types.ObjectId.isValid(menu_id)) {
      return res.status(400).json({ success: false, message: 'Identifiants invalides.' });
    }

    const [student, menu, manager] = await Promise.all([
      Child.findById(student_id),
      Menu.findById(menu_id),
      User.findById(req.user.id).select('school_id'),
    ]);

    if (!student || !menu) {
      return res.status(404).json({ success: false, message: 'Élève ou menu introuvable.' });
    }

    if (!manager?.school_id) {
      return res.status(403).json({ success: false, message: 'Aucune école associée à ce gestionnaire.' });
    }

    const managerSchoolId = manager.school_id.toString();
    if (student.school_id?.toString() !== managerSchoolId || menu.school_id?.toString() !== managerSchoolId) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
    }

    const existing = await Attendance.findOne({ student_id, menu_id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Présence déjà enregistrée pour cet élève.' });
    }

    const attendance = new Attendance({
      student_id,
      menu_id,
      present: !!present,
      justified: !!justified,
      reason: reason || null,
      marked_by: req.user.id,
      date: new Date(),
    });

    await attendance.save();

    if (!attendance.present && student.parent_id) {
      const safeReason = typeof reason === 'string' ? reason.trim() : '';
      const reasonSuffix = safeReason ? ` Motif: ${safeReason}` : '';

      try {
        await Notification.create({
          user_id: student.parent_id,
          school_id: student.school_id || null,
          title: 'Absence a la cantine',
          message: `${student.first_name} ${student.last_name} a ete signale absent (${menu.meal_type || 'REPAS'}) aujourd'hui.${reasonSuffix}`,
          type: 'ABSENCE',
          data: {
            child_id: student._id?.toString?.() || String(student._id),
            menu_id: menu._id?.toString?.() || String(menu._id),
            justified: !!justified,
            reason: safeReason || null,
          },
        });
      } catch (notificationError) {
        console.error('Absence notification error:', notificationError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Présence enregistrée.',
      data: attendance,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement de la présence.' });
  }
});

// Route pour lister les paiements
app.get('/api/payments', requireAuth, requireRole('PARENT', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { subscription_id, status } = req.query;
    const query = {};

    if (subscription_id && mongoose.Types.ObjectId.isValid(String(subscription_id))) {
      query.subscription_id = String(subscription_id);
    }

    if (status) {
      query.status = String(status).toUpperCase();
    }

    if (req.user?.role === 'PARENT') {
      query.parent_id = req.user.id;
    }

    let payments = await Payment.find(query)
      .populate('child_id', 'first_name last_name school_id')
      .populate('parent_id', 'first_name last_name email')
      .populate('subscription_id', 'status amount')
      .sort({ created_at: -1 });

    if (req.user?.role === 'SCHOOL_ADMIN') {
      const schoolId = await resolveSchoolIdForUser(req.user.id);
      payments = payments.filter((payment) => payment?.child_id?.school_id?.toString?.() === schoolId?.toString?.());
    }

    res.json({ success: true, data: payments.map(mapPaymentResponse) });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route de validation admin des paiements cash
app.put('/api/payments/:paymentId/validate', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { paymentId } = req.params;
    const normalizedStatus = String(req.body?.status || '').toUpperCase();

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, message: 'Payment ID invalide.' });
    }

    if (!['COMPLETED', 'FAILED'].includes(normalizedStatus)) {
      return res.status(400).json({ success: false, message: 'Le statut doit etre COMPLETED ou FAILED.' });
    }

    const payment = await Payment.findById(paymentId)
      .populate('child_id', 'school_id')
      .populate('subscription_id', 'status');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Paiement introuvable.' });
    }

    if (payment.method !== 'CASH') {
      return res.status(400).json({ success: false, message: 'Seuls les paiements CASH necessitent cette validation.' });
    }

    if (payment.status !== 'WAITING_ADMIN_VALIDATION') {
      return res.status(400).json({ success: false, message: 'Ce paiement n est pas en attente de validation admin.' });
    }

    if (req.user.role === 'SCHOOL_ADMIN') {
      const schoolId = await resolveSchoolIdForUser(req.user.id);
      const paymentSchoolId = payment?.child_id?.school_id?.toString?.();
      if (!schoolId || paymentSchoolId !== schoolId.toString()) {
        return res.status(403).json({ success: false, message: 'Acces non autorise a ce paiement.' });
      }
    }

    const paidAt = normalizedStatus === 'COMPLETED' ? new Date() : null;
    payment.status = normalizedStatus;
    payment.validated_by = req.user.id;
    payment.validated_at = new Date();
    payment.paid_at = paidAt;
    await payment.save();

    const subscriptionStatus = normalizedStatus === 'COMPLETED' ? 'ACTIVE' : 'PENDING_PAYMENT';
    await Subscription.findByIdAndUpdate(payment.subscription_id, {
      status: subscriptionStatus,
      payment_status: normalizedStatus,
      payment_date: paidAt,
      transaction_id: normalizedStatus === 'COMPLETED' ? payment.transaction_id : null,
      updated_at: new Date(),
    });

    res.json({
      success: true,
      message: normalizedStatus === 'COMPLETED'
        ? 'Paiement cash valide. L abonnement est actif.'
        : 'Paiement cash refuse. L abonnement reste en attente.',
      data: mapPaymentResponse(payment),
    });
  } catch (error) {
    console.error('Validate cash payment error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Notifications
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const { unread_only } = req.query;
    const filter = { user_id: req.user.id };
    if (String(unread_only).toLowerCase() === 'true') {
      filter.read = false;
    }

    const notifications = await Notification.find(filter).sort({ created_at: -1 }).limit(100);
    res.json({ success: true, data: notifications.map(mapNotificationResponse) });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user_id: req.user.id, read: false });
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Notification invalide.' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user_id: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée.' });
    }

    res.json({ success: true, data: mapNotificationResponse(notification) });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Notification invalide.' });
    }

    const deleted = await Notification.findOneAndDelete({ _id: id, user_id: req.user.id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée.' });
    }

    res.json({ success: true, message: 'Notification supprimée.' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
app.put('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ user_id: req.user.id, read: false }, { read: true });
    res.json({ success: true, message: 'Notifications marquées comme lues.' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour la présence (simulation)
app.get('/api/attendance', requireAuth, async (req, res) => {
  try {
    const attendance = [];
    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/attendance/mark', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, message: 'Présence enregistrée (simulation)' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Route pour les utilisateurs (SUPER_ADMIN)
app.get('/api/users', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const [users, parentCounts] = await Promise.all([
      User.find().select('-password').populate('school_id', 'name'),
      Child.aggregate([{ $group: { _id: '$parent_id', count: { $sum: 1 } } }]),
    ]);

    const countsMap = new Map(parentCounts.map(item => [item._id?.toString?.() || String(item._id), item.count]));

    const data = users
      .map(user => {
        const obj = user.toObject();
        const school = obj.school_id;
        const childrenCount = countsMap.get(obj._id.toString()) || 0;
        return {
          ...obj,
          school_name: school?.name || null,
          children_count: childrenCount,
        };
      });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/users', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { first_name, last_name, email, role, school_id } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const allowedRoles = ['SCHOOL_ADMIN', 'CANTEEN_MANAGER', 'PARENT'];

    if (!first_name || !last_name || !role) {
      return res.status(400).json({ success: false, message: 'first_name, last_name et role sont requis.' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role non autorise. Le SUPER_ADMIN peut creer: SCHOOL_ADMIN, CANTEEN_MANAGER, PARENT.',
      });
    }

    let resolvedSchoolId = school_id || null;
    let resolvedSchool = null;
    if (role === 'SCHOOL_ADMIN' || role === 'CANTEEN_MANAGER') {
      if (!resolvedSchoolId) {
        return res.status(400).json({ success: false, message: 'school_id est requis pour SCHOOL_ADMIN et CANTEEN_MANAGER.' });
      }
      resolvedSchool = await School.findById(resolvedSchoolId);
      if (!resolvedSchool) {
        return res.status(404).json({ success: false, message: 'Ecole non trouvee.' });
      }
    } else {
      resolvedSchoolId = null;
    }

    const sanitizePart = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '');

    const generateSchoolAdminEmail = async () => {
      const firstPart = sanitizePart(first_name) || 'admin';
      const lastPart = sanitizePart(last_name) || 'user';
      const schoolPart = sanitizePart(resolvedSchool?.name || 'school') || 'school';
      const localBase = `admin.${firstPart}.${lastPart}`;
      const domainBase = `${schoolPart}.dabali.bf`;

      for (let index = 0; index < 200; index += 1) {
        const suffix = index === 0 ? '' : `.${index + 1}`;
        const candidate = `${localBase}${suffix}@${domainBase}`;
        const existing = await User.findOne({ email: buildCaseInsensitiveEmailFilter(candidate) }).select('_id');
        if (!existing) return candidate;
      }

      const random = Math.random().toString(36).slice(2, 8);
      return `${localBase}.${random}@${domainBase}`;
    };

    let resolvedEmail = normalizedEmail;
    if (!resolvedEmail) {
      if (role !== 'SCHOOL_ADMIN') {
        return res.status(400).json({ success: false, message: 'email est requis pour ce role.' });
      }
      resolvedEmail = await generateSchoolAdminEmail();
    }

    const existingUser = await User.findOne({ email: buildCaseInsensitiveEmailFilter(resolvedEmail) });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Un utilisateur avec cet email existe deja.' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = new User({
      first_name,
      last_name,
      email: resolvedEmail,
      password: hashedPassword,
      role,
      school_id: resolvedSchoolId || undefined,
      is_temporary_password: true,
      created_by: req.user.id,
    });

    await user.save();

    if (role === 'SCHOOL_ADMIN' && resolvedSchoolId) {
      await School.findByIdAndUpdate(resolvedSchoolId, {
        admin_id: user._id,
        admin_name: `${first_name} ${last_name}`.trim(),
      });
    }

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      message: 'Utilisateur cree avec succes.',
      data: {
        user: userObj,
        temporary_password: temporaryPassword,
        email_generated: !normalizedEmail,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.put('/api/users/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id?.toString();
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouve.' });
    }

    if (req.body.phone !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'Le numero de telephone ne peut pas etre modifie par le SUPER_ADMIN.',
      });
    }

    if (req.body.password !== undefined) {
      return res.status(400).json({ success: false, message: 'Le mot de passe ne peut pas etre modifie ici.' });
    }

    const updates = {};
    const { first_name, last_name, email, role, school_id } = req.body;

    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;

    if (email !== undefined) {
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!normalizedEmail) {
        return res.status(400).json({ success: false, message: 'Email invalide.' });
      }
      const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Un autre utilisateur utilise deja cet email.' });
      }
      updates.email = normalizedEmail;
    }

    const allowedRoles = ['SCHOOL_ADMIN', 'CANTEEN_MANAGER', 'PARENT'];
    if (role !== undefined) {
      if (user.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
        return res.status(400).json({ success: false, message: 'La conversion d un SUPER_ADMIN n est pas autorisee.' });
      }
      if (role !== 'SUPER_ADMIN' && !allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Role non autorise.' });
      }
      if (requesterId && requesterId === id && role !== user.role) {
        return res.status(400).json({ success: false, message: 'Vous ne pouvez pas changer votre propre role.' });
      }
      updates.role = role;
    }

    if (school_id !== undefined) updates.school_id = school_id || undefined;

    const effectiveRole = updates.role || user.role;
    const effectiveSchoolId = updates.school_id !== undefined ? updates.school_id : user.school_id;

    if ((effectiveRole === 'SCHOOL_ADMIN' || effectiveRole === 'CANTEEN_MANAGER') && !effectiveSchoolId) {
      return res.status(400).json({ success: false, message: 'school_id est requis pour SCHOOL_ADMIN et CANTEEN_MANAGER.' });
    }

    if (effectiveRole === 'SCHOOL_ADMIN' || effectiveRole === 'CANTEEN_MANAGER') {
      const school = await School.findById(effectiveSchoolId);
      if (!school) {
        return res.status(404).json({ success: false, message: 'Ecole non trouvee.' });
      }
    }

    if (effectiveRole === 'PARENT') {
      updates.school_id = undefined;
    }

    const updated = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).populate('school_id', 'name');
    const obj = updated.toObject();
    delete obj.password;

    if (effectiveRole === 'SCHOOL_ADMIN' && effectiveSchoolId) {
      await School.findByIdAndUpdate(effectiveSchoolId, {
        admin_id: updated._id,
        admin_name: `${updated.first_name || ''} ${updated.last_name || ''}`.trim(),
      });
    } else if (user.role === 'SCHOOL_ADMIN' && effectiveRole !== 'SCHOOL_ADMIN') {
      await School.updateMany({ admin_id: user._id }, { $unset: { admin_id: 1 } });
    }

    res.json({ success: true, message: 'Utilisateur mis a jour.', data: obj });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.delete('/api/users/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id?.toString();
    if (requesterId && requesterId === id) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouve.' });
    }

    if (user.role === 'SCHOOL_ADMIN') {
      await School.updateMany({ admin_id: user._id }, { $unset: { admin_id: 1 } });
    }

    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'Utilisateur supprime.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.delete('/api/users/:id/delete', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id?.toString();
    if (requesterId && requesterId === id) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouve.' });
    }

    if (user.role === 'SCHOOL_ADMIN') {
      await School.updateMany({ admin_id: user._id }, { $unset: { admin_id: 1 } });
    }

    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'Utilisateur supprime.' });
  } catch (error) {
    console.error('Delete user fallback error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// === CANTEEN MANAGER MANAGEMENT ROUTES (start-backend.js) ===
app.post('/api/users/canteen-managers', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, school_id } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!first_name || !last_name || !normalizedEmail || !school_id) {
      return res.status(400).json({ success: false, message: 'Prénom, nom, email et école sont requis.' });
    }

    if (!isValidGmailEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Seuls les emails se terminant par @gmail.com sont autorisés pour les gestionnaires de cantine.',
      });
    }

    const school = await School.findById(school_id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'École non trouvée.' });
    }

    if (school.admin_id && school.admin_id.toString() !== req.user.id?.toString()) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Un utilisateur avec cet email existe déjà.' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const canteenManager = new User({
      first_name,
      last_name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      role: 'CANTEEN_MANAGER',
      school_id,
      is_temporary_password: true,
      created_by: req.user.id
    });

    await canteenManager.save();

    res.status(201).json({
      success: true,
      message: 'Gestionnaire de cantine créé avec succès.',
      data: {
        user: {
          id: canteenManager._id,
          first_name: canteenManager.first_name,
          last_name: canteenManager.last_name,
          email: canteenManager.email,
          phone: canteenManager.phone,
          role: canteenManager.role,
          school: school.name
        },
        temporary_password: temporaryPassword
      }
    });
  } catch (error) {
    console.error('Create canteen manager error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création du gestionnaire de cantine.' });
  }
});

app.get('/api/users/canteen-managers/school/:school_id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
  try {
    const { school_id } = req.params;
    const school = await School.findById(school_id);

    if (!school || school.admin_id?.toString() !== req.user.id?.toString()) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à cette école.' });
    }

    const managers = await User.find({ role: 'CANTEEN_MANAGER', school_id }).select('-password');

    res.json({ success: true, data: managers });
  } catch (error) {
    console.error('Get canteen managers error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des gestionnaires.' });
  }
});

app.post('/api/users/canteen-managers/:id/reset-password', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const manager = await User.findById(id);

    if (!manager || manager.role !== 'CANTEEN_MANAGER') {
      return res.status(404).json({ success: false, message: 'Gestionnaire de cantine non trouvé.' });
    }

    const school = await School.findById(manager.school_id);
    if (!school || school.admin_id?.toString() !== req.user.id?.toString()) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await User.findByIdAndUpdate(id, {
      password: hashedPassword,
      is_temporary_password: true
    });

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès.',
      data: { temporary_password: temporaryPassword }
    });
  } catch (error) {
    console.error('Reset canteen manager password error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la réinitialisation du mot de passe.' });
  }
});

app.delete('/api/users/canteen-managers/:id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const manager = await User.findById(id);

    if (!manager || manager.role !== 'CANTEEN_MANAGER') {
      return res.status(404).json({ success: false, message: 'Gestionnaire de cantine non trouvé.' });
    }

    const school = await School.findById(manager.school_id);
    if (!school || school.admin_id?.toString() !== req.user.id?.toString()) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé.' });
    }

    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'Gestionnaire de cantine supprimé avec succès.' });
  } catch (error) {
    console.error('Delete canteen manager error:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression du gestionnaire.' });
  }
});

// Route pour obtenir l'utilisateur courant
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token manquant' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    let schoolId = user.school_id ? user.school_id.toString() : null;
    let schoolName = null;
    if (schoolId) {
      const school = await School.findById(schoolId);
      schoolName = school?.name || null;
    } else if (user.role === 'SCHOOL_ADMIN') {
      const school = await School.findOne({ admin_id: user._id });
      if (school) {
        schoolId = school._id.toString();
        schoolName = school.name || null;
        await User.findByIdAndUpdate(user._id, { school_id: school._id });
      }
    }
    
    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        schoolId,
        schoolName
      }
    });
  } catch (error) {
    console.error(' Auth me error:', error);
    res.status(401).json({ success: false, message: 'Token invalide' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Démarrage
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' MongoDB connected');
    
    // Créer admin par défaut si n'existe pas
    const defaultAdminEmail = 'admin@gmail.com';
    let superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
    let createdDefaultAdmin = false;
    if (!superAdmin) {
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      const admin = new User({
        email: defaultAdminEmail,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        first_name: 'Super',
        last_name: 'Admin'
      });
      await admin.save();
      superAdmin = admin;
      createdDefaultAdmin = true;
      console.log(` Default admin created: ${defaultAdminEmail} / Admin123!`);
    }

    // Créer des écoles de test
    const schoolCount = await School.countDocuments();
    if (schoolCount === 0) {
      const schools = [
        {
          name: 'Lycée Philippe Zinda Kaboré',
          address: 'Avenue de la Liberté',
          city: 'Ouagadougou',
          admin_name: 'M. Kaboré Jean-Baptiste',
          student_count: 1248
        },
        {
          name: 'Groupe Scolaire Horizon',
          address: 'Quartier Ouaga 2000',
          city: 'Ouagadougou',
          admin_name: 'Mme Sawadogo Mariam',
          student_count: 452
        }
      ];
      
      for (const schoolData of schools) {
        const school = new School(schoolData);
        await school.save();
      }
      console.log(' Test schools created');
    }
    
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Backend server running on http://localhost:${process.env.PORT || 5000}`);
      console.log('API available at http://localhost:' + (process.env.PORT || 5000) + '/api');
      if (createdDefaultAdmin) {
        console.log(`Default admin: ${defaultAdminEmail} / Admin123!`);
      } else if (superAdmin?.email) {
        console.log(`Super admin: ${superAdmin.email}`);
      }
    });
  } catch (error) {
    console.error(' Server startup error:', error);
  }
};

startServer();



















