import { Request, Response } from 'express';
import Student from '../models/Student';
import School from '../models/School';
import User from '../models/User';
import { ApiResponse, CreateStudentDTO, UserRole } from '../types';

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
    const { first_name, last_name, class_name, school_id, parent_id, allergies }: CreateStudentDTO = req.body;

    // Validate required fields
    if (!first_name || !last_name || !school_id || !parent_id) {
      res.status(400).json({
        success: false,
        message: 'First name, last name, school ID, and parent ID are required.'
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

    // Check if parent exists
    const parent = await User.findById(parent_id);
    if (!parent) {
      res.status(404).json({
        success: false,
        message: 'Parent not found.'
      } as ApiResponse);
      return;
    }

    // Create student
    const student = new Student({
      first_name,
      last_name,
      class_name,
      school_id,
      parent_id,
      allergies: allergies || []
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
