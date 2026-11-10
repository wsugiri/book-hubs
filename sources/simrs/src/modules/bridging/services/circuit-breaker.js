// src/modules/bridging/services/circuit-breaker.js
export const createCircuitBreaker = ({ failureThreshold = 5, cooldownPeriodMs = 30000 } = {}) => {
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
    console.error(`[CIRCUIT BREAKER] Terbuka! Kegagalan: ${failureCount}. Cooldown ${cooldownPeriodMs}ms`);
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
        console.warn('[CIRCUIT BREAKER] Sirkuit sedang OPEN. Mengalihkan ke fallback.');
        return fallbackAction();
      }
      state = 'HALF_OPEN';
    }

    try {
      const result = await asyncAction();
      reset();
      return result;
    } catch (err) {
      recordFailure();
      if (state === 'OPEN') {
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

