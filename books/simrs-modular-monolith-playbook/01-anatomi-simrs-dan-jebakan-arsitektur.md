# Part 1: Anatomi Kompleksitas SIMRS & Jebakan Arsitektur Klasik

> 📖 Hub Buku: **[The SIMRS Backend Playbook](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Setiap hari Senin pukul 07.15 pagi di Rumah Sakit Umum Daerah (RSUD) kelas B berkapasitas 400 tempat tidur, terjadi sebuah fenomena yang oleh para insinyur sistem informasi kesehatan disebut sebagai *"The Morning Surge"*.

Di ruang tunggu utama, ratusan pasien rawat jalan mengantre tiket admisi poliklinik. Di saat yang sama, belasan dokter spesialis mulai menyalakan komputer poliklinik untuk membaca riwayat pasien melalui Rekam Medis Elektronik (RME). Di lantai tiga, petugas instalasi farmasi mulai menyiapkan obat racikan berdasarkan e-resep pertama yang masuk, sementara di Instalasi Gawat Darurat (IGD), pasien rujukan kecelakaan lalu lintas harus segera didaftarkan tanpa jeda satu detik pun. 

Tiba-tiba, layar kasir dan petugas pendaftaran berputar tanpa henti: *Loading spinner*. Respon API yang biasanya 80 milidetik melonjak menjadi 15 detik, disusul hujan kode status `HTTP 504 Gateway Timeout`. Di dalam ruang server, log basis data memuntahkan galat yang menakutkan: `FATAL: remaining connection slots are reserved for non-replication superuser connections` dan `SequelizeConnectionAcquireTimeoutError`.

Apa yang sebenarnya terjadi? Apakah jumlah pasien rumah sakit itu setara dengan festival diskon e-commerce jutaan pengguna per detik? Sama sekali tidak. Beban transaksi rumah sakit secara volume absolut sebenarnya tergolong moderat—mungkin "hanya" beberapa ratus transaksi konkuren per detik. Namun, sistem itu tumbang karena satu hal mendasar: **kesalahan fatal dalam arsitektur perangkat lunak.**

Sistem SIMRS tersebut dibangun dengan arsitektur klasik *Layer-First MVC* (`handlers/`, `models/`, `routes/`), di mana puluhan developer selama bertahun-tahun bebas melakukan `import` model antar folder teknis, menulis query relasi SQL yang menjalar tanpa batas, dan menaruh seluruh logika bisnis di dalam fungsi HTTP handler. Ketika sistem tersebut dipindahkan ke arsitektur serverless (seperti AWS Lambda) untuk menghemat biaya infrastruktur, seluruh kelemahan desain itu meledak secara serempak.

Bab ini membedah secara kritis anatomi kegagalan tersebut, membongkar ilusi kenyamanan pola MVC tradisional, dan memetakan mengapa sistem informasi rumah sakit membutuhkan paradigma rekayasa yang jauh lebih disiplin.

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

```text
                     JEBAKAN LAYER-FIRST (TECHNICAL SLICING)
  
  handlers/                  models/                   routes/
  ├── admission.handler.js ──┼── Visit.js ─────────────┼── admission.route.js
  ├── billing.handler.js ────┼── Invoice.js ───────────┼── billing.route.js
  ├── emr.handler.js ────────┼── MedicalRecord.js ─────┼── emr.route.js
  └── pharmacy.handler.js ───┴── Prescription.js ──────┴── pharmacy.route.js
           │                          ▲
           └──────────────────────────┘
      (Semua handler bebas memanggil semua model -> Spaghetti Dependencies)
```

### 1. Jebakan Layer-First vs. Domain-First (Mengapa MVC Menjadi Anti-Pattern)

Pada awal pembuatan proyek perangkat lunak, mengelompokkan file berdasarkan jenis teknisnya (*technical slicing*) terasa sangat intuitif:
* Semua controller atau handler ditaruh di `src/handlers/`
* Semua model Sequelize ditaruh di `src/models/`
* Semua route ditaruh di `src/routes/`

Namun dalam domain sekompleks rumah sakit, pola ini adalah jebakan mematikan. Bisnis rumah sakit tidak bekerja secara teknis; rumah sakit bekerja berdasarkan **Domain Klinis dan Administratif**. 

Ketika seorang developer ditugaskan mengerjakan fitur *"Discharge Pasien Rawat Inap"*, ia harus membuka:
* `src/handlers/admission.handler.js` (untuk status kepulangan tempat tidur)
* `src/handlers/billing.handler.js` (untuk pelunasan kasir dan split bill asuransi)
* `src/handlers/pharmacy.handler.js` (untuk retur obat yang belum terpakai)
* `src/models/Bed.js`, `src/models/Invoice.js`, `src/models/Prescription.js`
* Berbagai file route yang tersebar di belasan tempat.

**Dampaknya:**
1. **High Cognitive Load**: Developer harus melompat ke 10 direktori berbeda hanya untuk menyelesaikan satu fitur bisnis.
2. **Spaghetti Dependencies**: Tidak ada batas yang jelas siapa boleh memanggil siapa. Developer modul pendaftaran merasa wajar meng-import model `Invoice` dari folder `models/` lalu memanggil `Invoice.update()` langsung di dalam handler pendaftaran.
3. **Mimpi Buruk Pemisahan Microservices**: Ketika manajemen memutuskan modul Farmasi atau Billing harus dipisahkan menjadi microservice independen karena beban kerjanya yang tinggi, arsitek sistem mendapati fakta pahit: ratusan file saling mengunci (*tightly coupled*). Upaya pemisahan membutuhkan penulisan ulang (*rewrite*) hampir 70% basis kode.

---

### 2. Bahaya "Fat Handler" & Coupling ke HTTP Protocol

Perhatikan pola kode yang sangat sering dijumpai pada backend SIMRS berikut:

```javascript
// ❌ ANTI-PATTERN: Fat Handler yang terikat mati pada objek 'c' (Hono Context)
export const dischargePatient = async (c) => {
  const visitId = c.req.param('id');
  const user = c.get('user'); // Dari JWT Middleware

  const visit = await Visit.findByPk(visitId);
  if (!visit) {
    return c.json({ success: false, statusCode: 404, message: 'Kunjungan tidak ditemukan' }, 404);
  }

  // 50 baris business logic bercampur dengan HTTP response
  if (visit.status !== 'ACTIVE') {
    return c.json({ success: false, statusCode: 400, message: 'Pasien sudah discharge' }, 400);
  }

  // Cek tagihan kasir langsung tembak model Invoice
  const unpaidInvoices = await Invoice.findAll({ where: { visitId, status: 'UNPAID' } });
  if (unpaidInvoices.length > 0) {
    return c.json({ success: false, statusCode: 422, message: 'Masih ada tagihan belum lunas' }, 422);
  }

  visit.status = 'DISCHARGED';
  visit.dischargedAt = new Date();
  await visit.save();

  return c.json({ success: true, statusCode: 200, data: visit });
};
```

#### Mengapa Kode Ini Sangat Berbahaya?
1. **Coupled ke Protokol HTTP**: Logika bisnis validasi pelunasan tagihan dan pengosongan tempat tidur terkunci di dalam fungsi yang menerima parameter `c` (Hono Context).
2. **Zero Reusability**: Tiga bulan kemudian, manajemen meminta fitur baru: *"Otomatisasi Discharge Pasien via Cron Job setiap tengah malam jika pasien asuransi sudah melewati batas waktu"* atau *"Trigger Discharge dari event message queue (RabbitMQ/SQS) ketika sistem kasir eksternal mengirim webhook"*. 
   Developer tidak bisa memanggil fungsi di atas tanpa "memalsukan" objek mock HTTP Request `c`. Akhirnya, developer memilih jalan pintas: menyalin (*copy-paste*) logika 50 baris tersebut ke file cron job. Duplikasi logika bisnis resmi dimulai, dan celah inkonsistensi data terbuka lebar.

---

### 3. Kontradiksi Semantik Format Response & Redundansi Status

Banyak API SIMRS menghasilkan format respons JSON yang saling bertentangan:

```json
// ❌ ANTI-PATTERN: Kontradiksi Semantik & Duplikasi
{
  "success": true,
  "statusCode": 400,
  "data": {}
}
```

* **Kontradiksi Logika**: Kode status HTTP `400` merepresentasikan *Bad Request* (kegagalan klien). Menyertakan properti `"success": true` bersamaan dengan status 400 adalah kontradiksi logika yang membingungkan integrasi frontend (React/Flutter) dan bridging eksternal.
* **Redundansi Status**: Mengirimkan `statusCode` di dalam payload JSON sekaligus di HTTP Response Header adalah pemborosan redundan yang rawan inkonsistensi. Jika developer lupa menyelaraskan keduanya, HTTP header bernilai `200 OK` sementara JSON body bernilai `"statusCode": 500`. Seluruh format respons harus diatur oleh satu pintu keluar standar (*centralized response helper*) yang deterministik.

---

### 4. Bencana Connection Pool Exhaustion di AWS Lambda

Ketika aplikasi SIMRS di-deploy ke arsitektur serverless (seperti AWS Lambda), Sequelize menyimpan bahaya laten jika tidak dikonfigurasi secara presisi.

```text
                  AWS LAMBDA vs. DATABASE CONNECTION POOL
  
  [ Container Docker (Long-Running) ]        [ AWS Lambda (Short-Lived / Ephemeral) ]
  1 instance Node.js = 1 persistent pool    100 concurrent invocations = 100 pools!
  
         Node.js Server (Docker)                   Lambda 1    Lambda 2    Lambda 100
             [ Pool: 20 Conn ]                    [Pool: 5]   [Pool: 5]   [Pool: 5]
                    │                                 │           │           │
                    ▼                                 ▼           ▼           ▼
        ┌───────────────────────┐                 ┌────────────────────────────────┐
        │  MySQL / PostgreSQL   │                 │       MySQL / PostgreSQL       │
        │  max_connections: 150 │                 │      max_connections: 150      │
        └───────────────────────┘                 └────────────────────────────────┘
             Koneksi Aman: ~20                         Koneksi Meledak: 500!!
                                                  (DATABASE EXHAUSTION & CRASH)
```

* **Model Docker (Server Persisten)**: Satu instance server Node.js berjalan terus menerus. Sequelize membuka connection pool (misal `min: 5, max: 20`). Semua request HTTP yang masuk bergantian menggunakan pool yang sama. Jumlah koneksi ke basis data stabil dan terprediksi.
* **Model AWS Lambda (Event-Driven Concurrency)**: Setiap kali ada lonjakan request bersamaan (misal saat 100 loket poliklinik dibuka serentak), AWS Lambda membuat 100 *execution environments* yang berbeda. Jika masing-masing instance Lambda membuka koneksi pool default (misalnya `max: 5`), maka dalam tempo 3 detik akan ada `100 * 5 = 500` koneksi baru yang ditembakkan ke database.
* **Hasil Akhir**: Database rumah sakit seketika mencapai batas `max_connections`, menolak seluruh koneksi baru, dan melumpuhkan operasional rumah sakit secara total.

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Kasus Nyata: Tragedi Resep Farmasi Tanpa Batas Domain

Di sebuah rumah sakit swasta, seorang pasien rawat inap mendapatkan resep obat antibiotik dosis tinggi. Dokter memasukkan resep melalui modul EMR, yang langsung menulis data ke tabel `prescriptions`. 

Karena tidak ada isolasi modul, developer modul Farmasi menulis query langsung dari layar kasir farmasi:
```javascript
// Query langsung dari modul Farmasi ke tabel kunjungan Admisi
const visit = await Visit.findOne({
  where: { id: prescription.visitId },
  include: [{ model: Patient, include: [Insurance] }] // Deep Eager Loading lintas modul
});
```

Ketika tim admisi mengubah kolom `status` pada tabel `visits` dari enum sederhana menjadi struktur status bertingkat untuk mengakomodasi regulasi baru BPJS, query di modul Farmasi seketika pecah (*runtime crash*). Selama 4 jam, petugas farmasi tidak bisa memvalidasi obat dan mengeluarkan obat racikan, sementara antrean keluarga pasien di depan instalasi farmasi membludak hingga ke lobi utama rumah sakit.

Perubahan kecil pada modul Admisi menghancurkan modul Farmasi hanya karena **modul Farmasi mengintip dan bergantung langsung pada struktur internal basis data modul Admisi.**

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

Segera lakukan audit pada basis kode SIMRS Anda saat ini:

1. [ ] **Audit Ketergantungan Lintas Modul**: Buka terminal dan jalankan pencarian (grep) untuk melihat seberapa sering file di bawah domain A meng-import model milik domain B secara langsung.
2. [ ] **Sterilkan HTTP Context dari Business Logic**: Periksa fungsi handler Anda. Jika fungsi tersebut menerima parameter `c` (atau `req, res`) lalu melakukan operasi hitung bisnis, validasi klinis, atau query database di atas 20 baris, tandai sebagai target refactoring ke Service Layer.
3. [ ] **Periksa Konfigurasi Database Pool**: Cek file inisialisasi Sequelize. Apakah connection pool masih menggunakan konfigurasi statis tunggal tanpa membedakan apakah aplikasi sedang dieksekusi di dalam container Docker atau di AWS Lambda?
4. [ ] **Standardisasi Envelope Response**: Pastikan tidak ada lagi response yang menduplikasi status code atau memiliki kontradiksi semantik seperti `{ success: true, statusCode: 400 }`.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Menata kode berdasarkan jenis teknis (handlers, models, routes) sama seperti menata rumah dengan menaruh semua gagang pintu di ruang tamu, semua jendela di dapur, dan semua atap di garasi. Terlihat rapi menurut kategori benda, tetapi mustahil untuk ditinggali."*  
> — Healthcare System Architect

**Pertanyaan Refleksi Tim**:
* *"Jika besok pagi manajemen meminta modul Bridging BPJS dipisahkan menjadi server tersendiri karena sering mengalami timeout, berapa ratus baris kode yang harus kami bongkar di modul-modul lainnya?"*

---

## 🧭 Navigasi Bab Selanjutnya

📖 **[Kembali ke Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 2: Paradigma Modular Monolith & Bounded Contexts](02-prinsip-modular-monolith-dan-bounded-context.md)**
