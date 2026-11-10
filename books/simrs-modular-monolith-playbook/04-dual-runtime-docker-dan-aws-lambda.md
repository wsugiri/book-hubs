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
    (max: 20, min: 5)                                 • Dynamic Pool (max: 2, min: 0)
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
            // Sifat eksekusi bersifat konkuren per-container.
            // Gunakan pool sangat kecil dan agresif dalam membuang koneksi idle.
            max: 2,
            min: 0,
            idle: 1000,
            acquire: 30000,
            evict: 1000
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
const gracefulShutdown = async (signal) => {
  console.warn(`[SHUTDOWN] Menerima sinyal ${signal}. Menutup server secara aman...`);

  // 1. Berhenti menerima request HTTP baru
  server.close(() => {
    console.info('[SHUTDOWN] HTTP listener ditutup.');
  });

  // 2. Tunggu koneksi database menyelesaikan query aktif lalu tutup pool
  try {
    await sequelize.close();
    console.info('[SHUTDOWN] Seluruh koneksi basis data berhasil ditutup.');
    process.exit(0);
  } catch (error) {
    console.error('[SHUTDOWN ERROR] Terjadi kegagalan saat menutup koneksi database:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

### 4. Entrypoint 2: AWS Lambda Serverless (`lambda.js`)

Untuk deployment cloud serverless menggunakan AWS Lambda dan API Gateway:

```javascript
// lambda.js
import { handle } from 'hono/aws-lambda';
import app from './src/app.js';

// Wrapper bawaan Hono yang mengonversi event API Gateway V1/V2 menjadi Web Fetch API
export const handler = handle(app);
```

Hanya dengan **4 baris kode** di atas, seluruh sistem SIMRS Anda kompatibel dengan arsitektur serverless modern tanpa mengubah satu baris pun logika bisnis di dalam modul-modul medis Anda.

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Kasus Nyata: Skenario Graceful Shutdown Saat Pasien Membayar di Kasir

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
3. [ ] **Konfigurasi Pool Sesuai Lingkungan**: Terapkan logika `isLambda` di file koneksi database Anda untuk membatasi `max: 2` saat berjalan di serverless.
4. [ ] **Implementasikan Graceful Shutdown**: Uji penutupan server lokal Anda dengan menekan `Ctrl+C` (SIGINT) dan pastikan log `sequelize.close()` tereksekusi dengan sukses.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Arsitektur cloud yang tangguh bukanlah arsitektur yang berasumsi server tidak akan pernah mati, melainkan arsitektur yang siap dimatikan kapan saja tanpa merusak satu baris pun data pasien."*  
> — Cloud Infrastructure Architect

**Pertanyaan Refleksi Tim**:
* *"Apakah sistem backend rumah sakit kita saat ini dapat dipindahkan dari data center on-premise ke cloud AWS dalam hitungan jam tanpa harus menulis ulang kode database?"*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 3: Clean Implementation & Standar Kode](03-standar-kode-clean-architecture-hono-sequelize.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 5: Compliance Kesehatan (Audit Trail & Bridging BPJS/SATUSEHAT)](05-audit-trail-rme-dan-bridging-eksternal.md)**
