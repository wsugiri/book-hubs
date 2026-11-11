// src/modules/bridging/subscribers/visit-registered.subscriber.js
import * as outboxService from '../services/outbox.service.js';

export const handleVisitRegistered = async (event, options = {}) => {
  const { visitId, paymentType } = event.payload;

  // Modul Bridging menentukan sendiri tujuan integrasi eksternalnya
  await outboxService.scheduleOutboxTask(
    {
      destination: paymentType === 'BPJS' ? 'BPJS_VCLAIM' : 'SATUSEHAT_FHIR',
      eventType: event.eventName,
      idempotencyKey: `admission-visit-${visitId}`,
      payload: event.payload
    },
    { transaction: options.transaction }
  );
};
