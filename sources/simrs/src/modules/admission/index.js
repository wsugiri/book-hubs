// src/modules/admission/index.js
export { admissionRoutes } from './routes.js';
export { defineAdmissionModels } from './models/index.js';

import { registrationService } from './services/index.js';
import * as visitQueryService from './services/visit-query.service.js';

export const admissionService = {
  getVisitSummary: visitQueryService.getSummaryById,
  checkActiveVisit: visitQueryService.isPatientCurrentlyAdmitted,
  markPatientAsDischarged: registrationService.dischargePatient
};

