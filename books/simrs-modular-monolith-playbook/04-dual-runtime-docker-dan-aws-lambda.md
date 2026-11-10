# Part 4: Dual-Runtime Architecture: Menjinakkan Docker & AWS Lambda

> 📖 Hub Buku: **[The SIMRS Backend Playbook](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Dalam lanskap operasional rumah sakit modern, sering terjadi perdebatan sengit antara dua kubu tim infrastruktur:

* **Kubu Serverless / Cloud-Native**: *"Rumah sakit hanya ramai dari jam 07:00 pagi hingga jam 14:00 siang. Pada malam hari, puluhan server menganggur dan menghamburkan anggaran cloud. Kita harus menggunakan AWS Lambda agar infrastruktur dapat scale to zero dan secara otomatis melipatgandakan kapasitas saat antrean pagi membludak tanpa biaya pemeliharaan server."*
* **Kubu On-Premise / Container (Docker)**: *"Regulasi keamanan data kesehatan menuntut beberapa rumah sakit daerah menjalankan sistem di data center lokal (On-Premise) tanpa koneksi internet langsung. Server harus berjalan di container Docker yang stabil, memiliki connection pool yang persisten, dan waktu respon yang konsisten tanpa cold start."*

Dua kubu ini sering berujung pada keputusan yang keliru: **membuat dua basis kode terpisah** atau **mengunci arsitektur pada satu vendor cloud spesifik**.

Di sinilah keunggulan arsitektur modern berbasis **Hono**. Berbeda dari framework Node.js klasik (seperti Express yang bergantung pada objek `req` dan `res` milik mesin V8 Node.js lokal), Hono dibangun di atas fondasi standar web global (**Web Standard Fetch API: `Request` dan `Response`**). 

Hasilnya, logika aplikasi Anda di `src/app.js` tidak perlu diubah satu karakter pun. Sistem yang sama dapat dikemas menjadi *single Docker container* untuk server on-premise RSUD, sekaligus menjadi *serverless zip function* di AWS Lambda untuk rumah sakit swasta berskala nasional. Namun, ada satu komponen kritis yang harus dijinakkan: **manajemen koneksi basis data (Sequelize Connection Pool)**.

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

```text
               SATU APLIKASI (APP.JS) DENGAN DUA JALUR ENTRYPOINT
  
                              ┌────────────────┐
                              │   src/app.js   │
                              │ (Hono Web App) │
                              └───────┬────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
   [ Docker / On-Premise ]                             [ AWS Lambda Serverless ]
          server.js                                            lambda.js
     (@hono/node-server)                                   (hono/aws-lambda)
            │                                                   │
     Long-Running VM                                    Short-Lived Execution
  • Persistent Connection Pool                        • Ephemeral Execution
    (max: 20, min: 5)                                 • Dynamic Pool (max: 1, min: 0)
  • Graceful Shutdown (SIGTERM)                       • AWS RDS Proxy Connection Multiplex
```

---

### 1. Desain Aplikasi Utama (`src/app.js`): Zero Vendor Lock-in

Berkas `src/app.js` hanya bertanggung jawab untuk merangkai middleware inti dan menghubungkan sub-router dari masing-masing modul. Berkas ini sama sekali tidak memanggil `app.listen()` atau modul AWS SDK:

```javascript
// src/app.js
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { globalErrorHandler } from './core/http/error.middleware.js';

// Import router resmi dari masing-masing Bounded Context
import { masterDataRoutes } from './modules/master-data/index.js';
import { admissionRoutes } from './modules/admission/index.js';
import { emrRoutes } from './modules/emr/index.js';
import { pharmacyRoutes } from './modules/pharmacy/index.js';
import { billingRoutes } from './modules/billing/index.js';
import { bridgingRoutes } from './modules/bridging/index.js';

const app = new Hono().basePath('/api/v1');

// Pasang Global Middleware
app.use('*', requestId());
app.onError(globalErrorHandler);

// Mounting Rute Modul (Semua modul terisolasi di bawah path masing-masing)
app.route('/master-data', masterDataRoutes);
app.route('/admissions', admissionRoutes);
app.route('/emr', emrRoutes);
app.route('/pharmacy', pharmacyRoutes);
app.route('/billing', billingRoutes);
app.route('/bridging', bridgingRoutes);

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'HEALTHY', timestamp: new Date().toISOString() }));

export default app;
```

---

### 2. Menjinakkan Koneksi Database: Sequelize Adaptive Singleton

Inilah titik paling rawan yang sering menggagalkan migrasi SIMRS ke serverless. Sequelize secara default didesain untuk server persisten. Jika kita tidak membedakan lingkungan eksekusi, AWS Lambda akan membuka ribuan koneksi dan menghancurkan basis data.

Solusinya adalah **Adaptive Database Singleton**:

```javascript
// src/core/database/index.js
import { Sequelize } from 'sequelize';

// Deteksi apakah aplikasi sedang berjalan di lingkungan AWS Lambda
const isLambda = Boolean(
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.AWS_EXECUTION_ENV || 
  process.env.LAMBDA_TASK_ROOT
);

let sequelizeInstance = null;

export const getDatabase = () => {
  if (!sequelizeInstance) {
    const dbUri = process.env.DB_URI;
    if (!dbUri) {
      throw new Error('Variabel lingkungan DB_URI belum didefinisikan!');
    }

    sequelizeInstance = new Sequelize(dbUri, {
      dialect: 'mysql', // atau 'postgres'
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      
      // KONFIGURASI ADAPTIF CONNECTION POOL
      pool: isLambda
        ? {
            // Konfigurasi Khusus AWS Lambda:
            // Satu execution environment hanya memproses SATU request pada satu waktu,
            // jadi pool lebih dari 1 tidak menambah throughput. Konkurensi dicapai
            // lewat banyak instance Lambda, bukan pool besar.
            max: 1,
            min: 0,
            idle: 1000,
            acquire: 3000,
            evict: 0 // Matikan timer evict; pembersihan dilakukan per-invocation (lihat lambda.js)
          }
        : {
            // Konfigurasi Khusus Docker / Kubernetes (Long-Running):
            // Satu instance melayani ribuan request bergantian.
            // Pertahankan koneksi hangat (min pool) untuk latensi ultra-cepat.
            max: 20,
            min: 5,
            idle: 10000,
            acquire: 30000
          }
    });

    // Logging status inisialisasi koneksi
    console.info(`[DATABASE] Inisialisasi Sequelize Singleton. Mode: ${isLambda ? 'AWS_LAMBDA (Serverless)' : 'PERSISTENT (Docker)'}`);
  }

  return sequelizeInstance;
};

// Singleton export
export const sequelize = getDatabase();
```

> [!IMPORTANT]
> **Rekomendasi Wajib untuk AWS Lambda: Pasang AWS RDS Proxy!**  
> Di lingkungan produksi rumah sakit dengan ratusan loket poliklinik, connection pool Sequelize di sisi aplikasi saja tidak cukup menjamin basis data aman dari *connection exhaustion*. Gunakan **AWS RDS Proxy** di depan Amazon Aurora/RDS. RDS Proxy bertindak sebagai *connection multiplexer* terpusat yang menjaga koneksi fisik ke basis data tetap stabil meskipun puluhan ribu fungsi Lambda memanggilnya secara bersamaan.

---

### 3. Entrypoint 1: Docker / VM Deployment (`server.js`)

Untuk lingkungan lokal, server on-premise rumah sakit, atau deployment berbasis Kubernetes:

```javascript
// server.js
import { serve } from '@hono/node-server';
import app from './src/app.js';
import { sequelize } from './src/core/database/index.js';

const port = Number(process.env.PORT) || 3000;

// Jalankan HTTP server Node.js
const server = serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.info(`🚀 [DOCKER RUNTIME] SIMRS Core API berjalan di http://localhost:${info.port}`);
  }
);

