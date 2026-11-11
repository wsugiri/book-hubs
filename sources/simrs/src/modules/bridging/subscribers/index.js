// src/modules/bridging/subscribers/index.js
import { handleVisitRegistered } from './visit-registered.subscriber.js';

export const registerBridgingSubscribers = (eventBus) => {
  eventBus.subscribe('admission.visit.registered', handleVisitRegistered);
};

