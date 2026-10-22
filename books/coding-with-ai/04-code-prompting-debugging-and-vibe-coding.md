# Part 4: Prompt Engineering Khusus Kode, Debugging & Seni "Vibe Coding"

> 📖 Hub Buku: **[Coding with AI](index.md)**

---

## 📖 Narasi Pembuka: Dari 'StackOverflow Copy-Paste' Menuju 'Vibe Coding'

Pada awal tahun 2025, seorang ilmuwan AI terkemuka dan mantan direktur AI di Tesla, **Andrej Karpathy**, melontarkan sebuah cuitan viral yang memicu perdebatan sengit di seluruh komunitas teknologi global. Ia menuliskan istilah baru yang segera menjadi tren: **"Vibe Coding"**.

Karpathy menggambarkan bagaimana gaya pemrogramannya telah bertransformasi total:
> *"Saya hampir tidak lagi mengetik kode secara manual. Saya hanya berbicara dengan editor kode saya dalam bahasa Inggris, mendiktekan apa yang ingin saya bangun, mengamati agen AI membaca berkas dan menjalankan terminal, melihat hasilnya di peramban, lalu mengoreksi getaran atau arah logikanya (*the vibe*). Saya membiarkan AI menulis ribuan baris kode di latar belakang sementara saya hanya menjaga arah kemudi."*

Bagi sebagian programmer senior, istilah ini terdengar seperti penghujatan terhadap seni kriya rekayasa perangkat lunak. Mereka membayangkan ratusan developer pemula membangun aplikasi rapuh tanpa memahami satu pun baris kode di baliknya.

Namun, dalam bab pamungkas bukunya, **Jeremy Morgan** membedah realitas sebenarnya di balik fenomena ini:

"Vibe Coding" bukanlah tentang menjadi ceroboh atau malas berpikir. Sebaliknya, **"Vibe Coding" yang sukses menuntut keterampilan tingkat tinggi yang sama sekali baru: Prompt Engineering Presisi Tinggi, Penguasaan Lingkungan Kerja Berbasis Agen (*Agentic Workspaces*), dan Seni Debugging Investigatif**.

Jika Anda tidak memahami cara menyusun instruksi yang presisi, "vibe" yang Anda hasilkan bukan aplikasi hebat, melainkan tumpukan utang teknis (*technical debt*) yang akan meledak dalam hitungan pekan.

---

## 🔬 Teardown Konsep & Wawasan Utama

### 1. Anatomi Formula Prompt Khusus Rekayasa Perangkat Lunak
Prompt untuk menulis kode sangat berbeda dengan prompt untuk menulis esai sastra atau puisi. Kode menuntut kepatuhan mutlak pada tipe data, struktur repositori yang ada, dan konvensi penamaan yang konsisten.

Morgan merumuskan **Formula 4 Komponen Prompt Kode Presisi Tinggi**:

```text
               FORMULA 4 PILAR PROMPT KODE BERMUTU TINGGI
               
  1. PERAN & ARSITEKTUR (Role)
     -> "Bertindaklah sebagai Senior Python Backend Engineer yang mengutamakan 
        keamanan data dan kepatuhan clean architecture."
  ─────────────────────────────────────────────────────────────────────────────
  2. KONTEKS & POTONGAN KODE EKSISTING (Context & Scaffolding)
     -> "Berikut adalah skema Pydantic dan model SQLAlchemy yang sudah ada di proyek 
        kami: [lampirkan 20 baris kode model terkait]."
  ─────────────────────────────────────────────────────────────────────────────
  3. BATASAN KETAT (Constraints & Guardrails)
     -> "Aturan: DILARANG menggunakan pustaka pihak ketiga di luar standard library 
        dan SQLAlchemy 2.0. Wajib sertakan type hints lengkap. Tangani kasus division 
        by zero dan input None secara eksplisit."
  ─────────────────────────────────────────────────────────────────────────────
  4. FORMAT OUTPUT (Output Contract)
     -> "Tampilkan HANYA kode fungsi dan unit test-nya dalam format markdown python. 
        Jangan sertakan penjelasan pembuka yang bertele-tele."
```

#### Teknik "Few-Shot Prompting" untuk Menjaga Konsistensi Gaya Proyek
Jika Anda ingin AI menulis fungsi baru dengan gaya yang 100% cocok dengan kode tim Anda, jangan hanya mendeskripsikan aturannya. Berikan **satu contoh nyata (*few-shot example*)** dari basis kode Anda:

> *"Berikut adalah contoh bagaimana tim kami menulis fungsi penanganan error di file `user_service.py`:  
> `[lampirkan 1 fungsi contoh]`  
> Sekarang, tuliskan fungsi baru `process_refund_request()` dengan mengikuti konvensi penamaan variabel, penanganan exception, dan struktur log yang persis sama dengan contoh di atas."*

