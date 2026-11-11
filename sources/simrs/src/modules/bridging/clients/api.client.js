// src/modules/bridging/clients/api.client.js
import { logger } from '../../../core/config/logger.js';
import { createCircuitBreaker } from '../services/circuit-breaker.js';

// Isolasi Circuit Breaker per destinasi agar gangguan BPJS tidak memutus jalur SATUSEHAT
const breakers = {
  BPJS_VCLAIM: createCircuitBreaker({ name: 'BPJS_VCLAIM', failureThreshold: 5, cooldownPeriodMs: 30000 }),
  BPJS_ANTROL: createCircuitBreaker({ name: 'BPJS_ANTROL', failureThreshold: 5, cooldownPeriodMs: 30000 }),
  SATUSEHAT_FHIR: createCircuitBreaker({ name: 'SATUSEHAT_FHIR', failureThreshold: 5, cooldownPeriodMs: 30000 })
};

export const sendToBpjsOrSatusehat = async (destination, eventType, payload) => {
  const breaker = breakers[destination] || createCircuitBreaker({ name: destination });

  return await breaker.execute(async () => {
    logger.info({ destination, eventType }, '[BRIDGING CLIENT] Mengirim payload ke API eksternal');

    if (process.env.NODE_ENV === 'test') {
      return { status: 'OK', destination, eventType };
    }

    // Simulasi pengiriman sukses dengan proteksi circuit breaker
    return {
      success: true,
      destination,
      eventType,
      sentAt: new Date().toISOString()
    };
  });
};
