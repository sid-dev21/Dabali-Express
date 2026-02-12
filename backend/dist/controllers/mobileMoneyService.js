"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMoovMoneyPayment = exports.initiateMoovMoneyPayment = exports.verifyOrangeMoneyPayment = exports.initiateOrangeMoneyPayment = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Orange Money configuration
 * Get these values from: https://developer.orange.com/
 */
const ORANGE_MONEY_CONFIG = {
    BASE_URL: process.env.ORANGE_MONEY_BASE_URL || 'https://api.orange.com/orange-money-webpay/bf/v1',
    MERCHANT_KEY: process.env.ORANGE_MONEY_MERCHANT_KEY || '',
    API_KEY: process.env.ORANGE_MONEY_API_KEY || '',
    RETURN_URL: process.env.ORANGE_MONEY_RETURN_URL || 'https://yourapp.com/payment/callback',
    CANCEL_URL: process.env.ORANGE_MONEY_CANCEL_URL || 'https://yourapp.com/payment/cancel',
};
/**
 * Moov Money configuration
 * Get these values from: https://developer.moov-africa.bj/
 */
const MOOV_MONEY_CONFIG = {
    BASE_URL: process.env.MOOV_MONEY_BASE_URL || 'https://api.moov-africa.bj/v1',
    MERCHANT_ID: process.env.MOOV_MONEY_MERCHANT_ID || '',
    API_KEY: process.env.MOOV_MONEY_API_KEY || '',
    SECRET_KEY: process.env.MOOV_MONEY_SECRET_KEY || '',
};
/**
 * ORANGE MONEY - Initiate a payment
 */
const initiateOrangeMoneyPayment = async (amount, phone, reference, description) => {
    try {
        // 1. Prepare request payload
        const payload = {
            merchant_key: ORANGE_MONEY_CONFIG.MERCHANT_KEY,
            currency: 'XOF', // CFA Franc
            order_id: reference,
            amount: amount,
            return_url: ORANGE_MONEY_CONFIG.RETURN_URL,
            cancel_url: ORANGE_MONEY_CONFIG.CANCEL_URL,
            notif_url: `${process.env.API_URL}/api/payments/webhook/orange`,
            lang: 'fr',
            reference: description,
            customer_phone: phone,
        };
        // 2. Call Orange Money API
        const response = await axios_1.default.post(`${ORANGE_MONEY_CONFIG.BASE_URL}/webpayment`, payload, {
            headers: {
                'Authorization': `Bearer ${ORANGE_MONEY_CONFIG.API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        // 3. Handle response
        if (response.data.status === 'SUCCESS') {
            return {
                success: true,
                transactionId: response.data.txnid,
                reference: reference,
                status: 'PENDING',
                paymentUrl: response.data.payment_url,
                message: 'Payment initiated. Complete it on your phone.',
            };
        }
        else {
            return {
                success: false,
                status: 'FAILED',
                message: response.data.message || 'Failed to initiate payment.',
            };
        }
    }
    catch (error) {
        console.error('Orange Money payment error:', error);
        return {
            success: false,
            status: 'FAILED',
            message: error.response?.data?.message || 'Error while processing Orange Money payment.',
        };
    }
};
exports.initiateOrangeMoneyPayment = initiateOrangeMoneyPayment;
/**
 * ORANGE MONEY - Verify payment status
 */
const verifyOrangeMoneyPayment = async (transactionId) => {
    try {
        const response = await axios_1.default.get(`${ORANGE_MONEY_CONFIG.BASE_URL}/transaction/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${ORANGE_MONEY_CONFIG.API_KEY}`,
            },
        });
        const status = response.data.status;
        return {
            success: status === 'SUCCESS',
            transactionId: transactionId,
            status: status === 'SUCCESS' ? 'SUCCESS' : status === 'PENDING' ? 'PENDING' : 'FAILED',
            message: response.data.message,
        };
    }
    catch (error) {
        console.error('Orange Money verify error:', error);
        return {
            success: false,
            status: 'FAILED',
            message: 'Erreur lors de la vérification du paiement.',
        };
    }
};
exports.verifyOrangeMoneyPayment = verifyOrangeMoneyPayment;
/**
 * MOOV MONEY - Initiate a payment
 */
const initiateMoovMoneyPayment = async (amount, phone, reference, description) => {
    try {
        // 1. Generate authentication token
        const authResponse = await axios_1.default.post(`${MOOV_MONEY_CONFIG.BASE_URL}/auth/token`, {
            merchant_id: MOOV_MONEY_CONFIG.MERCHANT_ID,
            api_key: MOOV_MONEY_CONFIG.API_KEY,
        });
        const token = authResponse.data.token;
        // 2. Initiate payment
        const payload = {
            amount: amount,
            currency: 'XOF',
            customer_phone: phone,
            reference: reference,
            description: description,
            callback_url: `${process.env.API_URL}/api/payments/webhook/moov`,
        };
        const response = await axios_1.default.post(`${MOOV_MONEY_CONFIG.BASE_URL}/payments/initiate`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.data.status === 'PENDING') {
            return {
                success: true,
                transactionId: response.data.transaction_id,
                reference: reference,
                status: 'PENDING',
                message: 'Payment initiated. Confirm it on your phone.',
            };
        }
        else {
            return {
                success: false,
                status: 'FAILED',
                message: response.data.message || 'Failed to initiate payment.',
            };
        }
    }
    catch (error) {
        console.error('Moov Money payment error:', error);
        return {
            success: false,
            status: 'FAILED',
            message: error.response?.data?.message || 'Error while processing Moov Money payment.',
        };
    }
};
exports.initiateMoovMoneyPayment = initiateMoovMoneyPayment;
/**
 * MOOV MONEY - Verify payment status
 */
const verifyMoovMoneyPayment = async (transactionId) => {
    try {
        // Authentication
        const authResponse = await axios_1.default.post(`${MOOV_MONEY_CONFIG.BASE_URL}/auth/token`, {
            merchant_id: MOOV_MONEY_CONFIG.MERCHANT_ID,
            api_key: MOOV_MONEY_CONFIG.API_KEY,
        });
        const token = authResponse.data.token;
        // Verification
        const response = await axios_1.default.get(`${MOOV_MONEY_CONFIG.BASE_URL}/payments/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        const status = response.data.status;
        return {
            success: status === 'SUCCESS',
            transactionId: transactionId,
            status: status === 'SUCCESS' ? 'SUCCESS' : status === 'PENDING' ? 'PENDING' : 'FAILED',
            message: response.data.message,
        };
    }
    catch (error) {
        console.error('Moov Money verify error:', error);
        return {
            success: false,
            status: 'FAILED',
            message: 'Error while verifying payment.',
        };
    }
};
exports.verifyMoovMoneyPayment = verifyMoovMoneyPayment;
