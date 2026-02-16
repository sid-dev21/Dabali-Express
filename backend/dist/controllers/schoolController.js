"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSchool = exports.updateSchool = exports.createSchool = exports.getSchoolById = exports.getAllSchools = exports.getPublicSchools = void 0;
const School_1 = __importDefault(require("../models/School"));
const User_1 = __importDefault(require("../models/User"));
const types_1 = require("../types");
const hashPassword_1 = require("../utils/hashPassword");
// Public: list schools for registration dropdown (no auth)
const getPublicSchools = async (_req, res) => {
    try {
        const schools = await School_1.default.find()
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
        });
    }
    catch (error) {
        console.error('Get public schools error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving schools.'
        });
    }
};
exports.getPublicSchools = getPublicSchools;
// Allows to get all schools with populated admin info
const getAllSchools = async (req, res) => {
    try {
        const schools = await School_1.default.find()
            .populate('admin_id', 'first_name last_name email')
            .sort({ name: 1 });
        res.json({
            success: true,
            data: schools
        });
    }
    catch (error) {
        console.error('Get all schools error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving schools.'
        });
    }
};
exports.getAllSchools = getAllSchools;
// Allows to get a school by ID with populated admin info
const getSchoolById = async (req, res) => {
    try {
        const { id } = req.params;
        const school = await School_1.default.findById(id)
            .populate('admin_id', 'first_name last_name email');
        if (!school) {
            res.status(404).json({
                success: false,
                message: 'School not found.'
            });
            return;
        }
        res.json({
            success: true,
            data: school
        });
    }
    catch (error) {
        console.error('Get school by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving school.'
        });
    }
};
exports.getSchoolById = getSchoolById;
// Allows to create a school with optional admin assignment
const createSchool = async (req, res) => {
    try {
        const { name, address, city, admin_id, adminName, createWithAdmin, adminFirstName, adminLastName, adminPhone } = req.body;
        // Validate required fields
        if (!name) {
            res.status(400).json({
                success: false,
                message: 'School name is required.'
            });
            return;
        }
        // Check if admin exists (if admin_id is provided)
        if (admin_id) {
            const admin = await User_1.default.findById(admin_id);
            if (!admin) {
                res.status(404).json({
                    success: false,
                    message: 'Admin user not found.'
                });
                return;
            }
            // Update the admin's school_id
            await User_1.default.findByIdAndUpdate(admin_id, {
                school_id: null // Will be set after school creation
            });
        }
        // Create school
        const school = new School_1.default({
            name,
            address,
            city,
            admin_id
        });
        await school.save();
        // If admin_id provided, update the admin's school_id
        if (admin_id) {
            await User_1.default.findByIdAndUpdate(admin_id, {
                school_id: school._id
            });
        }
        // If createWithAdmin is true, create a School Admin
        let credentials = null;
        if (createWithAdmin && adminFirstName && adminLastName) {
            // Generate automatic email
            const generateEmail = (firstName, lastName, schoolName) => {
                const cleanFirstName = firstName.toLowerCase().replace(/[^a-z]/g, '');
                const cleanLastName = lastName.toLowerCase().replace(/[^a-z]/g, '');
                const cleanSchoolName = schoolName.toLowerCase().replace(/[^a-z]/g, '').replace(/\s+/g, '');
                return `admin.${cleanFirstName}.${cleanLastName}@${cleanSchoolName}.dabali.bf`;
            };
            // Generate automatic temporary password
            const generatePassword = () => {
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
            const existingAdmin = await User_1.default.findOne({ email: adminEmail });
            if (existingAdmin) {
                // Delete the school we just created
                await School_1.default.findByIdAndDelete(school._id);
                res.status(409).json({
                    success: false,
                    message: 'Generated email already exists. Please try different names.',
                });
                return;
            }
            // Hash admin password
            const hashedPassword = await (0, hashPassword_1.hashPassword)(adminPassword);
            // Create school admin
            const admin = new User_1.default({
                email: adminEmail,
                password: hashedPassword,
                role: types_1.UserRole.SCHOOL_ADMIN,
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
        const populatedSchool = await School_1.default.findById(school._id)
            .populate('admin_id', 'first_name last_name email');
        res.status(201).json({
            success: true,
            message: createWithAdmin ? 'School and admin created successfully.' : 'School created successfully.',
            data: {
                school: populatedSchool,
                credentials: credentials
            },
        });
    }
    catch (error) {
        console.error('Create school error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating school.',
        });
    }
};
exports.createSchool = createSchool;
// Allows to update a school by ID
const updateSchool = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Remove fields that shouldn't be updated
        delete updates._id;
        delete updates.created_at;
        // Check if admin exists
        if (updates.admin_id) {
            const admin = await User_1.default.findById(updates.admin_id);
            if (!admin) {
                res.status(404).json({
                    success: false,
                    message: 'Admin user not found.'
                });
                return;
            }
        }
        const school = await School_1.default.findByIdAndUpdate(id, { ...updates, updated_at: new Date() }, { new: true, runValidators: true }).populate('admin_id', 'first_name last_name email');
        if (!school) {
            res.status(404).json({
                success: false,
                message: 'School not found.'
            });
            return;
        }
        res.json({
            success: true,
            message: 'School updated successfully.',
            data: school
        });
    }
    catch (error) {
        console.error('Update school error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating school.'
        });
    }
};
exports.updateSchool = updateSchool;
// Allows to delete a school by ID
const deleteSchool = async (req, res) => {
    try {
        const { id } = req.params;
        const school = await School_1.default.findByIdAndDelete(id);
        if (!school) {
            res.status(404).json({
                success: false,
                message: 'School not found.'
            });
            return;
        }
        res.json({
            success: true,
            message: 'School deleted successfully.',
            data: school
        });
    }
    catch (error) {
        console.error('Delete school error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting school.'
        });
    }
};
exports.deleteSchool = deleteSchool;
