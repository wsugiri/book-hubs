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

### 2. Menjinakkan Koneksi Relasional: Sequelize Adaptive Singleton (MySQL & PostgreSQL)

Inilah titik paling rawan yang sering menggagalkan migrasi SIMRS ke serverless. Sequelize secara default didesain untuk server persisten. Jika kita tidak membedakan lingkungan eksekusi, AWS Lambda akan membuka ribuan koneksi dan menghancurkan basis data.

Selain itu, rumah sakit memiliki preferensi basis data relasional yang berbeda:
* **MySQL 8.0+**: Sangat populer di rumah sakit daerah berkat ketersediaan talenta lokal dan kemudahan administrasi.
* **PostgreSQL 15/16+**: Menjadi standar emas untuk sistem rumah sakit enterprise berkat dukungan tipe data `JSONB` yang sangat cepat dengan *GIN indexing* (cocok untuk form rekam medis dinamis CPPT/SOAP) serta kepatuhan ACID yang ketat.

Solusinya adalah **Adaptive Database Singleton** yang dioptimalkan secara spesifik untuk kedua dialek:

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

    // Deteksi Dialek: 'postgres' atau 'mysql'
    const dialect = process.env.DB_DIALECT || (dbUri.startsWith('postgres') ? 'postgres' : 'mysql');

    // 1. Opsi Khusus Dialek (Dialect-Specific Optimizations)
    const dialectOptions = dialect === 'postgres'
      ? {
          // OPTIMASI KHUSUS POSTGRESQL:
          statement_timeout: 30000, // 30s: Batasi query poliklinik liar agar tidak menggantung database
          idle_in_transaction_session_timeout: 10000, // 10s: Matikan koneksi jika developer lupa commit/rollback
          application_name: 'simrs-backend-service', // Mempermudah pelacakan di pg_stat_activity
          ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false
        }
      : {
          // OPTIMASI KHUSUS MYSQL (8.0+):
          charset: 'utf8mb4',
          timezone: '+07:00', // Kunci ke zona waktu WIB untuk keakuratan jam admisi
          decimalNumbers: true, // PENTING: Mencegah nilai rupiah kasir dibulatkan jadi float JS cacat
          connectTimeout: 10000
        };

    // 2. Konfigurasi Pool Adaptif (Docker vs AWS Lambda)
    const poolConfig = isLambda
      ? {
          // Mode Serverless: 1 koneksi per instance container Lambda
          max: 1,
          min: 0,
          idle: 1000,
          acquire: 3000,
          evict: 0
        }
      : {
          // Mode Container Docker / VM: Persistent pool untuk latensi ultra-cepat
          max: Number(process.env.DB_POOL_MAX) || 20,
          min: Number(process.env.DB_POOL_MIN) || 5,
          idle: 10000,
          acquire: 30000
        };

    sequelizeInstance = new Sequelize(dbUri, {
      dialect,
      dialectOptions,
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: poolConfig
    });

    console.info(`[DATABASE] Inisialisasi Sequelize Singleton. Dialek: ${dialect.toUpperCase()} | Mode: ${isLambda ? 'AWS_LAMBDA (Serverless)' : 'PERSISTENT (Docker)'}`);
  }

  return sequelizeInstance;
};

