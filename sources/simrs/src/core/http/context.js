// src/core/http/context.js
import { AsyncLocalStorage } from 'node:async_hooks';

export const requestContext = new AsyncLocalStorage();

export const contextMiddleware = async (c, next) => {
  const store = {
    requestId: c.get('requestId') || 'system',
    actorId: c.get('user')?.id || 'unauthenticated',
    actorRole: c.get('user')?.role || 'ANONYMOUS',
    clientIp: c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || '127.0.0.1'
  };

  await requestContext.run(store, async () => {
    await next();
  });
};

