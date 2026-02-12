import { Request, Response } from 'express';
import Subscription from '../models/Subscription';
import Student from '../models/Student';
import Payment from '../models/Payment';
import { ApiResponse, CreateSubscriptionDTO } from '../types';

// Allows to get all subscriptions with optional filters (student, status) and populated student info
export const getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const student_id = req.query.student_id as string;
    const status = req.query.status as string;

    // Build query
    let query: any = {};
    if (student_id) query.student_id = student_id;
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('student_id', 'first_name last_name class_name')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: subscriptions
    } as ApiResponse);
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving subscriptions.'
    } as ApiResponse);
  }
};

// Allows to get a subscription by ID with populated student info
export const getSubscriptionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findById(id)
      .populate('student_id', 'first_name last_name class_name');

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: subscription
    } as ApiResponse);
  } catch (error) {
    console.error('Get subscription by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving subscription.'
    } as ApiResponse);
  }
};

// Allows to create a subscription with validation and populated response
export const createSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id, start_date, end_date, meal_plan, price }: CreateSubscriptionDTO = req.body;

    // Validate required fields
    if (!student_id || !start_date || !end_date || !price) {
      res.status(400).json({
        success: false,
        message: 'Student ID, start date, end date, and price are required.'
      } as ApiResponse);
      return;
    }

    // Check if student exists
    const student = await Student.findById(student_id);
    if (!student) {
      res.status(404).json({
        success: false,
        message: 'Student not found.'
      } as ApiResponse);
      return;
    }

    // Create subscription
    const subscription = new Subscription({
      student_id,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      meal_plan: meal_plan || 'STANDARD',
      price
    });

    await subscription.save();

    // Return populated subscription
    const populatedSubscription = await Subscription.findById(subscription._id)
      .populate('student_id', 'first_name last_name class_name');

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully.',
      data: populatedSubscription
    } as ApiResponse);
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription.'
    } as ApiResponse);
  }
};

// Allows to update a subscription by ID
export const updateSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.created_at;

    // Convert dates if present
    if (updates.start_date) updates.start_date = new Date(updates.start_date);
    if (updates.end_date) updates.end_date = new Date(updates.end_date);

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { ...updates, updated_at: new Date() },
      { new: true, runValidators: true }
    ).populate('student_id', 'first_name last_name class_name');

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Subscription updated successfully.',
      data: subscription
    } as ApiResponse);
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription.'
    } as ApiResponse);
  }
};

// Allows to get subscriptions by student ID
export const getSubscriptionsByStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    const subscriptions = await Subscription.find({ student_id: studentId })
      .populate('student_id', 'first_name last_name class_name')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: subscriptions
    } as ApiResponse);
  } catch (error) {
    console.error('Get subscriptions by student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving subscriptions.'
    } as ApiResponse);
  }
};

// Allows to update subscription status
export const updateSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        message: 'Status is required.'
      } as ApiResponse);
      return;
    }

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { status, updated_at: new Date() },
      { new: true, runValidators: true }
    ).populate('student_id', 'first_name last_name class_name');

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Subscription status updated successfully.',
      data: subscription
    } as ApiResponse);
  } catch (error) {
    console.error('Update subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription status.'
    } as ApiResponse);
  }
};

// Allows to delete a subscription by ID (only if it has no payments)
export const deleteSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if subscription has payments
    const payments = await Payment.find({ subscription_id: id });
    if (payments.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete subscription with existing payments.'
      } as ApiResponse);
      return;
    }

    const subscription = await Subscription.findByIdAndDelete(id);

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: 'Subscription not found.'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Subscription deleted successfully.',
      data: subscription
    } as ApiResponse);
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting subscription.'
    } as ApiResponse);
  }
};
