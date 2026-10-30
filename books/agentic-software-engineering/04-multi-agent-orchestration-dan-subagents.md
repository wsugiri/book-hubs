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

### 5. Transcript Economy: Strategi Compaction & Context Budget Management

Setiap kali kita membuka sesi baru dengan sebuah agen, sesungguhnya kita sedang mengalokasikan sebuah *anggaran kognitif* yang terbatas. Bayangkan anggaran itu seperti rekening bank dengan saldo tetap: setiap baris kode yang dibaca, setiap output terminal yang dicerna, setiap pesan yang dipertukarkan—semuanya mendebit anggaran itu secara perlahan namun pasti. Ketika saldonya mendekati nol, bukan berarti agen berhenti; ia tetap berjalan, namun kualitas nalarnya mulai merosot—seperti seorang insinyur yang dipaksa bekerja tanpa tidur selama 40 jam.

Inilah yang disebut **Token Budget Management**: seni mengelola kapasitas konteks sebuah agen seefisien mungkin agar ia tetap cerdas dari awal hingga akhir tugas.

```text
  TOKEN BUDGET LIFECYCLE — Satu Sesi Agen

  [████████████████████████████████████████] 100% ← Sesi dimulai, konteks segar

  Seiring sesi berjalan...
  [████████████████████████░░░░░░░░░░░░░░░] 60%  ← Baca 10 file, jalankan 5 tools
  [████████████████░░░░░░░░░░░░░░░░░░░░░░░] 40%  ← Ambang compaction otomatis (≈ zona kuning)
  [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 20%  ← Zona merah — risiko context drift tinggi
  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  0%  ← Saturasi total: halusinasi & inkonsistensi
                                                     mulai terjadi

  → Strategi: Intervensi SEBELUM zona merah, bukan setelahnya.
```

Ada tiga strategi compaction yang bisa diterapkan tergantung situasi:

**Strategi 1: Rolling Summary Checkpoint**

Bayangkan seorang sekretaris rapat yang setiap 30 menit merangkum poin-poin diskusi ke dalam catatan ringkas, sehingga peserta tidak perlu mengingat ulang seluruh percakapan dari awal. Dalam sistem agen, strategi ini bekerja dengan cara serupa: secara berkala—biasanya saat mendekati 70-80% kapasitas konteks—sistem memicu sebuah rutinitas *summarization*. Seluruh riwayat percakapan yang panjang dipadatkan menjadi sebuah *state snapshot* yang hanya berisi poin-poin terpenting: keputusan yang sudah diambil, berkas apa yang sudah dimodifikasi, dan apa tujuan selanjutnya. Snapshot inilah yang menjadi "ingatan aktif" agen untuk sisa sesi, menggantikan ribuan baris log yang sudah tidak relevan.

**Strategi 2: Selective Archiving**

Tidak semua informasi perlu ada di dalam memori kerja agen sepanjang waktu. Output panjang dari perintah terminal—misalnya hasil `git diff` yang menampilkan 500 baris perubahan, atau log error dari test runner yang memuntahkan 200 baris stack trace—sangat jarang dibutuhkan secara penuh setelah titik tertentu. *Selective Archiving* adalah strategi di mana log-log panjang tersebut dipindahkan ke berkas di disk (misalnya `session-logs/run-001.log`), sementara agen hanya menyimpan *pointer* atau ringkasan singkat satu paragraf yang menunjukkan lokasi log tersebut jika suatu saat dibutuhkan. Hasilnya: konteks window tetap ramping, namun informasi detailnya tidak hilang—hanya "diparkir" di luar memori aktif.

**Strategi 3: Fresh Context Restart**

Terkadang, solusi paling elegan bukan meringkas, melainkan memulai ulang. Ketika sebuah sesi sudah terlalu panjang, terlalu banyak konteks yang sudah tidak relevan menumpuk, dan *signal-to-noise ratio* dalam memori agen mulai memburuk—saat itulah lebih bijak untuk meluncurkan sesi baru yang segar dengan hanya membawa artefak penting: `design.md`, daftar berkas yang sudah dimodifikasi, dan tujuan selanjutnya. Ini bukan kegagalan; ini adalah strategi. Agen yang dimulai dari konteks bersih sering kali menghasilkan kode yang lebih baik daripada agen yang dipaksakan melanjutkan sesi yang sudah "lelah".

