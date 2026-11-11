// src/modules/admission/services/index.js (Default assembly)
import { sequelize } from '../../../core/database/index.js';
import * as visitRepo from '../repositories/visit.repository.js';
import { eventBus } from '../../../core/events/event-bus.js';
import { makeRegistrationService } from './registration.service.js';

export const registrationService = makeRegistrationService({
  db: sequelize,
  visitRepo,
  eventBus
});
