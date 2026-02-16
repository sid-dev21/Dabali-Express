import { Request, Response } from 'express';
import School from '../models/School';
import User from '../models/User';
import { ApiResponse, CreateSchoolDTO, UserRole } from '../types';
import { hashPassword } from '../utils/hashPassword';

// Public: list schools for registration dropdown (no auth)
export const getPublicSchools = async (_req: Request, res: Response): Promise<void> => {
  try {
    const schools = await School.find()
      .select('name address city')
      .sort({ name: 1 });

    const data = schools.map((school) => ({
      id: school._id.toString(),
      name: school.name,
      address: school.address,
      city: school.city,
    }));

    res.json({
      success: true,
      data,
    } as ApiResponse);
  } catch (error) {
    console.error('Get public schools error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving schools.'
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
    const { name, address, city, admin_id, adminName, createWithAdmin, adminFirstName, adminLastName, adminPhone }: CreateSchoolDTO & { adminName?: string, createWithAdmin?: boolean, adminFirstName?: string, adminLastName?: string, adminPhone?: string } = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'School name is required.'
      } as ApiResponse);
      return;
    }

    // Check if admin exists (if admin_id is provided)
    if (admin_id) {
      const admin = await User.findById(admin_id);
      if (!admin) {
        res.status(404).json({
          success: false,
          message: 'Admin user not found.'
        } as ApiResponse);
        return;
      }
      
      // Update the admin's school_id
      await User.findByIdAndUpdate(admin_id, { 
        school_id: null // Will be set after school creation
      });
    }

    // Create school
    const school = new School({
      name,
      address,
      city,
      admin_id
    });

    await school.save();

    // If admin_id provided, update the admin's school_id
    if (admin_id) {
      await User.findByIdAndUpdate(admin_id, { 
        school_id: school._id 
      });
    }

    // If createWithAdmin is true, create a School Admin
    let credentials = null;
    if (createWithAdmin && adminFirstName && adminLastName) {
      // Generate automatic email
      const generateEmail = (firstName: string, lastName: string, schoolName: string): string => {
        const cleanFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const cleanLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
        const cleanSchoolName = schoolName.toLowerCase().replace(/[^a-z]/g, '').replace(/\s+/g, '');
        return `admin.${cleanFirstName}.${cleanLastName}@${cleanSchoolName}.dabali.bf`;
      };

      // Generate automatic temporary password
      const generatePassword = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };

      const adminEmail = generateEmail(adminFirstName, adminLastName, name);
      const adminPassword = generatePassword();

      // Check if generated email already exists
      const existingAdmin = await User.findOne({ email: adminEmail });
      if (existingAdmin) {
        // Delete the school we just created
        await School.findByIdAndDelete(school._id);
        res.status(409).json({
          success: false,
          message: 'Generated email already exists. Please try different names.',
        } as ApiResponse);
        return;
      }

      // Hash admin password
      const hashedPassword = await hashPassword(adminPassword);

      // Create school admin
      const admin = new User({
        email: adminEmail,
        password: hashedPassword,
        role: UserRole.SCHOOL_ADMIN,
        first_name: adminFirstName,
        last_name: adminLastName,
        phone: adminPhone || null,
        school_id: school._id
      });

      await admin.save();

      // Update school with admin_id
      school.admin_id = admin._id;
      await school.save();

      credentials = {
        email: adminEmail,
        temporaryPassword: adminPassword,
        message: 'Please save these credentials and give them to the school admin. The admin should change the password after first login.'
      };
    }

    // Return populated school
    const populatedSchool = await School.findById(school._id)
      .populate('admin_id', 'first_name last_name email');

    res.status(201).json({
      success: true,
      message: createWithAdmin ? 'School and admin created successfully.' : 'School created successfully.',
      data: {
        school: populatedSchool,
        credentials: credentials
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating school.',
    } as ApiResponse);
  }
};

// Allows to update a school by ID
export const updateSchool = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

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
