import { Request, Response } from 'express';
import Student from '../models/Student';
import School from '../models/School';
import User from '../models/User';
import { ApiResponse, CreateStudentDTO, UserRole } from '../types';

const normalizeString = (value?: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const parseDateOnly = (value?: unknown): Date | null => {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const datePart = value.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const buildBirthDateFilter = (date: Date): { $gte: Date; $lt: Date } => ({
  $gte: date,
  $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
});

// Allows to get all students with optional filters (school, parent, class) and populated school and parent info
export const getAllStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const school_id = req.query.school_id as string;
    const parent_id = req.query.parent_id as string;
    const class_name = req.query.class_name as string;

    // Build query
    let query: any = {};
    if (school_id) query.school_id = school_id;
    if (parent_id) query.parent_id = parent_id;
    if (class_name) query.class_name = class_name;

    const students = await Student.find(query)
      .populate('school_id', 'name city')
      .populate('parent_id', 'first_name last_name phone')
      .sort({ last_name: 1, first_name: 1 });

    res.json({
      success: true,
      data: students
    } as ApiResponse);
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving students.'
    } as ApiResponse);
  }
};

// Allows to get all students for a specific parent
export const getStudentsByParent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { parentId } = req.params;
    const requesterId = req.user?.id;
    if (requesterId && requesterId !== parentId) {
      res.status(403).json({
        success: false,
        message: 'Access denied.'
      } as ApiResponse);
      return;
    }

    const students = await Student.find({ parent_id: parentId })
      .populate('school_id', 'name city')
      .sort({ last_name: 1, first_name: 1 });

    res.json({
      success: true,
      data: students
    } as ApiResponse);
  } catch (error) {
    console.error('Get students by parent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving students for parent.'
    } as ApiResponse);
  }
};

// Allows to get a student by ID with populated school and parent info
export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id)
      .populate('school_id', 'name city')
      .populate('parent_id', 'first_name last_name phone');

    if (!student) {
      res.status(404).json({
        success: false,
        message: 'Student not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: student
    } as ApiResponse);
  } catch (error) {
    console.error('Get student by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving student.'
    } as ApiResponse);
  }
};

// Allows to create a student with validation and populated response
export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { first_name, last_name, class_name, school_id, parent_id, allergies, student_code, birth_date }: CreateStudentDTO = req.body;
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    // Validate required fields
    if (!first_name || !last_name || !school_id) {
      res.status(400).json({
        success: false,
        message: 'First name, last name, and school ID are required.'
      } as ApiResponse);
      return;
    }

    // Check if school exists
    const school = await School.findById(school_id);
    if (!school) {
      res.status(404).json({
        success: false,
        message: 'School not found.'
      } as ApiResponse);
      return;
    }

    // SCHOOL_ADMIN can only create students in their own school.
    if (requesterRole === UserRole.SCHOOL_ADMIN) {
      if (school.admin_id && requesterId && school.admin_id.toString() !== requesterId.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this school.'
        } as ApiResponse);
        return;
      }
    }

    // PARENT always links the created student to their own account.
    let effectiveParentId = parent_id;
    if (requesterRole === UserRole.PARENT) {
      if (!requesterId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized.'
        } as ApiResponse);
        return;
      }
      effectiveParentId = requesterId;
    }

    // Check if parent exists
    if (effectiveParentId) {
      const parent = await User.findById(effectiveParentId);
      if (!parent || parent.role !== UserRole.PARENT) {
        res.status(404).json({
          success: false,
          message: 'Parent not found.'
        } as ApiResponse);
        return;
      }
    }

    const normalizedBirthDate = parseDateOnly(birth_date);
    if (birth_date && !normalizedBirthDate) {
      res.status(400).json({
        success: false,
        message: 'Invalid birth date format.'
      } as ApiResponse);
      return;
    }

    // Create student
    const student = new Student({
      first_name: normalizeString(first_name),
      last_name: normalizeString(last_name),
      class_name: normalizeString(class_name) || undefined,
      school_id,
      parent_id: effectiveParentId || undefined,
      allergies: allergies || [],
      student_code: normalizeString(student_code) || undefined,
      birth_date: normalizedBirthDate || undefined
    });

    await student.save();

    // Return populated student
    const populatedStudent = await Student.findById(student._id)
      .populate('school_id', 'name city')
      .populate('parent_id', 'first_name last_name phone');

    res.status(201).json({
      success: true,
      message: 'Student created successfully.',
      data: populatedStudent
    } as ApiResponse);
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating student.'
    } as ApiResponse);
  }
};

// Allows to update a student by ID
export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.created_at;

    if (updates.student_code) {
      updates.student_code = normalizeString(updates.student_code);
    }

    if (updates.birth_date) {
      const normalizedBirthDate = parseDateOnly(updates.birth_date);
      if (!normalizedBirthDate) {
        res.status(400).json({
          success: false,
          message: 'Invalid birth date format.'
        } as ApiResponse);
        return;
      }
      updates.birth_date = normalizedBirthDate;
    }

    const student = await Student.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true }
    ).populate('school_id', 'name city')
     .populate('parent_id', 'first_name last_name phone');

    if (!student) {
      res.status(404).json({
        success: false,
        message: 'Student not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Student updated successfully.',
      data: student
    } as ApiResponse);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student.'
    } as ApiResponse);
  }
};

