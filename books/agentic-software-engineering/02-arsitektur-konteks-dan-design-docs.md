# Part 2: Arsitektur Konteks, System Rules, & Dokumen Desain (`design.md`)

> 📖 Hub Buku: **[Agentic Software Engineering](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Ada satu keluhan yang paling sering dilontarkan oleh para developer ketika baru pertama kali mencoba coding bersama AI:  
*"AI ini bodoh sekali! Saya minta buatkan fitur pembayaran, tapi kodenya malah mengubah tipe data database yang sudah stabil, mengabaikan konvensi penamaan tim, dan menggunakan pustaka JavaScript usang yang sudah kami hapus dua tahun lalu!"*

Apakah model AI tersebut benar-benar tidak kompeten?

Mari kita bedah secara jujur apa yang sebenarnya terjadi di balik layar. Sebuah model LLM, betapapun canggihnya bobot parameternya, tidak memiliki mata batin untuk mengetahui arsitektur repositori Anda yang terdiri dari 500 berkas. Ketika Anda hanya melemparkan instruksi satu kalimat: *"Buatkan endpoint pembayaran di backend"*, model tersebut dipaksa untuk mengisi ruang kosong yang maha luas menggunakan probabilitas statistik rata-rata internet.

Jika internet memuat jutaan contoh kode menggunakan Express v4, model akan menggunakan Express v4—meskipun proyek Anda menggunakan NestJS dengan Fastify dan arsitektur *Clean Architecture*.

Kegagalan fatal pada agen AI hampir tidak pernah disebabkan oleh keterbatasan sintaksis model. **Sembilan puluh lima persen kegagalan agen adalah kegagalan arsitektur konteks (*Garbage In, Garbage Hallucinated*).**

Dalam rekayasa agen modern, konteks adalah segalanya. Konteks adalah oksigen bagi nalar sang agen. Tanpa arsitektur konteks yang tertata rapi, agen otonom tercepat sekalipun hanya akan menjadi mesin pembuat *technical debt* berkecepatan tinggi.

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

### 1. Hierarki Piramida Konteks (The Context Hierarchy)

Untuk mengendalikan agen agar selalu bekerja sesuai rel yang benar, informasi dalam proyek harus disusun dalam bentuk piramida hierarkis dari yang paling permanen hingga yang paling dinamis:

```text
                     ▲
                    / \
                   /   \
                  /  4  \      LEVEL 4: Dynamic Scratchpad & Diff
                 /-------\     (State eksekusi sementara, terminal logs)
                /    3    \    LEVEL 3: Spec & Task (`design.md` / `task.md`)
               /-----------\   (Cetak biru fitur spesifik yang sedang digarap)
              /      2      \  LEVEL 2: On-Demand SOPs (`SKILL.md`)
             /---------------\ (Panduan prosedural cara kerja modul tertentu)
            /        1        \LEVEL 1: System Rules (`AGENTS.md` / `.cursorrules`)
           /───────────────────\(Aturan absolut perilaku, konvensi, dan batasan)
```

- **Level 1: System Rules (`AGENTS.md`, `.cursorrules`)**:  
  Aturan global yang wajib disuntikkan ke dalam *system prompt* agen setiap saat. Berisi instruksi tentang tumpukan teknologi (*tech stack*), konvensi kode (misal: "Gunakan TypeScript strict mode, jangan pernah gunakan `any`"), perintah build/test, dan batasan operasional (misal: "Jangan pernah mengubah file `.env`").
- **Level 2: Procedural Skills (`.agents/skills/`)**:  
  Pengetahuan cara kerja (*know-how*) yang hanya dibaca agen jika tugas relevan muncul. Ini menjaga agar *system prompt* tidak terlalu padat (*bloated*).
- **Level 3: Feature Specifications (`design.md` / `plan.md`)**:  
  Spesifikasi rinci dari fitur yang sedang dikerjakan. Ini adalah kontrak kebenaran antara manusia dan agen sebelum satu baris kode pun ditulis.
- **Level 4: Ephemeral Workspace State**:  
  Konteks sementara selama agen bekerja: berkas mana saja yang baru dibuka, baris mana yang diedit, dan pesan galat linter terakhir.

---

### 2. Bahaya Kognitif LLM: Attention Dilution & "Lost-in-the-Middle"

Mengapa kita tidak menyuntikkan seluruh kode repositori langsung ke dalam *context window* agen yang berkapasitas 1 juta token?

Penelitian mendalam tentang mekanisme *self-attention* pada model bahasa (seperti riset dari Liu et al. mengenai fenomena *Lost in the Middle*) mengungkap kenyataan pahit:
1. **Attention Fatigue**: Semakin besar jumlah token yang dijejalkan ke dalam konteks, semakin menurun kemampuan model untuk memberikan perhatian tajam pada instruksi spesifik.
2. **Context Contamination**: Menjejali kode lama yang berantakan atau pustaka yang tidak relevan akan "meracuni" gaya generasi kode agen.
3. **Biaya & Latensi Kognitif**: Membaca 500.000 token untuk setiap siklus ReAct membuat respon agen lambat dan boros sumber daya.

**Prinsip Emas Konteks**: *Bukan memberikan sebanyak mungkin informasi, melainkan memberikan informasi dengan rasio sinyal-terhadap-gangguan (Signal-to-Noise Ratio) setinggi mungkin.*

---

### 3. Anatomi `design.md` & Metodologi Spec-Driven Development

Sebelum era AI, banyak tim mengabaikan pembuatan dokumen desain (*Design Document / RFC*) karena dianggap memperlambat kecepatan rilis (*shipping velocity*). Di era agen, **dokumen desain justru menjadi akselerator nomor satu**.

Sebuah `design.md` yang baik adalah cetak biru teknis yang memandu agen mengeksekusi tugas tanpa perlu menebak-nebak. Struktur ideal berkas `design.md`:

```markdown
# Design Doc: [Nama Fitur]

## 1. Problem Statement & User Story
- Masalah nyata apa yang sedang kita selesaikan?
- Apa kriteria kesuksesan dari sisi fungsional pengguna?

## 2. Architectural Boundaries & Non-Goals
- Apa saja batas sistem yang TIDAK boleh disentuh?
- Apa kompromi teknis yang disengaja (*trade-offs*)?

## 3. Data Models & API Contracts
- Skema database (PostgreSQL / Prisma / TypeORM).
- Request/Response interfaces (TypeScript Types / JSON Schema).

## 4. Verification & Testing Strategy
- Unit test apa saja yang wajib dibuat?
- Apa edge cases yang harus dicakup (misal: timeout, nilai null, concurrent race conditions)?

## 5. Phased Implementation Tasks (Atomic Steps)
- [ ] Langkah 1: Buat migrasi skema tabel `orders`.
- [ ] Langkah 2: Implementasi repository layer dengan mock test.
- [ ] Langkah 3: Buat service layer dan validasi payload via Zod.
- [ ] Langkah 4: Expose REST/GraphQL endpoint dan jalankan E2E test.
```

Ketika dokumen `design.md` ini diserahkan kepada agen, agen tidak lagi "mengarang bebas". Agen akan mengeksekusi setiap langkah secara berurutan, menandai kotak centang satu demi satu, dan memverifikasi implementasinya terhadap kontrak API yang telah disepakati.

---

### 4. Pola "Plan-Before-Code" (Pemisahan Fase Berpikir dan Bertindak)

Salah satu kesalahan pemula adalah membiarkan agen langsung menulis berkas kode saat menerima permintaan pertama. Pola yang terbukti menghasilkan kode paling tangguh adalah **Plan-Before-Code Pattern**:

```text
Permintaan Pengguna
       │
       ▼
[ Fase 1: Perumusan Rencana (Plan Mode) ]
• Agen dilarang mengedit file kode.
• Agen hanya boleh membaca repo, menelusuri dependensi, dan menyusun `plan.md`.
• Manusia meninjau rencana teknis dan memberikan koreksi dini.
       │
       ▼ (Rencana Disetujui)
[ Fase 2: Eksekusi Terstruktur (Execution Mode) ]
• Agen mengeksekusi tugas langkah demi langkah sesuai checklist.
• Agen memverifikasi setiap langkah dengan linter dan test runner.
```

Dengan memisahkan fase perencanaan dan fase eksekusi, Anda menghemat 80% waktu revisi. Memperbaiki kesalahan arsitektur dalam teks dokumen desain membutuhkan waktu 10 detik; memperbaiki kode salah arsitektur yang sudah telanjur ditulis di 15 berkas membutuhkan waktu berjam-jam.

---

### 5. Standar Struktur & Penempatan Direktori Repositori Berbasis Agen (The Agentic Directory Architecture)

Di mana tepatnya kita harus meletakkan berkas aturan agen, keterampilan (*skills*), dokumen desain (*design.md*), skrip eksekusi, dan konfigurasi MCP di dalam proyek nyata?

Berikut adalah cetak biru struktur folder terstandar untuk repositori berbasis AI Agent modern:

```text
my-awesome-project/
├── .agents/                          # [Pusat Kontrol Agen di Repositori]
│   ├── skills/                       # Folder modul keterampilan (Skills Library)
│   │   ├── database-migration/       # Contoh skill migrasi DB
│   │   │   ├── SKILL.md              # Instruksi & SOP utama skill
│   │   │   ├── scripts/              # Skrip eksekusi pembantu (.sh, .ts, .py)
│   │   │   │   └── check_locks.sh
│   │   │   └── references/           # Skema & dokumentasi referensi tambahan
│   │   │       └── psql_cheatsheet.md
│   │   └── playwright-testing/       # Contoh skill pengujian E2E
│   │       ├── SKILL.md
│   │       └── templates/            # Template boilerplate test case
│   │           └── e2e_page_test.ts
│   ├── subagents/                    # Definisi & tipe subagent khusus
│   │   ├── code-reviewer.json        # Konfigurasi agen review (read-only)
│   │   └── security-auditor.json     # Konfigurasi agen audit kerentanan
│   ├── hooks/                        # Skrip hook otomatis (lifecycle events)
│   │   ├── pre-commit-check.sh       # Dijalankan agen sebelum membuat commit
│   │   └── on-error-diagnostic.sh    # Dijalankan saat terminal melempar exit != 0
│   └── mcp.json                      # Konfigurasi lokal Model Context Protocol
│
├── docs/                             # Dokumentasi Proyek & Spesifikasi
│   └── designs/                      # Folder arsip dokumen desain (Spec-Driven)
│       ├── template.md               # Template standar design.md
│       ├── 001-user-auth.md          # Dokumen desain fitur #1
│       └── 002-order-checkout.md     # Dokumen desain fitur #2
│
├── AGENTS.md                         # [ROOT LEVEL] Aturan sistem global & konvensi proyek
├── .cursorrules                      # (Opsional) Alias / mirror untuk IDE berbasis Cursor
├── .gitignore                        # Konfigurasi pengecualian git
│
├── src/                              # Direktori kode sumber aplikasi
│   ├── ...
│   └── ...
└── package.json                      # Definisi dependensi & build scripts
```

#### Aturan Pembagian Lingkup: Global Scope vs Workspace Scope

Salah satu kekeliruan arsitektur adalah mencampurkan preferensi pribadi developer dengan aturan rekayasa tim:

| Aspek | Global Scope (Personal Machine) | Workspace Scope (Project Repository) |
| :--- | :--- | :--- |
| **Lokasi File** | `~/.gemini/antigravity/` atau `~/.config/agents/` | `<project-root>/.agents/` & `AGENTS.md` |
| **Tujuan** | Preferensi personal pengembang (misal: gaya komentar kode pribadi, shortcut bash lokal, editor theme). | Aturan rekayasa resmi proyek, arsitektur sistem, dan konvensi tim. |
| **Status Git** | **DILARANG DI-COMMIT** (lokal di laptop masing-masing). | **WAJIB DI-COMMIT KE GIT** agar seluruh tim & CI memiliki agen dengan standar identik. |
| **Sensitivitas Kunci** | Kredensial API keys pribadi (`ANTHROPIC_API_KEY`, personal access tokens). | Hanya template konfigurasi; dilarang keras menyimpan *secrets* mentah! |

#### Panduan Manajemen Berkas Sementara (*Transient Artifacts & Scratchpads*)
Ketika agen melakukan debugging mendalam, agen sering membuat skrip eksperimen satu kali pakai (*one-off test scripts*) atau berkas sementara. 
- **Aturan Emas**: Jangan pernah membiarkan agen membuat berkas uji coba acak di dalam folder `src/` (misal: `src/test_temp.js`).
- Arahkan agen untuk menggunakan folder scratchpad yang diabaikan oleh Git, misalnya `.agents/scratch/` atau direktori brain internal (`<appDataDir>/brain/<conversation-id>/scratch/`).
- Tambahkan baris berikut ke `.gitignore` repositori Anda:
  ```gitignore
  # Agent transient scratchpads
  .agents/scratch/
  .agents/logs/
  *.tmp.agent
  ```

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Kasus: Menambahkan Fitur Multi-Tenant Organizations pada SaaS

Sebuah startup SaaS ingin menambahkan fitur *Workspaces/Organizations* di mana satu user bisa memiliki banyak organisasi dengan role berbeda (*Owner, Admin, Member*).

- **Pendekatan Tanpa Arsitektur Konteks (Ad-hoc)**:  
  Pengembang meminta: *"Tambahkan fitur multi-tenant ke aplikasi kita."*  
  Agen langsung membuat tabel `organizations` baru, namun tidak tahu bahwa aplikasi tersebut menggunakan JWT dengan *custom claims*. Agen menghasilkan kode yang membaca *tenant_id* dari query string URL—sebuah celah keamanan fatal (*Broken Object Level Authorization / BOLA*).

- **Pendekatan Spec-Driven dengan `design.md`**:  
  Pengembang meminta agen merancang `design.md` terlebih dahulu. Dokumen mendefinisikan:
  1. *Security invariant*: `tenant_id` harus selalu diekstrak dari session token yang terverifikasi secara kriptografis, bukan dari parameter URL publik.
  2. *Database constraint*: Semua query wajib menyertakan filter `organization_id` melalui middleware ORM global.
  3. *Testing contract*: Wajib menyertakan tes yang memverifikasi bahwa User A dari Organisasi 1 tidak dapat membaca data Organisasi 2 meskipun menebak UUID-nya.

Ketika agen mengeksekusi tugas berdasarkan `design.md` ini, hasilnya adalah implementasi berstandar industri dengan celah keamanan nol.

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

1. [ ] **Inisialisasi `AGENTS.md` di Setiap Repositori**: Tuliskan ringkasan 1-2 halaman mengenai stack teknologi, perintah standar (`test`, `lint`, `build`), dan aturan arsitektur yang pantang dilanggar.
2. [ ] **Biasakan Membuat `design.md` Sebelum Menulis Fitur Baru**: Untuk setiap fitur yang menyentuh lebih dari 2 berkas, buat draf spesifikasi terlebih dahulu dan diskusikan bersama agen.
3. [ ] **Terapkan Atomic Task Breakdown**: Pecah tugas besar menjadi sub-langkah kecil dengan kriteria centang (*checkboxes*). Agen bekerja jauh lebih presisi saat mengerjakan 5 tugas kecil 5-menitan daripada 1 tugas raksasa 30-menitan.
4. [ ] **Jaga Kebersihan Konteks**: Jangan biarkan log terminal sepanjang ribuan baris menumpuk di riwayat percakapan. Hapus atau lakukan *compaction* secara berkala agar perhatian agen tetap fokus.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Di era komputasi tradisional, dokumen spesifikasi sering kali menjadi artefak mati yang berdebu di Notion atau Confluence. Di era agen, dokumen spesifikasi adalah bahan bakar aktif yang secara langsung menggerakkan mesin eksekusi kode."*  
> — **Koleksi Wawasan Rekayasa Antigravity**

**Pertanyaan Refleksi Diri**:
- *Apakah instruksi yang selama ini Anda berikan kepada AI sudah cukup spesifik dan terikat batasan, atau Anda masih berharap AI dapat membaca pikiran dan asumsi tersembunyi di kepala Anda?*
- *Berapa banyak waktu yang bisa Anda hemat jika Anda mengoreksi arsitektur pada selembar dokumen desain 10 menit sebelum agen mulai menulis ratusan baris kode?*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 1: Anatomi & Paradigma AI Coding Agents](01-anatomi-dan-paradigma-ai-agents.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 3: Skills, Tool Calling, & Ekosistem Model Context Protocol (MCP)](03-skills-mcp-dan-tool-ecosystem.md)**

