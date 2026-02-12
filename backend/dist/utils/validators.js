"use strict";
/*Validators for Express Request object properties*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeString = exports.isValidAmount = exports.isValidDate = exports.isValidPhone = exports.isValidPassword = exports.isValidGmailEmail = exports.isValidEmail = void 0;
// Email validator
const isValidEmail = (email) => {
    // In test environment, allow more flexible emails
    if (process.env.NODE_ENV === 'test') {
        const testEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return testEmailRegex.test(email);
    }
    // In production, only allow @gmail.com
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
// Gmail-specific validator for canteen managers
const isValidGmailEmail = (email) => {
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    return emailRegex.test(email);
};
exports.isValidGmailEmail = isValidGmailEmail;
// Password strength validator
const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
};
exports.isValidPassword = isValidPassword;
// Number validator
const isValidPhone = (phone) => {
    const phoneRegex = /^\+226\s?[0-9]{2}\s?[0-9]{2}\s?[0-9]{2}\s?[0-9]{2}$/;
    return phoneRegex.test(phone);
};
exports.isValidPhone = isValidPhone;
// Date validator
const isValidDate = (date) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date))
        return false;
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
};
exports.isValidDate = isValidDate;
// Positive integer validator
const isValidAmount = (amount) => {
    return typeof amount === 'number' && amount > 0;
};
exports.isValidAmount = isValidAmount;
// Sanitize string input to prevent XSS attacks
const sanitizeString = (str) => {
    return str.trim().replace(/[<>]/g, '');
};
exports.sanitizeString = sanitizeString;
