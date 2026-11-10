# Part 3: Clean Implementation: Delivery, Domain, dan Data Layer

> 📖 Hub Buku: **[The SIMRS Backend Playbook](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Dalam sebuah sesi *pull request review* di tim backend SIMRS, seorang insinyur senior menemukan kode berikut yang ditulis oleh seorang developer muda:

```javascript
// Cuplikan kode sebelum refactoring
export const submitDoctorPrescription = async (c) => {
  const body = await c.req.json();
  if (!body.patientId || !body.medicines || body.medicines.length === 0) {
    return c.json({ status: 'error', code: 400, msg: 'Data tidak lengkap' }, 400);
  }
  // 120 baris query Sequelize langsung di handler...
  // Menghitung dosis obat racikan, memotong stok depo farmasi,
  // dan mengirim HTTP response manual dengan format yang berbeda dari modul lain...
};
```

Ketika ditanya mengapa kode tersebut dibuat demikian, jawabannya sangat wajar: *"Karena cepat dan langsung jalan di Postman."*

Namun di lingkungan rumah sakit, *"langsung jalan di Postman"* adalah standar kualitas yang sangat berbahaya. Enam bulan kemudian, ketika auditor internal meminta audit riwayat penulisan resep narkotika, atau ketika modul farmasi perlu dipanggil dari antrean pesan *emergency call*, kode di atas menjadi bom waktu: tidak bisa diuji secara unit test (*untestable*), format error tidak konsisten (*inconsistent contract*), dan logika medisnya terbelenggu oleh protokol HTTP.

Bab ini menyajikan standar kode bersih (*clean implementation standards*) berbasis Node.js ES Modules, Hono, dan Sequelize. Tiga lapisan utama—**Delivery**, **Domain**, dan **Data**—akan dipisahkan secara tegas agar setiap baris kode yang ditulis oleh tim dapat diuji, dipelihara, dan dipercaya hingga bertahun-tahun ke depan.

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

```text
                  ALUR DATA CLEAN ARCHITECTURE DALAM SATU MODUL
  
  [ HTTP Request ] 
         │
         ▼
  ┌──────────────────────────────────────────────────────────────┐
  │ 1. DELIVERY LAYER (handlers/ & routes.js)                    │
  │    • Validasi Skema via Zod (@hono/zod-validator)            │
  │    • Ekstraksi payload murni & actor dari JWT Context        │
  │    • Panggil Service Layer (Tanpa melempar objek 'c')        │
  │    • Kembalikan respon standar via sendSuccess()             │
  └──────────────────────────────┬───────────────────────────────┘
                                 │ (Pure JavaScript Objects)
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │ 2. DOMAIN / SERVICE LAYER (services/)                        │
  │    • Pure Business Logic & Aturan Medis Rumah Sakit          │
  │    • Mengelola Managed Database Transaction (sequelize.trx)   │
  │    • Koordinasi antar repository atau public service modul   │
  │    • Melempar AppError jika ada pelanggaran aturan bisnis    │
  └──────────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │ 3. DATA ACCESS LAYER (repositories/ & models/)               │
  │    • Isolasi Query Sequelize (find, create, update)          │
  │    • Optimasi index query, pagination, dan locking           │
  │    • Model Sequelize privat milik modul                      │
  └──────────────────────────────────────────────────────────────┘
```

---

### 1. Standardisasi Error & Response Engine (`src/core/`)

Sebelum menyentuh modul apa pun, kita harus membangun **Shared Kernel** yang bertugas menyeragamkan komunikasi keluar.

#### A. Factory Kesalahan Bisnis Terstandar (`src/core/errors/AppError.js`)
Alih-alih menggunakan ES6 `class` yang kaku, gunakan **Factory Function fungsional**. Pola ini menghasilkan error murni (*pure JavaScript Error instance*) yang diperkaya metadata HTTP tanpa mewajibkan penggunaan keyword `new` atau inheritance `class`:

```javascript
// src/core/errors/AppError.js
// Factory function murni (Functional & Zero-Class)
export const createAppError = (message, statusCode = 400, errorCode = 'BAD_REQUEST', details = null) => {
  const error = new Error(message);
  error.name = 'AppError';
  error.statusCode = statusCode;
  error.errorCode = errorCode;
  error.details = details;
  error.isAppError = true;
  return error;
};

export const createNotFoundError = (message = 'Resource not found', errorCode = 'RESOURCE_NOT_FOUND') =>
  createAppError(message, 404, errorCode);

export const createConflictError = (message = 'Conflict state', errorCode = 'CONFLICT_STATE', details = null) =>
  createAppError(message, 409, errorCode, details);

export const isAppError = (err) => Boolean(err && (err.isAppError === true || err.name === 'AppError'));
```

#### B. Helper Respon Standar (`src/core/http/response.js`)
Semua endpoint wajib mengembalikan amplop data (*data envelope*) yang konsisten. Untuk keperluan audit rumah sakit, kita selalu menyematkan `requestId`.

> [!NOTE]
> **Keputusan desain: `statusCode` tidak ditaruh di body JSON.** Part 1 mengkritik duplikasi status di header dan body karena rawan tidak sinkron. Sumber kebenaran tunggal adalah **HTTP status code**. Body hanya memuat `success` (turunan dari status) dan, untuk error, `errorCode` yang dapat dibaca mesin. Jika ada klien lama yang mewajibkan `statusCode` di body, tambahkan hanya di helper ini (satu tempat) dan catat di ADR.

```javascript
// src/core/http/response.js
const buildMeta = (c, extra = {}) => ({
  requestId: c.get('requestId') || 'req-untracked',
  timestamp: new Date().toISOString(),
  ...extra
});

export const sendSuccess = (c, data = null, message = 'Success', statusCode = 200, meta = {}) =>
  c.json({ success: true, message, data, meta: buildMeta(c, meta) }, statusCode);

export const sendError = (c, { statusCode, errorCode, message, details = null }) =>
  c.json({ success: false, errorCode, message, details, meta: buildMeta(c) }, statusCode);
```

#### C. Global Error Middleware (`src/core/http/error.middleware.js`)
Middleware ini menangkap semua error yang dilempar dari lapisan terdalam service tanpa memerlukan blok `try-catch` yang berulang-ulang di setiap handler. Selain `AppError`, middleware wajib mengenali **error bawaan Hono, Zod, dan Sequelize**. Tanpa itu, semua kesalahan klien (data duplikat, payload salah) akan keliru dilaporkan sebagai `500`.

```javascript
// src/core/http/error.middleware.js
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { UniqueConstraintError, ForeignKeyConstraintError, ValidationError as SequelizeValidationError } from 'sequelize';
import { isAppError } from '../errors/AppError.js';
import { sendError } from './response.js';
import { logger } from '../config/logger.js';

export const globalErrorHandler = (err, c) => {
  if (isAppError(err)) {
    return sendError(c, err);
  }

  if (err instanceof ZodError) {
    return sendError(c, { statusCode: 422, errorCode: 'VALIDATION_FAILED', message: 'Data tidak valid', details: err.flatten() });
  }

  if (err instanceof UniqueConstraintError) {
    return sendError(c, { statusCode: 409, errorCode: 'DUPLICATE_RESOURCE', message: 'Data sudah ada', details: err.fields });
  }

  if (err instanceof ForeignKeyConstraintError) {
    return sendError(c, { statusCode: 422, errorCode: 'INVALID_REFERENCE', message: 'Referensi data tidak ditemukan' });
  }

  if (err instanceof SequelizeValidationError) {
    return sendError(c, { statusCode: 422, errorCode: 'VALIDATION_FAILED', message: 'Data tidak valid', details: err.errors.map((e) => ({ field: e.path, message: e.message })) });
  }

  if (err instanceof HTTPException) {
    // Contoh: 401 dari middleware JWT Hono, 413 body terlalu besar
    return sendError(c, { statusCode: err.status, errorCode: 'HTTP_ERROR', message: err.message });
  }

  // Galat tak terduga: log detail lengkap, tapi jangan bocorkan stack trace ke klien
  logger.error({ err, requestId: c.get('requestId') }, 'Unhandled error');
  return sendError(c, {
    statusCode: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    message: 'Terjadi kesalahan sistem internal. Silakan hubungi tim IT Rumah Sakit.'
  });
};
```

> [!TIP]
> Secara default `@hono/zod-validator` mengembalikan respons `400` sendiri sebelum sampai ke error handler. Agar formatnya seragam, berikan *hook* ketiga: `zValidator('json', schema, (result) => { if (!result.success) throw result.error; })`, sehingga `ZodError` diteruskan ke `globalErrorHandler`.

---

### 2. Validasi Skema Permintaan (Fail-Fast Validation dengan Zod)

Di SIMRS, membiarkan data kotor menyentuh lapisan service adalah resep bencana. Gunakan Zod bersama `@hono/zod-validator` untuk memvalidasi payload sebelum handler dijalankan:

```javascript
// src/modules/admission/validators/registration.validator.js
import { z } from 'zod';

export const createOutpatientSchema = z.object({
  patientId: z.string().uuid({ message: 'Format Patient ID wajib berupa UUID' }),
  polyclinicId: z.string().uuid({ message: 'Polyclinic ID wajib diisi' }),
  doctorScheduleId: z.string().uuid({ message: 'Jadwal dokter wajib dipilih' }),
  paymentType: z.enum(['BPJS', 'PRIBADI', 'ASURANSI_SWASTA'], {
    message: 'Metode pembayaran tidak valid'
  }),
  bpjsCardNumber: z.string().optional()
}).refine(
  (data) => {
    if (data.paymentType === 'BPJS' && !data.bpjsCardNumber) {
      return false;
    }
    return true;
  },
  {
    message: 'Nomor Kartu BPJS wajib diisi untuk metode pembayaran BPJS',
    path: ['bpjsCardNumber']
  }
);
```

---

### 3. The Skinny Handler: Ramping, Deklaratif, dan Bebas Logika Bisnis

Fungsi handler hanya memiliki **3 tanggung jawab tunggal**:
1. Mengambil payload tervalidasi dari validator.
2. Mengambil identitas user/petugas dari konteks auth.
3. Memanggil service dan mengembalikan respon melalui `sendSuccess`.

```javascript
// src/modules/admission/handlers/registration.handler.js
import { sendSuccess } from '../../../core/http/response.js';
import * as registrationService from '../services/registration.service.js';

export const registerOutpatient = async (c) => {
  // 1. Ekstrak payload yang SUDAH divalidasi oleh Zod
  const payload = c.req.valid('json');
  
  // 2. Ekstrak data aktor (dari Auth Middleware)
  const actor = c.get('user');

  // 3. Panggil service murni (TANPA objek 'c'!)
  const visit = await registrationService.createOutpatientVisit(payload, actor);

  // 4. Return dengan standard envelope
  return sendSuccess(c, visit, 'Pendaftaran rawat jalan berhasil dibuat', 201);
};
```

---

### 4. Pure Business Logic di Service Layer

Lapisan service adalah jantung dari aplikasi rumah sakit. Fungsi di sini sepenuhnya mandiri:
* **Tidak tahu apa itu HTTP, URL, atau status code**.
* **Menerima parameter murni** (*Plain JavaScript Object*).
* **Bisa diuji dengan unit test** dalam hitungan milidetik tanpa perlu menyalakan server web.

```javascript
// src/modules/admission/services/registration.service.js
import { sequelize } from '../../../core/database/index.js';
import { createAppError } from '../../../core/errors/AppError.js';
import * as visitRepo from '../repositories/visit.repository.js';
import { billingService } from '../../billing/index.js'; // Kontrak publik modul Billing

export const createOutpatientVisit = async (payload, actor) => {
  // Gunakan Managed Transaction Sequelize
  return await sequelize.transaction(async (t) => {
    // 1. Validasi Aturan Medis: Pasien tidak boleh punya kunjungan aktif ganda di hari yang sama
    const activeVisit = await visitRepo.findActiveVisitToday(payload.patientId, { transaction: t });
    if (activeVisit) {
      throw createAppError(
        'Pasien masih terdaftar dalam kunjungan aktif hari ini di poli lain',
        409,
        'ACTIVE_VISIT_EXISTS',
        { existingVisitId: activeVisit.id, polyclinicId: activeVisit.polyclinicId }
      );
    }

    // 2. Buat data kunjungan melalui repository lokal
    const newVisit = await visitRepo.create(
      {
        ...payload,
        status: 'WAITING_FOR_TRIAGE',
        registeredBy: actor.id,
        registeredAt: new Date()
      },
      { transaction: t }
    );

    // 3. Komunikasi Antar-Modul: Terbitkan tagihan awal karcis admisi melalui modul Billing
    await billingService.initializeAdmissionInvoice(
      {
        visitId: newVisit.id,
        patientId: payload.patientId,
        paymentType: payload.paymentType
      },
      { transaction: t } // Transaksi atomik diteruskan!
    );

    return newVisit;
  });
};
```

#### Sisi Penerima Panggilan Antar-Modul (`src/modules/billing/services/invoice.service.js`)
Perhatikan bagaimana sisi penerima (Modul Billing) menyambut panggilan kontrak ini secara independen, memvalidasi tarif pendaftaran, dan menyimpan invoice tanpa tahu siapa yang memanggilnya:

```javascript
// src/modules/billing/services/invoice.service.js
import { createAppError } from '../../../core/errors/AppError.js';
import * as invoiceRepo from '../repositories/invoice.repository.js';

export const initializeAdmissionInvoice = async (dto, options = {}) => {
  const { visitId, patientId, paymentType } = dto;

  if (!visitId || !patientId) {
    throw createAppError('Kontrak pemanggilan modul tidak valid: visitId dan patientId wajib ada', 400, 'INVALID_INTER_MODULE_PAYLOAD');
  }

  // Tarif karcis pendaftaran rumah sakit (Bisa di-lookup dari modul master-data)
  const registrationFee = paymentType === 'BPJS' ? 0.00 : 25000.00;

  return await invoiceRepo.create({
    visitId,
    patientId,
    totalAmount: registrationFee,
    status: paymentType === 'BPJS' ? 'PAID' : 'UNPAID',
    paymentType
  }, options);
};
```

---

### 5. Repository Layer: Isolasi Akses Basis Data (Kompatibel PostgreSQL & MySQL)

Fungsi repository membungkus seluruh panggilan ORM Sequelize. Jika suatu saat Anda ingin mengganti query Sequelize dengan raw SQL berkinerja tinggi atau beralih ke Kysely/Prisma, perubahan hanya terjadi di folder `repositories/`, tanpa menyentuh service layer.

> [!TIP]
> **Testability.** Contoh service di atas meng-import repository secara langsung agar mudah dibaca. Di ES Modules, import langsung sulit di-*mock* saat unit test. Untuk service kritikal (pendaftaran, kasir), gunakan pola **factory dengan dependensi eksplisit** (`makeRegistrationService({ db, visitRepo, billingService })`) seperti dicontohkan di [Lampiran A](07-lampiran-struktur-kode-referensi.md).

```javascript
// src/modules/admission/repositories/visit.repository.js
import { Op } from 'sequelize';
import { Visit } from '../models/Visit.js';

export const findActiveVisitToday = async (patientId, options = {}) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return await Visit.findOne({
    where: {
      patientId,
      status: {
        [Op.in]: ['WAITING_FOR_TRIAGE', 'IN_CONSULTATION', 'WAITING_FOR_MEDICINE']
      },
      createdAt: {
        [Op.gte]: startOfDay
      }
    },
    ...options
  });
};

export const create = async (data, options = {}) => {
  return await Visit.create(data, options);
};
```

---

### 6. Rangkaian Rute & Middleware Binding (`src/modules/admission/routes.js`)

Inilah bagaimana validator Zod dan handler dihubungkan ke dalam sub-router Hono:

```javascript
// src/modules/admission/routes.js
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createOutpatientSchema } from './validators/registration.validator.js';
import * as registrationHandler from './handlers/registration.handler.js';

export const admissionRoutes = new Hono();

// POST /api/v1/admissions/outpatient
admissionRoutes.post(
  '/outpatient',
  zValidator('json', createOutpatientSchema, (result) => {
    // Teruskan ZodError ke globalErrorHandler agar envelope error seragam
    if (!result.success) throw result.error;
  }),
  registrationHandler.registerOutpatient
);
```

---

## 🛠️ Hands-On Verification: Uji Lapangan via cURL

Setelah kode dipasang, jalankan pengujian end-to-end menggunakan terminal cURL:

### Skenario 1: Pendaftaran Pasien Berhasil (HTTP 201 Created)
```bash
curl -X POST http://localhost:3000/api/v1/admissions/outpatient \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_JWT_PETUGAS>" \
  -d '{
    "patientId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "polyclinicId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "doctorScheduleId": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    "paymentType": "PRIBADI"
  }'
```

**Respon JSON yang Diterima:**
```json
{
  "success": true,
  "message": "Pendaftaran rawat jalan berhasil dibuat",
  "data": {
    "id": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
    "patientId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "polyclinicId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "status": "WAITING_FOR_TRIAGE",
    "registeredBy": "usr-nurse-01",
    "registeredAt": "2026-11-10T08:30:00.000Z"
  },
  "meta": {
    "requestId": "req-987abc123",
    "timestamp": "2026-11-10T08:30:00.125Z"
  }
}
```

### Skenario 2: Pasien Mencoba Daftar Dobel di Hari yang Sama (HTTP 409 Conflict)
Ulangi perintah cURL yang sama untuk kedua kalinya. Sistem akan menolak secara deterministik:

**Respon JSON yang Diterima:**
```json
{
  "success": false,
  "errorCode": "ACTIVE_VISIT_EXISTS",
  "message": "Pasien masih terdaftar dalam kunjungan aktif hari ini di poli lain",
  "details": {
    "existingVisitId": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
    "polyclinicId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e"
  },
  "meta": {
    "requestId": "req-987abc124",
    "timestamp": "2026-11-10T08:31:00.040Z"
  }
}
```

### Skenario 3: Validasi Gagal - Metode BPJS tanpa Nomor Kartu (HTTP 422 Unprocessable)
```bash
curl -X POST http://localhost:3000/api/v1/admissions/outpatient \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "polyclinicId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "doctorScheduleId": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    "paymentType": "BPJS"
  }'
```

**Respon JSON yang Diterima:**
```json
{
  "success": false,
  "errorCode": "VALIDATION_FAILED",
  "message": "Data tidak valid",
  "details": {
    "fieldErrors": {
      "bpjsCardNumber": [
        "Nomor Kartu BPJS wajib diisi untuk metode pembayaran BPJS"
      ]
    }
  },
  "meta": {
    "requestId": "req-987abc125",
    "timestamp": "2026-11-10T08:32:00.015Z"
  }
}
```

### Verifikasi Atomisitas Basis Data (SQL Terminal)
Periksa database lokal Anda untuk memastikan invoice awal karcis admisi otomatis dibuat oleh modul `billing` dalam transaksi yang sama:
```sql
-- Cek kunjungan
SELECT id, patientId, status, createdAt FROM admission_visits WHERE patientId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

-- Cek invoice yang otomatis terbit di modul billing
SELECT id, visitId, totalAmount, status FROM billing_invoices WHERE visitId = 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a';
```

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Ilustrasi Kasus: Mengapa Service yang "Bebas dari HTTP" Menyelamatkan Proyek

Tiga bulan setelah sistem SIMRS baru berjalan, tim manajemen mengumumkan kerja sama dengan mesin **Kios Mandiri Antrean (Self-Service Kiosk Machine)** di lobi rumah sakit. Kios tersebut tidak menggunakan REST API biasa, melainkan mengirim event via **MQTT / WebSocket**.

Karena seluruh logika pendaftaran di `registration.service.js` dirancang **bebas dari objek `c` Hono**, tim backend hanya membutuhkan waktu **2 jam** untuk mengintegrasikan kios tersebut:

```javascript
// mqtt/kiosk-consumer.js
import * as registrationService from '../modules/admission/services/registration.service.js';

mqttClient.on('message', async (topic, message) => {
  if (topic === 'kiosk/patient/register') {
    const payload = JSON.parse(message.toString());
    const actor = { id: 'KIOSK-SYSTEM-01', role: 'KIOSK' };
    
    // LANGSUNG PANGGIL SERVICE TANPA MOCK HTTP REQUEST!
    const result = await registrationService.createOutpatientVisit(payload, actor);
    console.log('Kunjungan dari Kios Mandiri Terdaftar:', result.id);
  }
});
```

Jika fungsi pendaftaran masih ditulis dengan gaya lama (terikat pada objek `c`), tim terpaksa menulis ulang seluruh logika atau membuat tiruan HTTP request palsu (*fake request context*).

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

1. [ ] **Hapus `c` dari Service Layer**: Periksa seluruh fungsi di `src/modules/*/services/`. Jika ada parameter `c` yang masuk ke dalam fungsi service, segera refactor dan gantikan dengan parameter data murni.
2. [ ] **Hilangkan Try-Catch Manual di Handler**: Delegasikan semua penanganan error ke `globalErrorHandler`. Jika terjadi kesalahan bisnis, cukup tulis `throw createAppError(...)` tanpa perlu sintaks class `new`.
3. [ ] **Terapkan Skema Validasi Zod**: Buat file validator untuk setiap rute mutasi (`POST`, `PUT`, `PATCH`) dan pasang middleware `@hono/zod-validator`.
4. [ ] **Gunakan Managed Transactions**: Selalu gunakan `sequelize.transaction(async (t) => { ... })` agar rollback terjadi otomatis saat timbul error tak terduga.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Kode yang baik bukanlah kode yang cerdik dengan trik satu baris yang rumit, melainkan kode yang membosankan karena begitu mudah dipahami, sangat mudah diuji, dan tidak mengejutkan siapa pun saat terjadi insiden."*  
> — Catatan Architecture Guild (kutipan ilustratif)

**Pertanyaan Refleksi Tim**:
* *"Bisakah fungsi pendaftaran atau pelunasan tagihan di sistem kita dipanggil dari script CLI atau unit test sederhana tanpa menyalakan server HTTP sama sekali?"*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 2: Prinsip Modular Monolith](02-prinsip-modular-monolith-dan-bounded-context.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 4: Dual-Runtime Architecture (Docker vs AWS Lambda)](04-dual-runtime-docker-dan-aws-lambda.md)**
