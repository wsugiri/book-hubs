// src/modules/bridging/clients/api.client.js
import { logger } from '../../../core/config/logger.js';

export const sendToBpjsOrSatusehat = async (destination, eventType, payload) => {
  logger.info({ destination, eventType }, '[BRIDGING CLIENT] Mengirim payload ke API eksternal');

  // Simulasi pemanggilan HTTP ke API BPJS / SATUSEHAT dengan timeout aman
  if (process.env.NODE_ENV === 'test') {
    return { status: 'OK', destination, eventType };
  }

  // Simulasi pengiriman sukses
  return {
    success: true,
    sentAt: new Date().toISOString()
  };
};

