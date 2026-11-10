// src/modules/emr/index.js
export { emrRoutes } from './routes.js';
export { defineEmrModels } from './models/index.js';

import * as emrService from './services/emr.service.js';

export const emrServiceContract = {
  getRecordByVisit: emrService.getRecordByVisit
};

