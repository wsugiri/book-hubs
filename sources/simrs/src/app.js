// src/app.js
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { globalErrorHandler } from './core/http/error.middleware.js';
import { contextMiddleware } from './core/http/context.js';
import { authMiddleware } from './core/middlewares/auth.middleware.js';
import { idempotencyMiddleware } from './core/middlewares/idempotency.middleware.js';
import { sequelize } from './core/database/index.js';
import { registerModels } from './core/database/register-models.js';

// Inisialisasi model-model domain dan hook database
registerModels(sequelize);

// Import router resmi dari masing-masing Bounded Context
import { masterDataRoutes } from './modules/master-data/index.js';
import { admissionRoutes } from './modules/admission/index.js';
import { emrRoutes } from './modules/emr/index.js';
import { pharmacyRoutes } from './modules/pharmacy/index.js';
import { billingRoutes } from './modules/billing/index.js';
import { bridgingRoutes } from './modules/bridging/index.js';

const app = new Hono();

// Global Middleware Stack
app.use('*', requestId());
app.use('*', contextMiddleware);
app.use('*', idempotencyMiddleware);
app.use('/api/*', authMiddleware);

app.onError(globalErrorHandler);

// Mounting Rute Modul (Semua modul terisolasi di bawah path masing-masing)
const api = new Hono();
api.route('/master-data', masterDataRoutes);
api.route('/admissions', admissionRoutes);
api.route('/emr', emrRoutes);
api.route('/pharmacy', pharmacyRoutes);
api.route('/billing', billingRoutes);
api.route('/bridging', bridgingRoutes);

app.route('/api/v1', api);

// Health check endpoint
app.get('/health', (c) =>
  c.json({
    status: 'HEALTHY',
    service: 'simrs-backend',
    timestamp: new Date().toISOString()
  })
);

export default app;

