---
name: book-assistant
description: >-
  Gunakan skill ini ketika pengguna bertanya tentang buku tertentu, meminta detail atau ringkasan buku,
  ingin menambahkan buku baru ke dalam koleksi, atau ingin mengecek dan memperbarui katalog buku.
---

# 📚 Book Assistant Skill

Skill ini memandu AI untuk mengelola basis pengetahuan buku di workspace ini. Tugas utamanya meliputi:
1. Menyediakan informasi mendalam mengenai buku berdasarkan judul yang diminta.
2. Memeriksa keberadaan buku di [CATALOG.md](CATALOG.md).
3. Membuat hub direktori buku di `books/<slug-judul>/` lengkap dengan `index.md` dan file teardown mendalam per bagian (Part/Bab).
4. Memperbarui [CATALOG.md](CATALOG.md) secara otomatis setiap ada buku baru atau status yang berubah.

---

## 🔄 Prosedur & Alur Kerja (Workflow)

Setiap kali pengguna menyebutkan atau meminta informasi tentang buku tertentu:

### Langkah 1: Cek Katalog Terlebih Dahulu
- Buka dan periksa file [CATALOG.md](CATALOG.md).
- Periksa apakah judul buku sudah terdaftar dalam tabel.

### Langkah 2: Evaluasi Status Dokumen
- **Skenario A: Buku Sudah Ada di Koleksi Aktif**
  - Baca file ringkasan atau hub yang ditautkan di `books/<slug>/index.md`.
  - Berikan jawaban atau elaborasi mendalam sesuai pertanyaan spesifik pengguna.
  
- **Skenario B: Permintaan Menambah ke Antrean Baca (TBR / Reading Queue)**
  - Masukkan buku ke tabel `⏳ Daftar Incaran & Antrean Bedah (To-Be-Read)` di [CATALOG.md](CATALOG.md).
  - Cantumkan target kategori, hook alasan kurasi, dan update badge counter antrean.

- **Skenario C: Memulai Bedah Buku dari Antrean (Teardown & Publikasi)**
  - Berikan ulasan/informasi lengkap tentang buku tersebut kepada pengguna.
  - Buat direktori baru `books/<slug-judul>/`.
  - Hapus buku dari tabel antrean TBR di `CATALOG.md` dan pindahkan ke showcase koleksi aktif.
  - Lanjut ke **Langkah 3 (Protokol Riset & Anti-Halusinasi)** sebelum mulai menulis.

---

### Langkah 3: Protokol Riset & Anti-Halusinasi (Wajib Sebelum Menulis)
Untuk menjamin akurasi akademik dan mencegah halusinasi (*hallucination*), AI **dilarang hanya mengandalkan ingatan internal** dan wajib menjalankan verifikasi berikut:

1. **Verifikasi Daftar Isi (*Table of Contents*) Asli**:
   - Gunakan pencarian web (`search_web`) untuk memeriksa struktur *Part* dan *Chapter* asli dari buku yang dibedah.
   - Pastikan pembagian file `01-[part].md`, `02-[part].md`, dst., merepresentasikan urutan bab buku aslinya dan mencantumkan cakupan bab asli (misal: *Mencakup Chapter 1–3*).
2. **Verifikasi Eksperimen, Studi Ilmiah & Tokoh Nyata per Bab**:
   - Cari dan cocokkan studi kasus, nama peneliti, tahun publikasi, dan institusi/jurnal yang benar-benar dikutip penulis pada bagian tersebut.
   - **Cegah Kontaminasi Silang (*Cross-Book Contamination*)**: Pastikan studi kasus atau eksperimen yang ditulis memang berasal dari buku dan bab tersebut, bukan tertukar dengan buku populer lain yang bertopik serupa.
3. **Kejujuran Epistemik & Aturan Kutipan**:
   - **Dilarang Mengarang Kutipan (*Zero Fabricated Quotes*)**: Hanya gunakan tanda kutip langsung (`"..."`) jika kalimat *verbatim* penulis terverifikasi. Jika merangkum gagasan penulis dengan kalimat sendiri, wajib gunakan label **Parafrase Intisari**.
   - **Dilarang Mengarang Angka/Statistik**: Jika angka persentase atau tahun eksperimen tidak ditemukan secara pasti dari hasil verifikasi, jelaskan mekanisme temuannya secara kualitatif tanpa mengarang angka fiktif.
   - **Kritik Metodologi (Konteks Sains Modern)**: Jika sebuah buku mengutip riset klasik yang di kemudian hari mengalami koreksi ilmiah atau terdampak krisis replikasi (*replication crisis*), berikan catatan konteks ilmiah secara objektif di bagian catatan kaki atau evaluasi kritis.

---

### Langkah 4: Membuat Hub, Teardown Mendalam & Catatan Kaki per Part
1. Simpan cover buku di `books/<slug-judul>/cover.jpg` (atau `.png`).
2. Buat `books/<slug-judul>/index.md` menggunakan [templates/book_index_template.md](templates/book_index_template.md), lengkap dengan **Audit Metodologi & Bukti Ilmiah** serta **Daftar Literatur Primer**.
3. Buat file teardown naratif per bagian (`01-[part].md`, `02-[part].md`, dst.) menggunakan [templates/part_teardown_template.md](templates/part_teardown_template.md).
4. **Standar Penulisan & Referensi Ilmiah**:
   - Jangan membuat ringkasan yang terlalu singkat atau hanya bullet points kering. Pertahankan kenyamanan membaca seperti buku aslinya (*narrative context*, analogi kunci, studi kasus nyata, dan refleksi mendalam).
   - **Wajib Menyematkan Catatan Kaki (`[^1]`, `[^2]`)**: Setiap kali menyebutkan eksperimen ilmiah, studi psikologi/medis/ekonomi, klaim statistik, atau tokoh sejarah di dalam teks, sematkan penanda *footnote* Markdown (`[^1]`) dan tuliskan detail referensinya (Nama Peneliti, Tahun, Judul/Konteks Riset, dan Temuan Inti) pada seksi `📚 Referensi, Studi Ilmiah & Catatan Kaki Bab Ini` di bagian akhir bab (sebelum navigasi bawah).

### Langkah 5: Perbarui `CATALOG.md` (Visual Showcase Card)
Setelah modul buku dibuat:
1. Tambahkan kartu visual (*Showcase Card*) ke kategori yang sesuai di [CATALOG.md](CATALOG.md):
   - Tampilkan thumbnail cover (`books/<slug-judul>/cover.jpg`).
   - Sertakan judul lengkap, rating, penulis, tahun, badge topik/tags.
   - Tuliskan *Big Idea* (1 kalimat hook yang kuat) dan *Kerangka Kunci*.
   - Sediakan tombol pintas langsung ke Master Hub dan Part 1.
2. Perbarui hitungan **Statistik Koleksi** pada badge di bagian atas [CATALOG.md](CATALOG.md).
3. Pastikan semua path berformat **relative path**: contoh `books/<slug-judul>/index.md`, `books/<slug-judul>/cover.jpg`.
   > ⚠️ **PENTING**: DILARANG KERAS menggunakan full path/absolute path lokal sistem (seperti `file:///Users/...` atau `/absolute/path/...`) di dalam file apa pun.

### Langkah 6: Berikan Respon kepada Pengguna
- Berikan intisari atau jawaban informatif langsung di chat.
- Berikan tautan ke direktori index buku baru dan katalog.
