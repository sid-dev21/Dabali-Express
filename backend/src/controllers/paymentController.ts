import { Request, Response } from 'express';
import Payment from '../models/Payment';
import Subscription from '../models/Subscription';
import User from '../models/User';
import { ApiResponse, CreatePaymentDTO } from '../types';

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
    const { status } = req.body;

    if (!status || !['COMPLETED', 'FAILED'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Valid payment status is required.'
      } as ApiResponse);
      return;
    }

    const payment = await Payment.findByIdAndUpdate(
      id,
      { 
        status,
        paid_at: status === 'COMPLETED' ? new Date() : null,
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

    res.json({
      success: true,
      message: 'Payment verified successfully.',
      data: payment
    } as ApiResponse);
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment.'
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

    // Create payment
    const payment = new Payment({
      subscription_id,
      parent_id: req.user?.id,
      amount,
      method,
      reference,
      status: 'PENDING'
    });

    await payment.save();

    // Return populated payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('subscription_id', 'student_id start_date end_date')
      .populate('parent_id', 'first_name last_name email');

    res.status(201).json({
      success: true,
      message: 'Payment created successfully.',
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
