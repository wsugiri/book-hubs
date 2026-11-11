// src/modules/bridging/services/circuit-breaker.js
import { logger } from '../../../core/config/logger.js';

export const createCircuitBreaker = ({ name = 'default', failureThreshold = 5, cooldownPeriodMs = 30000 } = {}) => {
  let failureCount = 0;
  let state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  let nextAttempt = Date.now();

  const reset = () => {
    failureCount = 0;
    state = 'CLOSED';
  };

  const trip = () => {
    state = 'OPEN';
    nextAttempt = Date.now() + cooldownPeriodMs;
    logger.error({ name, failureCount, cooldownPeriodMs }, '[CIRCUIT BREAKER] Sirkuit terbuka (OPEN)!');
  };

  const recordFailure = () => {
    failureCount += 1;
    if (state === 'HALF_OPEN' || failureCount >= failureThreshold) {
      trip();
    }
  };

  const execute = async (asyncAction, fallbackAction) => {
    if (state === 'OPEN') {
      if (Date.now() < nextAttempt) {
        logger.warn({ name }, '[CIRCUIT BREAKER] Sirkuit sedang OPEN. Mengalihkan ke fallback.');
        if (typeof fallbackAction === 'function') return fallbackAction();
        throw new Error(`Circuit breaker [${name}] sedang OPEN`);
      }
      state = 'HALF_OPEN';
    }

    try {
      const result = await asyncAction();
      reset();
      return result;
    } catch (err) {
      recordFailure();
      if (state === 'OPEN' && typeof fallbackAction === 'function') {
        return fallbackAction();
      }
      throw err;
    }
  };

  return {
    execute,
    reset,
    getState: () => state,
    getFailureCount: () => failureCount
  };
};
