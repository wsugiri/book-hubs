-- db/migrations/mysql/20261110_create_audit_and_outbox.sql

-- 1. Tabel Admisi
CREATE TABLE IF NOT EXISTS admission_visits (
  id CHAR(36) PRIMARY KEY,
  patientId CHAR(36) NOT NULL,
  polyclinicId CHAR(36) NOT NULL,
  doctorScheduleId CHAR(36) NOT NULL,
  paymentType VARCHAR(32) NOT NULL,
  bpjsCardNumber VARCHAR(32) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'WAITING_FOR_TRIAGE',
  registeredBy VARCHAR(64) NOT NULL,
  registeredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admission_visits_patient (patientId, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Billing
CREATE TABLE IF NOT EXISTS billing_invoices (
  id CHAR(36) PRIMARY KEY,
  visitId CHAR(36) NOT NULL,
  patientId CHAR(36) NOT NULL,
  totalAmount DECIMAL(14, 2) DEFAULT 0.00,
  status VARCHAR(32) DEFAULT 'UNPAID',
  paymentType VARCHAR(32) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_billing_invoices_visit (visitId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Audit Trail Rekam Medis (Append-Only)
CREATE TABLE IF NOT EXISTS clinical_audit_trails (
  id CHAR(36) PRIMARY KEY,
  tableName VARCHAR(64) NOT NULL,
  recordId VARCHAR(64) NOT NULL,
  action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  actorId VARCHAR(64) NOT NULL,
  actorRole VARCHAR(32) NOT NULL,
  requestId VARCHAR(64) NOT NULL,
  clientIp VARCHAR(45) NOT NULL,
  oldValues JSON NULL,
  newValues JSON NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_record (tableName, recordId),
  INDEX idx_audit_actor (actorId),
  INDEX idx_audit_time (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Transaksional Outbox Bridging
CREATE TABLE IF NOT EXISTS bridging_outbox (
  id CHAR(36) PRIMARY KEY,
  destination ENUM('BPJS_VCLAIM', 'BPJS_ANTROL', 'SATUSEHAT_FHIR') NOT NULL,
  eventType VARCHAR(64) NOT NULL,
  idempotencyKey VARCHAR(128) UNIQUE NOT NULL,
  payload JSON NOT NULL,
  status ENUM('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED') DEFAULT 'PENDING',
  retryCount INT DEFAULT 0,
  maxRetries INT DEFAULT 5,
  lastError TEXT NULL,
  nextAttemptAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_outbox_queue (status, nextAttemptAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

