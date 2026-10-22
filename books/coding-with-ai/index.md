# 📖 Coding with AI: Panduan Praktis Pemrograman, Pengujian, dan Kolaborasi bersama LLM

> 📚 **[Kembali ke Katalog Utama (CATALOG.md)](../../CATALOG.md)**  
> **Penulis**: Jeremy Morgan  
> **Tahun Terbit**: 2024 &nbsp;|&nbsp; **Penerbit**: Manning Publications  
> **Genre**: Rekayasa Perangkat Lunak, Kecerdasan Buatan & Produktivitas Developer  
> **Estimasi Waktu Baca Keseluruhan**: ~45–60 Menit (4 Modul Teardown Mendalam)  
> **Rating Rekomendasi**: ⭐⭐⭐⭐⭐ (4.9 / 5.0)  

---

<div align="center">
  <img src="cover.jpg" width="300" alt="Coding with AI Cover" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); margin-bottom: 12px;" />
</div>

---

## 🧭 Peta Eksplorasi Buku (Reading Roadmap)

Buku ini dibedah secara mendalam ke dalam 4 bagian tematik praktis untuk memandu developer bertransformasi dari pengetik kode manual (*syntax typist*) menjadi arsitek orkestrasi sistem (*AI-augmented software engineer*):

- [x] 📘 **[Part 1: Pergeseran Paradigma & Langkah Awal Pemrograman Bersama AI](01-paradigm-shift-and-first-steps.md)** — *Membongkar ilusi 'AI akan menggantikan programmer', pergeseran mental model dari menulis sintaks ke kurasi logika, anatomi cara kerja LLM memprediksi kode, dan mitigasi bahaya halusinasi dependensi.*
- [x] 📘 **[Part 2: Desain Arsitektur, Fase Discovery & Pembangunan Fondasi Aplikasi](02-design-discovery-and-scaffolding.md)** — *Fase perancangan sistem berbantuan AI, pembuatan boilerplate backend dan API, eksplorasi ekosistem alat (Copilot, Gemini Code Assist, Tabnine), serta strategi memecah masalah besar menjadi modul terisolasi.*
- [x] 📘 **[Part 3: Otomasi Pengujian & Pertahanan Kualitas Kode](03-effective-testing-and-code-quality.md)** — *Membangun Test-Driven Development (TDD) berbantuan AI, otomatisasi unit test dan integration test, merancang antarmuka UI interaktif, serta menangkap edge cases dan celah keamanan sebelum ke production.*
- [x] 📘 **[Part 4: Prompt Engineering Khusus Kode, Debugging & Seni "Vibe Coding"](04-code-prompting-debugging-and-vibe-coding.md)** — *Teknik prompt presisi tinggi untuk developer (Scaffolding, Few-Shot, Context Constraints), alur investigasi debugging mandiri, etika lisensi kode, dan menguasai era agen otonom ('Vibe Coding' dengan Cursor & Antigravity).*

---

## 🎯 1. Inti Filosofis & Tesis Utama

Kelahiran model bahasa besar (*Large Language Models / LLMs*) telah memicu polarisasi ekstrem di kalangan insinyur perangkat lunak: sebagian merasa terancam dan menolak AI karena takut kehilangan keahlian kriya (*craftsmanship*), sementara sebagian lainnya menggunakan AI secara serampangan—menyalin-tempel (*copy-paste*) kode mentah yang mereka sendiri tidak pahami.

**Jeremy Morgan**, seorang insinyur perangkat lunak dan edukator teknologi senior, hadir dengan tesis penengah yang sangat pragmatis:

> *"AI tidak datang untuk menggantikan Anda sebagai programmer; programmer yang menggunakan AI secara efektiflah yang akan menggantikan programmer yang menolak beradaptasi. Nilai tertinggi seorang insinyur perangkat lunak bukan lagi terletak pada kemampuan menghafal sintaksis pustaka atau mengetikkan kode baris demi baris, melainkan pada ketajaman merancang arsitektur, mendefinisikan batas masalah, dan memverifikasi kebenaran sistem."*

Buku ini mengajarkan bagaimana memperlakukan AI bukan sebagai "kotak ajaib yang tahu segalanya", melainkan sebagai **asisten magang berkemampuan super (*super-intern*)**: sangat cepat, memiliki wawasan luas tentang ratusan pustaka, tidak pernah lelah, namun rentan membuat asumsi ngawur dan butuh supervisi ketat dari seorang insinyur senior.

Kunci penguasaan *coding* di era modern adalah memindahkan energi kognitif kita dari hal-hal yang repetitif (menulis *boilerplate*, sintaksis *regex*, kueri SQL rutin, *mocking data* untuk tes) ke ranah esensial: **logika bisnis, keamanan data, performa arsitektur, dan pengalaman pengguna (*user experience*)**.

---

## 💡 2. Peta Konsep & Kerangka Berpikir Utama (Core Frameworks)

```text
               EVOLUSI PERAN SEORANG SOFTWARE ENGINEER
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
  ERA TRADISIONAL (Manual)                ERA AI-AUGMENTED
  • Menghafal sintaksis bahasa            • Merancang arsitektur & konteks
  • 60% waktu: Menulis boilerplate & bug  • 10% waktu: Scaffolding cepat via AI
  • Mencari snippet di StackOverflow      • 50% waktu: Verifikasi & code review
  • Pengujian manual yang melelahkan      • 40% waktu: Desain sistem & edge cases
       │                                       │
       ▼                                       ▼
  PENGETIK SINTAKS (Typist)               ARSITEK ORKESTRASI (Director)
```

