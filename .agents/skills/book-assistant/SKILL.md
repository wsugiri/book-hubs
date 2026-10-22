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
- **Skenario A: Buku Sudah Ada di Katalog**
  - Baca file ringkasan atau hub yang ditautkan di `books/<slug>/index.md`.
  - Berikan jawaban atau elaborasi mendalam sesuai pertanyaan spesifik pengguna.
  
- **Skenario B: Buku Belum Ada di Katalog**
  - Berikan ulasan/informasi lengkap tentang buku tersebut kepada pengguna.
  - Buat direktori baru `books/<slug-judul>/`.
  - Lanjut ke Langkah 3.

### Langkah 3: Membuat Hub & Teardown Mendalam per Part
1. Buat `books/<slug-judul>/index.md` menggunakan [templates/book_index_template.md](templates/book_index_template.md).
2. Buat file teardown naratif per bagian (`01-[part].md`, `02-[part].md`, dst.) menggunakan [templates/part_teardown_template.md](templates/part_teardown_template.md).
3. **Standar Penulisan**:
   - Jangan membuat ringkasan yang terlalu singkat atau hanya bullet points kering.
   - Pertahankan kenyamanan membaca seperti buku aslinya: sertakan cerita latar belakang (*narrative context*), analogi kunci, studi kasus nyata, dan refleksi mendalam tanpa bertele-tele.

### Langkah 4: Perbarui `CATALOG.md`
Setelah modul buku dibuat:
1. Tambahkan baris baru ke tabel daftar buku di [CATALOG.md](CATALOG.md) dengan tautan ke `books/<slug-judul>/index.md`.
2. Perbarui hitungan **Statistik Koleksi** (Total Buku, Selesai Dirangkum, dan daftar kategori).
3. Pastikan tautan file berformat **relative path**: `[Lihat Hub & Teardown](books/<slug-judul>/index.md)`.
   > ⚠️ **PENTING**: DILARANG KERAS menggunakan full path/absolute path lokal sistem (seperti `file:///Users/...` atau `/absolute/path/...`) di dalam file apa pun. Selalu gunakan relative path.

### Langkah 5: Berikan Respon kepada Pengguna
- Berikan intisari atau jawaban informatif langsung di chat.
- Berikan tautan ke direktori index buku baru dan katalog.
