import { Request, Response } from 'express';
import Attendance from '../models/Attendance';
import Student from '../models/Student';
import Menu from '../models/Menu';
import Notification from '../models/Notification';
import Subscription from '../models/Subscription';
import Payment from '../models/Payment';
import { ApiResponse, MarkAttendanceDTO, NotificationType } from '../types';

const toStringId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value as { _id?: unknown; id?: unknown };
    if (obj._id) return String(obj._id);
    if (obj.id) return String(obj.id);
  }
  return String(value);
};

// Allows to get attendance records with optional filters (student, date, school) and populated student and menu info
export const getAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const student_id = req.query.student_id as string;
    const date = req.query.date as string;
    const school_id = req.query.school_id as string;

    const query: Record<string, any> = {};
    if (student_id) query.student_id = student_id;

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query)
      .populate('student_id', 'first_name last_name school_id')
      .populate('menu_id', 'date meal_type description')
      .sort({ date: -1 });

    let filteredAttendance = attendance;
    if (school_id) {
      filteredAttendance = attendance.filter((record: any) =>
        record.student_id
        && (record.student_id as any).school_id
        && (record.student_id as any).school_id.toString() === school_id
      );
    }

    res.json({
      success: true,
      data: filteredAttendance
    } as ApiResponse);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance records.'
    } as ApiResponse);
  }
};

// Allows to mark attendance for a student for a specific menu and create a notification for the parent
export const markAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { student_id, menu_id, present, justified, reason }: MarkAttendanceDTO = req.body;

    if (!student_id || !menu_id || present === undefined) {
      res.status(400).json({
        success: false,
        message: 'Student ID, Menu ID, and presence status are required.'
      } as ApiResponse);
      return;
    }

    const existingAttendance = await Attendance.findOne({
      student_id,
      menu_id
    });

    if (existingAttendance) {
      res.status(400).json({
        success: false,
        message: 'Attendance already marked for this student and menu.'
      } as ApiResponse);
      return;
    }

    const student = await Student.findById(student_id).populate('parent_id');
    const menu = await Menu.findById(menu_id);

    if (!student || !menu) {
      res.status(404).json({
        success: false,
        message: 'Student or menu not found.'
      } as ApiResponse);
      return;
    }

    const attendance = new Attendance({
      student_id,
      menu_id,
      date: new Date(),
      present,
      justified: justified || false,
      reason: reason || null,
      marked_by: req.user?.id
    });

    await attendance.save();

    // Resolve parent user ID from student first, then fallback to payment history.
    let parentUserId = '';
    if (student.parent_id) {
      parentUserId = toStringId(student.parent_id);
    }

    if (!parentUserId) {
      const studentLookupId = toStringId((student as any)._id || student_id);
      const subscriptionQuery = {
        $or: [
          { student_id: studentLookupId },
          { child_id: studentLookupId } // legacy compatibility
        ]
      };

      const latestSubscription = await Subscription.findOne(subscriptionQuery)
        .sort({ end_date: -1, updatedAt: -1, createdAt: -1 })
        .select('_id');

      if (latestSubscription?._id) {
        const latestPayment = await Payment.findOne({
          subscription_id: latestSubscription._id,
          parent_id: { $exists: true, $ne: null },
        })
          .sort({ paid_at: -1, createdAt: -1 })
          .select('parent_id');

        if (latestPayment?.parent_id) {
          parentUserId = toStringId(latestPayment.parent_id);
        }
      }
    }

    let notificationSent = false;
    if (parentUserId) {
      try {
        const menuLabel = menu.description
          || (Array.isArray((menu as any).items) ? (menu as any).items.join(', ') : '')
          || 'Non specifie';
        const notificationTitle = present ? 'Repas Pris' : 'Absence a la cantine';
        const notificationMessage = present
          ? `${student.first_name} ${student.last_name} a pris son repas (${menu.meal_type}) aujourd'hui. Menu: ${menuLabel}`
          : `${student.first_name} ${student.last_name} est marque absent (${menu.meal_type}) aujourd'hui.${justified && reason ? ` Motif: ${reason}` : ''}`;

        const notification = new Notification({
          user_id: parentUserId,
          title: notificationTitle,
          message: notificationMessage,
          type: present ? NotificationType.MEAL_TAKEN : NotificationType.ABSENCE,
          related_student_id: student_id,
          related_menu_id: menu_id
        });

        await notification.save();
        notificationSent = true;
      } catch (notificationError) {
        // Do not fail attendance save when only notification fails.
        console.error('Attendance notification error:', notificationError);
      }
    } else {
      console.warn('Attendance notification skipped: no parent resolved', {
        student_id,
        menu_id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully.',
      data: {
        ...attendance.toObject(),
        notification_sent: notificationSent
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking attendance.'
    } as ApiResponse);
  }
};

// Allows to get attendance records for a specific student with optional date range and populated menu info
export const getAttendanceByStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    const query: Record<string, any> = { student_id: studentId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('menu_id', 'date meal_type description')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: attendance
    } as ApiResponse);
  } catch (error) {
    console.error('Get attendance by student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving student attendance.'
    } as ApiResponse);
  }
};
