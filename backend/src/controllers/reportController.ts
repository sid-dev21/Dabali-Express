import { Request, Response } from 'express';
import Student from '../models/Student';
import Payment from '../models/Payment';
import Attendance from '../models/Attendance';
import Subscription from '../models/Subscription';
import { ApiResponse } from '../types';



// Allows to get dashboard statistics
export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const school_id = req.query.school_id as string | undefined;

    // Build base queries
    let studentQuery: any = {};
    let paymentQuery: any = {};
    let attendanceQuery: any = {};
    let subscriptionQuery: any = {};

    if (school_id) {
      studentQuery.school_id = school_id;
      // For payments, we need to join through subscriptions
      const subscriptions = await Subscription.find({ school_id });
      const subscriptionIds = subscriptions.map(s => s._id);
      paymentQuery.subscription_id = { $in: subscriptionIds };
      
      // For attendance, we need to join through students
      const students = await Student.find({ school_id });
      const studentIds = students.map(s => s._id);
      attendanceQuery.student_id = { $in: studentIds };
      
      subscriptionQuery.student_id = { $in: studentIds };
    }

    // Get statistics
    const [
      totalStudents,
      totalPayments,
      totalAttendance,
      activeSubscriptions,
      todayAttendance,
      monthlyPayments
    ] = await Promise.all([
      Student.countDocuments(studentQuery),
      Payment.countDocuments(paymentQuery),
      Attendance.countDocuments(attendanceQuery),
      Subscription.countDocuments({ ...subscriptionQuery, status: 'ACTIVE' }),
      // Today's attendance
      Attendance.countDocuments({
        ...attendanceQuery,
        date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      // Monthly payments
      Payment.find({
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
    } as ApiResponse);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard statistics.'
    } as ApiResponse);
  }
};

// Allows to get payment reports
export const getPaymentReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const school_id = req.query.school_id as string;
    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;

    // Build query
    let query: any = {};
    if (start_date && end_date) {
      query.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    // If school_id is provided, we need to get payments through subscriptions
    if (school_id) {
      const subscriptions = await Subscription.find({ school_id });
      const subscriptionIds = subscriptions.map(s => s._id);
      query.subscription_id = { $in: subscriptionIds };
    }

    const payments = await Payment.find(query)
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
    } as ApiResponse);
  } catch (error) {
    console.error('Get payment reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payment reports.'
    } as ApiResponse);
  }
};

// Allows to get attendance reports
export const getAttendanceReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const school_id = req.query.school_id as string;
    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;
    const student_id = req.query.student_id as string;

    // Build query
    let query: any = {};
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
      const students = await Student.find({ school_id });
      const studentIds = students.map(s => s._id);
      query.student_id = query.student_id 
        ? { ...query.student_id, $in: studentIds }
        : { $in: studentIds };
    }

    const attendance = await Attendance.find(query)
      .populate('student_id', 'first_name last_name class_name')
      .populate('menu_id', 'date meal_type description')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: attendance
    } as ApiResponse);
  } catch (error) {
    console.error('Get attendance reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance reports.'
    } as ApiResponse);
  }
};

// Allows to get subscription reports
export const getSubscriptionReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const school_id = req.query.school_id as string;
    const status = req.query.status as string;

    // Build query
    let query: any = {};
    if (status) {
      query.status = status;
    }

    // If school_id is provided, we need to get subscriptions through students
    if (school_id) {
      const students = await Student.find({ school_id });
      const studentIds = students.map(s => s._id);
      query.student_id = { $in: studentIds };
    }

    const subscriptions = await Subscription.find(query)
      .populate('student_id', 'first_name last_name class_name')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: subscriptions
    } as ApiResponse);
  } catch (error) {
    console.error('Get subscription reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving subscription reports.'
    } as ApiResponse);
  }
};
