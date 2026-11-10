// tests/unit/admission/registration.service.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRegistrationService } from '../../../src/modules/admission/services/registration.service.js';

const fakeDb = {
  transaction: async (fn) => fn({})
};

test('Pendaftaran: menolak pendaftaran jika pasien masih memiliki kunjungan aktif hari ini', async () => {
  const service = makeRegistrationService({
    db: fakeDb,
    visitRepo: {
      findActiveVisitToday: async () => ({ id: 'v-existing-01', polyclinicId: 'poli-01' }),
      create: async () => {
        assert.fail('create() seharusnya tidak dipanggil');
      }
    },
    billingService: {
      initializeAdmissionInvoice: async () => {
        assert.fail('initializeAdmissionInvoice() seharusnya tidak dipanggil');
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

test('Pendaftaran: berhasil membuat kunjungan baru dan menerbitkan tagihan karcis', async () => {
  let invoiceCalled = false;

  const service = makeRegistrationService({
    db: fakeDb,
    visitRepo: {
      findActiveVisitToday: async () => null,
      create: async (data) => ({ id: 'v-new-01', ...data })
    },
    billingService: {
      initializeAdmissionInvoice: async (dto) => {
        invoiceCalled = true;
        assert.strictEqual(dto.visitId, 'v-new-01');
        assert.strictEqual(dto.patientId, 'p-100');
        return { id: 'inv-01' };
      }
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
  assert.strictEqual(invoiceCalled, true);
});

