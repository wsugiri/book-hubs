# Part 6: Migration Playbook, Team Governance, & Living ADR

> 📖 Hub Buku: **[The SIMRS Backend Playbook](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Banyak inisiatif arsitektur perangkat lunak yang hebat mati bukan karena desainnya salah, melainkan karena **cara eksekusi migrasinya yang keliru**.

Skenario klasik yang sering berulang: Seorang Chief Architect yang baru direkrut melihat basis kode SIMRS yang berantakan lalu membuat deklarasi berani di depan dewan direksi:
*"Sistem ini sudah tidak bisa diselamatkan. Kita harus menghentikan pengembangan fitur selama 6 bulan, dan menulis ulang seluruh sistem dari nol (The Big Bang Rewrite) dengan arsitektur baru!"*

Enam bulan kemudian, apa yang terjadi?
1. Fitur bisnis baru yang mendesak dari kementerian dan direktur rumah sakit tertunda.
2. Tim rekayasa kelelahan mereplikasi ratusan *edge-cases* bisnis rumah sakit yang tersimpan di sistem lama.
3. Tenggat waktu meleset menjadi 14 bulan, anggaran membengkak, dan saat sistem baru akhirnya di-deploy, terjadi ratusan bug yang belum pernah diantisipasi sebelumnya. 
4. Akhirnya, manajemen panik dan kembali ke sistem lama (*rollback*). Reputasi tim engineering hancur.

Pengalaman industri berulang kali menunjukkan pola yang sama: *rewrite* total jarang menghilangkan bug, ia hanya menukar bug lama yang sudah dikenal dengan bug baru yang belum dikenal. Martin Fowler mendokumentasikan alternatif yang lebih aman dalam artikelnya tentang *Strangler Fig Application*.

Jalan keluar yang realistis dan terbukti berhasil di berbagai institusi kesehatan global adalah **Strangler Fig Pattern (Pola Pohon Pencekik)**. Kita tidak merobohkan sistem lama secara brutal; kita menumbuhkan modul-modul baru yang bersih di samping sistem lama, memindahkan rute lalu lintas secara bertahap, hingga pada akhirnya sistem lama mengering dan bisa dicabut dengan aman tanpa pernah mengganggu operasional rumah sakit barang satu hari pun.

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

```text
               MIGRASI BERTAHAP MENGGUNAKAN STRANGLER FIG PATTERN
  
  [ FASE 1: DUAL ROUTING ]
                                     ┌──► [ Legacy Codebase (Layer-First) ]
  Client Request ──► [ Reverse Proxy ]    (Rute lama yang belum dimigrasi)
  (Hono Router)                      │
                                     └──► [ New Modular Monolith ]
                                          (Modul Master Data & Bridging)
  
  ─────────────────────────────────────────────────────────────────────────────
  
  [ FASE 2: STRANGLING THE CORE ]
  Modul lama dimatikan satu per satu saat domain baru siap:
  1. master-data  ──► [ SELESAI DIMIGRASI ] (100% Traffic ke New Module)
  2. admission    ──► [ SELESAI DIMIGRASI ] (Menggunakan New Service Contract)
  3. emr          ──► [ SEDANG BERJALAN ]
  4. billing      ──► [ TAHAP BERIKUTNYA ]
  
  ─────────────────────────────────────────────────────────────────────────────
  
  [ FASE 3: TOTAL CUTOVER & RETIREMENT ]
  Seluruh request masuk ke 'src/modules/'. Folder lama dihapus permanen.
```

---

### 1. Roadmap Migrasi 4 Tahap (The 4-Phase Migration Roadmap)

#### Tahap 1: Karantina & Fondasi Kernel (`src/core/`)
* **Stop the Bleeding**: Buat folder `src/core/` dan `src/modules/`.
* Terapkan aturan ketat: **Dilarang menambahkan file baru ke dalam folder lama (`handlers/`, `models/`, `routes/`)**.
* Bangun Shared Kernel: `AppError`, `sendSuccess`, koneksi database singleton, dan middleware tracing `requestId`.

#### Tahap 2: Ekstraksi Modul Rendah Risiko (`master-data` & `bridging`)
* Mulai refactoring dari domain yang paling sedikit memiliki dependensi timbal balik (*leaf nodes*):
  1. `master-data`: ICD-10, ICD-9, data poliklinik, dan jadwal dokter. Modul ini hanya melayani operasi baca (*read-heavy*).
  2. `bridging`: Pisahkan panggilan API BPJS dan SATUSEHAT ke folder terisolasi.
* Hubungkan rute modul baru ini ke `src/app.js` menggunakan sub-path `/api/v1/master-data` dan `/api/v1/bridging`.

#### Tahap 3: Migrasi Modul Transaksional Inti (`admission` -> `emr` -> `pharmacy` -> `billing`)
* Pindahkan domain utama satu per satu.
* Gunakan pola *Adapter / Facade*: Jika kode lama masih membutuhkan data dari tabel kunjungan, jangan biarkan ia menembak database secara langsung. Buat fungsi adaptor yang memanggil `admissionService` baru.
* Pastikan penulisan data baru diverifikasi menggunakan skema Zod dan dicatat oleh Sequelize Audit Hook.

#### Tahap 4: Pembongkaran Sistem Lama (*Decommissioning*)
* Setelah semua rute lama dialihkan ke `src/modules/`, periksa dependensi dengan alat analisis kode (*dependency-cruiser*).
* Hapus folder lama (`src/handlers/`, `src/routes/`, `src/models/` lama).
* Rayakan pencapaian tim! Basis kode SIMRS Anda kini 100% berbasis Modular Monolith yang bersih dan siap dipecah ke microservices kapan saja.

---

### 2. Living ADR: Mencatat Keputusan Arsitektur Agar Tidak Berdebat Dua Kali

Di banyak tim engineering, terjadi fenomena *"Debat Berulang Setiap 3 Bulan"*: Seorang developer baru masuk dan bertanya, *"Kenapa kita tidak pakai Microservices saja?"* atau *"Kenapa kita dilarang melakukan JOIN tabel lintas modul?"*. Jika alasan di balik keputusan masa lalu tidak didokumentasikan, tim akan menghabiskan puluhan jam rapat hanya untuk mengulang argumen yang sama.

Solusinya adalah **Architecture Decision Records (ADR)** yang disimpan langsung di repositori proyek (`docs/adr/`).

#### Template Standar ADR:

```markdown
# ADR-[Nomor]: [Judul Keputusan Singkat]

- **Status**: [PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED]
- **Tanggal**: [YYYY-MM-DD]
- **Pengambil Keputusan**: [Nama Arsitek / Tim]

## 1. Konteks & Masalah (Context)
[Jelaskan situasi medis/teknis yang melatarbelakangi keputusan ini. Apa hambatan atau risiko yang sedang dihadapi?]

## 2. Keputusan yang Diambil (Decision)
[Jelaskan pilihan solusi yang disepakati bersama. Jelaskan mengapa pilihan ini mengalahkan alternatif lainnya.]

## 3. Konsekuensi Positif (Positive Consequences)
- [Keuntungan arsitektural atau bisnis]
- [Peningkatan performa atau keamanan data]

## 4. Konsekuensi Negatif & Kompromi (Trade-offs)
- [Ongkos yang harus dibayar, misalnya: query sedikit lebih panjang atau butuh disiplin linter]
```

#### Contoh Nyata ADR-001 dari SIMRS Playbook:

```markdown
# ADR-001: Mengadopsi Pola Modular Monolith di atas Microservices untuk SIMRS

- **Status**: ACCEPTED
- **Tanggal**: 2026-11-10
- **Pengambil Keputusan**: SIMRS Architecture Guild

## 1. Konteks
Sistem rumah sakit memiliki alur pelayanan pasien yang sangat terintegrasi (Admisi -> Rekam Medis -> Kasir -> Farmasi). Tim engineering beranggotakan 8-12 orang dengan latar belakang keahlian menengah. Biaya operasional cloud harus dapat ditekan seminimal mungkin, dan sistem harus bisa di-deploy di rumah sakit daerah yang hanya memiliki server lokal (on-premise).

## 2. Keputusan
Kami memutuskan untuk mengadopsi pola **Modular Monolith** dengan pendekatan Bounded Context (Domain-First), menggunakan Hono dan Sequelize. Seluruh modul berada dalam satu repositori dan basis data fisik yang sama, namun dipisahkan secara logis dengan aturan isolasi folder yang ketat.

## 3. Konsekuensi Positif
- Deployment sangat sederhana: hanya 1 container Docker atau 1 AWS Lambda function.
- Menghilangkan latensi jaringan internal (zero internal network hops).
- Mendukung transaksi ACID basis data lokal yang aman untuk kasir dan admisi.
- Struktur folder modular menjamin kemudahan pemisahan ke Microservice di masa depan jika ada modul yang membutuhkan penskalaan independen.

## 4. Konsekuensi Negatif & Kompromi
- Memerlukan disiplin tim yang ketat untuk tidak melakukan cross-import langsung.
- Penegakan aturan harus diotomatisasi melalui custom ESLint rules di CI/CD.
```

---

### 3. Developer Onboarding Checklist & CI/CD Guardrails

Agar setiap engineer baru yang bergabung ke dalam tim langsung memahami dan mematuhi arsitektur ini tanpa perlu didampingi 24 jam, sediakan **Checklist Mandiri**:

```markdown
### 📋 Checklist Pembuatan Fitur / Modul Baru

Sebelum mengajukan Pull Request (PR), pastikan Anda telah mencentang seluruh poin berikut:

1. [ ] **Penempatan Berkas**: Apakah fitur baru Anda berada di dalam folder domain yang tepat di `src/modules/<nama-modul>/`?
2. [ ] **Isolasi Database**: Apakah model Sequelize Anda hanya mendefinisikan tabel milik modul Anda sendiri tanpa deklarasi `belongsTo`/`hasMany` ke modul lain?
3. [ ] **Kontrak Publik**: Jika modul lain membutuhkan fungsi dari fitur Anda, apakah fungsi tersebut sudah didaftarkan di `src/modules/<nama-modul>/index.js`?
4. [ ] **Skinny Handler**: Apakah fungsi di `handlers/` Anda hanya melakukan validasi, memanggil service, dan mengembalikan `sendSuccess` (maksimal ~25 baris)?
5. [ ] **Pure Service**: Apakah fungsi di `services/` Anda 100% bebas dari objek `c` (Hono Context)?
6. [ ] **Validasi Zod**: Apakah semua input mutasi (`POST`/`PUT`/`PATCH`) telah divalidasi dengan Zod schema?
7. [ ] **Error Handling**: Apakah Anda melempar `AppError` alih-alih `Error` biasa untuk validasi aturan bisnis?
8. [ ] **Guardrail Batas Modul**: Apakah `npm run lint` dan `npx depcruise src` lulus tanpa pelanggaran batas modul?
9. [ ] **Transaksi Lintas Modul**: Jika Anda meneruskan `transaction` ke service modul lain, apakah alasannya sudah dicatat di ADR?
10. [ ] **Audit Trail**: Untuk tabel klinis, apakah tidak ada bulk update/destroy tanpa `individualHooks: true`?
```

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Ilustrasi: Mengubah Budaya Engineering dari "Koboi" Menjadi Profesional

> [!NOTE]
> Skenario berikut adalah **ilustrasi** untuk menggambarkan dinamika adopsi, bukan studi kasus terukur. Tetapkan metrik dasar (*baseline*) tim Anda sendiri sebelum migrasi agar dampaknya bisa diukur secara jujur.

Di sebuah rumah sakit rujukan, tim developer sebelumnya terbiasa bekerja dengan gaya "koboi": siapa pun boleh langsung mengedit database produksi via DBeaver, menulis SQL JOIN 8 tabel langsung di controller, dan melakukan git push langsung ke branch `main`.

Ketika Architecture Guild memperkenalkan Playbook ini bersama guardrails batas modul dan ADR:
1. Pada minggu-minggu pertama, muncul penolakan: *"Dulu kita bikin fitur 1 hari selesai, sekarang harus bikin validator, repository, dan service terpisah, butuh 2 hari!"*
2. Setelah beberapa bulan, manfaatnya mulai terlihat: insiden bug saat rilis berkurang, dan ketika API BPJS berubah, perubahan cukup dilakukan di modul `bridging` tanpa efek samping ke pendaftaran atau kasir.
3. Engineer baru lebih cepat produktif karena struktur folder yang seragam membuat setiap modul bisa dibaca dengan pola pikir yang sama.

**Metrik yang disarankan untuk diukur sendiri**: jumlah insiden per rilis, *lead time* PR, jumlah pelanggaran batas modul di CI, dan waktu hingga engineer baru mengirim PR pertamanya.

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

1. [ ] **Buat Direktori ADR**: Inisialisasi folder `docs/adr/` dan buat `ADR-001` yang mendokumentasikan keputusan adopsi arsitektur Modular Monolith untuk tim Anda.
2. [ ] **Pasang GitHub Actions / GitLab CI**: Konfigurasikan automated check untuk menjalankan `npm run lint` dan `npm test` pada setiap Pull Request. Blokir opsi *Merge* jika ada pelanggaran isolasi modul.
3. [ ] **Tempelkan Onboarding Checklist di PR Template**: Buat file `.github/pull_request_template.md` agar setiap developer secara sadar memeriksa kepatuhan arsitektur sebelum meminta review dari rekan kerja.
4. [ ] **Jadwalkan Sesi Architecture Guild Mingguan**: Adakan diskusi santai 45 menit setiap Jumat sore untuk membahas refactoring modul, mengevaluasi bottleneck performa, dan merumuskan ADR baru bersama seluruh tim.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Arsitektur perangkat lunak yang hebat bukanlah dokumen PDF tebal 200 halaman yang disimpan di Google Drive lalu dilupakan semua orang. Arsitektur yang hebat adalah kebiasaan harian tim yang tercermin di setiap Pull Request, didukung oleh linter otomatis, dan dipandu oleh alasan yang tercatat jelas di ADR."*  
> — Catatan Architecture Guild (kutipan ilustratif)

**Pertanyaan Refleksi Tim**:
* *"Apakah keputusan arsitektur yang kita sepakati hari ini akan tetap dipahami dan dihormati oleh engineer yang baru bergabung dua tahun dari sekarang?"*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 5: Compliance Kesehatan & Bridging Eksternal](05-audit-trail-rme-dan-bridging-eksternal.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Lampiran A: Struktur Kode Referensi](07-lampiran-struktur-kode-referensi.md)**
