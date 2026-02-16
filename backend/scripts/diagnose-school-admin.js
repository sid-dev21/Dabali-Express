const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dabali-express';

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  first_name: String,
  last_name: String,
  school_id: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const schoolSchema = new mongoose.Schema({
  name: String,
  admin_id: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const School = mongoose.model('School', schoolSchema);

const printMapping = async (user) => {
  const bySchoolId = user.school_id ? await School.findById(user.school_id) : null;
  const byAdminId = await School.findOne({ admin_id: user._id });

  const userLabel = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  console.log('---');
  console.log('User:', userLabel);
  console.log('Email:', user.email);
  console.log('Role:', user.role);
  console.log('User.school_id:', user.school_id ? user.school_id.toString() : 'null');
  console.log('School by user.school_id:', bySchoolId ? `${bySchoolId._id.toString()} | ${bySchoolId.name}` : 'null');
  console.log('School by admin_id:', byAdminId ? `${byAdminId._id.toString()} | ${byAdminId.name}` : 'null');

  if (bySchoolId && byAdminId && bySchoolId._id.toString() !== byAdminId._id.toString()) {
    console.log('⚠ MISMATCH: user.school_id != school.admin_id mapping');
  }
};

async function main() {
  const email = process.argv[2];
  await mongoose.connect(MONGODB_URI);

  if (email) {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('No user found for email:', email);
    } else {
      await printMapping(user);
    }
  } else {
    const admins = await User.find({ role: 'SCHOOL_ADMIN' });
    if (!admins.length) {
      console.log('No SCHOOL_ADMIN users found.');
    }
    for (const admin of admins) {
      await printMapping(admin);
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Diagnostic error:', err.message);
  process.exit(1);
});
