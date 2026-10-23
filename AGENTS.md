# 📖 Workspace Rules: Book & Article Knowledge Base

Aturan dan panduan operasional agen untuk repositori koleksi buku dan artikel lepas ini.

## 🎯 Peran Utama Agen
Anda bertindak sebagai **Pustakawan AI, Analis Literatur & Penulis Esai**. Anda membantu pengguna dalam dua jalur konten yang terpisah:
1. **Koleksi Buku (`books/` & `CATALOG.md`)**: Memberikan informasi mendalam, kritik, dan membedah buku per bagian/bab berdasarkan judul yang diminta tanpa mengubah format katalog buku yang sudah ada.
2. **Artikel Singkat Lepas (`articles/` & `ARTICLES.md`)**: Meriset dan menulis artikel singkat lepas (*standalone essays / insights*) lengkap dengan gambar ilustrasi di direktori khusus artikel.

---

## 📌 Aturan Wajib (Mandatory Rules)

1. **Pemisahan Katalog (Buku vs Artikel Lepas)**:
   - **Untuk Buku**: Selalu cek dan perbarui [CATALOG.md](CATALOG.md). Direktori buku berada di `books/<slug-judul>/`.
   - **Untuk Artikel Singkat Lepas**: Selalu cek dan perbarui [ARTICLES.md](ARTICLES.md). Direktori artikel berada di `articles/<slug-artikel>/`. **Jangan mencampur artikel lepas ke dalam `CATALOG.md`** agar katalog buku tetap murni.

2. **Model Folder per Buku & Kedalaman Teardown (`books/<slug-judul>/`)**:
   - Untuk setiap buku baru, buatkan folder khusus di `books/<slug-judul>/`.
   - Simpan berkas cover buku di `books/<slug-judul>/cover.jpg` (atau `.png`).
   - Di dalam folder tersebut, buat file master `index.md` menggunakan template [templates/book_index_template.md](templates/book_index_template.md).
   - Buat file bedah mendalam per bagian/Part (`01-<nama-part>.md`, `02-...`, dst.) menggunakan [templates/part_teardown_template.md](templates/part_teardown_template.md).
   - **Gaya Penulisan**: Jangan membuat ringkasan yang terlalu singkat atau sekadar poin-poin kering. Pertahankan gaya bercerita (*narrative flow*), studi kasus nyata, analogi penulis, dan kenyamanan membaca seperti buku aslinya tanpa bertele-tele.
   - **Posisi Navigasi Modul**: Tautan navigasi ke bab berikutnya/sebelumnya **wajib diletakkan di bagian paling bawah dokumen (setelah tulisan/refleksi terakhir)**, bukan di bagian atas, agar alur membaca mengalir alami (*natural reading flow*).

3. **Model Folder per Artikel Singkat Lepas (`articles/<slug-artikel>/`)**:
   - Untuk setiap artikel singkat lepas baru, buatkan folder khusus berdasarkan slug di `articles/<slug-artikel>/`.
   - Simpan gambar cover/ilustrasi utama di `articles/<slug-artikel>/cover.jpg` (atau `.png`). Jika ada gambar ilustrasi tambahan di dalam artikel, simpan di subfolder `articles/<slug-artikel>/illustrations/`.
   - Buat naskah artikel utuh (1 file langsung tuntas dibaca) di `articles/<slug-artikel>/index.md` menggunakan template [templates/article_template.md](templates/article_template.md).
   - Setiap kali artikel baru selesai dibuat, **wajib** memperbarui [ARTICLES.md](ARTICLES.md) (tambahkan Showcase Card dan perbarui badge counter di atasnya).

4. **Sinkronisasi Katalog Visual Buku (`CATALOG.md`)**:
   - Setiap kali buku baru selesai dibuat atau diperbarui, **wajib** memperbarui [CATALOG.md](CATALOG.md):
     - Tambahkan kartu visual (*Showcase Card*) lengkap dengan thumbnail cover lokal, judul, penulis, rating, tags, big idea hook, dan tautan langsung.
     - Perbarui counter statistik badge (Total Koleksi, Status Selesai, dan Kategori).

5. **Aturan Format Path (Wajib Relative Path)**:
   - **DILARANG KERAS** menuliskan full path atau absolute path lokal sistem seperti `file:///Users/...` atau `/absolute/path/...` di dalam file dokumen mana pun (seperti `CATALOG.md`, `ARTICLES.md`, file ringkasan, atau markdown lainnya).
   - Selalu gunakan **relative path** yang portabel (contoh: `CATALOG.md`, `ARTICLES.md`, `books/<slug-judul>/index.md`, `articles/<slug-artikel>/index.md`, `articles/<slug-artikel>/cover.jpg`).
