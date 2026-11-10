// src/core/middlewares/auth.middleware.js
import { createUnauthorizedError } from '../errors/AppError.js';

export const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Mode fleksibel untuk dev/test: jika tanpa auth token dan environment development/test, gunakan mock actor
    if (process.env.NODE_ENV !== 'production') {
      c.set('user', {
        id: 'usr-default-nurse-01',
        name: 'Suster Default',
        role: 'NURSE'
      });
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
  c.set('user', {
    id: token === 'doctor-token' ? 'usr-doctor-01' : 'usr-nurse-01',
    name: token === 'doctor-token' ? 'dr. Budi Santoso, Sp.PD' : 'Ns. Siti Rahma, S.Kep',
    role: token === 'doctor-token' ? 'DOCTOR' : 'NURSE'
  });

  await next();
};

