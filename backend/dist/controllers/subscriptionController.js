"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubscription = exports.updateSubscriptionStatus = exports.getSubscriptionsByStudent = exports.updateSubscription = exports.createSubscription = exports.getSubscriptionById = exports.getAllSubscriptions = void 0;
const Subscription_1 = __importDefault(require("../models/Subscription"));
const Student_1 = __importDefault(require("../models/Student"));
const Payment_1 = __importDefault(require("../models/Payment"));
const types_1 = require("../types");
// Allows to get all subscriptions with optional filters (student, status) and populated student info
const getAllSubscriptions = async (req, res) => {
    try {
        const student_id = req.query.student_id;
        const school_id = req.query.school_id;
        const status = req.query.status;
        // Build query
        let query = {};
        if (status)
            query.status = status;
        if (student_id) {
            query.$or = [{ student_id }, { child_id: student_id }];
        }
        if (school_id) {
            const schoolStudentIds = await Student_1.default.find({ school_id }).distinct('_id');
            const schoolFilter = {
                $or: [
                    { student_id: { $in: schoolStudentIds } },
                    { child_id: { $in: schoolStudentIds } }
                ]
            };
            if (query.$or) {
                query = { $and: [{ $or: query.$or }, schoolFilter] };
            }
            else {
                query = { ...query, ...schoolFilter };
            }
        }
        const subscriptions = await Subscription_1.default.find(query)
            .populate('student_id', 'first_name last_name class_name')
            .sort({ created_at: -1 });
        const rawSubscriptions = subscriptions.map((subscription) => typeof subscription?.toObject === 'function' ? subscription.toObject() : subscription);
        const childIds = rawSubscriptions
            .map((subscription) => {
            const populatedStudent = subscription?.student_id;
            if (populatedStudent && typeof populatedStudent === 'object') {
                const populatedId = populatedStudent._id || populatedStudent.id;
                if (populatedId)
                    return populatedId.toString();
            }
            const legacyId = subscription?.child_id || subscription?.student_id;
            if (!legacyId)
                return '';
            if (typeof legacyId === 'string')
                return legacyId;
            if (typeof legacyId === 'object')
                return (legacyId._id || legacyId.id || '').toString();
            return String(legacyId);
        })
            .filter(Boolean);
        const children = childIds.length > 0
            ? await Student_1.default.find({ _id: { $in: childIds } }).select('first_name last_name class_name school_id').lean()
            : [];
        const childById = new Map();
        children.forEach((child) => {
            childById.set(String(child._id), child);
        });
        const normalizedSubscriptions = rawSubscriptions.map((subscription) => {
            const populatedStudent = subscription?.student_id && typeof subscription.student_id === 'object'
                ? subscription.student_id
                : null;
            const fallbackIdRaw = subscription?.child_id || subscription?.student_id || '';
            const fallbackId = typeof fallbackIdRaw === 'object'
                ? (fallbackIdRaw._id || fallbackIdRaw.id || '').toString()
                : String(fallbackIdRaw || '');
            const childId = (populatedStudent?._id || populatedStudent?.id || fallbackId || '').toString();
            const child = populatedStudent || childById.get(childId) || null;
            return {
                ...subscription,
                child,
                childId,
                startDate: subscription.startDate || subscription.start_date || '',
                endDate: subscription.endDate || subscription.end_date || '',
            };
        });
        res.json({
            success: true,
            data: normalizedSubscriptions
        });
    }
    catch (error) {
        console.error('Get all subscriptions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving subscriptions.'
        });
    }
};
exports.getAllSubscriptions = getAllSubscriptions;
// Allows to get a subscription by ID with populated student info
const getSubscriptionById = async (req, res) => {
    try {
        const { id } = req.params;
        const subscription = await Subscription_1.default.findById(id)
            .populate('student_id', 'first_name last_name class_name');
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: 'Subscription not found.'
            });
            return;
        }
        res.json({
            success: true,
            data: subscription
        });
    }
    catch (error) {
        console.error('Get subscription by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving subscription.'
        });
    }
};
exports.getSubscriptionById = getSubscriptionById;
// Allows to create a subscription with validation and populated response
const createSubscription = async (req, res) => {
    try {
        const { student_id, start_date, end_date, meal_plan, price } = req.body;
        // Validate required fields
        if (!student_id || !start_date || !end_date || !price) {
            res.status(400).json({
                success: false,
                message: 'Student ID, start date, end date, and price are required.'
            });
            return;
        }
        // Check if student exists
        const student = await Student_1.default.findById(student_id);
        if (!student) {
            res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
            return;
        }
        if (!student.parent_id) {
            res.status(400).json({
                success: false,
                message: 'Student is not linked to a parent.'
            });
            return;
        }
        if (req.user?.role === types_1.UserRole.PARENT && student.parent_id.toString() !== req.user?.id) {
            res.status(403).json({
                success: false,
                message: 'Access denied for this student.'
            });
            return;
        }
        // Create subscription
        const subscription = new Subscription_1.default({
            student_id,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            meal_plan: meal_plan || 'STANDARD',
            price
        });
        await subscription.save();
        // Return populated subscription
        const populatedSubscription = await Subscription_1.default.findById(subscription._id)
            .populate('student_id', 'first_name last_name class_name');
        res.status(201).json({
            success: true,
            message: 'Subscription created successfully.',
            data: populatedSubscription
        });
    }
    catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating subscription.'
        });
    }
};
exports.createSubscription = createSubscription;
// Allows to update a subscription by ID
const updateSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Remove fields that shouldn't be updated
        delete updates._id;
        delete updates.created_at;
        // Convert dates if present
        if (updates.start_date)
            updates.start_date = new Date(updates.start_date);
        if (updates.end_date)
            updates.end_date = new Date(updates.end_date);
        const subscription = await Subscription_1.default.findByIdAndUpdate(id, { ...updates, updated_at: new Date() }, { new: true, runValidators: true }).populate('student_id', 'first_name last_name class_name');
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: 'Subscription not found.'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Subscription updated successfully.',
            data: subscription
        });
    }
    catch (error) {
        console.error('Update subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating subscription.'
        });
    }
};
exports.updateSubscription = updateSubscription;
// Allows to get subscriptions by student ID
const getSubscriptionsByStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const subscriptions = await Subscription_1.default.find({ student_id: studentId })
            .populate('student_id', 'first_name last_name class_name')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            data: subscriptions
        });
    }
    catch (error) {
        console.error('Get subscriptions by student error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving subscriptions.'
        });
    }
};
exports.getSubscriptionsByStudent = getSubscriptionsByStudent;
// Allows to update subscription status
const updateSubscriptionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            res.status(400).json({
                success: false,
                message: 'Status is required.'
            });
            return;
        }
        const subscription = await Subscription_1.default.findByIdAndUpdate(id, { status, updated_at: new Date() }, { new: true, runValidators: true }).populate('student_id', 'first_name last_name class_name');
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: 'Subscription not found.'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Subscription status updated successfully.',
            data: subscription
        });
    }
    catch (error) {
        console.error('Update subscription status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating subscription status.'
        });
    }
};
exports.updateSubscriptionStatus = updateSubscriptionStatus;
// Allows to delete a subscription by ID (only if it has no payments)
const deleteSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        // Check if subscription has payments
        const payments = await Payment_1.default.find({ subscription_id: id });
        if (payments.length > 0) {
            res.status(400).json({
                success: false,
                message: 'Cannot delete subscription with existing payments.'
            });
            return;
        }
        const subscription = await Subscription_1.default.findByIdAndDelete(id);
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: 'Subscription not found.'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Subscription deleted successfully.',
            data: subscription
        });
    }
    catch (error) {
        console.error('Delete subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting subscription.'
        });
    }
};
exports.deleteSubscription = deleteSubscription;
