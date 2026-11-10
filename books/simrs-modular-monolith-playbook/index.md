# 📖 The SIMRS Backend Playbook: Manual Hands-On & Cetak Biru Arsitektur Modular Monolith (Node.js, Hono, Sequelize)

> 📚 **[Kembali ke Katalog Utama (CATALOG.md)](../../CATALOG.md)**  
> **Penulis**: SIMRS Engineering Team & Architecture Guild  
> **Tahun Terbit**: 2026 | **Penerbit**: Modern Healthcare Engineering Press  
> **Genre**: Rekayasa Perangkat Lunak, Enterprise Architecture & Healthcare Systems | **Estimasi Waktu Baca Keseluruhan**: ~90–120 Menit (6 Modul + 1 Lampiran Hands-On)  
> **Rating Rekomendasi**: ⭐⭐⭐⭐⭐ (5.0 / 5.0)  

---

<div align="center">
  <img src="cover.jpg" width="300" alt="The SIMRS Backend Playbook Cover" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); margin-bottom: 12px;" />
</div>

---

## 🧭 Peta Eksplorasi Buku (Reading & Hands-On Roadmap)

Buku ini bukan sekadar risalah konsep teoritis, melainkan **Manual Praktis & Panduan Lapangan (Field Manual)** siap eksekusi. Setiap bab memuat studi kasus nyata, baris kode siap pakai (*functional zero-class*), skrip terminal, skema database, skenario uji cURL, dan resep penanganan insiden produksi:

- [x] 📘 **[Part 1: Anatomi Kompleksitas SIMRS & Jebakan Arsitektur Klasik](01-anatomi-simrs-dan-jebakan-arsitektur.md)** — *Membongkar mengapa pola MVC teknis (handlers/models/routes) menjadi anti-pattern mematikan di rumah sakit. Dilengkapi skrip simulasi reproduksi connection pool exhaustion di AWS Lambda dan audit checklist kode warisan.*
- [x] 📘 **[Part 2: Paradigma Modular Monolith & Bounded Contexts](02-prinsip-modular-monolith-dan-bounded-context.md)** — *Mendefinisikan batas domain medis (Admission, EMR, Pharmacy, Billing, Bridging). Dilengkapi panduan arsitektur panggilan API/service antar-modul (in-process contract, remote microservice adapter via Anti-Corruption Layer, pemutus circular dependency), skrip otomasi `make-module.js`, serta konfigurasi `eslint-plugin-boundaries` dan `dependency-cruiser`.*
- [x] 📘 **[Part 3: Clean Implementation: Delivery, Domain, dan Data Layer](03-standar-kode-clean-architecture-hono-sequelize.md)** — *Tutorial implementasi kode bersih Hono + Sequelize tanpa class. Memisahkan handler tipis dari pure business logic, skema validasi Zod fail-fast, isolasi repository, simulasi lengkap pemanggil & penerima API antar-modul, dan pengujian end-to-end via cURL (skenario sukses 201, penolakan kunjungan aktif 409, dan payload cacat 422).*
- [x] 📘 **[Part 4: Dual-Runtime Architecture: Menjinakkan Docker & AWS Lambda](04-dual-runtime-docker-dan-aws-lambda.md)** — *Satu basis kode untuk dua lingkungan runtime yang dioptimalkan penuh untuk basis data relasional PostgreSQL 16 (JSONB, GIN Index, statement timeout) dan MySQL 8.0+ (decimal currency handling). Dilengkapi berkas produksi `Dockerfile` multi-stage, `docker-compose.yml` dual-DB, Sequelize adaptive singleton, graceful shutdown test, serta integrasi AWS RDS Proxy.*
- [x] 📘 **[Part 5: Compliance Kesehatan: Audit Trail RME, BPJS, & SATUSEHAT FHIR](05-audit-trail-rme-dan-bridging-eksternal.md)** — *Memenuhi mandat hukum Permenkes 24/2022. Implementasi audit trail transparan via `AsyncLocalStorage` & Sequelize Hook, skema migrasi DDL lengkap untuk PostgreSQL dan MySQL, plus runnable Background Outbox Worker (`SELECT FOR UPDATE SKIP LOCKED`) dan Circuit Breaker.*
- [x] 📘 **[Part 6: Migration Playbook, Team Governance, & Living ADR](06-migration-playbook-dan-team-governance.md)** — *Strategi migrasi inkremental menggunakan Strangler Fig Pattern tanpa melakukan rewrite total. Dilengkapi template ADR resmi, pull request checklist, dan pipeline CI automated verification.*
- [x] 📎 **[Lampiran A: Struktur Kode Referensi & Konvensi Proyek](07-lampiran-struktur-kode-referensi.md)** — *Peta repositori resmi `simrs-be/` (root, `db/`, `tests/`, entrypoint), anatomi lengkap satu modul, konvensi penamaan, matriks siapa boleh meng-import siapa, pola factory agar service mudah diuji, dan opsi laporan lintas modul tanpa JOIN.*

