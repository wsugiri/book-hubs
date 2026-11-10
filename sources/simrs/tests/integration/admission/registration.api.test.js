// tests/integration/admission/registration.api.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../../src/app.js';

test('Integration API: GET /health harus mengembalikan status HEALTHY 200', async () => {
  const res = await app.request('/health');
  assert.strictEqual(res.status, 200);

  const body = await res.json();
  assert.strictEqual(body.status, 'HEALTHY');
  assert.strictEqual(body.service, 'simrs-backend');
});

test('Integration API: POST /api/v1/admissions/outpatient gagal validasi jika payload kosong (422)', async () => {
  const res = await app.request('/api/v1/admissions/outpatient', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  assert.strictEqual(res.status, 422);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.errorCode, 'VALIDATION_FAILED');
});

test('Integration API: POST /api/v1/admissions/outpatient gagal jika BPJS tanpa bpjsCardNumber (422)', async () => {
  const res = await app.request('/api/v1/admissions/outpatient', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      patientId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      polyclinicId: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
      doctorScheduleId: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
      paymentType: 'BPJS'
    })
  });

  assert.strictEqual(res.status, 422);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.errorCode, 'VALIDATION_FAILED');
  assert.ok(body.details.fieldErrors.bpjsCardNumber);
});

