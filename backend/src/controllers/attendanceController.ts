import { Request, Response } from 'express';
import Attendance from '../models/Attendance';
import Student from '../models/Student';
import Menu from '../models/Menu';
import Notification from '../models/Notification';
import { ApiResponse, MarkAttendanceDTO, NotificationType } from '../types';

// Allows to get attendance records with optional filters (student, date, school) and populated student and menu info
export const getAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const student_id = req.query.student_id as string;
    const date = req.query.date as string;
    const school_id = req.query.school_id as string;

    // Build query
    let query: any = {};
    
    if (student_id) query.student_id = student_id;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Get attendance with populated data
    let attendanceQuery = Attendance.find(query)
      .populate('student_id', 'first_name last_name school_id')
      .populate('menu_id', 'date meal_type description')
      .sort({ date: -1 });

    const attendance = await attendanceQuery;

    // Filter by school_id if provided
    let filteredAttendance = attendance;
    if (school_id) {
      filteredAttendance = attendance.filter((a: any) => 
        a.student_id && (a.student_id as any).school_id && 
        (a.student_id as any).school_id.toString() === school_id
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

    // Validate required fields
    if (!student_id || !menu_id || present === undefined) {
      res.status(400).json({
        success: false,
        message: 'Student ID, Menu ID, and presence status are required.'
      } as ApiResponse);
      return;
    }

    // Check if attendance already exists
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

    // Get student and menu information
    const student = await Student.findById(student_id).populate('parent_id');
    const menu = await Menu.findById(menu_id);

    if (!student || !menu) {
      res.status(404).json({
        success: false,
        message: 'Student or menu not found.'
      } as ApiResponse);
      return;
    }

    // Create attendance record
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

    // Create notification for parent
    if (student.parent_id) {
      const notificationTitle = present ? 'Repas Pris' : 'Repas Manqué';
      const notificationMessage = present 
        ? `${student.first_name} ${student.last_name} a pris son repas (${menu.meal_type}) aujourd'hui. Menu: ${menu.description || 'Non spécifié'}`
        : `${student.first_name} ${student.last_name} n'a pas pris son repas (${menu.meal_type}) aujourd'hui.${justified && reason ? ` Motif: ${reason}` : ''}`;

      const notification = new Notification({
        user_id: (student.parent_id as any)._id,
        title: notificationTitle,
        message: notificationMessage,
        type: present ? NotificationType.MEAL_TAKEN : NotificationType.MEAL_MISSED,
        related_student_id: student_id,
        related_menu_id: menu_id
      });

      await notification.save();
    }

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully.',
      data: attendance
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

    let query: any = { student_id: studentId };

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
