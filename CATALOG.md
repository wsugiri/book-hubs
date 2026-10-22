# 📚 Katalog Buku & Ringkasan

Katalog terpusat yang mencatat seluruh koleksi buku, status ringkasan, kategori, serta tautan ke dokumen ringkasan detail.

---

## 📊 Statistik Koleksi

- **Total Buku Terdaftar**: 1
- **Status Selesai Dirangkum**: 1
- **Kategori Tersedia**: Pengembangan Diri (1)

---

## 📑 Daftar Koleksi Buku

| No | Judul Buku | Penulis | Kategori | Tahun | Rating | File Ringkasan | Status |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- | :---: |
| 1 | **Atomic Habits** | James Clear | Pengembangan Diri | 2018 | ⭐⭐⭐⭐⭐ (5.0) | [Lihat Hub & Teardown](books/atomic-habits/index.md) | ✅ Selesai (6 Part) |

---

## 📌 Catatan untuk Agent
Setiap kali ada permintaan untuk mendetailkan atau membedah buku baru:
1. Pastikan buku belum ada di daftar di atas.
2. Buat direktori baru per buku di `books/<slug-judul>/`:
   - Buat `books/<slug-judul>/index.md` mengacu pada [templates/book_index_template.md](templates/book_index_template.md) sebagai peta baca eksekutif.
   - Buat file teardown mendalam per bagian (Part/Bab) mengacu pada [templates/part_teardown_template.md](templates/part_teardown_template.md) dengan gaya narasi mengalir, studi kasus nyata, dan tidak terburu-buru.
3. Tambahkan baris baru pada tabel di atas dan perbarui bagian statistik di `CATALOG.md`.
4. Selalu gunakan **relative path** (contoh: `books/<slug-judul>/index.md`), DILARANG KERAS menggunakan absolute/full path sistem.
