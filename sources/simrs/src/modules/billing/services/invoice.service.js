// src/modules/billing/services/invoice.service.js
import { createAppError } from '../../../core/errors/AppError.js';
import * as invoiceRepo from '../repositories/invoice.repository.js';

export const initializeAdmissionInvoice = async (dto, options = {}) => {
  const { visitId, patientId, paymentType } = dto;

  if (!visitId || !patientId) {
    throw createAppError(
      'Kontrak pemanggilan modul tidak valid: visitId dan patientId wajib ada',
      400,
      'INVALID_INTER_MODULE_PAYLOAD'
    );
  }

  // Tarif karcis pendaftaran rumah sakit
  const registrationFee = paymentType === 'BPJS' ? 0.00 : 25000.00;

  return await invoiceRepo.create(
    {
      visitId,
      patientId,
      totalAmount: registrationFee,
      status: paymentType === 'BPJS' ? 'PAID' : 'UNPAID',
      paymentType
    },
    options
  );
};

export const getInvoiceByVisit = async (visitId) => {
  const invoice = await invoiceRepo.findByVisitId(visitId);
  if (!invoice) {
    throw createAppError('Tagihan kunjungan tidak ditemukan', 404, 'INVOICE_NOT_FOUND');
  }
  return invoice;
};

