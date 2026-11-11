// tests/unit/admission/registration.service.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRegistrationService } from '../../../src/modules/admission/services/registration.service.js';
import { createEventBus } from '../../../src/core/events/event-bus.js';

const fakeDb = {
  transaction: async (fn) => fn({ id: 'trx-mock-01' })
};

test('Pendaftaran: menolak pendaftaran jika pasien masih memiliki kunjungan aktif hari ini', async () => {
  const service = makeRegistrationService({
    db: fakeDb,
    visitRepo: {
      findActiveVisitToday: async () => ({ id: 'v-existing-01', polyclinicId: 'poli-01' }),
      create: async () => {
        assert.fail('create() seharusnya tidak dipanggil');
      }
    }
  });

  await assert.rejects(
    async () => {
      await service.createOutpatientVisit(
        {
          patientId: 'p-1',
          polyclinicId: 'poli-01',
          doctorScheduleId: 'doc-01',
          paymentType: 'PRIBADI'
        },
        { id: 'usr-nurse-1' }
      );
    },
    (err) => {
      assert.strictEqual(err.errorCode, 'ACTIVE_VISIT_EXISTS');
      assert.strictEqual(err.statusCode, 409);
      return true;
    }
  );
});

test('Pendaftaran: berhasil membuat kunjungan baru secara independen tanpa bergantung ke modul lain', async () => {
  const service = makeRegistrationService({
    db: fakeDb,
    visitRepo: {
      findActiveVisitToday: async () => null,
      create: async (data) => ({ id: 'v-new-01', ...data })
    }
  });

  const result = await service.createOutpatientVisit(
    {
      patientId: 'p-100',
      polyclinicId: 'poli-01',
      doctorScheduleId: 'doc-01',
      paymentType: 'PRIBADI'
    },
    { id: 'usr-nurse-1' }
  );

  assert.strictEqual(result.id, 'v-new-01');
  assert.strictEqual(result.status, 'WAITING_FOR_TRIAGE');
});

test('Pendaftaran: menerbitkan event admission.visit.registered ke subscriber (Billing, Bridging, EMR) dalam transaksi yang sama', async () => {
  const localBus = createEventBus();
  const reactions = [];

  // Simulasi subscriber independen dari modul Billing & Bridging
  localBus.subscribe('admission.visit.registered', async (event, options) => {
    reactions.push({
      subscriber: 'billing',
      visitId: event.payload.visitId,
      trxId: options.transaction?.id
    });
  });

  localBus.subscribe('admission.visit.registered', async (event, options) => {
    reactions.push({
      subscriber: 'bridging',
      paymentType: event.payload.paymentType,
      trxId: options.transaction?.id
    });
  });

  const service = makeRegistrationService({
    db: fakeDb,
    visitRepo: {
      findActiveVisitToday: async () => null,
      create: async (data) => ({ id: 'v-new-02', ...data })
    },
    eventBus: localBus
  });

  const result = await service.createOutpatientVisit(
    {
      patientId: 'p-200',
      polyclinicId: 'poli-jantung-01',
      doctorScheduleId: 'doc-02',
      paymentType: 'BPJS'
    },
    { id: 'usr-nurse-1' }
  );

  assert.strictEqual(result.id, 'v-new-02');
  assert.strictEqual(reactions.length, 2);
  assert.deepStrictEqual(reactions[0], {
    subscriber: 'billing',
    visitId: 'v-new-02',
    trxId: 'trx-mock-01'
  });
  assert.deepStrictEqual(reactions[1], {
    subscriber: 'bridging',
    paymentType: 'BPJS',
    trxId: 'trx-mock-01'
  });
});
