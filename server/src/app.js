import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { authenticate } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { i18nMiddleware } from './i18n/index.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import saleRoutes from './routes/sales.js';
import purchaseRoutes from './routes/purchases.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationRoutes from './routes/notifications.js';
import settingsRoutes from './routes/settings.js';
import { categoriesRouter, customersRouter, expensesRouter, suppliersRouter } from './routes/resources.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true }));
  app.use(i18nMiddleware);
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);

  // Everything below requires a valid token.
  app.use('/api', authenticate);
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/suppliers', suppliersRouter);
  app.use('/api/sales', saleRoutes);
  app.use('/api/purchases', purchaseRoutes);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api', notFound);

  // In production, serve the built React client.
  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
