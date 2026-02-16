import { Request, Response } from 'express';
import Payment from '../models/Payment';
import Subscription from '../models/Subscription';
import { ApiResponse, CreatePaymentDTO, UserRole } from '../types';

type ValidatedPaymentStatus = 'COMPLETED' | 'FAILED';

const normalizePaymentValidationStatus = (value: unknown): ValidatedPaymentStatus | null => {
  const normalized = String(value || '').trim().toUpperCase();
  if (['COMPLETED', 'SUCCESS', 'VALIDATED', 'APPROVED'].includes(normalized)) return 'COMPLETED';
  if (['FAILED', 'REJECTED', 'DECLINED'].includes(normalized)) return 'FAILED';
  return null;
};

const toSubscriptionStatusFromPayment = (status: ValidatedPaymentStatus): 'ACTIVE' | 'PENDING_PAYMENT' => {
  return status === 'COMPLETED' ? 'ACTIVE' : 'PENDING_PAYMENT';
};

const syncSubscriptionStatusForPayment = async (subscriptionId: unknown, status: ValidatedPaymentStatus) => {
  const subscriptionStatus = toSubscriptionStatusFromPayment(status);
  await Subscription.findByIdAndUpdate(
    subscriptionId,
    { status: subscriptionStatus, updated_at: new Date() }
  );
  return subscriptionStatus;
};

const isAdminValidator = (role?: UserRole): boolean => {
  return role === UserRole.SCHOOL_ADMIN || role === UserRole.SUPER_ADMIN;
};

//  Allows to get all payments with populated subscription and parent info
export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscription_id = req.query.subscription_id as string;
    const parent_id = req.query.parent_id as string;
    const status = req.query.status as string;

    // Build query
    let query: any = {};
    if (subscription_id) query.subscription_id = subscription_id;
    if (parent_id) query.parent_id = parent_id;
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('subscription_id', 'student_id start_date end_date')
      .populate('parent_id', 'first_name last_name email')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: payments
    } as ApiResponse);
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payments.'
    } as ApiResponse);
  }
};

//  Allows to get payments for a specific subscription with populated parent info
export const getPaymentsBySubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscriptionId } = req.params;

    const payments = await Payment.find({ subscription_id: subscriptionId })
      .populate('parent_id', 'first_name last_name email')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: payments
    } as ApiResponse);
  } catch (error) {
    console.error('Get payments by subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payments for subscription.'
    } as ApiResponse);
  }
};

// Allows to get a payment by ID with populated subscription and parent info
export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id)
      .populate('subscription_id', 'student_id start_date end_date')
      .populate('parent_id', 'first_name last_name email');

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: payment
    } as ApiResponse);
  } catch (error) {
    console.error('Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payment.'
    } as ApiResponse);
  }
};

//  Allows to verify a payment (mark as completed or failed)
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, verification_code } = req.body;
    const normalizedStatus = normalizePaymentValidationStatus(status);

    if (!normalizedStatus) {
      res.status(400).json({
        success: false,
        message: 'Valid payment status is required.'
      } as ApiResponse);
      return;
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found.'
      } as ApiResponse);
      return;
    }

    // For non-cash payments, verify the 4-digit code if provided
    if (payment.method !== 'CASH' && verification_code) {
      if (payment.verification_code !== verification_code) {
        res.status(400).json({
          success: false,
          message: 'Invalid verification code.'
        } as ApiResponse);
        return;
      }
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      { 
        status: normalizedStatus,
        paid_at: normalizedStatus === 'COMPLETED' ? new Date() : null,
        updated_at: new Date()
      },
      { new: true }
    ).populate('subscription_id', 'student_id start_date end_date')
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
    } as ApiResponse);
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment.'
    } as ApiResponse);
  }
};

// Allows admin to validate payments waiting for validation
export const validatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const normalizedStatus = normalizePaymentValidationStatus(status);

    if (!normalizedStatus) {
      res.status(400).json({
        success: false,
        message: 'Valid payment status (COMPLETED or FAILED) is required.'
      } as ApiResponse);
      return;
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found.'
      } as ApiResponse);
      return;
    }

    if (!['WAITING_ADMIN_VALIDATION', 'PENDING', 'COMPLETED', 'FAILED'].includes(payment.status)) {
      res.status(400).json({
        success: false,
        message: 'This payment cannot be validated from its current status.'
      } as ApiResponse);
      return;
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      { 
        status: normalizedStatus,
        paid_at: normalizedStatus === 'COMPLETED' ? new Date() : null,
        updated_at: new Date()
      },
      { new: true }
    ).populate('subscription_id', 'student_id start_date end_date')
     .populate('parent_id', 'first_name last_name email');

    const subscriptionStatus = await syncSubscriptionStatusForPayment(payment.subscription_id, normalizedStatus);

    res.json({
      success: true,
      message: `Payment ${normalizedStatus.toLowerCase()} successfully. Subscription status updated to ${subscriptionStatus}.`,
      data: updatedPayment
    } as ApiResponse);
  } catch (error) {
    console.error('Validate payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating payment.'
    } as ApiResponse);
  }
};

// Allows to create a new payment for a subscription
export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscription_id, amount, method, reference }: CreatePaymentDTO = req.body;

    // Validate required fields
    if (!subscription_id || !amount || !method) {
      res.status(400).json({
        success: false,
        message: 'Subscription ID, amount, and method are required.'
      } as ApiResponse);
      return;
    }

    // Check if subscription exists
    const subscription = await Subscription.findById(subscription_id);
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found.'
      } as ApiResponse);
      return;
    }

    // Determine payment status based on method
    let paymentStatus: 'PENDING' | 'COMPLETED' | 'WAITING_ADMIN_VALIDATION';
    let verificationCode: string | undefined;

    if (method === 'CASH') {
      paymentStatus = 'COMPLETED'; // Cash payments are immediately completed
    } else {
      paymentStatus = 'WAITING_ADMIN_VALIDATION'; // Other methods need admin validation
      verificationCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4-digit code
    }

    // Create payment
    const payment = new Payment({
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
    let subscriptionStatus: 'ACTIVE' | 'PENDING_PAYMENT';
    if (paymentStatus === 'COMPLETED') {
      subscriptionStatus = 'ACTIVE';
    } else {
      subscriptionStatus = 'PENDING_PAYMENT';
    }

    await Subscription.findByIdAndUpdate(
      subscription_id,
      { status: subscriptionStatus, updated_at: new Date() }
    );

    // Return populated payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('subscription_id', 'student_id start_date end_date')
      .populate('parent_id', 'first_name last_name email');

    res.status(201).json({
      success: true,
      message: paymentStatus === 'COMPLETED' 
        ? 'Payment completed successfully. Subscription is now active.' 
        : 'Payment created successfully. Subscription is pending admin validation.',
      data: populatedPayment
    } as ApiResponse);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment.'
    } as ApiResponse);
  }
};

// Simulate payment confirmation (for testing purposes)
export const simulatePaymentConfirmation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByIdAndUpdate(
      id,
      { 
        status: 'COMPLETED',
        paid_at: new Date(),
        updated_at: new Date()
      },
      { new: true }
    ).populate('subscription_id', 'student_id start_date end_date')
     .populate('parent_id', 'first_name last_name email');

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found.'
      } as ApiResponse);
      return;
    }

    await syncSubscriptionStatusForPayment(payment.subscription_id, 'COMPLETED');

    res.json({
      success: true,
      message: 'Payment confirmed successfully.',
      data: payment
    } as ApiResponse);
  } catch (error) {
    console.error('Simulate payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming payment.'
    } as ApiResponse);
  }
};
