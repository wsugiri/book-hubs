// src/modules/admission/events/visit-registered.event.js
export const createVisitRegisteredEvent = (visit) => ({
  eventName: 'admission.visit.registered',
  occurredAt: new Date().toISOString(),
  payload: {
    visitId: visit.id,
    patientId: visit.patientId,
    polyclinicId: visit.polyclinicId,
    paymentType: visit.paymentType,
    registeredAt: visit.registeredAt
  }
});

