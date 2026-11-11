// src/modules/admission/services/registration.service.js
import { createAppError } from '../../../core/errors/AppError.js';
import { noopEventBus } from '../../../core/events/event-bus.js';
import { createVisitRegisteredEvent } from '../events/visit-registered.event.js';

export const makeRegistrationService = ({
  db,
  visitRepo,
  eventBus = noopEventBus,
  clock = () => new Date()
}) => ({
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

      // 3. Publikasikan Domain Event (Subscriber Billing, Bridging Outbox, & EMR merespons secara independen)
      await eventBus.publish(createVisitRegisteredEvent(newVisit), { transaction: t });

      return newVisit;
    });
  },

  async dischargePatient(visitId) {
    const visit = await visitRepo.findById(visitId);
    if (!visit) {
      throw createAppError('Data kunjungan tidak ditemukan', 404, 'VISIT_NOT_FOUND');
    }
    return await visitRepo.updateStatus(visitId, 'DISCHARGED');
  }
});
