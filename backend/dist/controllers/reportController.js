"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionReports = exports.getAttendanceReports = exports.getPaymentReports = exports.getDashboardStats = void 0;
const Student_1 = __importDefault(require("../models/Student"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Attendance_1 = __importDefault(require("../models/Attendance"));
const Subscription_1 = __importDefault(require("../models/Subscription"));
// Allows to get dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        const school_id = req.query.school_id;
        // Build base queries
        let studentQuery = {};
        let paymentQuery = {};
        let attendanceQuery = {};
        let subscriptionQuery = {};
        if (school_id) {
            studentQuery.school_id = school_id;
            // For payments, we need to join through subscriptions
            const subscriptions = await Subscription_1.default.find({ school_id });
            const subscriptionIds = subscriptions.map(s => s._id);
            paymentQuery.subscription_id = { $in: subscriptionIds };
            // For attendance, we need to join through students
            const students = await Student_1.default.find({ school_id });
            const studentIds = students.map(s => s._id);
            attendanceQuery.student_id = { $in: studentIds };
            subscriptionQuery.student_id = { $in: studentIds };
        }
        // Get statistics
        const [totalStudents, totalPayments, totalAttendance, activeSubscriptions, todayAttendance, monthlyPayments] = await Promise.all([
            Student_1.default.countDocuments(studentQuery),
            Payment_1.default.countDocuments(paymentQuery),
            Attendance_1.default.countDocuments(attendanceQuery),
            Subscription_1.default.countDocuments({ ...subscriptionQuery, status: 'ACTIVE' }),
            // Today's attendance
            Attendance_1.default.countDocuments({
                ...attendanceQuery,
                date: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date().setHours(23, 59, 59, 999))
                }
            }),
            // Monthly payments
            Payment_1.default.find({
                ...paymentQuery,
                created_at: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    $lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
                }
            })
        ]);
        // Calculate monthly total
        const monthlyTotal = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);
        res.json({
            success: true,
            data: {
                totalStudents,
                totalPayments,
                totalAttendance,
                activeSubscriptions,
                todayAttendance,
                monthlyPayments: monthlyPayments.length,
                monthlyTotal,
                lastUpdated: new Date()
            }
        });
    }
    catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving dashboard statistics.'
        });
    }
};
exports.getDashboardStats = getDashboardStats;
// Allows to get payment reports
const getPaymentReports = async (req, res) => {
    try {
        const school_id = req.query.school_id;
        const start_date = req.query.start_date;
        const end_date = req.query.end_date;
        // Build query
        let query = {};
        if (start_date && end_date) {
            query.created_at = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            };
        }
        // If school_id is provided, we need to get payments through subscriptions
        if (school_id) {
            const subscriptions = await Subscription_1.default.find({ school_id });
            const subscriptionIds = subscriptions.map(s => s._id);
            query.subscription_id = { $in: subscriptionIds };
        }
        const payments = await Payment_1.default.find(query)
            .populate({
            path: 'subscription_id',
            populate: {
                path: 'student_id',
                match: school_id ? { school_id } : undefined
            }
        })
            .populate('parent_id', 'first_name last_name email')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            data: payments
        });
    }
    catch (error) {
        console.error('Get payment reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving payment reports.'
        });
    }
};
exports.getPaymentReports = getPaymentReports;
// Allows to get attendance reports
const getAttendanceReports = async (req, res) => {
    try {
        const school_id = req.query.school_id;
        const start_date = req.query.start_date;
        const end_date = req.query.end_date;
        const student_id = req.query.student_id;
        // Build query
        let query = {};
        if (start_date && end_date) {
            query.date = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            };
        }
        if (student_id) {
            query.student_id = student_id;
        }
        // If school_id is provided, we need to get attendance through students
        if (school_id) {
            const students = await Student_1.default.find({ school_id });
            const studentIds = students.map(s => s._id);
            query.student_id = query.student_id
                ? { ...query.student_id, $in: studentIds }
                : { $in: studentIds };
        }
        const attendance = await Attendance_1.default.find(query)
            .populate('student_id', 'first_name last_name class_name')
            .populate('menu_id', 'date meal_type description')
            .sort({ date: -1 });
        res.json({
            success: true,
            data: attendance
        });
    }
    catch (error) {
        console.error('Get attendance reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving attendance reports.'
        });
    }
};
exports.getAttendanceReports = getAttendanceReports;
// Allows to get subscription reports
const getSubscriptionReports = async (req, res) => {
    try {
        const school_id = req.query.school_id;
        const status = req.query.status;
        // Build query
        let query = {};
        if (status) {
            query.status = status;
        }
        // If school_id is provided, we need to get subscriptions through students
        if (school_id) {
            const students = await Student_1.default.find({ school_id });
            const studentIds = students.map(s => s._id);
            query.student_id = { $in: studentIds };
        }
        const subscriptions = await Subscription_1.default.find(query)
            .populate('student_id', 'first_name last_name class_name')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            data: subscriptions
        });
    }
    catch (error) {
        console.error('Get subscription reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving subscription reports.'
        });
    }
};
exports.getSubscriptionReports = getSubscriptionReports;