---

## 🚀 Quickstart Hands-On: Menjalankan Sistem dalam 5 Menit

Untuk membuktikan bahwa panduan ini dapat dijalankan langsung di mesin lokal engineer:

```bash
# 1. Clone repositori & masuk ke direktori backend
git clone https://github.com/your-hospital/simrs-be.git
cd simrs-be

# 2. Salin environment & jalankan database lokal via Docker
cp .env.example .env
docker compose up -d mysql

# 3. Pasang dependensi & jalankan migrasi database
npm install
npm run db:migrate

# 4. Jalankan arsitektur guardrail test (linter batas modul)
npm run lint:boundaries

# 5. Jalankan server lokal (Docker mode)
npm run dev

# 6. Jalankan automated unit & integration test
npm test
```

---

## 🎯 1. Inti Filosofis & Tesis Utama

Di dunia industri perangkat lunak, hanya sedikit sistem yang memiliki tingkat kekritisan setinggi **Sistem Informasi Manajemen Rumah Sakit (SIMRS)**. Keterlambatan respon antrean admisi di pagi hari dapat memicu kepanikan di lobi rawat jalan; bug transaksi kasir dapat melumpuhkan kepulangan ratusan pasien; dan kegagalan integritas data rekam medis (*Electronic Medical Record / EMR*) dapat berakibat fatal secara hukum maupun klinis.

Ironisnya, banyak sistem SIMRS modern dibangun di atas pondasi arsitektur yang rapuh: **pola Layer-First MVC klasik (`handlers/`, `models/`, `routes/`)**.

Ketika proyek SIMRS dimulai oleh 2-3 orang programmer, pengelompokan file berdasarkan fungsi teknis terasa mudah dan cepat. Namun ketika skala sistem membengkak—mencakup pendaftaran rawat jalan, rawat inap, instalasi gawat darurat (IGD), resep elektronik farmasi, kasir split-bill, hingga bridging BPJS dan SATUSEHAT—pola ini berubah menjadi mimpi buruk arsitektural:

> *"Jebakan terbesar dalam arsitektur software bukanlah salah memilih framework atau bahasa pemrograman, melainkan mencampuradukkan domain bisnis di bawah folder teknis yang sama, membiarkan query database melintasi batas domain tanpa kontrak, dan mengikat logika klinis secara langsung pada protokol HTTP."*

Tesis utama dari playbook ini adalah: **Modular Monolith adalah titik temu optimal (sweet spot) antara kecepatan pengembangan monolit dan independensi jangka panjang microservices.**

Dengan menstrukturkan kode berdasarkan **Bounded Contexts** (Domain-First), setiap modul SIMRS diperlakukan seolah-olah microservice independen yang berada dalam satu repositori (*monorepo/modular codebase*). Komunikasi antar modul hanya diizinkan melalui kontrak antarmuka resmi (*public service API*), bukan dengan tembakan SQL query langsung atau cross-import models. Dengan pendekatan ini, organisasi mendapatkan kemudahan deployment dan operasi di fase awal, namun memiliki jaminan bebas sakit kepala ketika sewaktu-waktu modul Billing atau Bridging harus dipisahkan menjadi microservice mandiri.

---

## 💡 2. Peta Konsep & Kerangka Berpikir Utama (Core Frameworks)

```text
                             ARSITEKTUR MODULAR MONOLITH SIMRS
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
[ SHARED KERNEL ]                    [ BOUNDED CONTEXTS ]                   [ DUAL RUNTIME ]
(src/core/)                          (src/modules/)                         (Entrypoints)
• Database Singleton & Transaction   • master-data (ICD, Poli, Nakes)       • server.js (Docker / VM)
• Standard HTTP Response & AppError  • admission (IGD, Rajal, Ranap)        • lambda.js (AWS Lambda)
• Centralized Error Middleware       • emr (CPPT, SOAP, Asesmen)            • @hono/node-server
• RBAC & Request Audit Trail         • pharmacy (E-Resep, Depo, Racikan)    • hono/aws-lambda
• Pino Structured Logger             • billing (Kasir, Split Bill, Klaim)   • Connection Pool Adaptif
                                     • bridging (BPJS & SATUSEHAT FHIR)
```

