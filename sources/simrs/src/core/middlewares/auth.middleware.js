// src/core/middlewares/auth.middleware.js
import { createUnauthorizedError } from '../errors/AppError.js';
import { requestContext } from '../http/context.js';

export const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('authorization');

  let user = null;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Mode fleksibel untuk dev/test: jika tanpa auth token dan environment development/test, gunakan mock actor
    if (process.env.NODE_ENV !== 'production') {
      user = {
        id: 'usr-default-nurse-01',
        name: 'Suster Default',
        role: 'NURSE'
      };
      c.set('user', user);
      
      // Sinkronisasikan ke request context agar terbaca oleh audit-hook
      const store = requestContext.getStore();
      if (store) {
        store.actorId = user.id;
        store.actorRole = user.role;
      }

      return await next();
    }
    throw createUnauthorizedError('Token otentikasi Bearer wajib disertakan');
  }

  const token = authHeader.replace('Bearer ', '').trim();
  // Simulasi verifikasi JWT token sederhana
  if (!token) {
    throw createUnauthorizedError('Token otentikasi tidak valid');
  }

  // Set mock user context berdasarkan token
  user = {
    id: token === 'doctor-token' ? 'usr-doctor-01' : 'usr-nurse-01',
    name: token === 'doctor-token' ? 'dr. Budi Santoso, Sp.PD' : 'Ns. Siti Rahma, S.Kep',
    role: token === 'doctor-token' ? 'DOCTOR' : 'NURSE'
  };
  c.set('user', user);

  // Sinkronisasikan ke request context agar terbaca oleh audit-hook
  const store = requestContext.getStore();
  if (store) {
    store.actorId = user.id;
    store.actorRole = user.role;
  }

  await next();
};

