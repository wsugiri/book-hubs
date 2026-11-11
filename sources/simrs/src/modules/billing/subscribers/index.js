// src/modules/billing/subscribers/index.js
import { handleVisitRegistered } from './visit-registered.subscriber.js';

export const registerBillingSubscribers = (eventBus) => {
  eventBus.subscribe('admission.visit.registered', handleVisitRegistered);
};

