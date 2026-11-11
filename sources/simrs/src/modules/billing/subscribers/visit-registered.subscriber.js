// src/modules/billing/subscribers/visit-registered.subscriber.js
import * as invoiceService from '../services/invoice.service.js';

export const handleVisitRegistered = async (event, options = {}) => {
  const { visitId, patientId, paymentType } = event.payload;

  await invoiceService.initializeAdmissionInvoice(
    { visitId, patientId, paymentType },
    { transaction: options.transaction }
  );
};