// Allows school admin to bulk import students for their school
export const importStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const schoolAdminId = req.user?.id;
    const { school_id, students } = req.body as { school_id?: string; students?: any[] };

    if (!school_id || !Array.isArray(students) || students.length === 0) {
      res.status(400).json({
        success: false,
        message: 'School ID and a non-empty students list are required.'
      } as ApiResponse);
      return;
    }

    const school = await School.findById(school_id);
    if (!school) {
      res.status(404).json({
        success: false,
        message: 'School not found.'
      } as ApiResponse);
      return;
    }

    if (school.admin_id && schoolAdminId && school.admin_id.toString() !== schoolAdminId.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied to this school.'
      } as ApiResponse);
      return;
    }

    const errors: { index: number; reason: string }[] = [];
    const operations: any[] = [];

    students.forEach((raw, index) => {
      const first_name = normalizeString(raw.first_name ?? raw.firstName);
      const last_name = normalizeString(raw.last_name ?? raw.lastName);
      const class_name = normalizeString(raw.class_name ?? raw.className ?? raw.class);
      const student_code = normalizeString(raw.student_code ?? raw.studentCode ?? raw.matricule);
      const birth_date = parseDateOnly(raw.birth_date ?? raw.birthDate ?? raw.dateOfBirth);
      const allergies = Array.isArray(raw.allergies) ? raw.allergies : [];

      if (!first_name || !last_name) {
        errors.push({ index, reason: 'Missing first_name or last_name.' });
        return;
      }

      if (!birth_date && !student_code) {
        errors.push({ index, reason: 'Provide birth_date or student_code for identification.' });
        return;
      }

      const filter: any = { school_id };
      if (student_code) {
        filter.student_code = student_code;
      } else {
        filter.first_name = first_name;
        filter.last_name = last_name;
        if (birth_date) filter.birth_date = birth_date;
        if (class_name) filter.class_name = class_name;
      }

      operations.push({
        updateOne: {
          filter,
          update: {
            $setOnInsert: {
              first_name,
              last_name,
              class_name: class_name || undefined,
              student_code: student_code || undefined,
              birth_date: birth_date || undefined,
              school_id,
              allergies
            }
          },
          upsert: true
        }
      });
    });

    let result = null;
    if (operations.length > 0) {
      result = await Student.bulkWrite(operations, { ordered: false });
    }

    res.status(200).json({
      success: true,
      message: 'Student import completed.',
      data: {
        received: students.length,
        inserted: result?.upsertedCount || 0,
        matched: result?.matchedCount || 0,
        errors
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Import students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing students.'
    } as ApiResponse);
  }
};

// Allows a parent to claim a student if identifiers are correct
export const claimStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const parentId = req.user?.id;
    const {
      school_id,
      student_code,
      birth_date,
      first_name,
      last_name,
      class_name
    } = req.body;

    if (!parentId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized.'
      } as ApiResponse);
      return;
    }

    if (!school_id) {
      res.status(400).json({
        success: false,
        message: 'School ID is required.'
      } as ApiResponse);
      return;
    }

    const school = await School.findById(school_id);
    if (!school) {
      res.status(404).json({
        success: false,
        message: 'School not found.'
      } as ApiResponse);
      return;
    }

    const normalizedStudentCode = normalizeString(student_code);
    const normalizedBirthDate = parseDateOnly(birth_date);

    let query: any = { school_id };

    if (normalizedStudentCode) {
      query.student_code = normalizedStudentCode;
      if (normalizedBirthDate) {
        query.birth_date = buildBirthDateFilter(normalizedBirthDate);
      }
    } else {
      const normalizedFirstName = normalizeString(first_name);
      const normalizedLastName = normalizeString(last_name);
      const normalizedClassName = normalizeString(class_name);

      if (!normalizedFirstName || !normalizedLastName || !normalizedBirthDate) {
        res.status(400).json({
          success: false,
          message: 'Provide student_code or first_name, last_name, and birth_date.'
        } as ApiResponse);
        return;
      }

      query.first_name = normalizedFirstName;
      query.last_name = normalizedLastName;
      query.birth_date = buildBirthDateFilter(normalizedBirthDate);
      if (normalizedClassName) query.class_name = normalizedClassName;
    }

    const student = await Student.findOne(query);

    if (!student) {
      res.status(400).json({
        success: false,
        message: 'Identifiants incorrects.'
      } as ApiResponse);
      return;
    }

    if (student.parent_id) {
      if (student.parent_id.toString() === parentId) {
        res.status(200).json({
          success: true,
          message: 'Enfant déjà associé.',
          data: student
        } as ApiResponse);
        return;
      }

      res.status(409).json({
        success: false,
        message: 'Cet enfant est déjà associé à un autre parent.'
      } as ApiResponse);
      return;
    }

    student.parent_id = parentId as any;
    student.claimed_at = new Date();
    await student.save();

    const populatedStudent = await Student.findById(student._id)
      .populate('school_id', 'name city')
      .populate('parent_id', 'first_name last_name phone');

    res.status(200).json({
      success: true,
      message: 'Enfant ajouté avec succès.',
      data: populatedStudent
    } as ApiResponse);
  } catch (error) {
    console.error('Claim student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error claiming student.'
    } as ApiResponse);
  }
};

// Allows to delete a student by ID
export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const student = await Student.findByIdAndDelete(id);

    if (!student) {
      res.status(404).json({
        success: false,
        message: 'Student not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Student deleted successfully.',
      data: student
    } as ApiResponse);
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student.'
    } as ApiResponse);
  }
};
