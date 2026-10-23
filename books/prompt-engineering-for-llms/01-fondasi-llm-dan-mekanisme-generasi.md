# Part 1: Fondasi LLM & Mekanisme Generasi Teks Autoregresif

> 📖 Hub Buku: **[Prompt Engineering for LLMs](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Bayangkan Anda sedang duduk di depan sebuah mesin tik kuno. Di belakang tirai tebal, duduk seorang penyalin naskah yang sangat terampil namun aneh. Dia telah membaca hampir setiap buku, artikel koran, postingan forum, dan baris kode yang pernah ditulis manusia di internet. Namun, penyalin ini tidak memiliki indera penglihatan terhadap dunia nyata, tidak memiliki kehendak bebas, dan sama sekali tidak peduli apakah apa yang dikatakannya benar atau dusta.

Tugasnya hanya satu: setiap kali Anda mengetikkan serangkaian kata di atas kertas, dia akan melihat huruf-huruf terakhir yang Anda ketik, lalu menghitung secara matematis: *dari miliaran kemungkinan kata di alam semesta, kata manakah yang secara statistik paling lazim muncul berikutnya untuk menyambung teks ini?*

Inilah analogi pembuka yang diajukan oleh **John Berryman** dan **Albert Ziegler** untuk meruntuhkan mitos terbesar tentang kecerdasan buatan. Sejak ChatGPT mengguncang dunia, jutaan orang membayangkan LLM (*Large Language Models*) sebagai makhluk berpikir serba tahu—sebuah entitas cerdas yang "memahami" pertanyaan Anda dan dengan bijak merumuskan jawabannya. 

Namun, dari kacamata seorang insinyur sistem, asumsi antropomorfik tersebut adalah ilusi yang sangat berbahaya. Ketika seorang insinyur meyakini bahwa AI "memahami" logika bisnis atau memiliki "niat baik", mereka akan mulai menulis prompt yang ambigu, ceroboh, dan penuh harapan palsu. 

Buku ini menegaskan: **LLM bukanlah mesin penjawab pertanyaan (*question-answering engine*), melainkan mesin pelengkap dokumen (*document completer*)**. Memahami perbedaan mendasar ini adalah lompatan kuantum pertama yang membedakan pengguna biasa dengan seorang insinyur prompt kelas dunia.

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

### 1. Model Mental Dasar: Dari "Tanya Jawab" Menjadi "Naskah Drama"
- **Esensi Gagasan**: 
  Ketika Anda mengirim prompt ke LLM, Anda sebenarnya tidak sedang mengajukan pertanyaan kepada seseorang di ruang seberang. Anda sedang menuliskan halaman pertama dari sebuah naskah cerita dan membiarkan model melanjutkan dialognya. Jika Anda menulis prompt dengan nada malas dan informal:
  ```text
  buatkan fungsi python untuk parsing log server
  ```
  Model membaca ini sebagai naskah dari forum internet kasual (seperti Reddit atau Stack Overflow junior). Maka, kelanjutan dokumen yang paling probabilistik adalah kode cepat, tanpa penanganan error (*try-catch*), dan tanpa pengujian unit.
  Sebaliknya, jika Anda menyusun prompt sebagai dokumentasi teknis formal:
  ```text
  # MODULE: Production Server Log Parser
  # ARCHITECTURE: High-throughput async Python 3.11 with robust exception handling and Type Hinting
  # STANDARD: PEP 8, zero external dependencies, 100% unit test coverage
  ```
  Model secara otomatis mengunci ruang probabilitas (*sub-manifold*) dari kode produksi senior, menghasilkan arsitektur yang jauh lebih kokoh.
- **Mengapa Ini Berlawanan dengan Intuisi Umum (Counter-intuitive)**: 
  Orang awam berasumsi bahwa semakin sopan mereka meminta ("*Tolong bantu saya ya AI yang pintar...*"), semakin baik hasilnya. Faktanya, kata-kata basa-basi ini justru mengotori jendela konteks dan menggeser probabilitas ke percakapan sosial santai, bukan ke repositori kode kelas enterprise.
- **Studi Kasus Penulis di GitHub Copilot**:
  Albert Ziegler membagikan bagaimana tim awal Copilot menyadari bahwa menambahkan komentar header file berstandar open-source ternama (seperti header Apache 2.0 atau format docstring Google) di awal prompt secara drastis meningkatkan kebersihan sintaksis kode yang digenerasi oleh model, tanpa perlu mengubah satu baris pun kode model dasar (*foundation model*).

---

### 2. Anatomi Tokenisasi: Mengapa LLM Gagal pada Angka dan Ejaan
- **Esensi Gagasan**: 
  Komputer tidak membaca teks dalam bentuk alfabet atau karakter individual, melainkan **Token** (potongan kata, suku kata, atau karakter khusus yang dipetakan ke dalam angka integer). Sebuah model dengan kamus token (misalnya 100.000 token) melihat kata `"prompting"` mungkin sebagai satu token tunggal `[34812]`, sedangkan kata yang jarang muncul dipotong menjadi beberapa sub-token.
- **Dampak Kritis pada Pemrograman & Matematika**:
  - **Masalah Ejaan Huruf**: Mengapa ChatGPT sering gagal ketika ditanya *"Berapa banyak huruf 'r' dalam kata 'strawberry'?"* Karena model tidak pernah melihat huruf 's-t-r-a-w-b-e-r-r-y'. Model hanya melihat token integer `[strawberry]`. Menghitung karakter di dalam sebuah token adalah tugas yang tidak alami bagi model autoregresif.
  - **Representasi Angka**: Angka multi-digit sering kali dipotong secara sembarangan oleh tokenizer (misalnya angka `12345` bisa dipecah menjadi `12` dan `345`). Inilah sebabnya perhitungan matematika mentah di dalam LLM sering meleset beberapa digit jika tidak dipandu oleh kalkulator eksternal atau langkah bertahap (*Chain-of-Thought*).
- **Analogi Kunci Penulis**:
  Meminta LLM menghitung huruf dalam sebuah kata sama seperti meminta seseorang menebak berapa gram berat cat merah pada sebuah rambu lalu lintas hanya dengan melihat fotonya dari kejauhan.

---

### 3. Dinamika Autoregresif, Suhu (Temperature), dan Logprobs
- **Mekanisme Generasi Autoregresif**:
  Generasi teks bersifat sekuensial langkah-demi-langkah (*token-by-token*). Token ke-$N$ dihasilkan berdasarkan seluruh rangkaian dari token ke-$1$ hingga token ke-$(N-1)$. Sekali token yang salah atau tidak akurat terpilih di awal kalimat, probabilitas bagi token-token berikutnya untuk ikut melenceng (*compound error*) akan melonjak secara eksponensial.
- **Distribusi Probabilitas & Parameter Sampling**:
  Di setiap langkah, model menghasilkan skor mentah (*logits*) untuk seluruh 100.000+ token di kamusnya. Fungsi Softmax mengubah logits ini menjadi distribusi probabilitas yang jika dijumlahkan bernilai 1.0 (100%).
  
  ```text
  Token Kandidat    Logits    Probabilitas Mentah    Temp = 0.0    Temp = 0.7    Temp = 1.5
  --------------------------------------------------------------------------------------
  "def"             12.4      82.4%                  100%          74.1%         41.2%
  "class"           9.8       12.1%                  0%            15.8%         26.3%
  "import"          8.1       4.2%                   0%             7.2%         18.5%
  "print"           4.2       1.3%                   0%             2.9%         14.0%
  ```

  - **Temperature = 0.0 (Greedy Sampling)**: Model secara mutlak hanya memilih token dengan probabilitas nomor 1 tertinggi. Sangat deterministik, ideal untuk ekstraksi data, sintaks kode, dan JSON formatting.
  - **Temperature > 0.7**: Distribusi diratakan, memberikan peluang bagi token peringkat kedua dan ketiga untuk terpilih. Bagus untuk penulisan kreatif, brainstorming ide, atau variasi narasi.
  - **Top-P (Nucleus Sampling)**: Membatasi pilihan hanya pada sekumpulan token teratas yang probabilitas kumulatifnya mencapai batas persentase $P$ (misalnya top 90%).

---

### 4. Akar Ilmiah Halusinasi: Bukan Kegagalan Sistem, Melainkan Fitur Bawaan
- **Esensi Gagasan**: 
  Banyak praktisi mengeluh bahwa LLM "rusak" ketika berhalusinasi. Berryman dan Ziegler membalik perspektif ini: **kreativitas dan halusinasi adalah fenomena komputasi yang persis sama**. 
  Ketika model diminta menulis puisi tentang astronot di Mars, kita memuji kemampuan halusinasinya sebagai "imajinasi puitis". Namun ketika model diminta mengutip nomor putusan Mahkamah Agung dan ia mengarang nomor perkara fiktif yang terdengar sangat meyakinkan, kita menyebutnya "cacat halusinasi fatal".
- **Mengapa Halusinasi Terjadi?**:
  Model dioptimalkan untuk memaksimalkan *kelancaran bahasa (linguistic plausibility)*, bukan *kebenaran faktual (factual truth)*. Jika sebuah dokumen hukum yang kredibel biasanya memuat referensi pasal di baris ketiga, model akan memproduksi token pasal yang polanya mirip secara fonetik dan struktural, terlepas apakah pasal tersebut benar-benar ada di kitab undang-undang.
- **Solusi Rekayasa**:
  Jangan meminta model "mengingat fakta dari memorinya yang kabur". Pasok fakta tersebut secara eksplisit ke dalam prompt melalui teknik *Grounding* atau *RAG (Retrieval-Augmented Generation)*.

---

### 5. Dari Raw Completion ke Chat: Peran Krusial RLHF
- **Evolusi Arsitektur**:
  Model generasi awal (seperti GPT-3 murni) adalah pelengkap teks liar. Jika Anda mengetikkan prompt:
  ```text
  Tuliskan 3 tips mengelola stres kerja:
  ```
  Model dasar mungkin tidak menjawabnya, melainkan menyambungnya dengan pertanyaan lain:
  ```text
  4 tips menjaga pola tidur, dan 5 cara menurunkan kolesterol.
  ```
  Karena di internet, artikel daftar tips sering kali bersambung ke artikel kesehatan lainnya.
- **Transformasi Melalui RLHF & Instruction Tuning**:
  Melalui teknik *Supervised Fine-Tuning (SFT)* dan *Reinforcement Learning from Human Feedback (RLHF)*, model dilatih untuk mengenali format percakapan berorientasi asisten (*System, User, Assistant roles*). Model diajarkan untuk menekan sifat pelengkap dokumen liarnya dan mengadopsi persona yang patuh, suka membantu, dan menolak permintaan berbahaya.

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Kasus 1: Mengapa Parser JSON Sering Macet di Pertengahan Objek
- **Skenario Masalah**: Tim backend membuat sistem ekstraksi CV pelamar kerja. Prompt meminta model mengembalikan JSON berisi daftar pengalaman kerja. Namun, 15% respons menghasilkan JSON tidak valid karena terpotong di tengah jalan.
- **Analisis Mekanisme Token**:
  Model kehabisan batas token output (*max_tokens*) saat sedang berada di dalam array bersarang (*nested array*). Karena model autoregresif tidak mengetahui sisa kuota token masa depan sebelum menghasilkan token saat ini, ia tidak bisa "mempercepat" penulisan kurung kurawal penutup `}`.
- **Intervensi Penulis**:
  1. Batasi kedalaman skema JSON (*flatten the schema*).
  2. Hitung rasio token input terhadap token output maksimum yang dialokasikan di backend.
  3. Gunakan mode *JSON Strict Output* yang memaksa mesin inferensi menggunakan Context-Free Grammar (CFG) decoding.

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

Langkah konkret yang harus segera diterapkan dalam penulisan prompt teknis Anda:

1. [ ] **Hapus Basa-Basi Kognitif**: Buang frasa pengantar seperti *"Tolong dengan sangat..."*, *"Bisakah kamu yang pintar membantuku..."*. Ganti dengan deklarasi peran teknis, konteks bisnis, dan batasan eksplisit.
2. [ ] **Atur Suhu ke Nol untuk Operasi Kritis**: Set `temperature = 0.0` untuk semua endpoint ekstraksi entitas, parsing payload, kueri database, atau klasifikasi kategori.
3. [ ] **Verifikasi Pemotongan Token**: Gunakan pustaka tokenizer resmi (seperti `tiktoken` untuk OpenAI models) di backend Anda untuk menghitung jumlah token yang dikonsumsi sebelum mengirimkannya ke API, bukan sekadar menghitung jumlah karakter `len(text)`.
4. [ ] **Waspadai Angka Multidigit**: Jika aplikasi Anda memerlukan kalkulasi keuangan, paksa model menuliskan langkah perhitungannya dalam format teks bertahap (*scratchpad/CoT*) atau serahkan kalkulasi ke pemanggilan fungsi kode Python (*Code Interpreter/Tool Call*).

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Model bahasa besar tidak tahu apa itu 'kebenaran'. Mereka hanya tahu apa yang paling sering muncul berdampingan di internet. Keberhasilan Anda sebagai insinyur ditentukan oleh seberapa mahir Anda menyusun pagar pembatas agar kebetulan statistik tersebut selalu jatuh di atas kebenaran operasional."*  
> — **John Berryman & Albert Ziegler**

**Pertanyaan Refleksi Diri**:
- *Apakah selama ini Anda memperlakukan AI sebagai 'kawan mengobrol yang cerdas' atau sebagai 'komponen komputasi probabilistik' yang wajib memiliki pagar pengaman dan validasi input-output?*

---

## 🧭 Navigasi Bab Selanjutnya

📖 **[Hub Buku (index.md)](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 2: Anatomi Konten, Scaffolding, & Rekayasa Konteks](02-anatomi-konten-dan-rekayasa-konteks.md)**
