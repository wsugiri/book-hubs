# Part 3: Skills, Tool Calling, & Ekosistem Model Context Protocol (MCP)

> 📖 Hub Buku: **[Agentic Software Engineering](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Bayangkan Anda merekrut seorang insinyur jenius lulusan universitas terbaik dunia. Ia menghafal ribuan algoritma, fasih berbicara dalam 20 bahasa pemrograman, dan bisa memecahkan soal LeetCode Hard dalam hitungan detik.

Namun, di hari pertamanya bekerja di kantor Anda, Anda mengurungnya di sebuah ruangan hampa: tanpa akses keyboard, tanpa terminal, tanpa akses ke database perusahaan, tanpa akses ke repositori GitHub, dan tanpa dokumentasi prosedur standar (SOP) tim. Ia hanya bisa berbicara melalui secarik kertas di bawah pintu.

Secara intelektual, ia tetap jenius. Namun secara operasional, nilainya bagi bisnis Anda mendekati **nol**.

Kondisi inilah yang dialami oleh model LLM mentah (*vanilla LLMs*). Kegeniusan parametrik mereka terisolasi di dalam "otak" tanpa saluran untuk memengaruhi dunia nyata.

Untuk mengubah model bahasa dari sekadar "penasihat yang banyak bicara" menjadi "eksekutor yang mampu membangun sistem", kita membutuhkan dua sayap komputasi modern:
1. **Tools & Protocol Interoperability (MCP)**: Memberi sang agen tangan, mata, dan kaki untuk mengakses database, menjalankan perintah terminal, dan berinteraksi dengan API eksternal.
2. **Skills Architecture (`SKILL.md`)**: Membekali sang agen dengan buku panduan prosedur kerja (SOP), skrip otomatisasi, dan aturan domain khusus yang dapat dipanggil saat dibutuhkan tanpa membebani memori kerjanya secara permanen.

Ketika tools dan skills dipadukan dengan nalar LLM, lahirlah sebuah sistem otonom yang mampu menyelesaikan rekayasa perangkat lunak secara utuh dan terukur.

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

### 1. Taksonomi Pengetahuan Agen: Parametrik vs Kontekstual vs Prosedural (Skills)

Banyak insinyur bingung membedakan di mana harus meletakkan sebuah instruksi atau pengetahuan. Apakah harus di-*fine-tune*, ditaruh di *system prompt*, atau dikemas menjadi sebuah *Skill*?

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TAKSONOMI PENGETAHUAN AGEN                         │
├───────────────────┬───────────────────────────────┬─────────────────────────┤
│ Jenis Pengetahuan │ Karakteristik & Lokasi        │ Contoh Kasus            │
├───────────────────┼───────────────────────────────┼─────────────────────────┤
│ 1. Parametrik     │ Melekat di bobot neural net   │ Sintaks dasar Python,   │
│    (Model Weights)│ (Statik, mahal diubah)        │ algoritma Dijkstra,     │
│                   │                               │ konsep dasar REST API   │
├───────────────────┼───────────────────────────────┼─────────────────────────┤
│ 2. Aturan Global  │ Selalu aktif di system prompt │ "Gunakan TypeScript     │
│    (`AGENTS.md`)  │ (Memakan token permanen)      │ strict, dilarang delete │
│                   │                               │ data tanpa konfirmasi"  │
├───────────────────┼───────────────────────────────┼─────────────────────────┤
│ 3. Prosedural     │ Tersimpan di disk, diaktifkan │ "SOP Migrasi Database   │
│    (`SKILL.md`)   │ secara on-demand / dinamis    │ Prisma", "Template PR", │
│                   │ (Hemat context window)        │ "Setup E2E Playwright"  │
├───────────────────┼───────────────────────────────┼─────────────────────────┤
│ 4. Dynamic Tools  │ Eksekusi kode real-time via   │ `run_command()`,        │
│    & MCP          │ function calling / protokol   │ `read_file()`,          │
│                   │                               │ `query_postgres_db()`   │
└───────────────────┴───────────────────────────────┴─────────────────────────┘
```

- **Mengapa Skills Begitu Revolusioner?**  
  Jika Anda memasukkan 50 prosedur standar tim ke dalam `AGENTS.md` (aturan global), *context window* agen akan langsung penuh sebelum pekerjaan dimulai. Dengan arsitektur **Skills**, agen hanya membaca ringkasan metadata satu baris untuk masing-masing skill. Ketika pengguna meminta *"Tolong buatkan pengujian E2E dengan Playwright"*, barulah agen secara dinamis membuka dan membaca berkas `.agents/skills/playwright-e2e/SKILL.md`.

---

### 2. Anatomi Struktur Berkas Skill Modern (`SKILL.md`)

Sebuah skill dirancang sebagai paket kemampuan mandiri (*modular capability package*). Format standarnya terdiri dari frontmatter YAML dan badan instruksi markdown:

```markdown
---
name: database-migration-safeguard
description: Gunakan skill ini setiap kali membuat atau memodifikasi skema migrasi database PostgreSQL. Memastikan tidak ada penguncian tabel (table locks) berbahaya atau kehilangan data.
---

# Database Migration Safeguard Skill

## 1. Kapan Menggunakan Skill Ini
Gunakan skill ini sebelum menjalankan perintah `prisma migrate dev` atau menulis file SQL di direktori `migrations/`.

## 2. Aturan Wajib (Golden Rules)
1. **Larangan Kolom NOT NULL Tanpa Default**: Dilarang menambahkan kolom baru dengan `NOT NULL` tanpa memberikan nilai default pada tabel yang memiliki lebih dari 10.000 baris.
2. **Concurrent Indexing**: Setiap pembuatan indeks baru wajib menggunakan perintah `CREATE INDEX CONCURRENTLY` untuk menghindari penguncian tabel produksi.
3. **Rollback Script Wajib**: Setiap migrasi naik (*up migration*) wajib disertai skrip migrasi turun (*down migration*) yang teruji.

## 3. Langkah Kerja Prosedural (SOP)
1. Jalankan `scripts/inspect_table_size.sh <nama_tabel>` untuk memeriksa volume data.
2. Buat berkas migrasi draf.
3. Jalankan `scripts/dry_run_migration.sh` di database pengujian lokal.
4. Lakukan verifikasi performa kueri menggunakan `EXPLAIN ANALYZE`.
```

Dengan mengemas pengetahuan teknis ke dalam skill, seluruh anggota tim dan agen AI mereka akan memiliki standar eksekusi yang identik, terlepas dari model LLM mana yang sedang digunakan.

#### Struktur Lengkap Satu Paket Skill Modular
Di tingkat sistem berkas, sebuah modul skill bukan hanya sekadar satu file markdown, melainkan sebuah paket mandiri:

```text
.agents/skills/<nama-skill>/
├── SKILL.md            # [WAJIB] File utama: metadata YAML (name, description) & instruksi kerja
├── scripts/            # [OPSIONAL] Skrip eksekusi yang bisa dijalankan agen di terminal
│   ├── run_audit.py    # Skrip analisis statis atau parsing log
│   └── helper.sh       # Utilitas shell pembantu
├── references/         # [OPSIONAL] Dokumen teknis mendalam yang hanya dibaca jika perlu
│   └── api_spec.json   # Skema data atau kamus istilah
├── templates/          # [OPSIONAL] Berkas cetakan / boilerplate yang akan disalin agen
│   └── endpoint.ts.tpl # Cetakan pembuatan rute baru
└── examples/           # [OPSIONAL] Contoh kasus nyata (few-shot prompting)
    └── good_query.sql  # Contoh kode yang lolos review tim
```

**Mekanisme Progressive Disclosure pada Skill**:
Agen cerdas tidak akan langsung membaca seluruh folder `references/` atau mengeksekusi semua skrip di `scripts/`. Agen membaca `description` di `SKILL.md` saat sistem inisialisasi. Hanya ketika ada tugas relevan, agen membuka `SKILL.md`. Dan hanya ketika `SKILL.md` merujuk ke berkas di `references/` atau `scripts/`, agen membaca atau mengeksekusi berkas spesifik tersebut. Ini adalah kunci penghematan token yang ekstrem.

---

### 3. Revolusi Model Context Protocol (MCP)

Sebelum tahun 2024, menghubungkan AI ke sumber daya eksternal adalah mimpi buruk fragmentasi (*N x M problem*). Jika ada 10 model AI dan 20 alat (Postgres, GitHub, Slack, Jira, Notion), pengembang harus menulis 200 integrasi khusus yang rapuh.

**Model Context Protocol (MCP)**, yang diinisiasi oleh Anthropic dan diadopsi secara luas di seluruh industri, memecahkan masalah ini dengan menyediakan arsitektur terbuka klien-server:

```text
┌─────────────────────────────────────────────────────────────┐
│                       MCP ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [ MCP Host / Client ]                                     │
│   (Antigravity / Cursor / Claude Desktop / IDE)             │
│            │                                                │
│            ├───────────────┬───────────────┬────────────────┤
│            │ (JSON-RPC)    │ (JSON-RPC)    │ (JSON-RPC)     │
│            ▼               ▼               ▼                │
│    [ Postgres MCP ]  [ GitHub MCP ]  [ Figma MCP ]          │
│            │               │               │                │
│            ▼               ▼               ▼                │
│    (Database Lokal)  (Pull Requests) (Design Tokens)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

MCP menyediakan tiga primitif utama yang bisa disediakan oleh sebuah server ke agen:
1. **Tools**: Fungsi eksekusi yang bisa dipanggil oleh agen dengan parameter tertentu (misal: `create_pull_request`, `execute_read_query`).
2. **Resources**: Data atau berkas pasif yang bisa dibaca agen layaknya URI (misal: `postgres://schema/public/users`, `file:///logs/today.log`).
3. **Prompts**: Template alur percakapan atau alur kerja interaktif yang sudah dipaketkan oleh penyedia layanan.

Dengan MCP, agen Anda bukan hanya bisa mengedit kode di editor lokal, melainkan bisa secara otonom:
- Mengambil desain token langsung dari Figma.
- Menjalankan kueri verifikasi ke PostgreSQL staging.
- Membuka PR di GitHub lengkap dengan deskripsi, tangkapan layar, dan menugaskan *reviewer* tim secara otomatis.

---

### 4. Sandboxing & Safe Tool Execution

Kekuasaan yang besar menuntut sistem keamanan yang tak tertembus. Dalam ekosistem agen, eksekusi alat harus dibagi menjadi dua kategori izin (*Permission Boundaries*):

```text
               ┌───────────────────────────────┐
               │    Permintaan Panggilan Tool   │
               └───────────────┬───────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    [ Sandboxed Execution ]         [ Unsandboxed / Host Execution ]
    • Baca berkas workspace         • Akses jaringan luar (curl/git push)
    • Edit berkas proyek            • Menghapus direktori sistem
    • Jalankan linter & unit test   • Menulis ke luar root workspace
    • Eksekusi shell terisolasi     • Akses kunci SSH / Secret vault
               │                               │
               ▼                               ▼
     (OTOMATIS BERJALAN)             (WAJIB PERSETUJUAN USER)
    Tanpa mengganggu fokus          Tombol: "Approve / Deny"
```

Desain ini memastikan agen dapat bekerja dengan ritme secepat kilat pada tugas-tugas rutin pengembangan tanpa rasa takut akan kecelakaan fatal (*destructive commands*).

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Kasus: Menghubungkan Agen dengan Basis Data Produksi Menggunakan PostgreSQL MCP

Bayangkan seorang engineer bertugas mengoptimalkan kueri laporan penjualan yang lambat.

- **Alur Tradisional**:
  1. Engineer membuka DBeaver atau pgAdmin.
  2. Mengetik kueri manual dan menyalin hasilnya ke spreadsheet.
  3. Membuka terminal, menulis kode backend.
  4. Melakukan deploy coba-coba tanpa tahu rencana eksekusi database.

- **Alur Agentic dengan MCP**:
  1. Engineer mengaktifkan PostgreSQL MCP Server di IDE.
  2. Memberikan instruksi: *"Periksa kueri di `src/reports/monthly_revenue.ts`. Analisis rencana eksekusinya menggunakan PostgreSQL MCP dan usulkan indeks komposit yang tepat."*
  3. Agen memanggil tool `postgres_query(query="EXPLAIN (ANALYZE, BUFFERS) SELECT ...")`.
  4. Agen melihat terjadi *Sequential Scan* pada tabel transaksi dengan 3 juta baris.
  5. Agen menyusun migrasi penambahan indeks komposit `(tenant_id, created_at, status)` menggunakan skill migrasi database yang aman (`CONCURRENTLY`).
  6. Agen memvalidasi ulang: kueri yang semula memakan waktu 4.8 detik kini tuntas dalam 12 milidetik.

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

1. [ ] **Audit Alur Kerja Berulang di Repositori Anda**: Catat 3 tugas yang selalu Anda jelaskan ulang kepada developer baru (misal: format commit, alur migrasi database, pembuatan komponen UI).
2. [ ] **Ubah SOP Tim Menjadi Berkas `SKILL.md`**: Buat folder `.agents/skills/<nama-skill>/SKILL.md` dan masukkan panduan langkah kerja terstruktur beserta skrip pembantunya.
3. [ ] **Eksplorasi Katalog MCP Server**: Pasang minimal satu MCP Server yang relevan dengan pekerjaan harian Anda (misal: GitHub MCP untuk otomasi issue/PR atau Database MCP untuk eksplorasi skema).
4. [ ] **Periksa Batasan Sandbox**: Pastikan agen Anda berjalan dalam sandbox default untuk eksekusi perintah shell rutin, dan hanya meminta bypass permission saat membutuhkan akses jaringan atau kredensial kritis.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Model bahasa tanpa alat hanyalah seorang filsuf yang terkurung di menara gading. Namun model bahasa yang dipersenjatai dengan Tools, MCP, dan Skills adalah seorang insinyur pembangun yang mampu memindahkan gunung-gunung kode."*  
> — **Koleksi Wawasan Rekayasa Antigravity**

**Pertanyaan Refleksi Diri**:
- *Berapa banyak prosedur manual tim Anda yang saat ini hanya tersimpan di kepala orang-orang senior dan rentan dilupakan oleh pengembang lain?*
- *Bagaimana jika seluruh SOP tersebut diubah menjadi modul Skills yang dapat dibaca dan dieksekusi secara presisi oleh agen AI Anda setiap hari?*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 2: Arsitektur Konteks, System Rules, & Dokumen Desain (`design.md`)](02-arsitektur-konteks-dan-design-docs.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 4: Orkestrasi Multi-Agent & Subagents Collaboration](04-multi-agent-orchestration-dan-subagents.md)**

