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
• Standard Response & AppError       • admission (IGD, Rajal, Ranap)        • lambda.js (AWS Lambda)
• Centralized Error Middleware       • emr (CPPT, SOAP, Asesmen)            • worker.js (Docker Outbox)
• RBAC & Request Audit Trail         • pharmacy (E-Resep, Depo, Racikan)    • worker.lambda.js (EventBridge)
• Pino Structured Logger             • billing (Kasir, Split Bill, Klaim)   • Connection Pool Adaptif
                                     • bridging (BPJS & SATUSEHAT FHIR)
```

### Empat Pilar Fondasi Arsitektur
1. **Domain-First Bounded Contexts**: Setiap domain medis dan administratif berada dalam foldernya sendiri di `src/modules/<domain>/`.
2. **Strict Module Boundaries**: Komunikasi lintas modul **hanya diizinkan** melalui public contract `src/modules/<domain>/index.js`. Dilarang meng-import model atau repository modul lain secara langsung.
3. **Protocol-Agnostic Service Layer**: Logika klinis murni di `services/` tidak mengenal objek `c` (Hono Context), sehingga dapat dipanggil dari HTTP handler, script worker, event listener, atau unit test.
4. **Dual-Runtime Cloud Readiness**: Basis kode yang sama dapat dijalankan di container Docker long-running maupun AWS Lambda ephemeral functions dengan Sequelize Adaptive Pool.

---

## 📁 Struktur Direktori

```text
sources/simrs/
├── package.json
├── eslint.config.js                   # Rule boundaries linter
├── .dependency-cruiser.cjs            # CI automated boundary checker
├── .env.example
├── Dockerfile                         # Multi-stage production container
├── docker-compose.yml                 # PostgreSQL 16 & MySQL 8 lokal
├── server.js                          # Entrypoint Docker / VM
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
│       ├── postgres/                  # Skema PostgreSQL (JSONB, GIN Index)
│       └── mysql/                     # Skema MySQL 8.0+ (InnoDB, DECIMAL)
├── tests/
│   ├── unit/                          # Unit test mandiri tanpa database
│   ├── integration/                   # Hono app.request() test
│   └── architecture/                  # Pemeriksaan batas arsitektur
└── src/
    ├── app.js                         # Perakitan aplikasi Hono & mounting modul
    ├── core/                          # SHARED KERNEL
    │   ├── config/ (env.js, logger.js)
    │   ├── database/ (index.js, audit-hook.js, register-models.js)
    │   ├── errors/ (AppError.js)
    │   ├── events/ (event-bus.js)
    │   ├── http/ (response.js, context.js, error.middleware.js)
    │   └── middlewares/ (auth.middleware.js, rbac.middleware.js, idempotency.middleware.js)
    └── modules/                       # BOUNDED CONTEXTS
        ├── master-data/               # Poliklinik, Jadwal Dokter, ICD
        ├── admission/                 # Kunjungan pasien rawat jalan/inap/IGD
        ├── emr/                       # Rekam Medis Elektronik (SOAP/CPPT)
        ├── pharmacy/                  # E-Resep & Obat
        ├── billing/                   # Tagihan & Kasir (dengan Microservice Adapter)
        └── bridging/                  # BPJS VClaim & SATUSEHAT FHIR (Outbox & Circuit Breaker)
```

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
# Memverifikasi tidak ada cross-import internal antar modul
npm run test:boundaries
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
Perintah ini akan secara otomatis membuat folder `src/modules/laboratory/` dengan subfolder `handlers/`, `services/`, `repositories/`, `models/`, `validators/`, `events/`, serta template `routes.js` dan `index.js`.

---

## ⚖️ Standar Kepatuhan Regulasi Kesehatan

1. **Permenkes No. 24/2022 (Audit Trail RME)**:
   - Terpasang otomatis melalui `src/core/database/audit-hook.js` dan `src/core/http/context.js` (`AsyncLocalStorage`).
   - Setiap mutasi pada rekam medis klinis otomatis mencatat perbedaan nilai (*diff*), aktor pengubah, `requestId`, dan IP klien ke tabel `clinical_audit_trails`.
2. **Resiliensi Bridging BPJS & SATUSEHAT**:
   - Transaksi pendaftaran lokal tidak boleh mengunci (*blocking*) pemanggilan HTTP pihak ketiga.
   - Menggunakan **Transactional Outbox Pattern** (`bridging_outbox`) dan **Circuit Breaker** (`createCircuitBreaker`) untuk menjamin loket rumah sakit tidak lumpuh saat server eksternal *down*.

