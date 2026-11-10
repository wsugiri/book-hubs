// src/modules/admission/services/registration.service.js
import { createAppError } from '../../../core/errors/AppError.js';

export const makeRegistrationService = ({ db, visitRepo, billingService, clock = () => new Date() }) => ({
  async createOutpatientVisit(payload, actor) {
    return await db.transaction(async (t) => {
      // 1. Validasi Aturan Medis: Pasien tidak boleh punya kunjungan aktif ganda di hari yang sama
      const activeVisit = await visitRepo.findActiveVisitToday(payload.patientId, { transaction: t });
      if (activeVisit) {
        throw createAppError(
          'Pasien masih terdaftar dalam kunjungan aktif hari ini di poli lain',
          409,
          'ACTIVE_VISIT_EXISTS',
          { existingVisitId: activeVisit.id, polyclinicId: activeVisit.polyclinicId }
        );
      }

      // 2. Buat data kunjungan melalui repository lokal
      const newVisit = await visitRepo.create(
        {
          ...payload,
          status: 'WAITING_FOR_TRIAGE',
          registeredBy: actor.id,
          registeredAt: clock()
        },
        { transaction: t }
      );

      // 3. Komunikasi Antar-Modul: Terbitkan tagihan awal karcis admisi melalui modul Billing
      if (billingService && typeof billingService.initializeAdmissionInvoice === 'function') {
        await billingService.initializeAdmissionInvoice(
          {
            visitId: newVisit.id,
            patientId: payload.patientId,
            paymentType: payload.paymentType
          },
          { transaction: t }
        );
      }

      return newVisit;
    });
  },

  async dischargePatient(visitId, actor) {
    const visit = await visitRepo.findById(visitId);
    if (!visit) {
      throw createAppError('Data kunjungan tidak ditemukan', 404, 'VISIT_NOT_FOUND');
    }
    return await visitRepo.updateStatus(visitId, 'DISCHARGED');
  }
});

