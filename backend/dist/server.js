"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
const database_1 = require("./config/database");
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const schoolRoutes_1 = __importDefault(require("./routes/schoolRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const menuRoutes_1 = __importDefault(require("./routes/menuRoutes"));
const subscriptionRoutes_1 = __importDefault(require("./routes/subscriptionRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
// Import error handler
const errorHandler_1 = require("./middlewares/errorHandler");
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/schools', schoolRoutes_1.default);
app.use('/api/users', userRoutes_1.default); // Added route for userRoutes
app.use('/api/students', studentRoutes_1.default);
app.use('/api/menus', menuRoutes_1.default);
app.use('/api/subscriptions', subscriptionRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/attendance', attendanceRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'API is running' });
});
// 404 handler (must be before error handler)
app.use(errorHandler_1.notFound);
// Error handler middleware (must be last)
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 5000;
// Set mongoose to use strict query mode
mongoose_1.default.set('strictQuery', false);
// Connect to database and start server
(0, database_1.connectDB)().then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});
exports.default = app;