Dengan teknik ini, kode yang dihasilkan AI akan berbaur secara alami ke dalam repositori Anda tanpa terlihat seperti kode asing yang ditempelkan sembarangan.

---

### 2. Alur Investigasi Debugging: 'Rubber-Duck Debugging' Bertenaga Super
Dahulu, para programmer memiliki tradisi unik bernama *Rubber Duck Debugging*: meletakkan bebek karet kuning di atas meja kerja dan menjelaskan baris kode yang rusak kepada si bebek secara lisan. Sering kali, saat merumuskan masalah dengan kata-kata sendiri, sang programmer menyadari di mana letak kesalahannya.

AI adalah bebek karet yang tidak hanya mendengarkan, tetapi juga bisa menjawab, menganalisis *stack trace*, dan mensimulasikan eksekusi memori di kepalanya.

```text
                  ALUR DEBUGGING INVESTIGATIF BERSAMA AI
                  
  Langkah 1: KUMPULKAN BUKTI PENUH
  Salin: (1) Pesan error lengkap / Stack Trace, (2) Baris kode yang dicurigai, 
  (3) Payload input data yang memicu error.
            │
            ▼
  Langkah 2: BERIKAN HIPOTESIS AWAL ANDA
  "Aplikasi crash dengan 'KeyError: transaction_id' saat menerima webhook Stripe. 
  Saya menduga ini karena webhook format baru mengirimkan ID di dalam objek 'data.object'."
            │
            ▼
  Langkah 3: MINTA AI MENGUJI HIPOTESIS & USULKAN SOLUSI DEFENSIVE
  AI mengonfirmasi perubahan skema Stripe, menunjukkan baris kode yang rentan, 
  dan menambahkan teknik parsing defensif (`.get('transaction_id')`).
```

**Peringatan Morgan**: Jangan pernah hanya mengetik: *"Kodenya error, tolong perbaiki."* AI tidak memiliki bola kristal untuk melihat terminal lokal Anda. Semakin lengkap log kesalahan dan variabel input yang Anda sertakan, semakin akurat solusi yang diberikan.

---

### 3. Menguasai Lingkungan Kerja Berbasis Agen (*Agentic Workspaces*)
Perbedaan terbesar antara era ChatGPT awal (2022) dan era modern (seperti **Google Antigravity** atau Cursor) adalah pergeseran dari sekadar jendela percakapan (*chat window*) menuju **Agen Otonom Terintegrasi**:

```text
     CHATBOT TRADISIONAL (2022)              AGEN OTONOM LOKAL (Modern)
  ─────────────────────────────────        ─────────────────────────────────────────
  • Salin kode dari IDE                    • Membaca seluruh repositori secara lokal
  • Tempel ke peramban web                 • Mengedit berkas langsung di tempat
  • Salin balasan AI kembali ke IDE        • Menjalankan terminal & test runner sendiri
  • Perbaiki error kompilasi manual        • Memperbaiki bug otomatis jika tes gagal
  • Terputus dari konteks file lain        • Memahami relasi dependensi multi-file
```

#### Aturan Mengoptimalkan Agen Otonom (Seperti Antigravity):
1. **Gunakan File Konstitusi Proyek (`AGENTS.md`)**:
   Tuliskan aturan wajib yang tidak boleh dilanggar agen: perintah linter yang wajib lolos, larangan menggunakan path absolut, dan struktur direktori resmi. Agen akan membaca file ini sebelum mengeksekusi tindakan apa pun.
2. **Kendalikan Cakupan Eksekusi (*Blast Radius*)**:
   Jangan perintahkan: *"Tolong rapikan seluruh kode di folder src/."* Batasi agen pada satu fitur atau satu direktori spesifik agar perubahan kode tetap mudah ditinjau (*reviewable*).
3. **Manfaatkan Siklus Umpan Balik Terminal (*The Agentic Feedback Loop*)**:
   Biarkan agen menjalankan perintah uji otomatisnya sendiri:
   > *"Buat perubahan pada fungsi `calculate_tax()`, lalu jalankan `pytest tests/test_tax.py` di terminal. Jika ada tes yang gagal, analisis kegagalannya dan perbaiki kodenya secara mandiri hingga seluruh tes hijau."*

---

### 4. Etika, Hak Cipta & Keberlanjutan Kode (*Code Sustainability*)
Di bab penutup, Morgan mengingatkan dua tanggung jawab etis dan teknis bagi setiap insinyur perangkat lunak:

