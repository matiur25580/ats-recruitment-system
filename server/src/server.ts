/*
 * LEARNING NOTE: Express application factory keeps HTTP wiring separate from process startup.
 * Interview tip: explain why tests import createApp without opening a production listener or connecting to a real deployment database.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import jobRoutes from './routes/jobRoutes';
import applicationRoutes from './routes/applicationRoutes';
import statsRoutes from './routes/statsRoutes';
import profileRoutes from './routes/profileRoutes';
import adminRoutes from './routes/adminRoutes';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler, notFoundHandler } from './middlewares/errorMiddleware';

dotenv.config();

export const createApp = (): express.Express => {
  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS'));
    },
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  app.use('/api/auth', authRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/health', (_req, res) => {
    res.json({ ok: true, message: 'ATS Backend running' });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

export const app = createApp();

export const startServer = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;
  const jwtSecret = process.env.JWT_SECRET;

  if (!mongoUri) throw new Error('MONGO_URI is required');
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET is required and must be at least 32 characters long');
  }

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected successfully');

  const PORT = Number(process.env.PORT) || 5000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`ATS backend listening on port ${PORT}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received; shutting down gracefully`);
    server.close(() => {
      void mongoose.disconnect().finally(() => process.exit(0));
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
};

// Importing this module from tests must never start a listener or connect to production data.
if (require.main === module) {
  startServer().catch((error: unknown) => {
    console.error('Unable to start ATS backend', error);
    process.exit(1);
  });
}
