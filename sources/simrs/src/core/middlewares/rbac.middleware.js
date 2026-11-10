// src/core/middlewares/rbac.middleware.js
import { createForbiddenError } from '../errors/AppError.js';

export const requireRole = (...allowedRoles) => {
  return async (c, next) => {
    const user = c.get('user');

    if (!user || !user.role) {
      throw createForbiddenError('Akses ditolak: role pengguna tidak teridentifikasi');
    }

    if (!allowedRoles.includes(user.role) && !allowedRoles.includes('*')) {
      throw createForbiddenError(`Akses ditolak: role ${user.role} tidak memiliki izin mengakses sumber daya ini`);
    }

    await next();
  };
};

