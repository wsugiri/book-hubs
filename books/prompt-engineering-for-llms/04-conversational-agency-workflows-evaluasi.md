# Part 4: Agen Percakapan, Tool Calling, Workflows & Evaluasi Produksi

> 📖 Hub Buku: **[Prompt Engineering for LLMs](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Dalam fase eksperimen laboratorium, membuat demo AI yang tampak memukau adalah perkara mudah. Anda dapat menulis prompt sepuluh baris, memasukkan satu pertanyaan cerdas, dan mendapatkan jawaban yang membuat seluruh tim eksekutif berdecak kagum. Namun, ketika demo tersebut diubah menjadi produk nyata yang diakses oleh ribuan pengguna secara bersamaan, ilusi itu sering kali runtuh seketika.

Tiba-tiba tim insinyur dihadapkan pada realitas brutal: pengguna mengajukan pertanyaan multi-langkah yang rumit, membutuhkan data langsung dari basis data SQL internal, meminta tindakan mutasi nyata (seperti mengirim email atau memesan tiket penerbangan), dan komplain ketika jawaban bot di hari Selasa berbeda 180 derajat dengan jawaban di hari Senin.

Pada titik inilah praktik *Prompt Engineering* beralih dari sekadar keterampilan menulis teks menjadi **Arsitektur Sistem Terdistribusi (*Distributed Systems Architecture*)**. 

**John Berryman** dan **Albert Ziegler** mendedikasikan bagian penutup buku ini untuk menjawab pertanyaan terbesar dalam rekayasa AI modern: *Bagaimana cara mentransformasikan LLM dari asisten teks pasif tanpa memori menjadi agen otonom yang dapat berpikir, mengambil tindakan nyata di dunia nyata (*Tool Calling*), serta bagaimana cara mengukur kualitas dan keamanannya secara objektif tanpa terjebak dalam perangkap 'pengujian berbasis perasaan' (vibe-based testing)?*

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

### 1. Pola Penalaran: Dari Chain-of-Thought (CoT) ke Pola ReAct
- **Keterbatasan Generasi Langsung**:
  Jika Anda meminta model menjawab teka-teki logika yang rumit secara langsung dalam satu tarikan napas, model dipaksa menebak token pertama tanpa memiliki ruang komputasi untuk "berpikir".
- **Chain-of-Thought (CoT)**:
  Dengan menambahkan instruksi sederhana seperti *"Pikirkan langkah demi langkah sebelum memberikan jawaban akhir"*, kita sebenarnya sedang memperpanjang urutan token autoregresif. Setiap token langkah perantara yang ditulis model di awal berfungsi sebagai memori kerja (*working scratchpad*) yang memandu model menuju kesimpulan yang benar secara matematis.
- **Pola ReAct (Reasoning + Acting)**:
  Dikembangkan untuk menghubungkan pemikiran internal dengan tindakan eksternal:
  
  ```text
  ┌─────────────────────────────────────────────────────────────┐
  │ 1. THOUGHT (Penalaran): "Pengguna menanyakan cuaca Jakarta. │
  │    Saya tidak memiliki sensor cuaca lokal, saya butuh API." │
  ├─────────────────────────────────────────────────────────────┤
  │ 2. ACTION (Tindakan): call_tool("get_weather", loc="Jakarta")│
  ├─────────────────────────────────────────────────────────────┤
  │ 3. OBSERVATION (Hasil Eksternal): {"temp": 32, "rain": 80%} │
  ├─────────────────────────────────────────────────────────────┤
  │ 4. THOUGHT: "Data cuaca sudah ada. Sekarang jawab pengguna."│
  ├─────────────────────────────────────────────────────────────┤
  │ 5. FINAL ANSWER: "Cuaca di Jakarta saat ini 32°C dan hujan."│
  └─────────────────────────────────────────────────────────────┘
  ```

---

### 2. Mekanisme Tool Calling / Function Calling Tingkat Produksi
- **Bukan Eksekusi Otomatis oleh LLM**:
  Salah kaprah yang umum terjadi adalah mengira LLM mengeksekusi kode Python atau API secara mandiri di server Anda. Faktanya:
  1. Anda mengirimkan daftar spesifikasi fungsi (*tool schema*) dalam format JSON Schema bersama prompt.
  2. Model membaca skema tersebut dan, alih-alih menghasilkan teks biasa, model mengeluarkan payload JSON terstruktur berisi nama fungsi dan argumen yang ingin ia panggil.
  3. **Backend Anda** mengeksekusi fungsi tersebut secara aman di lingkungan terisolasi (*sandbox*).
  4. Backend mengirimkan kembali hasilnya ke jendela konteks model untuk diinterpretasikan menjadi jawaban manusiawi.
- **Prinsip Hak Akses Terbatas (*Least Privilege*)**:
  Penulis memperingatkan dengan keras: jangan pernah mengekspos fungsi berbahaya seperti `execute_raw_sql()` atau `delete_user_account()` langsung ke agen LLM. Buat fungsi antarmuka spesifik dengan parameter yang sangat ketat (misalnya `cancel_booking(booking_id: str)`).

---

### 3. Orkestrasi Alur Kerja: Kapan Menggunakan Pipeline vs Agen Otonom
Penulis menyajikan panduan arsitektural yang sangat berharga untuk memilih kompleksitas sistem:

```text
                  SPEKTRUM ARSITEKTUR WORKFLOW LLM
                                 │
     ┌───────────────────────────┴───────────────────────────┐
     ▼                                                       ▼
[DETERMINISTIC PIPELINE / CHAIN]               [AUTONOMOUS AGENT / REACT]
• Alur langkah telah diprogram pasti          • Model menentukan langkah berikutnya
• Contoh: Router -> Search -> Summarize       • Contoh: Investigasi bug kompleks
• Keunggulan: Cepat, murah, prediktif         • Keunggulan: Sangat fleksibel
• Kekurangan: Kaku terhadap kejutan           • Kekurangan: Mahal, rawan loop sesat
```

- **Rekomendasi Penulis**:
  90% kebutuhan bisnis sebenarnya tidak membutuhkan agen otonom liar yang berjalan sendiri tanpa batas. Kebutuhan bisnis paling baik diselesaikan menggunakan **Deterministic Chains with LLM Nodes** (alur kerja di mana kode Python mengontrol alur percabangan, sementara LLM hanya digunakan sebagai unit pemroses di simpul-simpul tertentu). Gunakan agen otonom hanya untuk kasus eksplorasi yang benar-benar tidak terduga.

---

### 4. Krisis Evaluasi: Menghindari Perangkap "Vibes-Based Testing"
- **Bahaya Evaluasi Manual Ad-Hoc**:
  Ketika seorang insinyur mengubah System Prompt, mereka biasanya hanya menguji 3 kueri favorit mereka di konsol playground, merasa hasilnya bagus (*"looks good to me / vibe check passed"*), lalu langsung menggabungkan kode (*merge to main*). 
  Akibatnya fatal: perubahan prompt yang memperbaiki 1 kueri tersebut sering kali merusak 20 skenario kueri lainnya tanpa disadari (*prompt regression*).
- **Kerangka Evaluasi Kelas Industri**:
  1. **Golden Dataset (Kumpulan Data Emas)**: Koleksi 100 hingga 1.000 kasus uji nyata yang mencakup skenario umum, pertanyaan jebakan, kasus batas (*edge cases*), dan upaya injeksi jahat.
  2. **Metrik Deterministik Keras**: Memeriksa validitas sintaks JSON, waktu respons latensi, kecocokan kata kunci mutlak (*regex assert*), dan kehadiran field wajib.
  3. **LLM-as-a-Judge (Model sebagai Juri Otomatis)**: Menggunakan model pondasi yang lebih kuat (misalnya GPT-4o atau Gemini 1.5 Pro) untuk menilai kualitas jawaban model aplikasi Anda berdasarkan rubrik skor terstandar (misalnya skala 1–5 untuk akurasi faktual, kesopanan nada, dan kepatuhan format).

- **Mitigasi Bias pada LLM-as-a-Judge**:
  - **Verbosity Bias**: Model penilai cenderung memberi skor lebih tinggi pada jawaban yang lebih panjang meskipun bertele-tele. Solusinya: masukkan aturan eksplisit bahwa keringkasan adalah kriteria penilaian utama.
  - **Position Bias**: Dalam perbandingan dua model (A vs B), model juri cenderung menyukai opsi yang diletakkan di urutan pertama. Solusinya: lakukan pengujian ganda dengan membalik posisi opsi A dan B (*swap positions*).

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Kasus: Membangun CI/CD Evaluasi Otomatis untuk Rilis Prompt
- **Skenario**: Tim perbankan ingin memperbarui instruksi agen customer service untuk menyambut peluncuran produk kartu kredit baru.
- **Implementasi Pipeline Penulis**:
  Setiap *Pull Request* yang mengubah berkas prompt secara otomatis memicu tes integrasi di GitHub Actions:
  ```yaml
  name: Evaluate LLM Prompt Regression
  on: [pull_request]
  jobs:
    eval:
      runs-on: ubuntu-latest
      steps:
        - name: Run Synthetic Test Suite
          run: python -m eval_suite --dataset golden_500.json --threshold 0.92
  ```
- **Kriteria Kelulusan**:
  Jika skor akurasi rata-rata turun dari 94% menjadi 91%, atau jika ada 1 kasus kebocoran data rahasia pada kumpulan uji keamanan, build otomatis langsung **FAILED** dan merge dilarang. Prompt diperlakukan dengan disiplin pengujian perangkat lunak yang sama persis seperti kode Java atau TypeScript.

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

1. [ ] **Hentikan 'Vibes-Based Testing'**: Mulai hari ini, dokumentasikan minimal 30 pertanyaan tersulit dari pengguna nyata ke dalam berkas `golden_dataset.json` lengkap dengan kriteria jawaban yang benar.
2. [ ] **Pisahkan Jalur Berpikir (*Scratchpad*)**: Berikan ruang bagi model untuk menuliskan analisis internal di dalam tag `<thinking>...</thinking>` sebelum menghasilkan jawaban akhir di dalam tag `<answer>...</answer>`.
3. [ ] **Bungkus Tool dengan Validasi Skema**: Pastikan setiap fungsi yang dipanggil via Function Calling memvalidasi argumen menggunakan pustaka tipe data ketat (seperti Zod di TypeScript atau Pydantic di Python).
4. [ ] **Lakukan Uji Balik Posisi (Swap Test)**: Jika Anda menggunakan LLM untuk menilai respons AI lain, selalu balik urutan teks uji untuk memastikan skor bukan ilusi dari bias urutan tampilan.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Di masa depan, perbedaan antara pengembang perangkat lunak amatir dan insinyur AI profesional tidak ditentukan oleh siapa yang bisa merangkai kata paling indah, melainkan oleh siapa yang memiliki kerangka evaluasi paling disiplin dan pipeline pengujian paling tahan banting."*  
> — **John Berryman & Albert Ziegler**

**Pertanyaan Refleksi Diri**:
- *Jika Anda mengubah satu kalimat dalam System Prompt aplikasi Anda malam ini, apakah Anda memiliki cara otomatis untuk membuktikan bahwa perubahan tersebut tidak merusak 50 fitur lainnya besok pagi?*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Part Sebelumnya: Part 3 - Menjinakkan Model & Perlindungan Determinisme](03-menjinakkan-model-dan-mitigasi-kegagalan.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku (index.md)](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📚 **[Kembali ke Katalog Utama (CATALOG.md)](../../CATALOG.md)**