* **Lisensi Kode Terbuka & Kekayaan Intelektual**:
  Model AI dilatih pada miliaran baris kode repositori terbuka dengan berbagai lisensi (MIT, Apache 2.0, hingga GPL yang ketat). Selalu pastikan kode yang dihasilkan AI untuk perusahaan komersial tidak secara langsung menyalin blok algoritma berpemilik yang melanggar lisensi (*license contamination*).
* **Mencegah Akumulasi Utang Teknis (*Technical Debt*)**:
  Kode yang ditulis dalam 5 detik oleh AI akan dibaca dan dirawat oleh manusia selama 5 tahun ke depan. Jika tidak ada seorang pun di tim Anda yang memahami arsitektur kode tersebut, tim Anda berada dalam bahaya besar saat sistem mengalami kegagalan di tengah malam.

> **Hukum Akuntabilitas Morgan**:  
> *"AI mungkin yang mengetikkan kodenya, tetapi nama Andalah yang tertera di pesan git commit. Di mata tim dan pengguna Anda, Andalah pemilik sah dari kode tersebut."*

---

## 🧠 Eksperimen Pikiran & Kasus Nyata

### Kasus: Menghindari Halusinasi 'Ghost Bug' Melalui Log Eksekusi
Seorang developer backend sedang frustrasi karena fungsi enkripsi kata sandinya gagal memverifikasi login pengguna. Ia bertanya kepada AI: *"Kenapa fungsi bcrypt saya selalu mengembalikan False?"*

AI memberikan 5 spekulasi umum: mungkin versi bcrypt usang, mungkin encoding UTF-8 salah, mungkin panjang string melebihi 72 karakter. Developer mencoba kelima saran tersebut satu per satu selama 2 jam tanpa hasil.

**Pendekatan Taktis**:
Developer berhenti berspekulasi. Ia menambahkan baris pencatatan log (*debug print/logger*):
```python
print(f"DEBUG: Password Input Type: {type(password)}, Hash DB Type: {type(db_hash)}")
# Output: DEBUG: Password Input Type: <class 'bytes'>, Hash DB Type: <class 'str'>
```

Ketika nilai riil dan tipe data ini diserahkan ke AI:
> *"Lihat log ini: password bertipe bytes sedangkan hash di database bertipe string. Tunjukkan bagaimana cara melakukan encoding yang konsisten."*

Dalam 10 detik masalah terselesaikan: fungsi hanya butuh pemanggilan `.decode('utf-8')` sederhana pada nilai hash sebelum verifikasi. Pelajarannya: **AI membutuhkan fakta empiris dari lingkungan runtime Anda, bukan tebakan abstrak.**

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

1. [ ] **Bangun Pustaka Template Prompt Pribadi**: Simpan 3 template prompt terbaik Anda untuk (1) Refactoring fungsi, (2) Pembuatan unit test lengkap, dan (3) Investigasi pesan error.
2. [ ] **Sertakan Cuplikan Konteks Proyek**: Setiap kali meminta AI menulis fungsi baru, sertakan 10–20 baris kode contoh dari proyek Anda agar gaya penulisan konsisten.
3. [ ] **Terapkan Investigasi Log Sebelum Bertanya**: Sebelum menyodorkan bug ke AI, kumpulkan pesan error utuh, nomor baris kejadian, dan sampel data input yang memicunya.
4. [ ] **Miliki Kepemilikan Penuh Atas Commit Anda**: Luangkan waktu 2 menit untuk melakukan *self-review* diff kode di git sebelum Anda membuat commit. Jika ada baris yang membingungkan Anda, tanyakan pada AI maksudnya sekarang sebelum kode masuk ke repositori utama.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Era baru rekayasa perangkat lunak tidak menuntut Anda mengetik lebih cepat; era ini menuntut Anda berpikir lebih jernih. Programmer terhebat masa depan adalah konduktor orkestra yang mampu menyelaraskan instrumen AI dengan visi arsitektur yang kokoh."*  
> — **Jeremy Morgan**

> *"Jangan biarkan kemudahan AI membuat Anda lupa cara berpikir kritis. Nilai Anda bukan pada baris kode yang Anda hasilkan hari ini, melainkan pada keandalan sistem yang Anda bangun untuk masa depan."*  
> — **Jeremy Morgan**

**Pertanyaan Refleksi Diri**:
- *Apakah Anda sudah memiliki file pedoman aturan (seperti AGENTS.md) di proyek Anda untuk memandu AI bekerja sesuai standar tim?*
- *Jika suatu saat seluruh alat AI mati selama 24 jam, apakah Anda masih memiliki pemahaman fondasi yang cukup untuk memelihara dan memperbaiki sistem yang Anda bangun saat ini?*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 3: Otomasi Pengujian & Pertahanan Kualitas](03-effective-testing-and-code-quality.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku (index.md)](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📚 **[Kembali ke Katalog Utama (CATALOG.md)](../../CATALOG.md)**
