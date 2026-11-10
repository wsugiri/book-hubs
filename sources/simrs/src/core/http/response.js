// src/core/http/response.js
const buildMeta = (c, extra = {}) => ({
  requestId: c?.get ? c.get('requestId') || 'req-untracked' : 'req-untracked',
  timestamp: new Date().toISOString(),
  ...extra
});

export const sendSuccess = (c, data = null, message = 'Success', statusCode = 200, meta = {}) =>
  c.json({ success: true, message, data, meta: buildMeta(c, meta) }, statusCode);

export const sendError = (c, { statusCode = 500, errorCode = 'INTERNAL_ERROR', message = 'Error', details = null }) =>
  c.json({ success: false, errorCode, message, details, meta: buildMeta(c) }, statusCode);