// GRACEFUL SHUTDOWN (Sangat krusial untuk transaksi medis!)
// Mencegah pemotongan transaksi di tengah jalan saat container di-restart/redeploy
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 25000; // < terminationGracePeriodSeconds K8s (default 30s)
let isShuttingDown = false;

const closeHttpServer = () =>
  new Promise((resolve, reject) => {
    // server.close() berhenti menerima koneksi baru dan baru memanggil callback
    // setelah SEMUA request yang sedang berjalan selesai.
    server.close((err) => (err ? reject(err) : resolve()));
  });

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.warn(`[SHUTDOWN] Menerima sinyal ${signal}. Menutup server secara aman...`);

  // Jaring pengaman: paksa keluar jika ada request yang menggantung terlalu lama
  const forceExit = setTimeout(() => {
    console.error('[SHUTDOWN] Batas waktu habis, paksa keluar.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    // 1. TUNGGU request aktif (termasuk transaksi kasir) selesai
    await closeHttpServer();
    console.info('[SHUTDOWN] Semua request aktif selesai, HTTP listener ditutup.');

    // 2. Baru tutup pool database setelah tidak ada lagi yang memakainya
    await sequelize.close();
    console.info('[SHUTDOWN] Seluruh koneksi basis data berhasil ditutup.');
    process.exit(0);
  } catch (error) {
    console.error('[SHUTDOWN ERROR] Gagal menutup server dengan bersih:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

> [!NOTE]
> Urutan penting: **tutup HTTP dulu dan tunggu, baru tutup database.** Versi yang memanggil `server.close()` tanpa menunggu lalu langsung `sequelize.close()` justru akan memutus query yang masih berjalan, persis skenario kasir yang ingin dicegah. Di Kubernetes, tambahkan juga `preStop` hook singkat (misalnya `sleep 5`) agar load balancer berhenti mengirim trafik sebelum `SIGTERM` diproses.

---

### 4. Entrypoint 2: AWS Lambda Serverless (`lambda.js`)

Untuk deployment cloud serverless menggunakan AWS Lambda dan API Gateway:

```javascript
// lambda.js
import { handle } from 'hono/aws-lambda';
import app from './src/app.js';
import { sequelize } from './src/core/database/index.js';

const honoHandler = handle(app);

export const handler = async (event, context) => {
  // Pola yang direkomendasikan dokumentasi Sequelize untuk Lambda:
  // inisialisasi ulang pool di awal invocation (karena koneksi lama bisa sudah
  // diputus saat environment dibekukan), lalu tutup di akhir invocation.
  sequelize.connectionManager.initPools();
  if (Object.prototype.hasOwnProperty.call(sequelize.connectionManager, 'getConnection')) {
    delete sequelize.connectionManager.getConnection;
  }

  try {
    return await honoHandler(event, context);
  } finally {
    await sequelize.connectionManager.close();
  }
};
```

> [!NOTE]
> Detail `initPools()`/`close()` bergantung pada versi Sequelize (v6). Verifikasi ulang terhadap panduan resmi "AWS Lambda" di dokumentasi Sequelize versi yang Anda pakai sebelum masuk produksi. Jika memakai **RDS Proxy**, membuka-tutup koneksi per invocation menjadi murah karena proxy yang memegang koneksi fisik ke database.

Dengan wrapper tipis di atas, seluruh sistem SIMRS kompatibel dengan arsitektur serverless tanpa mengubah satu baris pun logika bisnis di dalam modul-modul medis.

### 5. Entrypoint 3: Outbox Worker di Lambda (`worker.lambda.js`)

Lambda tidak punya proses latar belakang yang berjalan terus. Worker outbox (Part 5) harus **dipicu dari luar**:
- **EventBridge Scheduler** setiap 1 menit memanggil `worker.lambda.js` untuk memproses batch outbox berstatus `PENDING`.
- Atau **SQS**: setelah commit, aplikasi mengirim pesan ke antrean; Lambda worker dipicu per pesan, dan kegagalan berulang otomatis masuk *Dead Letter Queue*.

Di Docker, worker yang sama dapat dijalankan sebagai container terpisah (`node worker.js`) dengan loop polling, sehingga tidak berebut sumber daya dengan API.

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Ilustrasi Kasus: Skenario Graceful Shutdown Saat Pasien Membayar di Kasir

Bayangkan skenario berikut pada pukul 12.00 siang di rumah sakit:
1. Pasien sedang menyelesaikan pembayaran operasi jantung senilai Rp45.000.000 di loket kasir.
2. Tim DevOps menjalankan automated deployment untuk memperbarui versi SIMRS via Docker Kubernetes Rolling Update.
3. Node Kubernetes mengirim sinyal `SIGTERM` ke container yang sedang memproses transaksi tersebut.

**Jika Tanpa Graceful Shutdown**:
Container langsung dimatikan secara instan (`process.exit()`). Koneksi basis data terputus di tengah eksekusi query. Hasilnya: uang pasien telah terpotong di mesin EDC, namun status tagihan di basis data masih berstatus `UNPAID`. Pasien tertahan di kasir dan terjadi selisih pembukuan kas (*financial reconciliation nightmare*).

**Dengan Graceful Shutdown**:
Saat sinyal `SIGTERM` diterima, server menolak request baru, memberi waktu hingga transaksi kasir yang sedang berjalan selesai commit secara utuh ke database, menutup connection pool dengan tertib, dan baru kemudian mematikan proses. Integritas data keuangan tetap utuh 100%.

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

1. [ ] **Pisahkan Entrypoint**: Pastikan Anda memiliki berkas `server.js` untuk Docker dan `lambda.js` untuk AWS Lambda, dengan `src/app.js` sebagai pusat perakitan murni.
2. [ ] **Verifikasi Singleton Sequelize**: Pastikan inisialisasi Sequelize tidak dipanggil berulang kali di setiap rute atau handler.
3. [ ] **Konfigurasi Pool Sesuai Lingkungan**: Terapkan logika `isLambda` di file koneksi database Anda untuk membatasi `max: 1` saat berjalan di serverless, dan bungkus handler Lambda dengan `initPools()`/`close()` per invocation.
4. [ ] **Implementasikan Graceful Shutdown**: Uji penutupan server lokal Anda dengan menekan `Ctrl+C` (SIGINT) dan pastikan log `sequelize.close()` tereksekusi dengan sukses.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Arsitektur cloud yang tangguh bukanlah arsitektur yang berasumsi server tidak akan pernah mati, melainkan arsitektur yang siap dimatikan kapan saja tanpa merusak satu baris pun data pasien."*  
> — Catatan Architecture Guild (kutipan ilustratif)

**Pertanyaan Refleksi Tim**:
* *"Apakah sistem backend rumah sakit kita saat ini dapat dipindahkan dari data center on-premise ke cloud AWS dalam hitungan jam tanpa harus menulis ulang kode database?"*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 3: Clean Implementation & Standar Kode](03-standar-kode-clean-architecture-hono-sequelize.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 5: Compliance Kesehatan (Audit Trail & Bridging BPJS/SATUSEHAT)](05-audit-trail-rme-dan-bridging-eksternal.md)**
