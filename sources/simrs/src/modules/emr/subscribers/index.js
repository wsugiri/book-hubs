// src/modules/emr/subscribers/index.js
import { handleVisitRegistered } from './visit-registered.subscriber.js';

export const registerEmrSubscribers = (eventBus) => {
  eventBus.subscribe('admission.visit.registered', handleVisitRegistered);
};
