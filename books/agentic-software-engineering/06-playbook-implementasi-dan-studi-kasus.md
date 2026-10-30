# Part 6: Playbook Implementasi Nyata & Alur Kerja End-to-End

> 📖 Hub Buku: **[Agentic Software Engineering](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Teori arsitektur tanpa penerapan di dunia nyata hanyalah filsafat di atas kertas. Anda kini telah memahami apa itu agen, mengapa konteks hierarkis (`AGENTS.md` dan `design.md`) adalah fondasi mutlak, bagaimana memperluas kapabilitas agen dengan modul Skills dan protokol MCP, bagaimana membagi beban kerja ke skuad subagent terisolasi, serta bagaimana mengunci kualitas menggunakan loop verifikasi deterministik.

Kini tiba saatnya menyatukan seluruh instrumen tersebut ke dalam **alur kerja harian seorang insinyur perangkat lunak modern**.

Bagaimana seorang pengembang tunggal dapat memimpin proyek bernilai ratusan ribu baris kode dan mengantarkan fitur baru ke produksi dalam hitungan jam tanpa mengorbankan stabilitas arsitektur? 

Di bagian penutup ini, kita akan membongkar cetak biru operasional langkah-demi-langkah (*Master Operating Procedure*) dan membedah tiga studi kasus nyata dari kancah rekayasa industri.

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

### 1. Blueprint Alur Kerja Standar (The 6-Step Agentic Pipeline)

Inilah standar emas alur kerja rekayasa perangkat lunak berbantuan agen:

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      THE 6-STEP AGENTIC PIPELINE                       │
 └──────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
       [ 1. Discovery & Research ] ──► Agen mengeksplorasi codebase
                                    │  tanpa mengedit berkas
                                    ▼
       [ 2. Spec & Design Doc ]    ──► Merumuskan `design.md` & kontrak data
                                    │  (Disetujui oleh Engineer)
                                    ▼
       [ 3. Atomic Task Breakdown ]──► Memecah fitur menjadi checklist
                                    │  tugas mandiri kecil
                                    ▼
       [ 4. Subagent Execution ]   ──► Agen Coder mengeksekusi tugas
                                    │  secara terisolasi di sandbox
                                    ▼
       [ 5. Deterministic Verify ] ──► Loop otomatis: Type check -> Test -> Lint
                                    │  (Self-correction hingga lolos)
                                    ▼
       [ 6. Human Review & Ship ]  ──► Inspeksi diff akhir oleh manusia & PR
```

1. **Discovery & Research**: Gunakan subagent bertipe *Researcher* untuk membaca pola arsitektur yang sudah ada, mengidentifikasi dependensi, dan merangkum cara komponen serupa diimplementasikan di proyek Anda.
2. **Spec & Design Doc (`design.md`)**: Jangan mulai menulis kode sebelum dokumen desain disepakati. Tuliskan model data, antarmuka API, dan kriteria pengujian.
3. **Atomic Task Breakdown (`plan.md` / `task.md`)**: Bagi pekerjaan menjadi unit-unit checklist 10-15 menit (di dalam `design.md` atau di berkas `plan.md`). Setiap tugas harus memiliki input yang jelas, berkas yang ditargetkan, dan kriteria keberhasilan yang terukur.
4. **Subagent Execution**: Delegasikan implementasi tugas ke subagent pelaksana. Setiap subagent hanya berfokus pada lingkupnya sendiri.
5. **Deterministic Verification Loop**: Biarkan agen menjalankan `npm run build`, `npm run lint`, dan `npm test`. Agen akan secara otomatis membaca kegagalan dan memperbaikinya.
6. **Human Review & Ship**: Manusia melakukan inspeksi akhir pada `git diff`. Periksa apakah ada logika bisnis tersembunyi yang terlewat, lalu buat *pull request*.

---

### 2. Skrip Inisialisasi Struktur Repositori Siap Pakai (Starter Scaffold Script)

Untuk mempercepat adopsi standar ini pada repositori baru atau yang sudah ada, Anda dapat menjalankan skrip satu baris ini di root direktori proyek Anda:

```bash
# Inisialisasi hierarki agen, skills, dan dokumen desain
mkdir -p .agents/skills \
         .agents/subagents \
         .agents/hooks \
         .agents/scratch \
         docs/designs

# Buat template rules dan template dokumen desain
touch AGENTS.md
touch docs/designs/template.md

# Lindungi scratchpad dari git
echo -e "\n# Agent transient files\n.agents/scratch/\n*.tmp.agent" >> .gitignore
```

Dengan menjalankan inisialisasi ini:
1. `AGENTS.md` siap diisi dengan aturan inti teknologi dan testing proyek.
2. `docs/designs/` siap menampung spesifikasi fitur (`design.md`) sebelum koding dimulai.
3. `.agents/skills/` siap menampung modul SOP tim yang dapat dipanggil agen secara *on-demand*.
4. `.agents/scratch/` terisolasi dari pelacakan Git sehingga eksperimen agen tidak mengotori repositori utama.

#### Contoh Template `AGENTS.md` Minimal yang Siap Pakai

Setelah menjalankan skrip di atas, isi `AGENTS.md` Anda dengan template berikut sebagai titik awal:

```markdown
# AGENTS.md — Aturan Operasional Agen untuk Proyek Ini

## 🛠️ Tech Stack
- **Runtime**: Node.js 20 (LTS) dengan TypeScript strict mode (`"strict": true`)
- **Framework HTTP**: Fastify v4 (bukan Express)
- **Database**: PostgreSQL 15 dengan Prisma ORM
- **Test Runner**: Vitest (`npm test`) dengan coverage minimal 80%
- **Linter & Formatter**: ESLint + Prettier (jalankan `npm run lint` sebelum commit)

## 🚀 Perintah Penting
- `npm run dev`       → Menjalankan dev server di port 3000 (hot reload aktif)
- `npm run build`     → Kompilasi TypeScript ke `dist/`
- `npm test`          → Menjalankan seluruh test suite
- `npm run lint`      → Linting + auto-fix
- `npx prisma migrate dev` → Menjalankan migrasi database baru
- `npx prisma studio` → UI visual untuk melihat isi database lokal

## 🏛️ Aturan Arsitektur (Wajib Diikuti)
1. Gunakan **Clean Architecture**: pisahkan `domain/`, `application/`, `infrastructure/`, dan `interface/`.
2. **Dilarang keras** menggunakan tipe `any` di TypeScript. Gunakan `unknown` dan lakukan type narrowing secara eksplisit.
3. Setiap route Fastify wajib memiliki JSON Schema untuk validasi request dan response.
4. Business logic **tidak boleh** berada di dalam handler route. Tempatkan di layer `application/usecases/`.
5. Selalu gunakan **Dependency Injection** via constructor — jangan instantiasi service langsung di dalam handler.

## 🚫 File yang TIDAK BOLEH Diubah oleh Agen
- `.env` dan `.env.*` — konfigurasi environment sensitif
- `prisma/migrations/` — migrasi yang sudah pernah di-deploy ke production
- `package-lock.json` — hanya boleh diubah via `npm install`
- `tsconfig.json` — ubah hanya dengan persetujuan eksplisit engineer

## 📐 Pola Kode yang Disukai
- Gunakan `Result<T, E>` pattern (bukan throw exception) untuk error handling di layer domain.
- Semua interaksi database harus melalui **Repository interface** yang didefinisikan di `domain/repositories/`.
- Untuk test: gunakan **in-memory repository** sebagai dependency, bukan database sungguhan.
```

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Studi Kasus 1: Membangun Fitur Full-Stack Baru (Webhook Idempotency Layer)

Sebuah platform pembayaran membutuhkan sistem penerimaan webhook pihak ketiga yang tahan terhadap pengiriman berulang (*duplicate deliveries*) dengan jaminan idempotensi mengikuti standar industri **[Stripe API Idempotent Requests](https://stripe.com/docs/api/idempotent_requests)**.

- **Eksekusi Langkah Demi Langkah**:
  1. **Dokumen Desain**: Pengembang menginstruksikan agen membuat `docs/designs/webhook-idempotency.md`.
     - Agen mendefinisikan tabel `idempotency_keys` di PostgreSQL dengan kolom: `key` (varchar, primary key), `status` (processing, completed, failed), `response_payload` (jsonb), dan `expires_at` (timestamp).
  2. **Migrasi Database**: Agen menggunakan skill *Database Migration* untuk menulis berkas SQL migrasi yang aman dengan indeks pada kolom kedaluwarsa.
  3. **Middleware Implementasi**: Subagent backend menulis middleware Express/Fastify:
     - Jika key ada dan status `processing`, kembalikan `409 Conflict`.
     - Jika key ada dan status `completed`, kembalikan cached response payload secara langsung tanpa menjalankan logika ulang.
     - Jika key belum ada, catat dengan status `processing` di dalam transaksi database yang terisolasi.
  4. **Pengujian Konkurensi**: Agen menulis unit test konkurensi menggunakan 5 request HTTP paralel dengan key yang sama persis:
     ```typescript
     const promises = Array(5).fill(null).map(() => 
       request(app).post('/webhooks/stripe').set('Idempotency-Key', testKey).send(mockEvent)
     );
     const results = await Promise.all(promises);
     // Verifikasi: Hanya 1 request mengembalikan 200, 4 lainnya mengembalikan 409
     ```
  5. **Verifikasi**: Agen menjalankan test suite. Awalnya tes gagal karena *race condition* pada level aplikasi; agen merevisi kueri SQL menggunakan `INSERT ... ON CONFLICT DO NOTHING RETURNING *` di level basis data. Tes lolos dalam 3 menit.

---

### Studi Kasus 2: Refactoring Kode Warisan Rumit (Characterization Testing Pattern)

Sebuah fungsi perhitungan diskon dan pajak keranjang belanja (*legacy pricing engine*) sepanjang 800 baris kode di sebuah file `calculateCart.js` tanpa satu pun unit test perlu dimigrasikan ke TypeScript murni.

- **Bahaya Terbesar**: Pengembang takut mengubah fungsi tersebut karena ada ratusan aturan diskon tersembunyi (*edge cases*) yang tidak terdokumentasi.
- **Strategi Agentic: Characterization Testing**:
  1. Alih-alih langsung menulis ulang kodenya, agen diinstruksikan untuk menulis **[Characterization Tests / Golden Master (Martin Fowler)](https://martinfowler.com/bliki/CharacterizationTest.html)** terlebih dahulu:
     - Agen membuat skrip yang menghasilkan 50 variasi kombinasi keranjang belanja (keranjang kosong, diskon kupon ganda, pelanggan VIP, barang bebas pajak, nilai minus, dsb.).
     - Agen menjalankan fungsi warisan pada ke-50 input tersebut dan mencatat hasilnya sebagai *Ground Truth Snapshot*.
  2. Subagent Coder kemudian memecah fungsi 800 baris tersebut menjadi modul-modul TypeScript kecil yang bersih (*Single Responsibility*): `DiscountCalculator`, `TaxCalculator`, dan `ShippingEngine`.
  3. Agen menjalankan 50 pengujian *snapshot* terhadap implementasi TypeScript baru.
  4. Pada input ke-37, ada selisih pembulatan $0.01. Agen membaca diff, memperbaiki aturan pembulatan bankir (*banker's rounding*), dan menjalankan ulang tes hingga 50/50 cocok 100% dengan perilaku lama.
  5. Kode warisan berhasil dimodernisasi dengan risiko regresi nol.

---

### Studi Kasus 3: Investigasi Insiden Produksi (Autonomous Root Cause Analysis)

Sebuah pod backend mengalami lonjakan memori tak terkendali (*Memory Leak*) setiap kali pengguna mengunduh laporan PDF ukuran besar.

- **Alur Investigasi Agen**:
  1. Pengembang memberikan log profiler heap memory ke agen: *"Analisis memory leak pada pembuatan laporan PDF di `src/reports/pdfGenerator.ts`."*
  2. Agen menelusuri alur berkas dan mendeteksi bahwa stream pembuatan PDF tidak pernah memanggil `stream.destroy()` atau `res.end()` saat koneksi klien terputus di tengah jalan (*aborted connection*).
  3. Agen menulis skrip reproduksi lokal yang memutus koneksi HTTP saat streaming baru berjalan 10%.
  4. Agen memverifikasi kebocoran memori di lingkungan lokal: buffer memori tetap bertahan di heap.
  5. Agen menambahkan event listener:
     ```typescript
     req.on('close', () => {
       if (!stream.destroyed) {
         stream.destroy();
         logger.warn('Client aborted download, stream released.');
       }
     });
     ```
  6. Agen menguji ulang skrip pemutusan koneksi: memori langsung terlepas (*garbage collected*). Agen merangkum dokumen Root Cause Analysis (RCA) siap kirim untuk post-mortem tim.

---

### Studi Kasus 4: Onboarding Engineer Baru dengan Agentic Codebase Tour

Seorang junior engineer baru bergabung ke tim. Dalam proses onboarding konvensional, memahami arsitektur codebase berskala besar biasanya membutuhkan 2 hingga 3 minggu: membaca dokumentasi yang sering kali sudah usang, mengikuti sesi *shadowing* dengan senior engineer, dan bertanya berulang kali tentang hal yang sama. Dengan agentic workflow, dalam **3 jam pertama**, engineer baru tersebut sudah bisa berkontribusi nyata.

- **Alur Onboarding Berbantuan Agen**:
  1. Engineer baru memberikan instruksi kepada agen dalam mode *Read-Only Researcher*: *"Berikan saya tur arsitektur codebase ini. Jelaskan alur data dari HTTP request masuk hingga response keluar, sertakan komponen kunci dan dependensi antar modul."*
  2. Agen menjelajahi struktur folder secara sistematis — membaca `AGENTS.md`, dokumen desain di `docs/`, file konfigurasi, dan file-file kunci seperti entry point aplikasi, router utama, serta definisi model data — semuanya **tanpa mengubah satu baris pun**.
  3. Agen menghasilkan dokumen `docs/onboarding/architecture-tour.md` yang berisi:
     - Diagram alur data dari HTTP request masuk hingga response keluar
     - Daftar 10 file terpenting beserta fungsi dan tanggung jawab masing-masing
     - Panduan *"Di mana harus mulai jika ingin menambahkan fitur X"* — misalnya cara menambahkan endpoint baru, mendefinisikan model database, atau menulis middleware autentikasi
  4. Engineer baru kemudian mengajukan pertanyaan spesifik: *"Saya perlu menambahkan endpoint baru untuk ekspor laporan CSV. Apa saja file dan layer yang perlu saya sentuh?"*
  5. Agen langsung mereferensikan peta arsitektur yang sudah dipelajari dan memberikan rencana implementasi konkret dalam hitungan detik — lengkap dengan nama file target, interface yang harus diimplementasikan, dan urutan pengerjaan yang disarankan.
  6. **Perbandingan hasil**:
     - **Sebelumnya**: 2–3 minggu onboarding dengan sesi shadowing, mengganggu produktivitas senior engineer, dan transfer pengetahuan yang tidak pernah sepenuhnya lengkap.
     - **Sesudahnya**: 3 jam pertama sudah memiliki peta arsitektur yang akurat dan rencana implementasi fitur pertama yang konkret.

> *"Agen tidak menggantikan senior engineer sebagai mentor — ia menghilangkan bottleneck pengetahuan tersembunyi (tribal knowledge) yang selama ini hanya ada di kepala orang-orang tertentu. Senior engineer kini bisa fokus pada keputusan arsitektur tingkat tinggi, bukan menjawab pertanyaan 'di mana file konfigurasi database?' untuk kesepuluh kalinya."*

---

### 3. Anti-Pattern & Failure Modes dalam Implementasi Nyata

Adopsi agentic workflow bukan jaminan otomatis produktivitas meningkat. Seperti halnya metodologi baru lainnya, ada jebakan-jebakan umum yang sering menghantam tim di fase awal. Mengenali dan menghindari keempat anti-pattern berikut akan menghemat berminggu-minggu frustrasi.

---

**⚠️ Anti-Pattern 1: "Zero Test Coverage Trap"**

Tim memutuskan untuk adopsi agen secara langsung tanpa membangun fondasi pengujian terlebih dahulu. Agen menulis kode dengan cepat dan terlihat meyakinkan — namun tidak ada cara otomatis untuk memverifikasi kebenarannya. Hasilnya: codebase dipenuhi kode yang terlihat bersih di permukaan namun menyimpan bug tersembunyi yang baru muncul di production.

*Solusi*: Bangun minimal test suite terlebih dahulu, bahkan jika harus menggunakan **Characterization Tests** seperti di Studi Kasus 2 untuk mengunci perilaku kode warisan sebelum menyerahkan kendali pada agen.

---

**⚠️ Anti-Pattern 2: "God Prompt Syndrome"**

Developer menulis satu prompt raksasa yang meminta agen mengerjakan 15 hal sekaligus: *"Buat endpoint baru, tambah migrasi database, tulis unit test, update dokumentasi API, refactor fungsi lama yang berkaitan, dan tambahkan logging."* Hasilnya: kode setengah jadi, inkonsisten antar bagian, dan sangat sulit di-debug karena banyak konteks yang saling tumpang tindih dalam satu sesi.

*Solusi*: Tegakkan prinsip **satu prompt = satu tugas atomik**. Gunakan `design.md` sebagai dokumen kesepakatan dan pecah pekerjaan menjadi checklist tugas mandiri sebelum agen mulai bekerja.

---

**⚠️ Anti-Pattern 3: "Blind Trust Deployment"**

Developer langsung melakukan `git commit` dan `git push` — bahkan langsung merge dan deploy ke production — tanpa membaca `git diff` hasil kerja agen. Tiba-tiba production mengalami *downtime* karena agen secara tak terduga juga memodifikasi file konfigurasi environment atau mengubah nilai default yang tidak berkaitan langsung dengan tugas.

*Solusi*: **Selalu jalankan `git diff` sebelum commit**. Perlakukan kode hasil agen persis seperti Anda memperlakukan code review dari junior engineer yang cerdas namun kadang terlalu bersemangat — baca setiap baris perubahan dengan teliti sebelum menandatanganinya.

---

**⚠️ Anti-Pattern 4: "Context Amnesia Loop"**

Developer terus mengulang pertanyaan yang sama ke agen di setiap sesi baru karena tidak ada `AGENTS.md` yang mendokumentasikan konteks proyek. Agen memberikan jawaban yang berbeda-beda setiap sesi — kadang merekomendasikan Express, kadang Fastify; kadang menggunakan `async/await`, kadang callback — tergantung apa yang ada di memori konteks saat itu.

*Solusi*: Investasikan 30 menit menulis `AGENTS.md` yang baik sejak hari pertama. Ini adalah **investasi satu kali** yang menghemat ribuan prompt di masa depan. Lihat template di atas sebagai titik awal.

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

### Checklist Harian Insinyur Perangkat Lunak Agentic:
1. [ ] **Mulai dengan Riset Terfokus**: Berikan prompt pencarian fakta sebelum meminta kode baru: *"Baca arsitektur modul X, apa saja asumsi yang harus saya perhatikan?"*
2. [ ] **Validasi Dokumen Desain Terlebih Dahulu**: Jangan biarkan agen mulai mengedit sebelum `design.md` memiliki tabel skema dan daftar file target yang jelas.
3. [ ] **Delegasikan Pengujian ke Subagent Khusus**: Minta subagent penguji membuat skenario pengujian ekstrem (*edge cases, fuzz testing, concurrent requests*).
4. [ ] **Inspeksi Git Diff Secara Kritis**: Selalu lakukan `git diff` manual sebelum membuat commit. Pastikan tidak ada berkas sampah, komentar halusinasi, atau perubahan dependensi yang tidak diinginkan.

---

### ✅ Team Readiness Checklist: Apakah Tim Anda Siap?

Sebelum tim mengadopsi agentic workflow secara penuh, gunakan tabel evaluasi berikut untuk mengukur tingkat kesiapan. Beri tanda ✅ untuk setiap item yang sudah terpenuhi, lalu hitung skornya.

| Kategori | Item Evaluasi | Status |
|---|---|---|
| **Fondasi** | `AGENTS.md` sudah ada dan terisi dengan aturan proyek | ☐ |
| **Fondasi** | Tech stack dan arsitektur terdokumentasi secara tertulis | ☐ |
| **Fondasi** | Test coverage ≥ 60% (atau minimal characterization tests ada) | ☐ |
| **Tooling** | Linter dan formatter aktif dan terintegrasi di editor | ☐ |
| **Tooling** | CI/CD pipeline sudah berjalan dan memblokir merge jika test gagal | ☐ |
| **Tooling** | Sandbox eksekusi agen aman (tidak bisa langsung deploy ke production) | ☐ |
| **Proses** | `design.md` selalu dibuat dan disepakati sebelum coding dimulai | ☐ |
| **Proses** | Proses code review ada dan dijalankan secara konsisten | ☐ |
| **Proses** | Git workflow terstandar (branching strategy, commit convention) | ☐ |
| **Budaya** | Tim terbuka untuk bereksperimen dan gagal dengan cepat | ☐ |
| **Budaya** | Ada waktu iterasi yang dilindungi (bukan selalu dikejar deadline) | ☐ |
| **Budaya** | Senior engineer siap berperan sebagai "orkestrator", bukan "typist" | ☐ |

**Panduan Interpretasi Skor**:

| Skor | Status Kesiapan |
|---|---|
| **0 – 5** | 🔴 **Belum siap** — Fokus membangun fondasi terlebih dahulu sebelum adopsi agen |
| **6 – 9** | 🟡 **Partially Ready** — Mulai dengan tugas-tugas sederhana dan terisolasi; bangun fondasi yang kurang sambil berjalan |
| **10 – 12** | 🟢 **Siap adopsi penuh** — Tim memiliki landasan yang kokoh; adopsi agentic workflow secara menyeluruh |

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Masa depan rekayasa perangkat lunak bukan milik mereka yang sekadar mampu mengetik sintaksis tercepat, melainkan milik mereka yang mampu memimpin skuad agen cerdas dengan visi arsitektur yang jernih, disiplin pengujian yang ketat, dan ketulusan untuk membangun perangkat lunak yang andal bagi peradaban."*  
> — **Koleksi Wawasan Rekayasa Antigravity**

**Pertanyaan Refleksi Diri**:
- *Apakah Anda sudah siap mengubah identitas harian Anda dari sekadar 'tukang ketik kode' menjadi 'Direktur Rekayasa Perangkat Lunak' yang mengorkestrasi sistem cerdas?*
- *Proyek apa di meja kerja Anda saat ini yang bisa Anda selesaikan 5 kali lebih cepat dengan menerapkan alur kerja Agentic Pipeline mulai hari ini?*

---

## 🌐 Sumber Riset & Tautan Verifikasi (Primary Sources & Cross-Check)

1. **Legacy Code Modernization & Characterization Testing**:  
   Fowler, M. *Characterization Test*. martinfowler.com Software Architecture Guides.  
   🔗 Tautan Panduan Martin Fowler: [https://martinfowler.com/bliki/CharacterizationTest.html](https://martinfowler.com/bliki/CharacterizationTest.html)
2. **Idempotency & Fault-Tolerant Distributed APIs**:  
   Stripe Engineering Guides. *Designing Robust and Idempotent Webhook APIs*.  
   🔗 Dokumentasi Resmi Stripe: [https://stripe.com/docs/api/idempotent_requests](https://stripe.com/docs/api/idempotent_requests)
3. **Continuous Integration & Automated Code Review for AI-Generated Code**:  
   Google Engineering Practices. *Google's Code Review Developer Guide*.  
   🔗 Panduan Resmi: [https://google.github.io/eng-practices/review/](https://google.github.io/eng-practices/review/)

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 5: Feedback Loops, Evaluasi Mandiri, & Guardrails Kualitas](05-evaluasi-verifikasi-dan-guardrails.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Kembali ke Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📚 **[Kembali ke Katalog Utama (CATALOG.md)](../../CATALOG.md)**

