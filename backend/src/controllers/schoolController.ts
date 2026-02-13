import { Request, Response } from 'express';
import School from '../models/School';
import User from '../models/User';
import { ApiResponse, CreateSchoolDTO } from '../types';

// Public school directory for login dropdown
export const getPublicSchools = async (req: Request, res: Response): Promise<void> => {
  try {
    const schools = await School.find()
      .select('_id name city')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: schools,
    } as ApiResponse);
  } catch (error) {
    console.error('Get public schools error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving schools directory.',
    } as ApiResponse);
  }
};

// Allows to get all schools with populated admin info
export const getAllSchools = async (req: Request, res: Response): Promise<void> => {
  try {
    const schools = await School.find()
      .populate('admin_id', 'first_name last_name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: schools
    } as ApiResponse);
  } catch (error) {
    console.error('Get all schools error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving schools.'
    } as ApiResponse);
  }
};

// Allows to get a school by ID with populated admin info
export const getSchoolById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const school = await School.findById(id)
      .populate('admin_id', 'first_name last_name email');

    if (!school) {
      res.status(404).json({
        success: false,
        message: 'School not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: school
    } as ApiResponse);
  } catch (error) {
    console.error('Get school by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving school.'
    } as ApiResponse);
  }
};

// Allows to create a school with optional admin assignment
export const createSchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, address, city, admin_id }: CreateSchoolDTO = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'School name is required.'
      } as ApiResponse);
      return;
    }

    // Check if admin exists
    if (admin_id) {
      const admin = await User.findById(admin_id);
      if (!admin) {
        res.status(404).json({
          success: false,
          message: 'Admin user not found.'
        } as ApiResponse);
        return;
      }
    }

    // Create school
    const school = new School({
      name,
      address,
      city,
      admin_id
    });

    await school.save();

    // Keep user-school link in sync for SCHOOL_ADMIN.
    if (admin_id) {
      await User.findByIdAndUpdate(admin_id, { school_id: school._id });
    }

    // Return populated school
    const populatedSchool = await School.findById(school._id)
      .populate('admin_id', 'first_name last_name email');

    res.status(201).json({
      success: true,
      message: 'School created successfully.',
      data: populatedSchool
    } as ApiResponse);
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating school.'
    } as ApiResponse);
  }
};

// Allows to update a school by ID
export const updateSchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const previousSchool = await School.findById(id).select('admin_id');

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.created_at;

    // Check if admin exists
    if (updates.admin_id) {
      const admin = await User.findById(updates.admin_id);
      if (!admin) {
        res.status(404).json({
          success: false,
          message: 'Admin user not found.'
        } as ApiResponse);
        return;
      }
    }

    const school = await School.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true }
    ).populate('admin_id', 'first_name last_name email');

    if (!school) {
      res.status(404).json({
        success: false,
        message: 'School not found.'
      } as ApiResponse);
      return;
    }

    // Keep user-school link in sync if admin assignment changed.
    if (updates.admin_id) {
      const newAdminId = updates.admin_id.toString();
      const oldAdminId = previousSchool?.admin_id?.toString();
      if (oldAdminId && oldAdminId !== newAdminId) {
        await User.findByIdAndUpdate(oldAdminId, { $unset: { school_id: '' } });
      }
      await User.findByIdAndUpdate(newAdminId, { school_id: id });
    }

    res.json({
      success: true,
      message: 'School updated successfully.',
      data: school
    } as ApiResponse);
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating school.'
    } as ApiResponse);
  }
};

// Allows to delete a school by ID
export const deleteSchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const school = await School.findByIdAndDelete(id);

    if (!school) {
      res.status(404).json({
        success: false,
        message: 'School not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'School deleted successfully.',
      data: school
    } as ApiResponse);
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting school.'
    } as ApiResponse);
  }
};
