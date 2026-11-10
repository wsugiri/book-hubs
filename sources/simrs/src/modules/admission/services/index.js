// src/modules/admission/services/index.js (Default assembly)
import { sequelize } from '../../../core/database/index.js';
import * as visitRepo from '../repositories/visit.repository.js';
import { billingService } from '../../billing/index.js';
import { makeRegistrationService } from './registration.service.js';

export const registrationService = makeRegistrationService({
  db: sequelize,
  visitRepo,
  billingService
});

