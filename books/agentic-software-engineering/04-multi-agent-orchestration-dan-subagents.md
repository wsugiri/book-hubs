# Part 4: Orkestrasi Multi-Agent & Subagents Collaboration

> 📖 Hub Buku: **[Agentic Software Engineering](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Dalam sebuah tim rekayasa perangkat lunak di dunia nyata, tidak ada satu orang pun yang diminta melakukan segalanya sendirian secara simultan. Kita tidak meminta seorang insinyur untuk merancang arsitektur sistem terdistribusi, menulis 10.000 baris kode mikroservis, membuat desain antarmuka pengguna di Figma, meriset paper kriptografi terbaru, menguji penetrasi keamanan, dan melakukan *code review* atas kodenya sendiri dalam satu tarikan napas.

Jika Anda memaksakan semua beban itu pada satu orang manusia, ia akan mengalami kelelahan mental (*burnout*), kehilangan fokus, dan mulai membuat kesalahan konyol pada hal-hal mendasar.

Hal yang persis sama terjadi pada AI Agent tunggal (*Single Agent Architecture*).

Ketika kita menugaskan satu agen untuk membaca seluruh repositori, meriset pustaka baru di internet, menulis logika backend, membuat komponen frontend, dan menjalankan pengujian dalam satu sesi obrolan yang panjang, agen tersebut lambat laun akan mengalami **Cognitive Drift**. Konteks kerjanya membengkak menjadi puluhan ribu token, ia mulai melupakan instruksi awal yang diberikan di awal sesi, dan kinerjanya merosot drastis.

Solusi dari kebuntuan ini adalah arsitektur yang telah dipraktikkan manusia selama ribuan tahun: **pembagian kerja (*division of labor*) melalui Orkestrasi Multi-Agent (*Subagents Architecture*).**

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

### 1. Kapan Agen Tunggal Runtuh: Sindrom Kejenuhan Konteks (Context Saturation)

Mengapa satu agen pintar tidak cukup untuk menangani proyek perangkat lunak skala menengah hingga besar?

```text
               KAPASITAS KOGNITIF AGEN TUNGGAL
     Ketajaman
     Nalar
        ▲
        │  ████████████
        │  ████████████████
        │  ████████████████████
        │  ████████████████████████
        │  ████████████████████████████ ◄─── Titik Jenuh (Saturation)
        │  ██████████████████               • Mulai halusinasi variabel
        │  ██████████                       • Lupa batasan design.md
        │  ████                             • Menimpa berkas yang salah
        └────────────────────────────────────────► Jumlah Langkah / Token
```

1. **Context Window Saturation**: Setiap panggilan tool, pembacaan berkas 800 baris, dan output terminal panjang menyumbang token ke memori kerja agen. Ketika mencapai batas tertentu, model harus memangkas riwayat atau mengalami distorsi atensi.
2. **Role Confusion**: Sulit bagi satu entitas untuk menjadi "pencipta kode yang kreatif dan cepat" sekaligus "penguji kode yang skeptis dan kejam terhadap bug".
3. **Pencemaran Ruang Kerja (Workspace Pollution)**: Eksplorasi eksperimental yang gagal dapat meninggalkan berkas sementara dan dependensi rusak yang mengaburkan jalur utama proyek.

---

### 2. Pola Arsitektur Hierarkis: Skuad Multi-Agent Terpadu

Solusi arsitektural yang paling tangguh—sebagaimana dibuktikan dalam riset multi-agent software engineering ternama seperti **[MetaGPT (Hong et al., 2023)](https://arxiv.org/abs/2308.00352)** dan **[ChatDev (Qian et al., 2023)](https://arxiv.org/abs/2307.07924)**—adalah memisahkan tanggung jawab menjadi peran-peran spesifik dengan batasan konteks terisolasi:

```text
                        ┌───────────────────────────────┐
                        │     ORCHESTRATOR / LEAD       │
                        │   (Perencana & Pengarah)      │
                        │ • Memegang design.md & goals  │
                        │ • Memecah dan delegasi tugas  │
                        └───────────────┬───────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│ DEEP RESEARCHER │            │  WORKER / CODER │            │  CODE REVIEWER  │
│  (Subagent 1)   │            │   (Subagent 2)  │            │  / QA AUDITOR   │
├─────────────────┤            ├─────────────────┤            ├─────────────────┤
│ • Read-only     │            │ • Full write    │            │ • Read-only     │
│ • Analisis repo │            │ • Terminal shell│            │ • Security scan │
│ • Merangkum API │            │ • Menulis kode  │            │ • Verifikasi tes│
│ • Mengembalikan │            │ • Eksekusi tes  │            │ • Tolak jika ada│
│   intisarinya   │            │   di sandbox    │            │   celah/regresi │
└─────────────────┘            └─────────────────┘            └─────────────────┘
```

- **Orchestrator (Parent Agent)**:  
  Bertindak sebagai *Tech Lead*. Tugas utamanya bukan menulis baris kode satu per satu, melainkan menyusun strategi, memecah milestone, mendelegasikan tugas ke subagent, dan mengintegrasikan hasil akhir.
- **Deep Researcher (Subagent Spesialis Riset)**:  
  Diberikan izin baca saja (*read-only*). Ia dapat menjelajahi 50 berkas kode, membaca dokumentasi resmi di web, atau menginspeksi basis data. Setelah selesai, ia hanya mengirimkan ringkasan 2 paragraf berisi intisari yang dibutuhkan kepada Orchestrator. Konteks ribuan baris yang dibacanya tetap terisolasi di ruang kerjanya dan **tidak mencemari context window sang Orchestrator**.
- **Worker / Implementation Subagent**:  
  Diberikan izin tulis (*write tools*) dan terminal sandbox. Ia bertugas fokus mengeksekusi satu sub-tugas kecil yang terisolasi.
- **Code Reviewer / QA Subagent**:  
  Memiliki *system prompt* yang dirancang secara khusus untuk bersikap skeptis, mencari celah keamanan (*security vulnerabilities*), mengecek kepatuhan terhadap `AGENTS.md`, dan memastikan bahwa tidak ada regresi pada fungsionalitas yang sudah ada.

---

### 3. Workspace Isolation: Shared Memory vs Branched Workspaces

Bagaimana para subagent berbagi ruang kerja kode tanpa saling menimpa (*race conditions*)?

```text
Pola 1: Shared Workspace (Single Branch)
• Cocok untuk tugas berurutan (*sequential tasks*).
• Subagent 1 menyelesaikan API -> Subagent 2 mengonsumsi API untuk UI.
• Hemat ruang disk, namun membutuhkan koordinasi ketat.

Pola 2: Branched Workspace (Isolated Git Worktrees)
• Cocok untuk tugas paralel (*concurrent tasks*) atau eksplorasi berisiko tinggi.
• Setiap subagent bekerja di klon git branch terisolasi (`feature-auth-refactor-worker-1`).
• Jika eksperimen gagal, workspace subagent langsung dimusnahkan tanpa merusak cabang utama.
• Jika berhasil, Orchestrator melakukan git merge secara terstruktur.
```

---

### 4. Manajemen Transkrip & Context Compaction

Ketika sebuah alur kerja rekayasa berjalan selama berjam-jam (*long-running workflows*), bagaimana sistem mencegah agen agar tidak kehabisan memori?

Dua teknik kunci yang diterapkan dalam sistem canggih seperti Antigravity dan arsitektur agen generasi baru:
1. **Compaction on Checkpoint**: Ketika log percakapan mencapai ambang token tertentu (misal 80% dari batas konteks), sistem secara otomatis memicu rutinitas *summarization*. Riwayat pesan yang panjang diringkas menjadi representasi keadaan (*state snapshot*) yang padat, sementara berkas detail dan log mentah diarsipkan ke disk.
2. **Reactive Wakeup (Tanpa Polling)**: Orchestrator tidak perlu membuang token dalam lingkaran tunggu (*polling loop*) seperti menanyakan *"Apakah subagent sudah selesai?"* setiap 10 detik. Sistem menggunakan arsitektur *event-driven*: Orchestrator masuk ke mode *sleep*, dan secara otomatis dibangunkan (*woken up*) hanya ketika subagent mengirimkan sinyal pesan selesai.

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Kasus: Migrasi Pustaka State Management di Frontend Skala Besar

Bayangkan sebuah aplikasi React dengan 80 komponen yang masih menggunakan Redux jadul ingin dimigrasikan ke Zustand.

- **Kegagalan Single Agent**:
  Agen mulai mengedit file satu demi satu. Pada file ke-15, token percakapan sudah penuh sesak. Agen mulai lupa konvensi store yang baru, salah mengimpor hook, dan mulai mengarang tipe TypeScript yang tidak konsisten dengan 14 file sebelumnya. Hasil akhirnya adalah codebase yang setengah jalan dan rusak total.

- **Kemenangan Orkestrasi Multi-Agent**:
  1. **Orchestrator** membaca `design.md` migrasi dan memetakan 80 komponen ke dalam 4 domain mandiri: *Auth*, *Cart*, *User Profile*, dan *Settings*.
  2. Orchestrator meluncurkan **Researcher Subagent** untuk mengekstrak seluruh selector Redux dan memetakan model Zustand yang baru.
  3. Orchestrator meluncurkan **4 Worker Subagents** secara berurutan atau paralel dalam *isolated branches*, masing-masing fokus memigrasikan satu domain saja.
  4. Setiap Worker menyelesaikan tugasnya dalam waktu singkat dengan konteks yang bersih dan menjalankan unit test lokalnya sendiri.
  5. Setelah semua Worker selesai, Orchestrator meluncurkan **QA Subagent** untuk menjalankan *end-to-end integration test* di seluruh aplikasi.
  6. Migrasi 80 komponen selesai tanpa satu pun inkonsistensi sintaksis.

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

1. [ ] **Jangan Bebani Single Agent untuk Masalah Besar**: Jika suatu tugas memerlukan riset mendalam sekaligus penulisan kode di banyak berkas, pecah tugas tersebut menjadi dua fase: fase riset terisolasi dan fase implementasi.
2. [ ] **Gunakan Role Delegasi yang Jelas**: Ketika mendefinisikan subagent, tentukan batasan perannya secara eksplisit (misal: "Anda adalah Code Reviewer read-only, laporkan temuan tanpa mengubah file").
3. [ ] **Terapkan Prinsip Minimal Information Passing**: Subagent hanya boleh mengembalikan kesimpulan dan artefak penting kepada parent agent, bukan seluruh dump terminal atau isi berkas mentah yang dibacanya.
4. [ ] **Manfaatkan Event-Driven Wakeup**: Hindari script tunggu manual; biarkan sistem orkestrasi membangunkan agen utama saat sub-tugas tuntas.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Kehebatan sejati dalam rekayasa perangkat lunak modern bukanlah membangun satu agen raksasa yang mahatahu, melainkan merancang orkestra simfoni dari puluhan agen spesialis kecil yang bekerja dalam harmoni sempurna di bawah satu partitur lagu yang jelas."*  
> — **Koleksi Wawasan Rekayasa Antigravity**

**Pertanyaan Refleksi Diri**:
- *Pernahkah Anda frustrasi melihat AI mulai berhalusinasi setelah percakapan berjalan terlalu panjang? Apakah itu salah modelnya, atau Anda yang belum memecah tugasnya ke dalam subagent yang terisolasi?*
- *Bagaimana Anda bisa membagi pekerjaan rekayasa tim Anda ke dalam peran-peran spesialis yang siap dioperasikan oleh skuad subagent AI?*

---

## 🌐 Sumber Riset & Tautan Verifikasi (Primary Sources & Cross-Check)

1. **MetaGPT: Meta-Programming for A Multi-Agent Collaborative Framework**:  
   Hong, S., Zheng, X., Chen, J., et al. (2023). ICLR 2024.  
   🔗 Tautan Paper Resmi: [https://arxiv.org/abs/2308.00352](https://arxiv.org/abs/2308.00352)  
   🔗 Repositori Proyek: [https://github.com/geekan/MetaGPT](https://github.com/geekan/MetaGPT)
2. **ChatDev: Communicative Agents for Software Development**:  
   Qian, C., Cong, X., Yang, C., et al. (2023). ACL 2024.  
   🔗 Tautan Paper Resmi: [https://arxiv.org/abs/2307.07924](https://arxiv.org/abs/2307.07924)  
   🔗 Repositori Proyek: [https://github.com/OpenBMB/ChatDev](https://github.com/OpenBMB/ChatDev)
3. **Subagents Architecture & Isolated Git Workspaces**:  
   Antigravity System Architecture Documentation & Branch/Share Worktree Modes.

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 3: Skills, Tool Calling, & Ekosistem Model Context Protocol (MCP)](03-skills-mcp-dan-tool-ecosystem.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 5: Feedback Loops, Evaluasi Mandiri, & Guardrails Kualitas](05-evaluasi-verifikasi-dan-guardrails.md)**