**Kapan Manual vs Otomatis?**

Sistem canggih seperti Antigravity menangani compaction secara otomatis saat ambang token tertentu tercapai—developer tidak perlu melakukan apa pun. Namun ada situasi di mana intervensi manual lebih tepat: misalnya, ketika developer menyadari bahwa arah pekerjaan berubah drastis di tengah sesi (dari debugging ke penulisan fitur baru), atau ketika sesi mulai menunjukkan tanda-tanda *context drift* (agen mulai mengulang pertanyaan atau melupakan konvensi yang sudah disepakati). Dalam situasi ini, perintah `/compact` dapat dipicu secara manual untuk memaksa ringkasan segera, memberikan agen "nafas segar" sebelum melanjutkan. Aturan sederhananya: **jika Anda merasa perlu mengingatkan agen tentang sesuatu yang sudah pernah Anda jelaskan sebelumnya, itu pertanda compaction sudah terlambat dilakukan.**

---

### 6. Anti-Pattern: Jebakan Umum dalam Sistem Multi-Agent

Arsitektur multi-agent adalah alat yang sangat kuat, namun seperti semua alat yang kuat, ia bisa disalahgunakan. Berikut adalah empat jebakan paling umum yang dialami tim rekayasa ketika pertama kali mengadopsi pola orchestrasi—beserta cara mendeteksi dan menghindarinya.

**Anti-Pattern 1: Over-Delegation**

Ada sebuah paradoks yang menarik: semakin bersemangat seorang developer mempelajari multi-agent orchestration, semakin besar godaan untuk membungkus setiap tugas kecil dalam subagent baru. *"Butuh membaca satu file konfigurasi? Mari buat Research Subagent."* *"Perlu mengubah satu baris variabel environment? Buat Worker Subagent khusus."*

Ini adalah over-delegation—memecah pekerjaan ke dalam subagent yang granularitasnya terlalu kecil sehingga overhead koordinasi (meluncurkan subagent, menunggu hasilnya, mengintegrasikan laporan) justru lebih mahal daripada biaya mengerjakannya langsung. Bayangkan seorang manajer yang memanggil rapat tim setiap kali ia ingin mengambil segelas air—absurd, namun itulah yang terjadi dalam kode.

Tanda-tanda over-delegation: waktu total tugas terasa jauh lebih lama dari perkiraan, sebagian besar waktu dihabiskan agen untuk "menunggu hasil subagent" bukan "mengerjakan sesuatu", dan laporan subagent yang dikembalikan terlalu singkat (satu atau dua kalimat) untuk sesuatu yang seharusnya bisa dikerjakan langsung. Aturan praktisnya: **gunakan subagent hanya ketika tugas yang didelegasikan membutuhkan eksplorasi konteks besar yang tidak ingin Anda bawa ke dalam context window orchestrator, atau ketika tugas tersebut dapat dijalankan secara paralel untuk menghemat waktu.**

**Anti-Pattern 2: Context Leakage**

Subagent Researcher baru saja selesai menganalisis 40 berkas kode dan menemukan pola arsitektur yang relevan. Sang Orchestrator, yang antusias, meminta subagent untuk mengirimkan "semua yang kamu temukan." Subagent pun mengirimkan dump mentah: 3.000 baris log pembacaan berkas, seluruh output `grep`, setiap komentar kode yang ditemukannya.

Apa yang terjadi selanjutnya? Orchestrator meneruskan keseluruhan dump tersebut ke Worker Subagent berikutnya sebagai "konteks tugas." Worker Subagent kini harus mencerna 3.000 baris noise hanya untuk menemukan 3 paragraf informasi yang sebenarnya relevan. Ini adalah **Context Leakage**: Orchestrator gagal bertindak sebagai filter informasi, dan sebagai gantinya menjadi sekadar *forwarding relay* yang membebani setiap agen berikutnya dengan konteks yang tidak perlu.

Akibatnya jauh lebih serius dari sekadar pemborosan token: Worker Subagent yang kelebihan konteks noise cenderung menghasilkan respons yang lebih lambat, lebih inkonsisten, dan lebih mungkin mengambil kesimpulan yang salah karena teralihkan oleh informasi yang tidak relevan. **Prinsip Minimal Information Passing** adalah antidotnya: setiap subagent hanya boleh mengembalikan *kesimpulan terstruktur* dan *artefak kunci*, bukan dump mentah dari aktivitasnya.

