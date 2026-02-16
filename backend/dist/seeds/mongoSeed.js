"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedMongoDB = void 0;
const User_1 = __importDefault(require("../models/User"));
const School_1 = __importDefault(require("../models/School"));
const Student_1 = __importDefault(require("../models/Student"));
const seedMongoDB = async () => {
    try {
        // Clear existing data
        await User_1.default.deleteMany({});
        await School_1.default.deleteMany({});
        await Student_1.default.deleteMany({});
        // Create sample users
        const users = await User_1.default.insertMany([
            {
                email: 'admin@dabali-express.com',
                password: '$2a$10$8K1p/a0dhrxiowP.dnkgNORTWgdEDHn5L2/xjpEWuC.QQv4rKO9jO',
                role: 'SUPER_ADMIN',
                first_name: 'Super',
                last_name: 'Admin'
            },
            // Add more users as needed
        ]);
        console.log('Database seeded successfully');
    }
    catch (error) {
        console.error('Error seeding database:', error);
    }
};
exports.seedMongoDB = seedMongoDB;
