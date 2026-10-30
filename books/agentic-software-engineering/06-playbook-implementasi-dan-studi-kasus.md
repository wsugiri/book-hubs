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

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

### Checklist Harian Insinyur Perangkat Lunak Agentic:
1. [ ] **Mulai dengan Riset Terfokus**: Berikan prompt pencarian fakta sebelum meminta kode baru: *"Baca arsitektur modul X, apa saja asumsi yang harus saya perhatikan?"*
2. [ ] **Validasi Dokumen Desain Terlebih Dahulu**: Jangan biarkan agen mulai mengedit sebelum `design.md` memiliki tabel skema dan daftar file target yang jelas.
3. [ ] **Delegasikan Pengujian ke Subagent Khusus**: Minta subagent penguji membuat skenario pengujian ekstrem (*edge cases, fuzz testing, concurrent requests*).
4. [ ] **Inspeksi Git Diff Secara Kritis**: Selalu lakukan `git diff` manual sebelum membuat commit. Pastikan tidak ada berkas sampah, komentar halusinasi, atau perubahan dependensi yang tidak diinginkan.

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
3. **Continuous Integration Verification for Autonomous Code Generation**:  
   GitHub Engineering & Antigravity Research Lab. *Automating Safe Pull Request Reviews with Autonomous Agents*.

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 5: Feedback Loops, Evaluasi Mandiri, & Guardrails Kualitas](05-evaluasi-verifikasi-dan-guardrails.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Kembali ke Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📚 **[Kembali ke Katalog Utama (CATALOG.md)](../../CATALOG.md)**

