"use strict";
/* Helper functions for various utilities */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPastDate = exports.isFutureDate = exports.formatDateForDB = exports.calculatePagination = exports.generatePaymentReference = exports.formatAmount = exports.calculateEndDate = void 0;
const types_1 = require("../types");
/* Function to calculate the end date of a subscription based on its type */
const calculateEndDate = (startDate, type) => {
    const endDate = new Date(startDate);
    switch (type) {
        case types_1.SubscriptionType.MONTHLY:
            endDate.setMonth(endDate.getMonth() + 1);
            break;
        case types_1.SubscriptionType.TRIMESTER:
            endDate.setMonth(endDate.getMonth() + 3);
            break;
        case types_1.SubscriptionType.ANNUAL:
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;
    }
    return endDate;
};
exports.calculateEndDate = calculateEndDate;
// Format money in XOF
const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-BF', {
        style: 'currency',
        currency: 'XOF',
    }).format(amount);
};
exports.formatAmount = formatAmount;
// Generate a random reference string for payments
const generatePaymentReference = (method) => {
    const prefix = method === 'ORANGE_MONEY' ? 'OM' :
        method === 'MOOV_MONEY' ? 'MM' : 'CASH';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${date}${random}`;
};
exports.generatePaymentReference = generatePaymentReference;
// Calculate pagination offsets
const calculatePagination = (page = 1, limit = 10, total) => {
    const offset = (page - 1) * limit;
    const pages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        pages,
        offset,
    };
};
exports.calculatePagination = calculatePagination;
// Format date to YYYY-MM-DD 
const formatDateForDB = (date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
};
exports.formatDateForDB = formatDateForDB;
// Check if two dates are in the future 
const isFutureDate = (date) => {
    return date > new Date();
};
exports.isFutureDate = isFutureDate;
// Check if date is in the past
const isPastDate = (date) => {
    return date < new Date();
};
exports.isPastDate = isPastDate;
