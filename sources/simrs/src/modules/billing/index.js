// src/modules/billing/index.js
// ADAPTER PATTERN: Otomatis mendeteksi apakah Billing berjalan lokal atau remote!
export { billingRoutes } from './routes.js';
export { defineBillingModels } from './models/index.js';

import * as localBillingService from './services/invoice.service.js';

const BILLING_MICROSERVICE_URL = process.env.BILLING_SERVICE_URL;

export const billingService = {
  async initializeAdmissionInvoice(dto, options = {}) {
    // KASUS A: Modul Billing sudah diekstrak menjadi Microservice independen
    if (BILLING_MICROSERVICE_URL) {
      const response = await fetch(`${BILLING_MICROSERVICE_URL}/api/v1/invoices/admission-init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': options.requestId || 'inter-module-call',
          'Authorization': `Bearer ${process.env.INTERNAL_SERVICE_SECRET}`
        },
        body: JSON.stringify(dto),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal memanggil Remote Billing Microservice');
      }

      return await response.json();
    }

    // KASUS B: Masih berada dalam satu proses Modular Monolith (In-Memory)
    return await localBillingService.initializeAdmissionInvoice(dto, options);
  },

  async getInvoiceByVisit(visitId) {
    return await localBillingService.getInvoiceByVisit(visitId);
  }
};

