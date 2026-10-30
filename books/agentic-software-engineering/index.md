# 📖 Agentic Software Engineering: Panduan Komprehensif Rekayasa Perangkat Lunak Berbasis Autonomous AI Agents, Skills, Tools, & System Context

> 📚 **[Kembali ke Katalog Utama (CATALOG.md)](../../CATALOG.md)**  
> **Penulis**: Antigravity Engineering Lab & Practitioners Collection  
> **Tahun Terbit**: 2026 &nbsp;|&nbsp; **Penerbit**: Modern AI Engineering Hub  
> **Genre**: Rekayasa Perangkat Lunak, Autonomous Agents & System Architecture  
> **Estimasi Waktu Baca Keseluruhan**: ~75–90 Menit (6 Modul Teardown Mendalam)  
> **Rating Rekomendasi**: ⭐⭐⭐⭐⭐ (5.0 / 5.0)  

---

<div align="center">
  <img src="cover.jpg" width="300" alt="Agentic Software Engineering Cover" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); margin-bottom: 12px;" />
</div>

---

## 🧭 Peta Eksplorasi Buku (Reading Roadmap)

Buku ini disusun secara sistematis ke dalam 6 bagian inti yang membawa Anda melangkah dari pemahaman filosofis kecerdasan agen otonom hingga implementasi arsitektur produksi skala riil:

- [x] 📘 **[Part 1: Anatomi & Paradigma AI Coding Agents](01-anatomi-dan-paradigma-ai-agents.md)** — *Membongkar batas antara Autocomplete, Chatbot, dan Autonomous Agent. Memahami siklus ReAct (Reasoning-Action-Observation), dynamic tool execution, dan pergeseran peran engineer dari pengetik sintaks menjadi Software Engineering Lead.*
- [x] 📘 **[Part 2: Arsitektur Konteks, System Rules, & Dokumen Desain (`design.md`)](02-arsitektur-konteks-dan-design-docs.md)** — *Mengapa 90% kegagalan agent adalah kegagalan konteks. Anatomi hierarki aturan sistem (`AGENTS.md`, `.cursorrules`), metodologi Spec-Driven Development, struktur dokumen desain (`design.md`), serta standar penempatan struktur direktori repositori (`.agents/skills/`, `docs/designs/`, workspace vs global scope).*
- [x] 📘 **[Part 3: Skills, Tool Calling, & Ekosistem Model Context Protocol (MCP)](03-skills-mcp-dan-tool-ecosystem.md)** — *Membedah anatomi Skills (`SKILL.md`) dan struktur subfolder mandiri (`scripts/`, `references/`, `templates/`). Mekanisme tool calling sandboxed vs unsandboxed, dan revolusi integrasi sistem eksternal menggunakan protokol terbuka MCP (Model Context Protocol).*
- [x] 📘 **[Part 4: Orkestrasi Multi-Agent & Subagents Collaboration](04-multi-agent-orchestration-dan-subagents.md)** — *Mencegah context degradation dan cognitive drift pada tugas-tugas kompleks. Pola arsitektur hierarkis: Orchestrator, Deep Researcher, Worker/Coder, dan Reviewer. Strategi isolasi workspace dan transcript economy.*
- [x] 📘 **[Part 5: Feedback Loops, Evaluasi Mandiri, & Guardrails Kualitas](05-evaluasi-verifikasi-dan-guardrails.md)** — *Membangun jembatan antara penalaran probabilistik LLM dengan kebenaran deterministik mesin (Linter, Compilers, Automated Tests). Pola Self-Correction otonom, sandbox security, dan merancang Human-in-the-Loop approval gates yang presisi.*
- [x] 📘 **[Part 6: Playbook Implementasi Nyata & Alur Kerja End-to-End](06-playbook-implementasi-dan-studi-kasus.md)** — *Blueprint kerja harian: dari ideation, scaffolding, refactoring sistem legasi, investigasi bug misterius (Root Cause Analysis), hingga otomasi deployment CI/CD. Dilengkapi checklist kesiapan implementasi tim.*

---

## 🎯 1. Inti Filosofis & Tesis Utama

Dunia rekayasa perangkat lunak sedang mengalami pergeseran tektonik terbesar sejak penemuan *compiler* dan internet: **transisi dari Assisted Coding (bantuan pasif seperti autocomplete) menuju Agentic Software Engineering (orkestrasi agen otonom aktif).**

Dalam model tradisional, interaksi manusia dengan AI hanya terbatas pada *chatting* di kotak terpisah atau menerima saran baris kode (*inline completion*). Manusia tetap menanggung seluruh beban kognitif: membaca direktori, mencari berkas referensi, menyalin kode, menjalankan terminal, membaca pesan galat (*stack trace*), dan mengedit berkas satu per satu.

Buku ini mengajarkan paradigma baru:

> *"AI Agent bukanlah sekadar model bahasa yang pandai bercakap-cakap; Agent adalah sistem komputasi berotak LLM yang dibekali panca indra (Read Tools), anggota gerak (Execution Tools), memori kerja (Context Management), dan kemampuan bernalar secara berulang (Iterative Feedback Loops) untuk menyelesaikan tujuan dunia nyata tanpa pengawasan mikro."*

Melalui buku ini, seorang insinyur perangkat lunak tidak lagi dilihat dari berapa cepat ia mengetik karakter kode per menit, melainkan **seberapa jernih ia merumuskan spesifikasi masalah, menyusun arsitektur sistem, membatasi ruang lingkup (boundaries), dan memvalidasi kebenaran hasil akhir.**

