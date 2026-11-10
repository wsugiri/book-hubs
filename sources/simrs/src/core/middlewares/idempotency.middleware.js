// src/core/middlewares/idempotency.middleware.js
import { createAppError } from '../errors/AppError.js';

// Cache in-memory untuk memverifikasi idempotency key jangka pendek
const idempotencyStore = new Map();

export const idempotencyMiddleware = async (c, next) => {
  // Hanya berlaku untuk mutasi
  if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
    const idempotencyKey = c.req.header('idempotency-key');
    if (idempotencyKey) {
      if (idempotencyStore.has(idempotencyKey)) {
        const cached = idempotencyStore.get(idempotencyKey);
        if (cached.status === 'PROCESSING') {
          throw createAppError('Permintaan yang identik sedang diproses. Mohon tunggu.', 409, 'IDEMPOTENT_REQUEST_IN_PROGRESS');
        }
        return c.json(cached.body, cached.status);
      }

      idempotencyStore.set(idempotencyKey, { status: 'PROCESSING', createdAt: Date.now() });
      c.set('idempotencyKey', idempotencyKey);
    }
  }

  await next();
};

