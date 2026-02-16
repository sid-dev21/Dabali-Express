"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Function to hash a password
const hashPassword = async (password) => {
    const salt = await bcryptjs_1.default.genSalt(10); // Generate a "salt" with 10 rounds
    return bcryptjs_1.default.hash(password, salt); // Hash the password with the generated salt
};
exports.hashPassword = hashPassword;
// Function to compare a password with a hashed password
const comparePassword = async (password, hashedPassword) => {
    return bcryptjs_1.default.compare(password, hashedPassword);
};
exports.comparePassword = comparePassword;