Ketika Anda memberikan konteks yang tepat (`design.md`), aturan main yang ketat (`AGENTS.md`), kapabilitas terarah (`skills`), dan alat eksekusi yang aman (`tools & MCP`), satu orang insinyur dapat mengorkestrasi pekerjaan yang sebelumnya memerlukan satu divisi rekayasa perangkat lunak penuh.

---

## 💡 2. Peta Konsep & Kerangka Berpikir Utama (Core Frameworks)

```text
                        EKOSISTEM AGENTIC SOFTWARE ENGINEERING
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
  [ 1. CONTEXT LAYER ]      [ 2. COGNITIVE ENGINE ]       [ 3. ACTION LAYER ]
  • System Rules (AGENTS.md) • High-Capacity LLM          • Terminal Shell & Sandbox
  • Specs & Plans (design.md)• ReAct Loop (Think-Act-Obs) • File Edit / AST Diffing
  • Skill Modules (SKILL.md) • Self-Reflection Engine     • MCP External Connectors
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      ▼
                        [ 4. VERIFICATION LOOP ]
                        • Deterministic Linters & Types
                        • Automated Unit / E2E Tests
                        • Human-in-the-Loop Review
```

### 4 Pilar Utama Arsitektur Agen:
- **Pilar 1: The Context Hierarchy (Fondasi Informasi)**: LLM tidak tahu apa yang tidak ada dalam *context window*-nya. Informasi harus distrukturkan secara berjenjang: aturan perilaku permanen (`AGENTS.md`), blueprint rancangan fitur (`design.md`), dan modul SOP fungsional (*Skills*) yang hanya dibaca saat diperlukan.
- **Pilar 2: The ReAct Reasoning Cycle (Mesin Kognitif)**: Siklus dinamis di mana agen merencanakan hipotesis (*Thought*), memanggil instruksi tindakan (*Action/Tool Call*), menerima umpan balik nyata dari sistem operasi (*Observation*), dan mengulangi siklus tersebut hingga kriteria keberhasilan tercapai.
- **Pilar 3: The Tool & Protocol Interface (Jangkauan Aksi)**: Agen memanfaatkan antarmuka terstandar seperti *Model Context Protocol* (MCP) dan *Sandboxed Shell* untuk membaca basis data, merestrukturisasi repositori kode, dan berinteraksi dengan API eksternal secara terkontrol.
- **Pilar 4: The Deterministic Feedback Loop (Jaminan Kualitas)**: Jangan pernah mengandalkan LLM untuk memvalidasi dirinya sendiri hanya dengan "menebak". Pasangkan agen dengan kompilator, *test suite*, dan linter deterministik. Jika tes gagal, agen membaca *stack trace* dan memperbaikinya sendiri secara otomatis.

---

## ⚡ 3. Playbook Praktis: Rencana Implementasi

Langkah taktis bagi individu dan tim rekayasa untuk mengadopsi Agentic Workflow:

### Fase 1: Hari Ini (Quick Wins & Zero-Cost Setup)
- [ ] Buat file `AGENTS.md` di *root* repositori Anda yang memuat arsitektur proyek, konvensi kode, perintah *build*, dan aturan pengujian.
- [ ] Berhenti melakukan *prompting* ad-hoc langsung meminta kode; ganti dengan metode **Spec-First** (minta agen membuat dokumen `design.md` atau `plan.md` terlebih dahulu).
- [ ] Uji alur *debugging* mandiri: berikan pesan galat mentah (*error log*) beserta file terkait dan instruksikan agen mencari akar masalah sebelum mengubah satu baris pun.

### Fase 2: 30 Hari Pertama (Membangun Ekosistem Kustom)
- [ ] Identifikasi alur kerja berulang di tim Anda (misal: generator skema basis data, pembuatan endpoint API CRUD, setup storybook UI) dan kemas ke dalam folder `.agents/skills/<nama-skill>/SKILL.md`.
- [ ] Terapkan integrasi MCP untuk alat pendukung (misal: GitHub MCP untuk PR review, PostgreSQL MCP untuk inspeksi skema DB, Sentry MCP untuk analisis crash log).
- [ ] Terapkan pola *multi-agent* sederhana: pisahkan peran antara Agen Periset (*Researcher*) dan Agen Pelaksana (*Worker/Executor*).

### Fase 3: Jangka Panjang (Karakter & Standar Produksi Tim)
- [ ] Bangun *Continuous Verification Pipeline* di mana setiap *pull request* yang digenerasi oleh agen wajib lolos linter otomatis, tes integrasi di sandbox terisolasi, dan audit keamanan dependensi.
- [ ] Bentuk repositori sentral *Skills Library* di level organisasi agar pengetahuan rekayasa terbaik (*engineering best practices*) terdistribusi secara instan ke seluruh agen tim.

---

## ⚖️ 4. Evaluasi Kritis & Ulasan Objektif

- **Kekuatan Terbesar**: Menyajikan pemahaman komprehensif, arsitektural, dan bebas dari *hype* teknologi murahan. Membedah komponen teknis secara konkret (`design.md`, `SKILL.md`, MCP, Sandbox, Subagents) dengan contoh nyata yang langsung bisa diuji di proyek perangkat lunak harian.
- **Kritik & Titik Buta (Blind Spots)**: Mengandalkan ekosistem agen menuntut disiplin tinggi dalam dokumentasi dan pengujian otomatis. Pada proyek legasi tanpa tes otomatis (*zero test coverage*) dan minim dokumentasi, tingkat otonomi agen harus dibatasi secara ketat untuk menghindari regresi fungsional yang fatal.
- **Profil Pembaca Ideal**: Insinyur perangkat lunak (Junior hingga Principal), Arsitek Solusi, Engineering Manager, dan Tech Founders yang ingin menggandakan kecepatan pengiriman produk (*shipping velocity*) tanpa mengorbankan kualitas dan keamanan kode.

