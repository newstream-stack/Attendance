import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
import allowedIpRouter from './routes/allowedIp.routes';
import attendanceRouter from './routes/attendance.routes';
import leaveRouter from './routes/leave.routes';
import overtimeRouter from './routes/overtime.routes';
import proxyRouter from './routes/proxy.routes';
import notificationRouter from './routes/notification.routes';
import reportRouter from './routes/report.routes';
import departmentRouter from './routes/department.routes';

const app = express();

// Security
app.use(helmet());

// CORS — allow frontend dev origin with credentials
app.use(
  cors({
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/allowed-ips', allowedIpRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/leave', leaveRouter);
app.use('/api/v1/overtime', overtimeRouter);
app.use('/api/v1/proxy', proxyRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/departments', departmentRouter);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