**Anti-Pattern 3: Orphaned Subagent**

Skenario ini lebih halus namun sangat mahal: Orchestrator meluncurkan lima subagent secara paralel untuk mengerjakan lima modul berbeda. Empat subagent menyelesaikan tugasnya dan mengirim laporan. Subagent kelima—karena bug dalam system prompt, karena menemui edge case yang tak terduga, atau karena mengalami context saturation—masuk ke dalam kondisi diam: ia terus "berpikir" dan mengonsumsi sumber daya, namun tidak pernah mengirimkan sinyal selesai. Sementara itu, Orchestrator terus menunggu tanpa batas, tidak tahu bahwa subagent kelima sudah tidak akan pernah menyelesaikan tugasnya.

Ini adalah **Orphaned Subagent**—subagent yang "terlantar" tanpa mekanisme pengembalian hasil yang jelas. Cara mendeteksinya: tetapkan **timeout yang eksplisit** untuk setiap subagent yang diluncurkan. Jika dalam waktu X menit subagent belum memberikan sinyal selesai, Orchestrator harus mampu mengambil keputusan: apakah tugas tersebut diulang dengan subagent baru, atau apakah tugas tersebut dikerjakan langsung oleh Orchestrator. Cara mencegahnya: dalam setiap system prompt subagent, sertakan instruksi eksplisit: *"Apapun yang terjadi, kirimkan laporan ringkas kepada parent agent sebelum menghentikan sesi—bahkan jika tugas tidak selesai sempurna, sertakan apa yang sudah dikerjakan dan mengapa berhenti."*

**Anti-Pattern 4: Circular Dependency Loop**

Ini adalah anti-pattern yang paling jarang terjadi namun paling destruktif ketika terjadi. Orchestrator meluncurkan Subagent A dan mengatakan: *"Analisislah modul Auth dan tentukan interface yang perlu diubah, lalu tunggu konfirmasi dari saya sebelum memulai."* Subagent A, dalam usahanya menganalisis, menemukan bahwa ia butuh informasi dari modul Payment yang belum selesai. Ia pun mengirim pertanyaan balik ke Orchestrator. Orchestrator—yang tidak menyadari bahwa pertanyaan ini membutuhkan hasil dari Subagent B yang belum diluncurkan—kini menunggu Subagent A, sementara Subagent A menunggu Orchestrator, sementara informasi yang dibutuhkan ada di Subagent B yang tidak ada. **Deadlock sempurna.**

Solusinya bukan pada deteksi loop (yang sulit), melainkan pada pencegahan melalui **input/output contract yang didefinisikan sebelum peluncuran**. Sebelum meluncurkan setiap subagent, Orchestrator harus mampu menjawab tiga pertanyaan: (1) *Apa saja input yang dibutuhkan subagent ini untuk memulai—apakah semua input tersebut sudah tersedia?* (2) *Apa output yang akan dikembalikan subagent ini—dalam format apa, seberapa detail?* (3) *Apakah subagent ini memiliki ketergantungan pada hasil subagent lain yang mungkin belum selesai?* Jika jawaban untuk pertanyaan ketiga adalah "ya", maka subagent tersebut belum boleh diluncurkan.

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

### Kasus 2: Audit Keamanan Paralel pada Microservices Besar

Bayangkan tim keamanan di sebuah perusahaan fintech yang hendak meluncurkan produk baru dalam dua minggu. Mereka memiliki lima microservices utama—**Auth**, **Payment**, **Notification**, **Analytics**, dan **User**—yang masing-masing ditulis oleh tim berbeda selama enam bulan terakhir. Sebelum go-live, seluruh codebase harus diaudit untuk menemukan potensi SQL Injection, kerentanan autentikasi lemah, dan celah dari OWASP Top 10. Dengan metode konvensional—satu auditor keamanan memeriksa setiap service satu per satu—pekerjaan ini diestimasi memakan waktu dua minggu penuh.

Lalu seorang insinyur keamanan senior mengusulkan pendekatan berbeda: orkestrasi multi-agent dengan branched workspaces.

**Arsitektur Audit Paralel**

