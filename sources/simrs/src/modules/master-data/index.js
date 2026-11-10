// src/modules/master-data/index.js
export { masterDataRoutes } from './routes.js';
export { defineMasterDataModels } from './models/index.js';

import * as masterService from './services/master-data.service.js';

export const masterDataService = {
  getPolyclinicDetail: masterService.getPolyclinicDetail,
  getAllPolyclinics: masterService.getAllPolyclinics
};

