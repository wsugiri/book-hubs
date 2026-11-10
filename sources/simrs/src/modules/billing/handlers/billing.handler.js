// src/modules/billing/handlers/billing.handler.js
import { sendSuccess } from '../../../core/http/response.js';
import * as invoiceService from '../services/invoice.service.js';

export const getInvoiceByVisitId = async (c) => {
  const { visitId } = c.req.param();
  const invoice = await invoiceService.getInvoiceByVisit(visitId);
  return sendSuccess(c, invoice, 'Data tagihan berhasil diambil');
};

