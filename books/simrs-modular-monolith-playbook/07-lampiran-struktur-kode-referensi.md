# Lampiran A: Struktur Kode Referensi & Konvensi Proyek

> 📖 Hub Buku: **[The SIMRS Backend Playbook](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Enam bab sebelumnya menjelaskan *mengapa* dan *bagaimana* arsitektur Modular Monolith diterapkan pada SIMRS. Namun bagi engineer yang baru bergabung, pertanyaan pertama yang muncul hampir selalu sangat konkret: *"File ini harus saya taruh di mana? Namanya apa? Siapa yang boleh meng-import siapa?"*

Lampiran ini adalah jawaban tunggal untuk pertanyaan tersebut. Anggap lampiran ini sebagai **peta repositori resmi** (*source of truth*). Jika ada perbedaan antara kode di repositori dan lampiran ini, salah satunya harus diperbarui melalui ADR, bukan dibiarkan menyimpang diam-diam.

---

## 🔬 1. Struktur Root Repositori

```text
simrs-be/
├── src/
│   ├── core/                          # SHARED KERNEL (tidak boleh berisi logika domain)
│   │   ├── config/
│   │   │   ├── env.js                 # Validasi env dengan Zod (fail-fast saat boot)
│   │   │   └── logger.js              # Pino logger + redaksi field sensitif (NIK, no. BPJS)
│   │   ├── database/
│   │   │   ├── index.js               # Sequelize adaptive singleton (Docker vs Lambda)
│   │   │   ├── audit-hook.js          # Global hooks audit trail RME
│   │   │   └── register-models.js     # Memanggil defineModels() setiap modul
│   │   ├── errors/
│   │   │   └── AppError.js            # Factory createAppError, createNotFoundError, createConflictError
│   │   ├── http/
│   │   │   ├── response.js            # sendSuccess / sendError / sendPaginated
│   │   │   ├── error.middleware.js    # Global error handler (isAppError, Zod, Sequelize, HTTPException)
│   │   │   └── context.js             # AsyncLocalStorage (actorId, requestId, clientIp)
│   │   └── middlewares/
│   │       ├── auth.middleware.js     # Verifikasi JWT
│   │       ├── rbac.middleware.js     # requireRole('DOKTER', 'PERAWAT', ...)
│   │       └── idempotency.middleware.js # Header Idempotency-Key untuk POST kritikal
│   │
│   ├── modules/
│   │   ├── master-data/
│   │   ├── admission/                 # ← contoh lengkap di bagian 2
│   │   ├── emr/
│   │   ├── pharmacy/
│   │   ├── billing/
│   │   └── bridging/
│   │       ├── clients/               # HTTP client BPJS VClaim, Antrol, SATUSEHAT (khusus bridging)
│   │       ├── workers/               # Outbox worker (dipanggil dari scheduler/SQS)
│   │       └── ...                    # handlers/, services/, repositories/, models/, dst.
│   │
│   └── app.js                         # Perakitan Hono: middleware global + mount routes modul
│
├── db/
│   ├── migrations/
│   │   ├── 20261110-0001-admission-create-visits.cjs   # Prefix nama modul pada nama file
│   │   └── 20261110-0002-billing-create-invoices.cjs
│   └── seeders/
│
├── tests/
│   ├── unit/
│   │   └── admission/registration.service.test.js     # Service diuji dengan repo palsu (fake)
│   ├── integration/
│   │   └── admission/registration.api.test.js         # app.request() Hono + DB test (Docker)
│   └── architecture/
│       └── boundaries.test.js                          # dependency-cruiser sebagai test
│
├── docs/
│   └── adr/
│       └── ADR-001-modular-monolith.md
│
├── .github/
│   ├── workflows/ci.yml               # lint + test + depcruise wajib lulus
│   └── pull_request_template.md       # Checklist Part 6
│
├── eslint.config.js
├── .dependency-cruiser.cjs
├── Dockerfile
├── docker-compose.yml                 # API + MySQL/Postgres lokal
├── server.js                          # Entrypoint Docker / VM
├── lambda.js                          # Entrypoint AWS Lambda (HTTP)
├── worker.lambda.js                   # Entrypoint AWS Lambda (outbox worker, dipicu EventBridge/SQS)
└── package.json                       # "type": "module"
```

---

## 🔬 2. Anatomi Lengkap Satu Modul (`admission/`)

```text
src/modules/admission/
├── handlers/
│   └── registration.handler.js        # Tipis: ambil payload & actor → panggil service → sendSuccess
├── services/
│   ├── registration.service.js        # Logika bisnis murni (tanpa Hono Context)
│   └── visit-query.service.js         # Query read-only untuk kontrak publik
├── repositories/
│   └── visit.repository.js            # Satu-satunya tempat query Sequelize
├── models/
│   ├── Visit.js                       # Tabel: admission_visits
│   └── index.js                       # defineModels(sequelize) – asosiasi HANYA antar model modul ini
├── validators/
│   └── registration.validator.js      # Skema Zod
├── events/
│   └── visit-registered.event.js      # Bentuk payload event yang dipublikasikan modul
├── routes.js                          # Sub-router Hono + validator + RBAC
└── index.js                           # PUBLIC API: admissionRoutes + admissionService
```

### Konvensi Penamaan

| Elemen | Konvensi | Contoh |
| :--- | :--- | :--- |
| Folder modul | kebab-case, kata benda domain | `master-data`, `admission` |
| Nama tabel | `<modul>_<entitas_jamak>` | `admission_visits`, `billing_invoices` |
| File handler/service/repo | `<fitur>.<layer>.js` | `registration.service.js` |
| Error code | SCREAMING_SNAKE_CASE | `ACTIVE_VISIT_EXISTS` |
| Kontrak publik | `<modul>Service` | `admissionService`, `billingService` |
| Event | `<modul>.<entitas>.<kata-kerja-lampau>` | `admission.visit.registered` |

### Matriks Siapa Boleh Meng-import Siapa

| Dari ↓ / Ke → | `core/*` | folder internal modul sendiri | `modules/<lain>/index.js` | folder internal modul lain |
| :--- | :---: | :---: | :---: | :---: |
| `handlers/` | ✅ | ✅ (services, validators) | ❌ | ❌ |
| `services/` | ✅ | ✅ (repositories, events) | ✅ | ❌ |
| `repositories/` | ✅ | ✅ (models) | ❌ | ❌ |
| `models/` | ✅ (database) | ✅ (model modul sendiri) | ❌ | ❌ |
| `core/*` | ✅ | — | ❌ | ❌ |

> [!IMPORTANT]
> `core/` **tidak boleh** meng-import apa pun dari `modules/`. Jika `core` butuh sesuatu dari domain, berarti logika tersebut salah tempat.

---

## 🔬 3. Pola Testability: Factory Service dengan Dependensi Eksplisit

ES Modules membuat *mocking* import langsung menjadi rumit. Solusi sederhana tanpa framework DI: service diekspor sebagai **factory** yang menerima dependensi, lalu `index.js`/handler merakit instance default.

```javascript
// src/modules/admission/services/registration.service.js
import { createAppError } from '../../../core/errors/AppError.js';

export const makeRegistrationService = ({ db, visitRepo, billingService, clock = () => new Date() }) => ({
  async createOutpatientVisit(payload, actor) {
    return db.transaction(async (t) => {
      const active = await visitRepo.findActiveVisitToday(payload.patientId, { transaction: t });
      if (active) {
        throw createAppError('Pasien masih memiliki kunjungan aktif hari ini', 409, 'ACTIVE_VISIT_EXISTS');
      }
      const visit = await visitRepo.create(
        { ...payload, status: 'WAITING_FOR_TRIAGE', registeredBy: actor.id, registeredAt: clock() },
        { transaction: t }
      );
      await billingService.initializeAdmissionInvoice(
        { visitId: visit.id, patientId: payload.patientId, paymentType: payload.paymentType },
        { transaction: t }
      );
      return visit;
    });
  }
});
```

```javascript
// src/modules/admission/services/index.js  (perakitan default)
import { sequelize } from '../../../core/database/index.js';
import * as visitRepo from '../repositories/visit.repository.js';
import { billingService } from '../../billing/index.js';
import { makeRegistrationService } from './registration.service.js';

export const registrationService = makeRegistrationService({ db: sequelize, visitRepo, billingService });
```

```javascript
// tests/unit/admission/registration.service.test.js  (node:test, tanpa DB)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRegistrationService } from '../../../src/modules/admission/services/registration.service.js';

const fakeDb = { transaction: (fn) => fn({}) };

test('menolak pendaftaran ganda di hari yang sama', async () => {
  const service = makeRegistrationService({
    db: fakeDb,
    visitRepo: { findActiveVisitToday: async () => ({ id: 'v-1' }), create: async () => assert.fail() },
    billingService: { initializeAdmissionInvoice: async () => assert.fail() }
  });

  await assert.rejects(
    service.createOutpatientVisit({ patientId: 'p-1' }, { id: 'u-1' }),
    { errorCode: 'ACTIVE_VISIT_EXISTS' }
  );
});
```

---

## 🔬 4. Registrasi Model per Modul (Gaya Fungsional tanpa Class)

Setiap modul mendefinisikan modelnya secara fungsional menggunakan factory `sequelize.define`; `core` hanya memanggil fungsi registrasi tanpa mengetahui detail internal model.

```javascript
// src/modules/admission/models/index.js
import { defineVisitModel } from './Visit.js';

export const defineAdmissionModels = (sequelize) => {
  const Visit = defineVisitModel(sequelize);
  // Asosiasi internal (HANYA antar model di dalam modul admission) jika ada
  return { Visit };
};
```

```javascript
// src/core/database/register-models.js
// Pengecualian terdokumentasi: satu-satunya file core yang menyentuh modules,
// hanya untuk bootstrap, dan hanya lewat fungsi defineModels yang diekspor index.js modul.
import { defineAdmissionModels } from '../../modules/admission/index.js';
import { defineBillingModels } from '../../modules/billing/index.js';

export const registerModels = (sequelize) => {
  defineAdmissionModels(sequelize);
  defineBillingModels(sequelize);
};
```

> [!NOTE]
> File `register-models.js` adalah pengecualian dari aturan "core tidak meng-import modules". Pengecualian ini wajib dicatat di ADR dan di whitelist `.dependency-cruiser.cjs`. Alternatif yang lebih bersih adalah memindahkan bootstrap ke `src/app.js` atau `src/bootstrap.js`.

---

## 🔬 5. Laporan Lintas Modul (Karena JOIN Lintas Modul Dilarang)

Laporan seperti *"Pendapatan per Poli per Dokter"* membutuhkan data `admission`, `billing`, dan `master-data` sekaligus. Opsi yang diizinkan, berurutan dari yang paling sederhana:

1. **Komposisi di service**: ambil data dari masing-masing kontrak publik, gabungkan di memori. Cocok untuk volume kecil.
2. **Read model / proyeksi**: modul `reporting` memiliki tabel denormalisasi sendiri yang diisi dari event (`billing.invoice.paid`, dll.).
3. **Reporting database terpisah**: replika baca atau data warehouse. Query SQL bebas JOIN karena bukan jalur transaksi.

Yang **tidak** diizinkan: query SQL JOIN langsung ke tabel milik modul lain dari dalam repository modul transaksional.

---

## 🔬 6. Berkas `package.json` Resmi (Siap Salin)

Gunakan konfigurasi dependensi dan skrip ini sebagai fondasi proyek:

```json
{
  "name": "simrs-be",
  "version": "1.0.0",
  "type": "module",
  "description": "Backend SIMRS Enterprise Berbasis Modular Monolith",
  "main": "server.js",
  "scripts": {
    "dev": "node --watch server.js",
    "start": "node server.js",
    "worker": "node worker.js",
    "test": "node --test tests/unit/**/*.test.js",
    "test:integration": "node --test tests/integration/**/*.test.js",
    "test:boundaries": "depcruise src --config .dependency-cruiser.cjs",
    "lint": "eslint src/",
    "lint:boundaries": "eslint src/ --rule 'boundaries/element-types: error'",
    "make:module": "node scripts/make-module.js",
    "db:migrate": "sequelize-cli db:migrate"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.0",
    "@hono/zod-validator": "^0.4.1",
    "hono": "^4.6.0",
    "mysql2": "^3.11.0",
    "pg": "^8.13.0",
    "pg-hstore": "^2.3.4",
    "pino": "^9.4.0",
    "pino-pretty": "^11.2.2",
    "sequelize": "^6.37.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "dependency-cruiser": "^16.4.0",
    "eslint": "^9.14.0",
    "eslint-plugin-boundaries": "^4.2.2",
    "sequelize-cli": "^6.6.2"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

## 🔬 7. Berkas Lingkungan `.env.example`

```bash
# Runtime Environment
NODE_ENV=development
PORT=3000

# Basis Data Relasional (Pilih salah satu dialek):
# Opsi 1: PostgreSQL 16 (Enterprise & JSONB)
DB_URI=postgresql://postgres:rootpassword@localhost:5432/simrs_dev
DB_DIALECT=postgres
DB_SSL=false

# Opsi 2: MySQL 8.0 (Relasional Standar)
# DB_URI=mysql://root:rootpassword@localhost:3306/simrs_dev
# DB_DIALECT=mysql

# Batas Waktu Graceful Shutdown (ms)
SHUTDOWN_TIMEOUT_MS=25000

# Konfigurasi Panggilan Antar-Modul (Opsional: Jika ada modul yang diekstrak ke microservice)
# BILLING_SERVICE_URL=http://billing-service:3001
INTERNAL_SERVICE_SECRET=super_secret_internal_token_simrs

# Kredensial Bridging Eksternal (Diisolasi di modul bridging)
BPJS_CONS_ID=12345
BPJS_SECRET_KEY=secret_bpjs
BPJS_USER_KEY=user_key_bpjs
BPJS_BASE_URL=https://apijkn-dev.bpjs-kesehatan.go.id/vclaim-rest-dev

SATUSEHAT_CLIENT_ID=client_id_satusehat
SATUSEHAT_CLIENT_SECRET=client_secret_satusehat
SATUSEHAT_BASE_URL=https://api-satusehat-dev.dto.kemkes.go.id/fhir-r4/v1
```

---

## 🔬 8. Troubleshooting Cookbook: Resep Insiden Produksi

| Gejala Insiden | Akar Masalah | Tindakan Cepat Lapangan (Fix Recipe) |
| :--- | :--- | :--- |
| `SequelizeConnectionAcquireTimeoutError` di Lambda | Connection pool habis akibat cold starts tanpa RDS Proxy | 1. Turunkan `pool.max: 1` di `src/core/database/index.js`<br>2. Pastikan `lambda.js` memanggil `initPools()` & `close()`<br>3. Aktifkan AWS RDS Proxy di depan database. |
| `Query timeout (statement_timeout)` di PostgreSQL | Query laporan admisi/keuangan memindai jutaan baris tanpa indeks | 1. Tambahkan indeks komposit pada kolom filter tanggal (`createdAt`) dan `polyclinicId`<br>2. Jangan jalankan query analitik di thread utama transaksi; pisahkan ke replica database baca. |
| Nilai uang kasir desimal terpotong di MySQL | Driver MySQL mengonversi `DECIMAL(14,2)` ke tipe IEEE-754 float JavaScript | Pastikan `decimalNumbers: true` terpasang pada `dialectOptions` di `src/core/database/index.js`. |
| `Circular dependency` antar-modul saat booting | Modul A meng-import Service B, dan Modul B meng-import Service A | 1. Pisahkan pemanggilan timbal balik menggunakan **Domain Event** (`eventBus.emit`)<br>2. Pindahkan entitas data yang diperebutkan ke modul `master-data`. |
| `no-cross-module-internals` gagal saat CI | Ada engineer meng-import langsung ke folder `models/` atau `services/` modul lain | 1. Buka `src/modules/<target>/index.js`<br>2. Ekspor fungsi resmi lewat `index.js`<br>3. Ubah import di modul pemanggil agar merujuk ke `./modules/<target>/index.js`. |
| Server BPJS timeout 30 detik saat registrasi | Request bridging dijalankan di dalam alur HTTP pendaftaran pasien | 1. Pindahkan payload bridging ke tabel `bridging_outbox`<br>2. Biarkan pendaftaran pasien sukses lokal di rumah sakit<br>3. Biarkan `outbox.worker.js` mengirim ulang di latar belakang. |
| `no-cross-module-internals` gagal saat CI | Ada engineer meng-import langsung ke folder `models/` atau `services/` modul lain | 1. Buka `src/modules/<target>/index.js`<br>2. Ekspor fungsi resmi lewat `index.js`<br>3. Ubah import di modul pemanggil agar merujuk ke `./modules/<target>/index.js`. |
| Server BPJS timeout 30 detik saat registrasi | Request bridging dijalankan di dalam alur HTTP pendaftaran pasien | 1. Pindahkan payload bridging ke tabel `bridging_outbox`<br>2. Biarkan pendaftaran pasien sukses lokal di rumah sakit<br>3. Biarkan `outbox.worker.js` mengirim ulang di latar belakang. |
| Memory Leak saat build/test | AsyncLocalStorage store tertahan atau event listener menumpuk | Pastikan seluruh context runner dibungkus dalam blok eksekusi `requestContext.run(store, async () => { await next(); })`. |

---

## ⚡ Panduan Aksi Nyata dari Lampiran Ini (Action Checklist)

1. [ ] Samakan struktur repositori dengan bagian 1; buat folder yang belum ada (`db/`, `tests/architecture/`, `docs/adr/`).
2. [ ] Ganti nama tabel lama ke format `<modul>_<entitas>` secara bertahap lewat migration.
3. [ ] Ubah service paling kritikal (pendaftaran, kasir) ke pola factory dan tulis minimal satu unit test.
4. [ ] Tambahkan `boundaries.test.js` agar pelanggaran import gagal di CI, bukan hanya warning di editor.

---

## 🧭 Navigasi Bab

⬅️ **[Kembali ke Part 6: Migration Playbook & Team Governance](06-migration-playbook-dan-team-governance.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 🏠 **[Kembali ke Katalog Utama (CATALOG.md)](../../CATALOG.md)**
