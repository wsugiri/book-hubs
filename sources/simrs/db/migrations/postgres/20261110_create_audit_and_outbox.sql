-- db/migrations/postgres/20261110_create_audit_and_outbox.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- Untuk gen_random_uuid()

-- 1. Tabel Master Data & Admisi (Skema Dasar)
CREATE TABLE IF NOT EXISTS admission_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  polyclinic_id UUID NOT NULL,
  doctor_schedule_id UUID NOT NULL,
  payment_type VARCHAR(32) NOT NULL,
  bpjs_card_number VARCHAR(32) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'WAITING_FOR_TRIAGE',
  registered_by VARCHAR(64) NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admission_visits_patient ON admission_visits (patient_id, created_at);

-- 2. Tabel Billing Invoices
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  total_amount NUMERIC(14, 2) DEFAULT 0.00,
  status VARCHAR(32) DEFAULT 'UNPAID',
  payment_type VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_visit ON billing_invoices (visit_id);

-- 3. Tabel Audit Trail Rekam Medis (Append-Only dengan GIN Index)
CREATE TABLE IF NOT EXISTS clinical_audit_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(64) NOT NULL,
  record_id VARCHAR(64) NOT NULL,
  action VARCHAR(16) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  actor_id VARCHAR(64) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  request_id VARCHAR(64) NOT NULL,
  client_ip VARCHAR(45) NOT NULL,
  old_values JSONB NULL,
  new_values JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_record ON clinical_audit_trails (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON clinical_audit_trails (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON clinical_audit_trails (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_new_values_gin ON clinical_audit_trails USING GIN (new_values);

-- 4. Tabel Transaksional Outbox Bridging
CREATE TABLE IF NOT EXISTS bridging_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination VARCHAR(32) NOT NULL CHECK (destination IN ('BPJS_VCLAIM', 'BPJS_ANTROL', 'SATUSEHAT_FHIR')),
  event_type VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(128) UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(16) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED')),
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 5,
  last_error TEXT NULL,
  next_attempt_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outbox_queue ON bridging_outbox (status, next_attempt_at);

