-- db/migrations/mysql/20261110_create_audit_and_outbox.sql

-- 1. Tabel Admisi (snake_case selaras dengan Sequelize underscored: true)
CREATE TABLE IF NOT EXISTS admission_visits (
  id CHAR(36) PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  polyclinic_id CHAR(36) NOT NULL,
  doctor_schedule_id CHAR(36) NOT NULL,
  payment_type VARCHAR(32) NOT NULL,
  bpjs_card_number VARCHAR(32) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'WAITING_FOR_TRIAGE',
  registered_by VARCHAR(64) NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admission_visits_patient (patient_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Billing
CREATE TABLE IF NOT EXISTS billing_invoices (
  id CHAR(36) PRIMARY KEY,
  visit_id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  total_amount DECIMAL(14, 2) DEFAULT 0.00,
  status VARCHAR(32) DEFAULT 'UNPAID',
  payment_type VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_billing_invoices_visit (visit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Audit Trail Rekam Medis (Append-Only)
CREATE TABLE IF NOT EXISTS clinical_audit_trails (
  id CHAR(36) PRIMARY KEY,
  table_name VARCHAR(64) NOT NULL,
  record_id VARCHAR(64) NOT NULL,
  action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  request_id VARCHAR(64) NOT NULL,
  client_ip VARCHAR(45) NOT NULL,
  old_values JSON NULL,
  new_values JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_record (table_name, record_id),
  INDEX idx_audit_actor (actor_id),
  INDEX idx_audit_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Transaksional Outbox Bridging
CREATE TABLE IF NOT EXISTS bridging_outbox (
  id CHAR(36) PRIMARY KEY,
  destination ENUM('BPJS_VCLAIM', 'BPJS_ANTROL', 'SATUSEHAT_FHIR') NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(128) UNIQUE NOT NULL,
  payload JSON NOT NULL,
  status ENUM('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED') DEFAULT 'PENDING',
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 5,
  last_error TEXT NULL,
  next_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_outbox_queue (status, next_attempt_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
