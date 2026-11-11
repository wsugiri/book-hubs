// src/modules/billing/index.js
// ADAPTER PATTERN: Otomatis mendeteksi apakah Billing berjalan lokal atau remote!
export { billingRoutes } from './routes.js';
export { defineBillingModels } from './models/index.js';
export { registerBillingSubscribers } from './subscribers/index.js';

import * as localBillingService from './services/invoice.service.js';
import { requestContext } from '../../core/http/context.js';
import { env } from '../../core/config/env.js';

export const billingService = {
  async initializeAdmissionInvoice(dto, options = {}) {
    const billingServiceUrl = env.BILLING_SERVICE_URL;

    // KASUS A: Modul Billing sudah diekstrak menjadi Microservice independen
    if (billingServiceUrl) {
      const store = requestContext.getStore();
      const requestId = options.requestId || store?.requestId || 'inter-module-call';

      const response = await fetch(`${billingServiceUrl}/api/v1/invoices/admission-init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
          'Authorization': `Bearer ${env.INTERNAL_SERVICE_SECRET}`
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
