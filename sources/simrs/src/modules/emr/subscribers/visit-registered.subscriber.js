// src/modules/emr/subscribers/visit-registered.subscriber.js
import { logger } from '../../../core/config/logger.js';

export const handleVisitRegistered = async (event) => {
  const { visitId, patientId, polyclinicId } = event.payload;
  logger.info(
    { visitId, patientId, polyclinicId },
    '[EMR SUBSCRIBER] Menyiapkan lembar awal pengkajian medis untuk kunjungan baru'
  );
  // Di sini dapat dilakukan auto-insert draft CPPT / antrean rekam medis poli jika diperlukan
};