- **Pilar 1: Context Isolation Framework**: AI tidak bisa membaca pikiran Anda atau memahami repositori jutaan baris sekaligus tanpa panduan. Berikan konteks yang terisolasi dan spesifik—satu fungsi, satu antarmuka, satu tanggung jawab (*single responsibility*).
- **Pilar 2: Automated Verification Loop**: Jangan pernah memercayai kode AI hanya karena tampak rapi. Pasangkan setiap generasi kode AI dengan suite pengujian otomatis (*unit tests*) dan linter. Biarkan tes yang memvalidasi kebenaran logika.
- **Pilar 3: The 3-Step Code Prompting Formula**: Setiap prompt kode yang efektif harus memiliki 3 elemen wajib: **Peran/Konteks Arsitektur** + **Batasan & Dependensi Spesifik** + **Kriteria Keberhasilan & Format Output**.

---

## ⚡ 3. Playbook Praktis: Rencana Implementasi

Langkah taktis bagi developer untuk mengintegrasikan AI ke alur kerja harian:

### Fase 1: Hari Ini (Quick Wins & Rutinitas Harian)
- [ ] **Delegasikan Tugas Repetitif**: Gunakan asisten AI (seperti Gemini, Copilot, atau ChatGPT) untuk menulis *boilerplate* data model, skrip migrasi database, dan ekspresi reguler (*regex*).
- [ ] **Pembuatan Mock Data Otomatis**: Alih-alih membuat data pengujian manual satu per satu, minta AI membuatkan 50 variasi data JSON realistis lengkap dengan kasus ekstrem (*edge cases*).
- [ ] **Dokumentasi & Penjelasan Kode Warisan**: Salin fungsi lama yang rumit tanpa dokumentasi, minta AI menguraikan alur logikanya langkah demi langkah dan menambahkan *docstring* standar.

### Fase 2: 30 Hari Pertama (Mengubah Alur Kerja Proyek)
- [ ] **Terapkan AI-Assisted TDD (Test-Driven Development)**: Sebelum meminta AI menulis fungsi implementasi, minta AI menuliskan *unit test suite* berdasarkan spesifikasi fungsional Anda terlebih dahulu. Jalankan tes tersebut hingga merah (*failing test*), lalu minta AI menulis kode agar tes berubah menjadi hijau.
- [ ] **Baku-kan File Konteks Proyek**: Buat file panduan aturan instruksi (seperti `AGENTS.md` atau panduan arsitektur internal) di repositori Anda agar setiap AI memahami konvensi penamaan, pustaka resmi yang diizinkan, dan larangan teknis tim Anda.
- [ ] **Audit Keamanan Dependensi**: Jangan terima rekomendasi pustaka eksternal secara membabi buta. Selalu cek apakah paket yang disarankan AI benar-benar ada di *registry* resmi (PyPI, npm) atau merupakan paket halusinasi (*package hallucination / typo-squatting*).

### Fase 3: Jangka Panjang (Menjadi Arsitek Sistem)
- [ ] **Alur Kerja Agen Otonom (*Agentic Coding*)**: Gunakan lingkungan kerja seperti Antigravity atau Cursor di mana AI tidak hanya menyarankan teks kode, melainkan mampu membaca struktur direktori, mengeksekusi perintah terminal, menjalankan *linter*, dan memperbaiki *error* secara mandiri.
- [ ] **Penyempurnaan Arsitektur Tingkat Tinggi**: Fokuskan 80% jam kerja Anda pada pemodelan domain (*Domain-Driven Design*), mitigasi kemacetan skalabilitas (*bottleneck*), dan keamanan siber.

---

## ⚖️ 4. Evaluasi Kritis & Ulasan Objektif

- **Kekuatan Terbesar**: Buku ini sangat membumi (*grounded*) dan langsung dapat dipraktikkan. Jeremy Morgan tidak menjual janji muluk fiksi ilmiah; ia menyajikan contoh kode nyata (menggunakan Python dan perkakas web modern) serta menunjukkan secara jujur di mana AI sering melakukan kesalahan bodoh dan bagaimana cara menjinakkan kesalahan tersebut.
- **Kritik & Titik Buta (Blind Spots)**:
  - *Siklus Alat yang Cepat*: Beberapa tangkapan layar UI alat spesifik yang dibahas (seperti Tabnine atau versi antarmuka Blackbox AI) bisa berubah dengan cepat seiring waktu. Pembaca perlu fokus pada prinsip alur kerja di balik alat tersebut, bukan tata letak tombolnya.
  - *Fokus Dominan pada Proyek Skala Menengah*: Buku ini sangat unggul untuk proyek baru (*greenfield*) dan aplikasi skala menengah. Untuk sistem terdistribusi monolitik raksasa berumur 15 tahun (*legacy enterprise*), integrasi AI membutuhkan teknik *context retrieval* (RAG) yang lebih canggih daripada sekadar prompt IDE standar.
- **Profil Pembaca Ideal**: Software engineer pemula hingga senior, developer Python/JavaScript, tech lead tim produk, dan siapa saja yang ingin melipatgandakan kecepatan pengiriman perangkat lunak (*shipping speed*) tanpa mengorbankan kualitas arsitektur.

---

> ➡️ **Mulai membaca bab pertama**: **[Part 1: Pergeseran Paradigma & Langkah Awal Pemrograman Bersama AI](01-paradigm-shift-and-first-steps.md)**
