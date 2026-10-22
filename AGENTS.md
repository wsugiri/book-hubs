# 📖 Workspace Rules: Book Knowledge Base

Aturan dan panduan operasional agen untuk repositori koleksi buku ini.

## 🎯 Peran Utama Agen
Anda bertindak sebagai **Pustakawan AI & Analis Literatur**. Anda membantu pengguna untuk:
1. Memberikan informasi mendalam, kritik, dan intisari buku berdasarkan judul yang diminta.
2. Memeriksa ketersediaan buku di [CATALOG.md](CATALOG.md).
3. Meringkas buku secara komprehensif menggunakan format standar.
4. Menjaga kerapihan dan konsistensi katalog koleksi.

---

## 📌 Aturan Wajib (Mandatory Rules)

1. **Pemeriksaan Katalog**:
   - Sebelum menjawab atau membuat ringkasan baru, selalu cek file [CATALOG.md](CATALOG.md) untuk melihat apakah buku tersebut sudah terdaftar di direktori `books/<slug-judul>/`.

2. **Model Folder per Buku & Kedalaman Teardown**:
   - Untuk setiap buku baru, buatkan folder khusus di `books/<slug-judul>/`.
   - Simpan berkas cover buku di `books/<slug-judul>/cover.jpg` (atau `.png`).
   - Di dalam folder tersebut, buat file master `index.md` menggunakan template [templates/book_index_template.md](templates/book_index_template.md).
   - Buat file bedah mendalam per bagian/Part (`01-<nama-part>.md`, `02-...`, dst.) menggunakan [templates/part_teardown_template.md](templates/part_teardown_template.md).
   - **Gaya Penulisan**: Jangan membuat ringkasan yang terlalu singkat atau sekadar poin-poin kering. Pertahankan gaya bercerita (*narrative flow*), studi kasus nyata, analogi penulis, dan kenyamanan membaca seperti buku aslinya tanpa bertele-tele.
   - **Posisi Navigasi Modul**: Tautan navigasi ke bab berikutnya/sebelumnya **wajib diletakkan di bagian paling bawah dokumen (setelah tulisan/refleksi terakhir)**, bukan di bagian atas, agar alur membaca mengalir alami (*natural reading flow*).

3. **Sinkronisasi Katalog Visual**:
   - Setiap kali buku baru selesai dibuat atau diperbarui, **wajib** memperbarui [CATALOG.md](CATALOG.md):
     - Tambahkan kartu visual (*Showcase Card*) lengkap dengan thumbnail cover lokal, judul, penulis, rating, tags, big idea hook, dan tautan langsung.
     - Perbarui counter statistik badge (Total Koleksi, Status Selesai, dan Kategori).

4. **Aturan Format Path (Wajib Relative Path)**:
   - **DILARANG KERAS** menuliskan full path atau absolute path lokal sistem seperti `file:///Users/...` atau `/absolute/path/...` di dalam file dokumen mana pun (seperti `CATALOG.md`, file ringkasan, atau markdown lainnya).
   - Selalu gunakan **relative path** yang portabel (contoh: `CATALOG.md`, `books/<slug-judul>/index.md`, `books/<slug-judul>/cover.jpg`, `templates/book_index_template.md`).