// Singleton export
export const sequelize = getDatabase();
```

---

### Perbandingan Fitur Kunci: PostgreSQL vs MySQL untuk SIMRS

| Kebutuhan Klinis / SIMRS | PostgreSQL (15+) | MySQL (8.0+) | Catatan Arsitektur |
| :--- | :--- | :--- | :--- |
| **Penyimpanan Formulir Rekam Medis (CPPT / SOAP)** | `JSONB` (Binary format) | `JSON` (Text-based) | Di PostgreSQL, `JSONB` mendukung **GIN Indexing**, memungkinkan pencarian diagnosa di dalam dokumen rekam medis berjalan instan tanpa full-table scan. |
| **Primary Key ID Global** | `UUID` native (`gen_random_uuid()`) | `CHAR(36)` atau `BINARY(16)` | Keduanya didukung Sequelize via `DataTypes.UUID`. PostgreSQL lebih hemat ruang penyimpanan disk secara native. |
| **Penguncian Antrean Outbox BPJS** | `FOR UPDATE SKIP LOCKED` | `FOR UPDATE SKIP LOCKED` | **Didukung di kedua database** (MySQL 8.0+ & PG 9.5+). Sangat krusial agar banyak worker outbox tidak berebut baris data yang sama. |
| **Nilai Finansial Kasir** | `NUMERIC(14, 2)` | `DECIMAL(14, 2)` | Wajib mengaktifkan `decimalNumbers: true` di MySQL agar Sequelize tidak mengubah angka presisi rupiah menjadi float. |
| **Zona Waktu Kunjungan** | `TIMESTAMPTZ` | `DATETIME` / `TIMESTAMP` | Disarankan menyimpan semua waktu dalam UTC di level basis data, dan mengonversinya ke WIB (+07) saat presentasi ke klien. |

> [!IMPORTANT]
> **Rekomendasi Wajib untuk AWS Lambda: Pasang AWS RDS Proxy!**  
> Baik Anda menggunakan Amazon Aurora PostgreSQL maupun Aurora MySQL, connection pool Sequelize di sisi aplikasi saja tidak cukup menjamin basis data aman dari *connection exhaustion* saat poliklinik dibuka serentak. Gunakan **AWS RDS Proxy** di depan basis data. RDS Proxy bertindak sebagai *connection multiplexer* terpusat yang menjaga koneksi fisik ke basis data tetap stabil meskipun puluhan ribu fungsi Lambda memanggilnya secara bersamaan.

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

## 🛠️ Hands-On Lab: Berkas Produksi Docker & Pengujian Graceful Shutdown

Berikut adalah artefak konfigurasi lengkap yang siap Anda salin ke proyek:

### 1. `Dockerfile` Produksi Multi-Stage (Non-Root User)
```dockerfile
# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Runtime Minimalis
FROM node:20-alpine AS runner
WORKDIR /app

# Pasang dumb-init untuk menangani sinyal PID 1 (SIGTERM/SIGINT) secara presisi
RUN apk add --no-cache dumb-init

# Jalankan sebagai non-root user demi keamanan kepatuhan rumah sakit
USER node

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node server.js ./

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]
```

### 2. `docker-compose.yml` (Pilihan Basis Data: MySQL 8 atau PostgreSQL 16)
```yaml
version: '3.8'

services:
  # OPSI A: PostgreSQL 16 (Direkomendasikan untuk Enterprise & JSONB RME)
  postgres:
    image: postgres:16-alpine
    container_name: simrs-postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: rootpassword
      POSTGRES_DB: simrs_dev
    ports:
      - '5432:5432'
    volumes:
      - pg_data:/var/lib/postgresql/data
    command: postgres -c max_connections=150 -c shared_buffers=256MB

  # OPSI B: MySQL 8.0 (Alternatif Relasional Populer)
  mysql:
    image: mysql:8.0
    container_name: simrs-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: simrs_dev
    ports:
      - '3306:3306'
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password --max_connections=150

  simrs-api:
    build: .
    container_name: simrs-backend
    restart: unless-stopped
    ports:
      - '3300:3000'
    environment:
      NODE_ENV: development
      PORT: 3000
      # Pilih salah satu koneksi sesuai kebutuhan tim:
      DB_URI: postgresql://postgres:rootpassword@postgres:5432/simrs_dev
      # DB_URI: mysql://root:rootpassword@mysql:3306/simrs_dev
      DB_DIALECT: postgres # atau 'mysql'
      SHUTDOWN_TIMEOUT_MS: 25000
    depends_on:
      - postgres
      # - mysql

volumes:
  pg_data:
  mysql_data:
```

### 3. Skenario Uji Graceful Shutdown (Terminal Hands-On)
Jalankan pengujian ini untuk memvalidasi bahwa transaksi medis yang sedang berjalan tidak akan terputus saat deploy container baru:

```bash
# 1. Jalankan container
docker compose up -d

# 2. Kirim request transaksi panjang (simulasi 5 detik)
curl -X POST http://localhost:3000/api/v1/admissions/outpatient ... &

# 3. Seketika kirim perintah stop container (simulasi rolling update Kubernetes)
docker stop --time 30 simrs-backend

# 4. Amati log container:
docker logs simrs-backend
# Output log yang benar:
# [SHUTDOWN] Menerima sinyal SIGTERM. Menutup server secara aman...
# [SHUTDOWN] Semua request aktif selesai, HTTP listener ditutup.
# [SHUTDOWN] Seluruh koneksi basis data berhasil ditutup.
```

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
