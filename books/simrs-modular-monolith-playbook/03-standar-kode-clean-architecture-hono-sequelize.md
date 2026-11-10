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

#### A. Kelas Kesalahan Bisnis Terstandar (`src/core/errors/AppError.js`)
Jangan melempar error bawaan JavaScript generik seperti `throw new Error('Pasien tidak ditemukan')`. Buat kelas error khusus domain yang membawa konteks kode status HTTP dan kode mesin (*error code*):

```javascript
// src/core/errors/AppError.js
export class AppError extends Error {
  constructor(message, statusCode = 400, errorCode = 'BAD_REQUEST', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errorCode = 'RESOURCE_NOT_FOUND') {
    super(message, 404, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict state', errorCode = 'CONFLICT_STATE') {
    super(message, 409, errorCode);
  }
}
```

#### B. Helper Respon Standar (`src/core/http/response.js`)
Semua endpoint wajib mengembalikan amplop data (*data envelope*) yang konsisten. Untuk keperluan audit rumah sakit, kita selalu menyematkan `requestId`:

```javascript
// src/core/http/response.js
export const sendSuccess = (c, data = null, message = 'Success', statusCode = 200, meta = {}) => {
  return c.json(
    {
      success: true,
      statusCode,
      message,
      data,
      meta: {
        requestId: c.get('requestId') || 'req-untracked',
        timestamp: new Date().toISOString(),
        ...meta
      }
    },
    statusCode
  );
};
```

#### C. Global Error Middleware (`src/core/http/error.middleware.js`)
Middleware ini menangkap semua error yang dilempar dari lapisan terdalam service tanpa memerlukan blok `try-catch` yang berulang-ulang di setiap handler:

```javascript
// src/core/http/error.middleware.js
import { AppError } from '../errors/AppError.js';

export const globalErrorHandler = (err, c) => {
  const requestId = c.get('requestId');

  // Jika error adalah AppError yang sengaja kita lempar
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        statusCode: err.statusCode,
        errorCode: err.errorCode,
        message: err.message,
        details: err.details,
        meta: {
          requestId,
          timestamp: new Date().toISOString()
        }
      },
      err.statusCode
    );
  }

  // Galat tak terduga (Bug sintaks, DB Crash, Network Error)
  console.error(`[UNHANDLED ERROR] [${requestId}]`, err);

  return c.json(
    {
      success: false,
      statusCode: 500,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan sistem internal. Silakan hubungi tim IT Rumah Sakit.',
      meta: {
        requestId,
        timestamp: new Date().toISOString()
      }
    },
    500
  );
};
```

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
import { AppError } from '../../../core/errors/AppError.js';
import * as visitRepo from '../repositories/visit.repository.js';
import { billingService } from '../../billing/index.js'; // Kontrak publik modul Billing

export const createOutpatientVisit = async (payload, actor) => {
  // Gunakan Managed Transaction Sequelize
  return await sequelize.transaction(async (t) => {
    // 1. Validasi Aturan Medis: Pasien tidak boleh punya kunjungan aktif ganda di hari yang sama
    const activeVisit = await visitRepo.findActiveVisitToday(payload.patientId, { transaction: t });
    if (activeVisit) {
      throw new AppError(
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

---

### 5. Repository Layer: Isolasi Akses Basis Data

Fungsi repository membungkus seluruh panggilan ORM Sequelize. Jika suatu saat Anda ingin mengganti query Sequelize dengan raw SQL berkinerja tinggi atau beralih ke Kysely/Prisma, perubahan hanya terjadi di folder `repositories/`, tanpa menyentuh service layer.

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

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Kasus Nyata: Mengapa Service yang "Bebas dari HTTP" Menyelamatkan Proyek

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
2. [ ] **Hilangkan Try-Catch Manual di Handler**: Delegasikan semua penanganan error ke `globalErrorHandler`. Jika terjadi kesalahan bisnis, cukup tulis `throw new AppError(...)`.
3. [ ] **Terapkan Skema Validasi Zod**: Buat file validator untuk setiap rute mutasi (`POST`, `PUT`, `PATCH`) dan pasang middleware `@hono/zod-validator`.
4. [ ] **Gunakan Managed Transactions**: Selalu gunakan `sequelize.transaction(async (t) => { ... })` agar rollback terjadi otomatis saat timbul error tak terduga.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Kode yang baik bukanlah kode yang cerdik dengan trik satu baris yang rumit, melainkan kode yang membosankan karena begitu mudah dipahami, sangat mudah diuji, dan tidak mengejutkan siapa pun saat terjadi insiden."*  
> — Clean Code Architect

**Pertanyaan Refleksi Tim**:
* *"Bisakah fungsi pendaftaran atau pelunasan tagihan di sistem kita dipanggil dari script CLI atau unit test sederhana tanpa menyalakan server HTTP sama sekali?"*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 2: Prinsip Modular Monolith](02-prinsip-modular-monolith-dan-bounded-context.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 4: Dual-Runtime Architecture (Docker vs AWS Lambda)](04-dual-runtime-docker-dan-aws-lambda.md)**
