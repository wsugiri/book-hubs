# 🏥 SIMRS Backend Core (Modular Monolith)

Cetak biru implementasi backend **Sistem Informasi Manajemen Rumah Sakit (SIMRS)** berbasis arsitektur **Modular Monolith** dengan Node.js (ES Modules), Hono Framework, dan Sequelize ORM.

Didasarkan pada buku: **[The SIMRS Backend Playbook](../../books/simrs-modular-monolith-playbook/index.md)**.

---

## 🧭 Arsitektur Tingkat Tinggi

```text
                             ARSITEKTUR MODULAR MONOLITH SIMRS
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
[ SHARED KERNEL ]                    [ BOUNDED CONTEXTS ]                   [ DUAL RUNTIME ]
(src/core/)                          (src/modules/)                         (Entrypoints)
• Database Singleton & Trx           • master-data (ICD, Poli, Nakes)       • server.js (Docker / VM)
• In-Process Domain EventBus         • admission (IGD, Rajal, Ranap)        • lambda.js (AWS Lambda)
• Standard Response & AppError       • emr (CPPT, SOAP, Asesmen)            • worker.js (Docker Outbox)
• Centralized Error Middleware       • pharmacy (E-Resep, Depo, Racikan)    • worker.lambda.js (EventBridge)
• RBAC & Request Audit Trail         • billing (Kasir, Split Bill, Klaim)   • Connection Pool Adaptif
• Pino Structured Logger             • bridging (BPJS & SATUSEHAT FHIR)
```

### Lima Pilar Fondasi Arsitektur

1. **Domain-First Bounded Contexts**: Setiap domain medis dan administratif berada dalam foldernya sendiri di `src/modules/<domain>/`.
2. **Strict Zero Cross-Module Dependency**:
   - **TIDAK BOLEH** ada satu pun modul di `src/modules/<A>/` yang meng-import file apa pun dari `src/modules/<B>/` (bahkan `index.js` sekalipun).
   - Setiap modul **100% mandiri (autonomous)** dan hanya boleh meng-import dari dalam modulnya sendiri atau `src/core/`.
   - Koordinasi lintas-modul berjalan sepenuhnya melalui **Domain Events (`src/core/events/event-bus.js`)** dengan tetap meneruskan konteks transaksi database (`{ transaction: t }`) agar keutuhan ACID terjaga.
3. **Functional & Zero-Class Policy**:
   - Seluruh kode di `src/` wajib ditulis menggunakan *pure functions*, *closures*, dan *factory functions* (tanpa kata kunci `class` atau `this`).
4. **Protocol-Agnostic Service Layer**:
   - Logika klinis murni di `services/` tidak mengenal objek `c` (Hono Context), sehingga dapat dipanggil dari HTTP handler, subscriber event, script worker, atau unit test.
   - Handler HTTP (`handlers/`) dilarang mem-bypass `services/` untuk memanggil `repositories/` atau `models/` secara langsung.
5. **Dual-Runtime Cloud Readiness**:
   - Basis kode yang sama dapat dijalankan di container Docker *long-running* maupun AWS Lambda *ephemeral functions* dengan Sequelize Adaptive Pool.

---

## 🔄 Alur Koordinasi Zero Cross-Module Dependency

Ketika pasien mendaftar di loket Rawat Jalan (`admission`), modul `admission` **sama sekali tidak memanggil atau mengenal** modul `billing`, `bridging`, maupun `emr`. Modul `admission` cukup menerbitkan satu event domain, lalu masing-masing modul merespons secara independen melalui *subscriber*-nya:

```text
[ Modul Admission ]
  registration.service.js
         │
         │ 1. eventBus.publish(createVisitRegisteredEvent(newVisit), { transaction: t })
         ▼
┌─────────────────────────────────────────────────────────┐
│             Core Domain EventBus (src/core/)            │
└────────┬───────────────────────────┬────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
[ Subscriber Billing ]      [ Subscriber Bridging ]     [ Subscriber EMR ]
Buat tagihan karcis awal    Jadwalkan ke tabel outbox   Siapkan lembar awal
(ikut transaksi DB `t`)     BPJS / SATUSEHAT (trx `t`)  pengkajian medis poli
```

---

## 📁 Struktur Direktori