Sang Orchestrator—yang berperan sebagai *Security Lead*—mulai dengan membaca dokumen arsitektur sistem dan menyusun *audit brief* untuk masing-masing service: apa saja titik masuk data yang perlu diperiksa, framework apa yang digunakan, dan pola kerentanan spesifik apa yang paling relevan berdasarkan stack teknologinya. Dokumen ini menjadi *input contract* yang jelas untuk setiap subagent yang akan diluncurkan.

```text
              ┌─────────────────────────────────┐
              │       SECURITY ORCHESTRATOR     │
              │  • Membaca arsitektur sistem    │
              │  • Menyusun audit brief         │
              │  • Meluncurkan 5 subagents      │
              │  • Mengkonsolidasi Risk Matrix  │
              └────────────────┬────────────────┘
                               │
    ┌──────────┬───────────┬───┴───────┬───────────┐
    ▼          ▼           ▼           ▼           ▼
[Auth SA]  [Payment SA] [Notif SA] [Analytics SA] [User SA]
Read-Only  Read-Only   Read-Only   Read-Only    Read-Only
Semgrep    Semgrep     Semgrep     Semgrep      Semgrep
+ bandit   + bandit    + bandit    + bandit     + bandit
    │          │           │           │           │
    ▼          ▼           ▼           ▼           ▼
  Laporan    Laporan    Laporan     Laporan     Laporan
  Temuan     Temuan     Temuan      Temuan      Temuan
  Ringkas    Ringkas    Ringkas     Ringkas     Ringkas
    └──────────┴───────────┴───────────┴───────────┘
                               │
                               ▼
                      [ RISK MATRIX FINAL ]
                   Konsolidasi 5 laporan menjadi
                  satu dokumen prioritas remediasi
```

Orchestrator meluncurkan lima **Security Auditor Subagents** secara paralel, masing-masing ditempatkan di *branched workspace* yang terisolasi—sehingga tidak ada risiko satu subagent membaca hasil analisis subagent lain secara tidak sengaja, dan tidak ada kemungkinan alat keamanan dari satu service "bocor" ke konteks service lainnya.

**Yang Krusial: Setiap Subagent Hanya Read-Only**

Ini bukan sekadar pilihan teknis; ini adalah kebijakan keamanan. Subagent auditor tidak boleh memiliki kemampuan menulis ke codebase. Mereka menjalankan tool analisis statis—**Semgrep** untuk mendeteksi pola kerentanan SQL Injection, XSS, dan injeksi perintah, serta **bandit** untuk analisis keamanan kode Python—dan hanya membaca output hasilnya. Tidak ada modifikasi kode selama fase audit; modifikasi adalah tugas fase remediasi yang terpisah.

**Laporan Ringkas, Bukan Dump Mentah**

Setelah alat analisis selesai berjalan, setiap subagent tidak begitu saja meneruskan ribuan baris output Semgrep mentah ke Orchestrator. Sebaliknya, subagent merangkum temuannya ke dalam laporan terstruktur ringkas yang mencakup: jumlah total temuan per tingkat keparahan (*Critical, High, Medium, Low*), tiga temuan paling kritis dengan lokasi file dan nomor baris yang tepat, serta rekomendasi remediasi singkat. Laporan ini cukup untuk Orchestrator tanpa harus membebaninya dengan raw output ribuan baris.

**Konsolidasi: Dari 5 Laporan ke Satu Risk Matrix**

Setelah kelima subagent menyelesaikan auditnya dan mengirimkan laporan mereka, Orchestrator memiliki pekerjaan terakhir: konsolidasi. Ia membandingkan temuan lintas service, mengidentifikasi pola kerentanan yang muncul berulang di beberapa service (sinyal bahwa ada kelemahan sistemik dalam praktik penulisan kode tim), memprioritaskan urutan remediasi berdasarkan tingkat risiko bisnis, dan menghasilkan sebuah **Risk Matrix** tunggal yang siap dipresentasikan ke manajemen.

Hasilnya? Audit yang diestimasi memakan waktu dua minggu selesai dalam **empat jam**—bukan karena setiap langkah dikerjakan lebih cepat, melainkan karena kelima service diaudit **secara bersamaan**. Pola orkestrasi paralel ini tidak hanya menghemat waktu; ia juga menghilangkan risiko *audit fatigue* di mana seorang auditor manusia yang bekerja selama berhari-hari mulai melewatkan kerentanan halus karena kelelahan.

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

