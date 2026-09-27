import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/auth.js';
import fieldRoutes from './routes/fields.js';
import searchRoutes from './routes/search.js';
import userRoutes from './routes/users.js';
import assistantRoutes from './routes/assistant.js';
import listingRoutes from './routes/listings.js';
import notificationRoutes from './routes/notifications.js';
import cropHealthRoutes from './routes/cropHealth.js';
import diaryRoutes from './routes/diary.js';
import marketRoutes from './routes/market.js';
import weatherRoutes from './routes/weather.js';
import adminRoutes from './routes/admin.js';
import soilRoutes from './routes/soil.js';
import mediaRoutes from './routes/media.js';
import { errorHandler } from './middleware/index.js';


// Builds the Express app without touching the network or database, so it can be tested directly.
export function createApp() {
  const { CLIENT_ORIGIN = 'http://localhost:5173' } = process.env;
  const app = express();
  const limiter = (limit) => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false });

  app.use(helmet());
  app.use(cors({ origin: CLIENT_ORIGIN.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '100kb' }));
  app.use(mongoSanitize());
  app.use('/api', limiter(300));

  app.get('/api/health', (req, res) =>
    res.json({ database: mongoose.connection.readyState === 1 ? 'connected' : 'unavailable', time: new Date().toISOString() })
  );
  app.use('/api/auth', limiter(30), authRoutes);
  app.use('/api/soil', soilRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/fields', fieldRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/assistant', assistantRoutes);
  app.use('/api/listings', listingRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/crop-health', cropHealthRoutes);
  app.use('/api/diary', diaryRoutes);
  app.use('/api/market', marketRoutes);
  app.use('/api/weather', weatherRoutes);
  app.use('/api/admin', adminRoutes);
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}