### Empat Pilar Fondasi Arsitektur

1. **Domain-First Bounded Isolation**: Menghentikan penyebaran logika domain ke folder teknis yang terpisah. Seluruh delivery, logic, data access, dan model milik satu domain disatukan di dalam folder modul masing-masing (`src/modules/<domain>/`).
2. **Protocol-Agnostic Core Logic**: Logika medis di dalam Service Layer sama sekali tidak mengenal objek `c` (Hono Context). Service hanya menerima Plain JavaScript Objects (POJO) dan mengembalikan hasil murni, sehingga dapat dipanggil secara identik dari HTTP handler, background cron job, message queue, maupun modul internal lain.
3. **Strict Database Sovereignty**: Modul A dilarang melakukan JOIN atau memodifikasi tabel milik Modul B. Semua ketergantungan relasional diselesaikan melalui pemanggilan Public Service Contract pada transaksi yang sama atau melalui pertukaran event.
4. **Dual-Runtime Cloud Readiness**: Memanfaatkan Hono yang berakar pada Web Standard Fetch API dan konfigurasi adaptif koneksi Sequelize, sistem dapat dijalankan di container Docker berumur panjang maupun AWS Lambda serverless tanpa perlu mengubah satu baris pun kode aplikasi.

---

## ⚡ 3. Playbook Praktis: Rencana Implementasi

Langkah operasional yang siap dieksekusi oleh tim engineering:

### Fase 1: Hari Ini (Quick Wins & Stop the Bleeding)
- [ ] Pasang `eslint-plugin-boundaries` dan `dependency-cruiser` untuk mencegah impor ke folder internal (`models/`, `repositories/`, `handlers/`) milik modul lain.
- [ ] Terapkan wrapper response terpusat (`sendSuccess`) dan kelas error tunggal (`AppError`) di seluruh endpoint baru.
- [ ] Pisahkan parameter protokol `c` (Hono Context) dari fungsi business logic di service; pastikan service hanya menerima data murni (*pure payload*).

### Fase 2: 30 Hari Pertama (Membangun Batas Domain)
- [ ] Lakukan refactoring modul per modul ke struktur `src/modules/<nama-modul>/` (mulai dari modul berisiko rendah seperti `master-data` dan `admission`).
- [ ] Buat file `index.js` sebagai pintu gerbang (*public contract*) untuk setiap modul.
- [ ] Implementasikan dynamic connection pool Sequelize untuk mencegah lonjakan koneksi database saat berjalan di lingkungan serverless Lambda.
- [ ] Pasang `@hono/zod-validator` pada seluruh skema request rawat jalan dan pendaftaran.

### Fase 3: Jangka Panjang (Audit Trail & Kesiapan Microservices)
- [ ] Bangun modul `bridging/` terisolasi dengan pola Outbox / Queue untuk transaksi BPJS VClaim dan SATUSEHAT FHIR.
- [ ] Pasang Sequelize Global Hooks untuk audit logging otomatis sesuai mandat Permenkes RME No. 24/2022.
- [ ] Lakukan uji beban (*stress test*) simulasi peak hour poliklinik jam 07:00–09:00 pagi pada runtime Docker dan AWS Lambda (dengan RDS Proxy).

---

## ⚖️ 4. Evaluasi Kritis & Ulasan Objektif

* **Kekuatan Terbesar**: Memberikan kejelasan batas tanggung jawab (*clear cognitive load*) bagi tim engineer. Mencegah timbunan utang teknis (*architectural technical debt*) sejak hari pertama tanpa perlu membayar ongkos operasional microservices yang rumit (service mesh, network latency, distributed consensus).
* **Kritik & Titik Buta (Blind Spots)**: Memerlukan disiplin tim yang ketat. Tanpa komitmen pada aturan isolasi dan linting otomatis, modular monolith dapat dengan mudah terdegradasi kembali menjadi *distributed spaghetti*. Selain itu, transaksi basis data yang melintasi dua modul masih berbagi koneksi database fisik yang sama; ketika nanti benar-benar dipisah menjadi microservice, transaksi terdistribusi (*Saga Pattern*) harus diperkenalkan.
* **Profil Pembaca Ideal**: Software Architect, Backend Engineering Lead, Senior Full-stack Developer, dan DevOps Engineer yang sedang merancang atau memigrasikan sistem rumah sakit, sistem klinik multi-cabang, atau aplikasi enterprise monolitik berskala besar.
