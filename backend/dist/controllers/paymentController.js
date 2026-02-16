"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulatePaymentConfirmation = exports.createPayment = exports.validatePayment = exports.verifyPayment = exports.getPaymentById = exports.getPaymentsBySubscription = exports.getAllPayments = void 0;
const Payment_1 = __importDefault(require("../models/Payment"));
const Subscription_1 = __importDefault(require("../models/Subscription"));
const types_1 = require("../types");
const normalizePaymentValidationStatus = (value) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (['COMPLETED', 'SUCCESS', 'VALIDATED', 'APPROVED'].includes(normalized))
        return 'COMPLETED';
    if (['FAILED', 'REJECTED', 'DECLINED'].includes(normalized))
        return 'FAILED';
    return null;
};
const toSubscriptionStatusFromPayment = (status) => {
    return status === 'COMPLETED' ? 'ACTIVE' : 'PENDING_PAYMENT';
};
const syncSubscriptionStatusForPayment = async (subscriptionId, status) => {
    const subscriptionStatus = toSubscriptionStatusFromPayment(status);
    await Subscription_1.default.findByIdAndUpdate(subscriptionId, { status: subscriptionStatus, updated_at: new Date() });
    return subscriptionStatus;
};
const isAdminValidator = (role) => {
    return role === types_1.UserRole.SCHOOL_ADMIN || role === types_1.UserRole.SUPER_ADMIN;
};
//  Allows to get all payments with populated subscription and parent info
const getAllPayments = async (req, res) => {
    try {
        const subscription_id = req.query.subscription_id;
        const parent_id = req.query.parent_id;
        const status = req.query.status;
        // Build query
        let query = {};
        if (subscription_id)
            query.subscription_id = subscription_id;
        if (parent_id)
            query.parent_id = parent_id;
        if (status)
            query.status = status;
        const payments = await Payment_1.default.find(query)
            .populate('subscription_id', 'student_id start_date end_date')
            .populate('parent_id', 'first_name last_name email')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            data: payments
        });
    }
    catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving payments.'
        });
    }
};
exports.getAllPayments = getAllPayments;
//  Allows to get payments for a specific subscription with populated parent info
const getPaymentsBySubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        const payments = await Payment_1.default.find({ subscription_id: subscriptionId })
            .populate('parent_id', 'first_name last_name email')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            data: payments
        });
    }
    catch (error) {
        console.error('Get payments by subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving payments for subscription.'
        });
    }
};
exports.getPaymentsBySubscription = getPaymentsBySubscription;
// Allows to get a payment by ID with populated subscription and parent info
const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await Payment_1.default.findById(id)
            .populate('subscription_id', 'student_id start_date end_date')
            .populate('parent_id', 'first_name last_name email');
        if (!payment) {
            res.status(404).json({
                success: false,
                message: 'Payment not found.'
            });
            return;
        }
        res.json({
            success: true,
            data: payment
        });
    }
    catch (error) {
        console.error('Get payment by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving payment.'
        });
    }
};
exports.getPaymentById = getPaymentById;
//  Allows to verify a payment (mark as completed or failed)
const verifyPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, verification_code } = req.body;
        const normalizedStatus = normalizePaymentValidationStatus(status);
        if (!normalizedStatus) {
            res.status(400).json({
                success: false,
                message: 'Valid payment status is required.'
            });
            return;
        }
        const payment = await Payment_1.default.findById(id);
        if (!payment) {
            res.status(404).json({
                success: false,
                message: 'Payment not found.'
            });
            return;
        }
        // For non-cash payments, verify the 4-digit code if provided
        if (payment.method !== 'CASH' && verification_code) {
            if (payment.verification_code !== verification_code) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid verification code.'
                });
                return;
            }
        }
        const updatedPayment = await Payment_1.default.findByIdAndUpdate(id, {
            status: normalizedStatus,
            paid_at: normalizedStatus === 'COMPLETED' ? new Date() : null,
            updated_at: new Date()
        }, { new: true }).populate('subscription_id', 'student_id start_date end_date')
            .populate('parent_id', 'first_name last_name email');
        let message = 'Payment verified successfully.';
        if (isAdminValidator(req.user?.role)) {
            const subscriptionStatus = await syncSubscriptionStatusForPayment(payment.subscription_id, normalizedStatus);
            message = `Payment verified successfully. Subscription status updated to ${subscriptionStatus}.`;
        }
        res.json({
            success: true,
            message,
            data: updatedPayment
        });
    }
    catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment.'
        });
    }
};
exports.verifyPayment = verifyPayment;
// Allows admin to validate payments waiting for validation
const validatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const normalizedStatus = normalizePaymentValidationStatus(status);
        if (!normalizedStatus) {
            res.status(400).json({
                success: false,
                message: 'Valid payment status (COMPLETED or FAILED) is required.'
            });
            return;
        }
        const payment = await Payment_1.default.findById(id);
        if (!payment) {
            res.status(404).json({
                success: false,
                message: 'Payment not found.'
            });
            return;
        }
        if (!['WAITING_ADMIN_VALIDATION', 'PENDING', 'COMPLETED', 'FAILED'].includes(payment.status)) {
            res.status(400).json({
                success: false,
                message: 'This payment cannot be validated from its current status.'
            });
            return;
        }
        const updatedPayment = await Payment_1.default.findByIdAndUpdate(id, {
            status: normalizedStatus,
            paid_at: normalizedStatus === 'COMPLETED' ? new Date() : null,
            updated_at: new Date()
        }, { new: true }).populate('subscription_id', 'student_id start_date end_date')
            .populate('parent_id', 'first_name last_name email');
        const subscriptionStatus = await syncSubscriptionStatusForPayment(payment.subscription_id, normalizedStatus);
        res.json({
            success: true,
            message: `Payment ${normalizedStatus.toLowerCase()} successfully. Subscription status updated to ${subscriptionStatus}.`,
            data: updatedPayment
        });
    }
    catch (error) {
        console.error('Validate payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating payment.'
        });
    }
};
exports.validatePayment = validatePayment;
// Allows to create a new payment for a subscription
const createPayment = async (req, res) => {
    try {
        const { subscription_id, amount, method, reference } = req.body;
        // Validate required fields
        if (!subscription_id || !amount || !method) {
            res.status(400).json({
                success: false,
                message: 'Subscription ID, amount, and method are required.'
            });
            return;
        }
        // Check if subscription exists
        const subscription = await Subscription_1.default.findById(subscription_id);
        if (!subscription) {
            res.status(404).json({
                success: false,
                message: 'Subscription not found.'
            });
            return;
        }
        // Determine payment status based on method
        let paymentStatus;
        let verificationCode;
        if (method === 'CASH') {
            paymentStatus = 'COMPLETED'; // Cash payments are immediately completed
        }
        else {
            paymentStatus = 'WAITING_ADMIN_VALIDATION'; // Other methods need admin validation
            verificationCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4-digit code
        }
        // Create payment
        const payment = new Payment_1.default({
            subscription_id,
            parent_id: req.user?.id,
            amount,
            method,
            reference,
            status: paymentStatus,
            verification_code: verificationCode
        });
        await payment.save();
        // Update subscription status based on payment status
        let subscriptionStatus;
        if (paymentStatus === 'COMPLETED') {
            subscriptionStatus = 'ACTIVE';
        }
        else {
            subscriptionStatus = 'PENDING_PAYMENT';
        }
        await Subscription_1.default.findByIdAndUpdate(subscription_id, { status: subscriptionStatus, updated_at: new Date() });
        // Return populated payment
        const populatedPayment = await Payment_1.default.findById(payment._id)
            .populate('subscription_id', 'student_id start_date end_date')
            .populate('parent_id', 'first_name last_name email');
        res.status(201).json({
            success: true,
            message: paymentStatus === 'COMPLETED'
                ? 'Payment completed successfully. Subscription is now active.'
                : 'Payment created successfully. Subscription is pending admin validation.',
            data: populatedPayment
        });
    }
    catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating payment.'
        });
    }
};
exports.createPayment = createPayment;
// Simulate payment confirmation (for testing purposes)
const simulatePaymentConfirmation = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await Payment_1.default.findByIdAndUpdate(id, {
            status: 'COMPLETED',
            paid_at: new Date(),
            updated_at: new Date()
        }, { new: true }).populate('subscription_id', 'student_id start_date end_date')
            .populate('parent_id', 'first_name last_name email');
        if (!payment) {
            res.status(404).json({
                success: false,
                message: 'Payment not found.'
            });
            return;
        }
        await syncSubscriptionStatusForPayment(payment.subscription_id, 'COMPLETED');
        res.json({
            success: true,
            message: 'Payment confirmed successfully.',
            data: payment
        });
    }
    catch (error) {
        console.error('Simulate payment confirmation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error confirming payment.'
        });
    }
};
exports.simulatePaymentConfirmation = simulatePaymentConfirmation;
