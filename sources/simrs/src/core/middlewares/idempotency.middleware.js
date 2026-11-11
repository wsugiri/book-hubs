// src/core/middlewares/idempotency.middleware.js
import { createAppError } from '../errors/AppError.js';

// Cache in-memory untuk memverifikasi idempotency key jangka pendek
const idempotencyStore = new Map();
const TTL_MS = 60 * 1000; // 60 detik

export const idempotencyMiddleware = async (c, next) => {
  // Hanya berlaku untuk mutasi
  if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
    const idempotencyKey = c.req.header('idempotency-key');
    if (idempotencyKey) {
      const now = Date.now();
      if (idempotencyStore.has(idempotencyKey)) {
        const cached = idempotencyStore.get(idempotencyKey);
        if (cached.status === 'PROCESSING') {
          // Cegah stuck processing jika request sebelumnya macet lebih dari 30 detik
          if (now - cached.createdAt < 30000) {
            throw createAppError('Permintaan yang identik sedang diproses. Mohon tunggu.', 409, 'IDEMPOTENT_REQUEST_IN_PROGRESS');
          }
        } else if (cached.status === 'COMPLETED') {
          // Kembalikan response yang sama persis secara instan
          return c.json(cached.body, cached.statusCode);
        }
      }

      idempotencyStore.set(idempotencyKey, { status: 'PROCESSING', createdAt: now });
      c.set('idempotencyKey', idempotencyKey);

      await next();

      // Tangkap hasil response sukses dan simpan ke store
      try {
        if (c.res && c.res.status < 400) {
          const clonedRes = c.res.clone();
          const body = await clonedRes.json();
          idempotencyStore.set(idempotencyKey, {
            status: 'COMPLETED',
            statusCode: c.res.status,
            body,
            createdAt: now
          });
        } else {
          // Jika request gagal (4xx / 5xx), hapus key agar klien bisa melakukan retry
          idempotencyStore.delete(idempotencyKey);
        }
      } catch {
        // Fallback jika response bukan JSON
      }

      // Bersihkan entri yang sudah melampaui TTL untuk mencegah kebocoran memori
      for (const [key, val] of idempotencyStore.entries()) {
        if (now - val.createdAt > TTL_MS) {
          idempotencyStore.delete(key);
        }
      }
      return;
    }
  }

  await next();
};