```text
sources/simrs/
├── package.json
├── eslint.config.js                   # Rule linter Zero Cross-Module Dependency
├── .dependency-cruiser.cjs            # CI automated boundary checker
├── .env.example
├── Dockerfile                         # Multi-stage production container
├── docker-compose.yml                 # PostgreSQL 16 & MySQL 8 lokal
├── server.js                          # Entrypoint Docker / VM (dengan Graceful Shutdown)
├── lambda.js                          # Entrypoint AWS Lambda (HTTP)
├── worker.js                          # Entrypoint Docker outbox worker
├── worker.lambda.js                   # Entrypoint AWS Lambda outbox worker
├── scripts/
│   ├── make-module.js                 # Otomasi scaffold modul baru
│   └── test-pool-stress.js            # Simulasi stress-test connection pool
├── docs/adr/                          # Living Architecture Decision Records
│   ├── ADR-001-modular-monolith.md
│   └── ADR-002-domain-events-and-transactional-outbox.md
├── .github/
│   ├── workflows/ci.yml               # Automated CI test & boundary checker
│   └── pull_request_template.md       # Checklist kepatuhan PR
├── db/
│   └── migrations/
│       ├── postgres/                  # Skema PostgreSQL (snake_case, JSONB, GIN Index)
│       └── mysql/                     # Skema MySQL 8.0+ (snake_case, InnoDB, DECIMAL)
├── tests/
│   ├── unit/                          # Unit test mandiri tanpa database
│   ├── integration/                   # Hono app.request() test
│   └── architecture/                  # Guardrails: Zero Cross-Module, No Handler Bypass, Zero-Class
└── src/
    ├── app.js                         # Perakitan aplikasi Hono, mounting route & event subscribers
    ├── core/                          # SHARED KERNEL
    │   ├── config/ (env.js, logger.js)
    │   ├── database/ (index.js, audit-hook.js, register-models.js, models/ClinicalAuditTrail.js)
    │   ├── errors/ (AppError.js)
    │   ├── events/ (event-bus.js)
    │   ├── http/ (response.js, context.js, error.middleware.js)
    │   └── middlewares/ (auth.middleware.js, rbac.middleware.js, idempotency.middleware.js)
    └── modules/                       # INDEPENDENT BOUNDED CONTEXTS (Zero Cross-Import)
        ├── master-data/               # Poliklinik, Jadwal Dokter, ICD
        ├── admission/                 # Kunjungan pasien rawat jalan/inap/IGD
        ├── emr/                       # Rekam Medis Elektronik (SOAP/CPPT)
        ├── pharmacy/                  # E-Resep & Obat
        ├── billing/                   # Tagihan & Kasir (dengan Microservice Adapter)
        └── bridging/                  # BPJS VClaim & SATUSEHAT FHIR (Outbox & Circuit Breaker)
```

---

## 🛡️ Tiga Guardrail Otomatis (`boundaries.test.js`)

Kepatuhan arsitektur dijaga secara otomatis oleh 3 pengujian di `tests/architecture/boundaries.test.js`, `.dependency-cruiser.cjs`, dan `eslint.config.js`:

| Guardrail | Aturan yang Ditegakkan |
| :--- | :--- |
| **1. Zero Cross-Module Dependency** | Gagal jika ada file di `src/modules/<A>/` yang meng-import file apa pun dari `src/modules/<B>/`. |
| **2. Strict Layered Architecture** | Gagal jika ada file di `handlers/` yang mem-bypass `services/` dan meng-import `repositories/` atau `models/` secara langsung. |
| **3. Functional & Zero-Class Policy** | Gagal jika ditemukan deklarasi `class` di dalam `src/`. |

---

## 🚀 Quickstart: Menjalankan Sistem

### 1. Salin Konfigurasi Environment
```bash
cp .env.example .env
```

### 2. Jalankan Database Lokal (Docker)
```bash
# Jalankan PostgreSQL 16
docker compose up -d postgres

# Atau jika menggunakan MySQL 8.0:
# docker compose up -d mysql
```

### 3. Pasang Dependensi & Jalankan Uji Otomatis
```bash
npm install
npm test
```

### 4. Jalankan Linter Batas Arsitektur
```bash
# Memverifikasi Zero Cross-Module Dependency
npm run test:boundaries
npm run lint:boundaries
```

### 5. Jalankan Server Dev Lokal
```bash
npm run dev
```
Akses healthcheck: `http://localhost:3000/health`

### 6. Jalankan Background Outbox Worker
```bash
npm run worker
```

---

## 🛠️ Generator Modul Otomatis

Untuk menambahkan modul baru dengan struktur folder yang 100% patuh pada aturan arsitektur:

```bash
npm run make:module laboratory
```
Perintah ini akan secara otomatis membuat folder `src/modules/laboratory/` dengan subfolder `handlers/`, `services/`, `repositories/`, `models/`, `validators/`, `events/`, `subscribers/`, serta template `routes.js` dan `index.js`.

---

## ⚖️ Standar Kepatuhan Regulasi Kesehatan

1. **Permenkes No. 24/2022 (Audit Trail RME)**:
   - Terpasang otomatis melalui `src/core/database/audit-hook.js` (`afterCreate`, `afterUpdate`, `afterDestroy`) dan `src/core/http/context.js` (`AsyncLocalStorage`).
   - Setiap mutasi pada rekam medis klinis otomatis mencatat perbedaan nilai (*diff*), aktor pengubah, `requestId`, dan IP klien ke tabel `clinical_audit_trails`.
2. **Resiliensi Bridging BPJS & SATUSEHAT**:
   - Transaksi pendaftaran lokal tidak pernah menahan transaksi DB saat memanggil HTTP pihak ketiga (*Two-Phase Claim Pattern* di `outbox.worker.js`).
   - Menggunakan **Transactional Outbox Pattern** (`bridging_outbox`) dan **Circuit Breaker** (`createCircuitBreaker`) per destinasi untuk menjamin loket rumah sakit tidak lumpuh saat server eksternal *down*.
