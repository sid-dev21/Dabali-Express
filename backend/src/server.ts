// server.ts

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/authRoutes';
import schoolRoutes from './routes/schoolRoutes';
import studentRoutes from './routes/studentRoutes';
import menuRoutes from './routes/menuRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import paymentRoutes from './routes/paymentRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import reportRoutes from './routes/reportRoutes';
import notificationRoutes from './routes/notificationRoutes';

// Import error handler
import { errorHandler, notFound } from './middlewares/errorHandler';

// Import database connection
import { testConnection } from './config/database';

// Load environment variables
dotenv.config();

const app = express();

// Basic middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP security
app.use(helmet());

// CORS (adjust origin if needed)
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// HTTP logs
app.use(morgan('dev'));

// Global rate limiting on /api
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
});

app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler (must be before error handler)
app.use(notFound);

// Error handler middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Test database connection on startup
testConnection()
  .then((connected) => {
    if (connected) {
      console.log('Database connection successful');
    } else {
      console.warn('Database connection failed - server will start but database operations may fail');
    }
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
