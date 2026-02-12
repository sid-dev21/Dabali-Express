"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStudent = exports.updateStudent = exports.createStudent = exports.getStudentById = exports.getStudentsByParent = exports.getAllStudents = void 0;
const Student_1 = __importDefault(require("../models/Student"));
const School_1 = __importDefault(require("../models/School"));
const User_1 = __importDefault(require("../models/User"));
const Subscription_1 = __importDefault(require("../models/Subscription"));
const types_1 = require("../types");
// Allows to get all students with optional filters (school, parent, class) and populated school and parent info
const getAllStudents = async (req, res) => {
    try {
        const school_id = req.query.school_id;
        const parent_id = req.query.parent_id;
        const class_name = req.query.class_name;
        // Build query
        let query = {};
        if (school_id)
            query.school_id = school_id;
        if (parent_id)
            query.parent_id = parent_id;
        if (class_name)
            query.class_name = class_name;
        const students = await Student_1.default.find(query)
            .populate('school_id', 'name city')
            .populate('parent_id', 'first_name last_name phone')
            .sort({ last_name: 1, first_name: 1 });
        res.json({
            success: true,
            data: students
        });
    }
    catch (error) {
        console.error('Get all students error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving students.'
        });
    }
};
exports.getAllStudents = getAllStudents;
// Allows to get all students for a specific parent
const getStudentsByParent = async (req, res) => {
    try {
        const { parentId } = req.params;
        const students = await Student_1.default.find({ parent_id: parentId })
            .populate('school_id', 'name city')
            .sort({ last_name: 1, first_name: 1 });
        const studentIds = students.map((student) => student._id);
        const activeSubscriptions = await Subscription_1.default.find({
            student_id: { $in: studentIds },
            status: 'ACTIVE',
        })
            .sort({ createdAt: -1 })
            .lean();
        const activeByStudentId = new Map();
        for (const sub of activeSubscriptions) {
            const studentId = sub.student_id?.toString();
            if (studentId && !activeByStudentId.has(studentId)) {
                activeByStudentId.set(studentId, {
                    id: sub._id.toString(),
                    meal_plan: sub.meal_plan,
                    status: sub.status,
                    end_date: sub.end_date,
                    price: sub.price,
                });
            }
        }
        const hydratedStudents = students.map((student) => {
            const raw = student.toObject();
            return {
                ...raw,
                active_subscription: activeByStudentId.get(student._id.toString()) ?? null,
            };
        });
        res.json({
            success: true,
            data: hydratedStudents
        });
    }
    catch (error) {
        console.error('Get students by parent error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving students for parent.'
        });
    }
};
exports.getStudentsByParent = getStudentsByParent;
// Allows to get a student by ID with populated school and parent info
const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student_1.default.findById(id)
            .populate('school_id', 'name city')
            .populate('parent_id', 'first_name last_name phone');
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
            return;
        }
        res.json({
            success: true,
            data: student
        });
    }
    catch (error) {
        console.error('Get student by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving student.'
        });
    }
};
exports.getStudentById = getStudentById;
// Allows to create a student with validation and populated response
const createStudent = async (req, res) => {
    try {
        const { first_name, last_name, class_name, school_id, parent_id, allergies } = req.body;
        const resolvedParentId = req.user?.role === types_1.UserRole.PARENT ? req.user.id : parent_id;
        // Validate required fields
        if (!first_name || !last_name || !school_id || !resolvedParentId) {
            res.status(400).json({
                success: false,
                message: 'First name, last name, school ID, and parent ID are required.'
            });
            return;
        }
        // Check if school exists
        const school = await School_1.default.findById(school_id);
        if (!school) {
            res.status(404).json({
                success: false,
                message: 'School not found.'
            });
            return;
        }
        // Check if parent exists
        const parent = await User_1.default.findById(resolvedParentId);
        if (!parent) {
            res.status(404).json({
                success: false,
                message: 'Parent not found.'
            });
            return;
        }
        // Create student
        const student = new Student_1.default({
            first_name,
            last_name,
            class_name,
            school_id,
            parent_id: resolvedParentId,
            allergies: allergies || []
        });
        await student.save();
        // Return populated student
        const populatedStudent = await Student_1.default.findById(student._id)
            .populate('school_id', 'name city')
            .populate('parent_id', 'first_name last_name phone');
        res.status(201).json({
            success: true,
            message: 'Student created successfully.',
            data: populatedStudent
        });
    }
    catch (error) {
        console.error('Create student error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating student.'
        });
    }
};
exports.createStudent = createStudent;
// Allows to update a student by ID
const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Remove fields that shouldn't be updated
        delete updates._id;
        delete updates.created_at;
        const student = await Student_1.default.findByIdAndUpdate(id, { ...updates, updated_at: new Date() }, { new: true, runValidators: true }).populate('school_id', 'name city')
            .populate('parent_id', 'first_name last_name phone');
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Student updated successfully.',
            data: student
        });
    }
    catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating student.'
        });
    }
};
exports.updateStudent = updateStudent;
// Allows to delete a student by ID
const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student_1.default.findByIdAndDelete(id);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Student deleted successfully.',
            data: student
        });
    }
    catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting student.'
        });
    }
};
exports.deleteStudent = deleteStudent;
