"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSchool = exports.updateSchool = exports.createSchool = exports.getSchoolById = exports.getAllSchools = void 0;
const School_1 = __importDefault(require("../models/School"));
const User_1 = __importDefault(require("../models/User"));
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
        const { name, address, city, admin_id } = req.body;
        // Validate required fields
        if (!name) {
            res.status(400).json({
                success: false,
                message: 'School name is required.'
            });
            return;
        }
        // Check if admin exists
        if (admin_id) {
            const admin = await User_1.default.findById(admin_id);
            if (!admin) {
                res.status(404).json({
                    success: false,
                    message: 'Admin user not found.'
                });
                return;
            }
        }
        // Create school
        const school = new School_1.default({
            name,
            address,
            city,
            admin_id
        });
        await school.save();
        // Return populated school
        const populatedSchool = await School_1.default.findById(school._id)
            .populate('admin_id', 'first_name last_name email');
        res.status(201).json({
            success: true,
            message: 'School created successfully.',
            data: populatedSchool
        });
    }
    catch (error) {
        console.error('Create school error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating school.'
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
