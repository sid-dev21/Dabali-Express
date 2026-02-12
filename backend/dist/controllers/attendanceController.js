"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceByStudent = exports.markAttendance = exports.getAttendance = void 0;
const Attendance_1 = __importDefault(require("../models/Attendance"));
const Student_1 = __importDefault(require("../models/Student"));
const Menu_1 = __importDefault(require("../models/Menu"));
const Notification_1 = __importDefault(require("../models/Notification"));
const types_1 = require("../types");
// Allows to get attendance records with optional filters (student, date, school) and populated student and menu info
const getAttendance = async (req, res) => {
    try {
        const student_id = req.query.student_id;
        const date = req.query.date;
        const school_id = req.query.school_id;
        // Build query
        let query = {};
        if (student_id)
            query.student_id = student_id;
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        }
        // Get attendance with populated data
        let attendanceQuery = Attendance_1.default.find(query)
            .populate('student_id', 'first_name last_name school_id')
            .populate('menu_id', 'date meal_type description')
            .sort({ date: -1 });
        const attendance = await attendanceQuery;
        // Filter by school_id if provided
        let filteredAttendance = attendance;
        if (school_id) {
            filteredAttendance = attendance.filter((a) => a.student_id && a.student_id.school_id &&
                a.student_id.school_id.toString() === school_id);
        }
        res.json({
            success: true,
            data: filteredAttendance
        });
    }
    catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving attendance records.'
        });
    }
};
exports.getAttendance = getAttendance;
// Allows to mark attendance for a student for a specific menu and create a notification for the parent
const markAttendance = async (req, res) => {
    try {
        const { student_id, menu_id, present, justified, reason } = req.body;
        // Validate required fields
        if (!student_id || !menu_id || present === undefined) {
            res.status(400).json({
                success: false,
                message: 'Student ID, Menu ID, and presence status are required.'
            });
            return;
        }
        // Check if attendance already exists
        const existingAttendance = await Attendance_1.default.findOne({
            student_id,
            menu_id
        });
        if (existingAttendance) {
            res.status(400).json({
                success: false,
                message: 'Attendance already marked for this student and menu.'
            });
            return;
        }
        // Get student and menu information
        const student = await Student_1.default.findById(student_id).populate('parent_id');
        const menu = await Menu_1.default.findById(menu_id);
        if (!student || !menu) {
            res.status(404).json({
                success: false,
                message: 'Student or menu not found.'
            });
            return;
        }
        // Create attendance record
        const attendance = new Attendance_1.default({
            student_id,
            menu_id,
            date: new Date(),
            present,
            justified: justified || false,
            reason: reason || null,
            marked_by: req.user?.id
        });
        await attendance.save();
        // Create notification for parent
        if (student.parent_id) {
            const notificationTitle = present ? 'Repas Pris' : 'Repas Manqué';
            const notificationMessage = present
                ? `${student.first_name} ${student.last_name} a pris son repas (${menu.meal_type}) aujourd'hui. Menu: ${menu.description || 'Non spécifié'}`
                : `${student.first_name} ${student.last_name} n'a pas pris son repas (${menu.meal_type}) aujourd'hui.${justified && reason ? ` Motif: ${reason}` : ''}`;
            const notification = new Notification_1.default({
                user_id: student.parent_id._id,
                title: notificationTitle,
                message: notificationMessage,
                type: present ? types_1.NotificationType.MEAL_TAKEN : types_1.NotificationType.MEAL_MISSED,
                related_student_id: student_id,
                related_menu_id: menu_id
            });
            await notification.save();
        }
        res.status(201).json({
            success: true,
            message: 'Attendance marked successfully.',
            data: attendance
        });
    }
    catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking attendance.'
        });
    }
};
exports.markAttendance = markAttendance;
// Allows to get attendance records for a specific student with optional date range and populated menu info
const getAttendanceByStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { startDate, endDate } = req.query;
        let query = { student_id: studentId };
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        const attendance = await Attendance_1.default.find(query)
            .populate('menu_id', 'date meal_type description')
            .sort({ date: -1 });
        res.json({
            success: true,
            data: attendance
        });
    }
    catch (error) {
        console.error('Get attendance by student error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving student attendance.'
        });
    }
};
exports.getAttendanceByStudent = getAttendanceByStudent;
