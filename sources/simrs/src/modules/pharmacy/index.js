// src/modules/pharmacy/index.js
export { pharmacyRoutes } from './routes.js';
export { definePharmacyModels } from './models/index.js';

import * as pharmacyService from './services/pharmacy.service.js';

export const pharmacyServiceContract = {
  getPrescriptionsByVisit: pharmacyService.getPrescriptionsByVisit
};

