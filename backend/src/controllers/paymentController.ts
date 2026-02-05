/**
 * PAYMENT CONTROLLER - REALISTIC SIMULATION
 * 
 * Simulates the full mobile money payment process
 * without needing real provider APIs.
 */

import { Request, Response } from 'express';
import pool from '../config/database';
import { ApiResponse, CreatePaymentDTO, PaymentMethod, PaymentStatus } from '../types';
import { generatePaymentReference } from '../utils/helpers';
import { isValidAmount } from '../utils/validators';

/**
 * GET ALL PAYMENTS
 * GET /api/payments
 */
export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const parent_id = req.query.parent_id as string;
    const subscription_id = req.query.subscription_id as string;
    const status = req.query.status as PaymentStatus;

    let query = `
      SELECT p.*, 
             sub.type as subscription_type,
             s.first_name as student_first_name,
             s.last_name as student_last_name,
             u.first_name as parent_first_name,
             u.last_name as parent_last_name
      FROM payments p
      JOIN subscriptions sub ON p.subscription_id = sub.id
      JOIN students s ON sub.student_id = s.id
      JOIN users u ON p.parent_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (parent_id) {
      query += ` AND p.parent_id = $${paramCount}`;
      params.push(parent_id);
      paramCount++;
    }

    if (subscription_id) {
      query += ` AND p.subscription_id = $${paramCount}`;
      params.push(subscription_id);
      paramCount++;
    }

    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    } as ApiResponse);
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements.',
    } as ApiResponse);
  }
};

/**
 * GET PAYMENT BY ID
 * GET /api/payments/:id
 */
export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, 
              sub.type as subscription_type,
              s.first_name as student_first_name,
              s.last_name as student_last_name
       FROM payments p
       JOIN subscriptions sub ON p.subscription_id = sub.id
       JOIN students s ON sub.student_id = s.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Paiement non trouvé.',
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du paiement.',
    } as ApiResponse);
  }
};

/**
 * CREATE PAYMENT - Initier un paiement
 * POST /api/payments
 */
export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscription_id, amount, method, phone }: CreatePaymentDTO = req.body;

    // 1. VALIDATION
    if (!subscription_id || !amount || !method) {
      res.status(400).json({
        success: false,
        message: 'L\'abonnement, le montant et la méthode sont requis.',
      } as ApiResponse);
      return;
    }

    if (!isValidAmount(amount)) {
      res.status(400).json({
        success: false,
        message: 'Le montant doit être positif.',
      } as ApiResponse);
      return;
    }

    // 2. CHECK SUBSCRIPTION
    const subscriptionCheck = await pool.query(
      `SELECT sub.*, s.parent_id 
       FROM subscriptions sub
       JOIN students s ON sub.student_id = s.id
       WHERE sub.id = $1`,
      [subscription_id]
    );

    if (subscriptionCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Abonnement non trouvé.',
      } as ApiResponse);
      return;
    }

    const parent_id = subscriptionCheck.rows[0].parent_id;

    // 3. GENERATE UNIQUE REFERENCE
    const reference = generatePaymentReference(method);

    // 4. DETERMINE INITIAL STATUS
    let status: PaymentStatus;
    let paid_at = null;

    if (method === PaymentMethod.CASH) {
      // CASH: immediate payment
      status = PaymentStatus.SUCCESS;
      paid_at = new Date();
    } else {
      // MOBILE MONEY: waiting for confirmation
      status = PaymentStatus.PENDING;
    }

    // 5. CREATE PAYMENT IN DATABASE
    const result = await pool.query(
      `INSERT INTO payments (subscription_id, parent_id, amount, method, status, reference, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [subscription_id, parent_id, amount, method, status, reference, paid_at]
    );

    const payment = result.rows[0];

    // 6. RESPONSE DEPENDING ON METHOD
    if (method === 'CASH') {
      res.status(201).json({
        success: true,
        message: 'Paiement en espèces enregistré avec succès.',
        data: payment,
      } as ApiResponse);
    } else {
      // Mobile Money - provide instructions
      const provider = method === 'ORANGE_MONEY' ? 'Orange Money' : 'Moov Money';
      const ussdCode = method === 'ORANGE_MONEY' ? '*144#' : '*155#';

      res.status(201).json({
        success: true,
        message: `Paiement ${provider} initié.`,
        data: {
          ...payment,
          instructions: {
            step1: `Composez ${ussdCode} sur votre téléphone`,
            step2: `Sélectionnez "Payer un marchand"`,
            step3: `Entrez le code marchand: CANTEEN`,
            step4: `Entrez le montant: ${amount} FCFA`,
            step5: `Confirmez avec votre code PIN`,
            note: 'Le paiement sera confirmé automatiquement dans quelques secondes.',
          },
        },
      } as ApiResponse);
    }
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du paiement.',
    } as ApiResponse);
  }
};

/**
 * SIMULATE PAYMENT CONFIRMATION - simulate confirmation (ADMIN/TEST only)
 * POST /api/payments/:id/simulate-confirm
 * 
 * This endpoint allows simulating the confirmation of a mobile money payment.
 */
export const simulatePaymentConfirmation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { success = true } = req.body; // By default, payment succeeds

    // Check that the payment exists and is PENDING
    const paymentCheck = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    );

    if (paymentCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Paiement non trouvé.',
      } as ApiResponse);
      return;
    }

    const payment = paymentCheck.rows[0];

    if (payment.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        message: 'Le paiement n\'est pas en attente.',
      } as ApiResponse);
      return;
    }

    // Update status
    const newStatus = success ? 'SUCCESS' : 'FAILED';
    const paid_at = success ? new Date() : null;

    const result = await pool.query(
      `UPDATE payments 
       SET status = $1, paid_at = $2
       WHERE id = $3
       RETURNING *`,
      [newStatus, paid_at, id]
    );

    res.status(200).json({
      success: true,
      message: `Paiement ${newStatus === 'SUCCESS' ? 'confirmé' : 'échoué'} avec succès.`,
      data: result.rows[0],
    } as ApiResponse);
  } catch (error) {
    console.error('Simulate payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la simulation.',
    } as ApiResponse);
  }
};

/**
 * VERIFY PAYMENT - Vérifier le statut d'un paiement
 * GET /api/payments/:id/verify
 */
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Paiement non trouvé.',
      } as ApiResponse);
      return;
    }

    const payment = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference,
        paid_at: payment.paid_at,
        message: payment.status === 'SUCCESS' 
          ? 'Paiement confirmé' 
          : payment.status === 'PENDING'
          ? 'En attente de confirmation'
          : 'Paiement échoué',
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du paiement.',
    } as ApiResponse);
  }
};

/**
 * GET PAYMENTS BY SUBSCRIPTION
 * GET /api/payments/subscription/:subscriptionId
 */
export const getPaymentsBySubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscriptionId } = req.params;

    const result = await pool.query(
      `SELECT p.*,
              u.first_name as parent_first_name,
              u.last_name as parent_last_name
       FROM payments p
       JOIN users u ON p.parent_id = u.id
       WHERE p.subscription_id = $1
       ORDER BY p.created_at DESC`,
      [subscriptionId]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    } as ApiResponse);
  } catch (error) {
    console.error('Get payments by subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements.',
    } as ApiResponse);
  }
};