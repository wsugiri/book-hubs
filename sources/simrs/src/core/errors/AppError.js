// src/core/errors/AppError.js
// Factory function murni (Functional & Zero-Class)
export const createAppError = (message, statusCode = 400, errorCode = 'BAD_REQUEST', details = null) => {
  const error = new Error(message);
  error.name = 'AppError';
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  error.details = details;
  error.isAppError = true;
  return error;
};

export const createNotFoundError = (message = 'Resource not found', errorCode = 'RESOURCE_NOT_FOUND') =>
  createAppError(message, 404, errorCode);

export const createConflictError = (message = 'Conflict state', errorCode = 'CONFLICT_STATE', details = null) =>
  createAppError(message, 409, errorCode, details);

export const createUnauthorizedError = (message = 'Unauthorized access', errorCode = 'UNAUTHORIZED') =>
  createAppError(message, 401, errorCode);

export const createForbiddenError = (message = 'Forbidden action', errorCode = 'FORBIDDEN') =>
  createAppError(message, 403, errorCode);

export const isAppError = (err) => Boolean(err && (err.isAppError === true || err.name === 'AppError'));

