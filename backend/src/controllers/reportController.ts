import { Request, Response } from 'express';
import pool from '../config/database';
import { ApiResponse } from '../types';

/**
 * REPORT CONTROLLER
 *
 * Fournit des rapports agrégés (dashboard, paiements, présence, abonnements).
 */

/**
 * GET DASHBOARD STATS
 * GET /api/reports/dashboard
 */
export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const school_id = req.query.school_id as string | undefined;
    const start_date = req.query.start_date as string | undefined;
    const end_date = req.query.end_date as string | undefined;

    const result = await pool.query(
      `
      SELECT
        -- Nombre total d'élèves
        (SELECT COUNT(*)::INT
         FROM students s
         JOIN schools sc ON s.school_id = sc.id
         WHERE ($1::INT IS NULL OR sc.id = $1::INT)
        ) AS total_students,

        -- Abonnements actifs
        (SELECT COUNT(*)::INT
         FROM subscriptions sub
         JOIN students s ON sub.student_id = s.id
         JOIN schools sc ON s.school_id = sc.id
         WHERE sub.status = 'ACTIVE'
           AND ($1::INT IS NULL OR sc.id = $1::INT)
        ) AS active_subscriptions,

        -- Revenu total (paiements réussis sur la période)
        (SELECT COALESCE(SUM(p.amount), 0)::INT
         FROM payments p
         JOIN subscriptions sub ON p.subscription_id = sub.id
         JOIN students s ON sub.student_id = s.id
         JOIN schools sc ON s.school_id = sc.id
         WHERE p.status = 'SUCCESS'
           AND ($1::INT IS NULL OR sc.id = $1::INT)
           AND ($2::DATE IS NULL OR p.paid_at::DATE >= $2::DATE)
           AND ($3::DATE IS NULL OR p.paid_at::DATE <= $3::DATE)
        ) AS total_revenue
      `,
      [school_id || null, start_date || null, end_date || null]
    );

    res.status(200).json({
      success: true,
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating dashboard statistics.',
    } as ApiResponse);
  }
};

