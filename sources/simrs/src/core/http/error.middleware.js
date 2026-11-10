// src/core/http/error.middleware.js
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { UniqueConstraintError, ForeignKeyConstraintError, ValidationError as SequelizeValidationError } from 'sequelize';
import { isAppError } from '../errors/AppError.js';
import { sendError } from './response.js';
import { logger } from '../config/logger.js';

export const globalErrorHandler = (err, c) => {
  if (isAppError(err)) {
    return sendError(c, err);
  }

  if (err instanceof ZodError) {
    return sendError(c, {
      statusCode: 422,
      errorCode: 'VALIDATION_FAILED',
      message: 'Data tidak valid',
      details: err.flatten()
    });
  }

  if (err instanceof UniqueConstraintError) {
    return sendError(c, {
      statusCode: 409,
      errorCode: 'DUPLICATE_RESOURCE',
      message: 'Data sudah ada',
      details: err.fields
    });
  }

  if (err instanceof ForeignKeyConstraintError) {
    return sendError(c, {
      statusCode: 422,
      errorCode: 'INVALID_REFERENCE',
      message: 'Referensi data tidak ditemukan'
    });
  }

  if (err instanceof SequelizeValidationError) {
    return sendError(c, {
      statusCode: 422,
      errorCode: 'VALIDATION_FAILED',
      message: 'Data tidak valid',
      details: err.errors.map((e) => ({ field: e.path, message: e.message }))
    });
  }

  if (err instanceof HTTPException) {
    return sendError(c, {
      statusCode: err.status,
      errorCode: 'HTTP_ERROR',
      message: err.message
    });
  }

  // Galat tak terduga: log detail lengkap, jangan bocorkan stack trace ke klien
  logger.error({ err, requestId: c.get ? c.get('requestId') : undefined }, 'Unhandled error');
  return sendError(c, {
    statusCode: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    message: 'Terjadi kesalahan sistem internal. Silakan hubungi tim IT Rumah Sakit.'
  });
};

