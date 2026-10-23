---
name: article-writer
description: >-
  Gunakan skill ini ketika pengguna meminta pembuatan artikel singkat lepas (standalone article/essay),
  ingin membedah topik/fenomena/mental model di luar bedah buku penuh, atau ingin mengecek dan memperbarui
  katalog artikel di ARTICLES.md.
---

# ✍️ Article Writer Skill (Artikel Singkat Lepas)

Skill ini memandu AI untuk meriset, menulis, dan mengelola **Artikel Singkat Lepas (*Standalone Articles / Essays*)** di dalam workspace ini. Katalog artikel dikelola secara terpisah di [ARTICLES.md](ARTICLES.md) agar tidak mencampuri atau mengubah katalog buku di [CATALOG.md](CATALOG.md).

---

## 🔄 Prosedur & Alur Kerja (Workflow)

Setiap kali pengguna meminta pembuatan artikel lepas atau mendiskusikan topik artikel:

### Langkah 1: Cek Katalog Artikel (`ARTICLES.md`)
- Buka dan periksa file [ARTICLES.md](ARTICLES.md).
- Periksa apakah topik atau judul artikel sudah pernah ditulis di `articles/<slug-artikel>/` atau sedang berada di tabel antrean ide (*Writing Queue*).

### Langkah 2: Evaluasi Skenario Permintaan
- **Skenario A: Artikel Sudah Ada di Koleksi**
  - Baca file artikel di `articles/<slug-artikel>/index.md`.
  - Berikan jawaban, elaborsi, atau revisi sesuai permintaan pengguna.

- **Skenario B: Menambah Ide ke Antrean Tulisan (*Writing Queue*)**
  - Masukkan topik ke tabel `⏳ Daftar Ide & Antrean Artikel (Writing Queue)` di [ARTICLES.md](ARTICLES.md).
  - Cantumkan target kategori, *angle/hook* bahasan, dan perbarui badge counter antrean ide.

- **Skenario C: Menulis & Mempublikasikan Artikel Baru**
  - Buat direktori baru berdasarkan slug judul di `articles/<slug-artikel>/`.
  - Jika topik berasal dari antrean di `ARTICLES.md`, hapus dari tabel antrean dan pindahkan ke kategori aktif.
  - Lanjut ke Langkah 3.

### Langkah 3: Menyusun Artikel & Ilustrasi di `articles/<slug-artikel>/`
1. **Struktur Direktori per Artikel**:
   - `articles/<slug-artikel>/index.md`: File utama artikel singkat lepas (1 file utuh selesai dibaca, tidak dipecah menjadi part/bab seperti buku).
   - `articles/<slug-artikel>/cover.jpg` (atau `.png`): Gambar ilustrasi utama/cover artikel.
   - `articles/<slug-artikel>/illustrations/` *(opsional)*: Subfolder jika artikel membutuhkan gambar diagram atau ilustrasi tambahan di tengah pembahasan.
2. **Gunakan Template Standar**:
   - Gunakan struktur dari [templates/article_template.md](templates/article_template.md).
3. **Standar Penulisan Artikel Lepas**:
   - Padat, bernas, dan mengalir (*narrative flow*), dengan estimasi waktu baca **3–7 menit**.
   - Mulai dengan *Hook* yang memikat, bedah konsep/fenomena secara tajam, sertakan contoh nyata, dan tutup dengan langkah taktis (*Actionable Takeaways*) serta pertanyaan reflektif.
   - Navigasi kembali ke katalog wajib berada di bagian paling bawah dokumen.

### Langkah 4: Perbarui `ARTICLES.md` (Visual Showcase Card)
Setelah artikel dan gambar ilustrasi selesai dibuat:
1. Tambahkan kartu visual (*Showcase Card*) ke kategori yang sesuai di [ARTICLES.md](ARTICLES.md) dengan format berikut:
   ```markdown
   ### [Judul Artikel: Subjudul](articles/<slug-artikel>/index.md)

   <div align="center">
     <a href="articles/<slug-artikel>/index.md">
       <img src="articles/<slug-artikel>/cover.jpg" width="420" alt="Judul Artikel Cover" style="max-width: 100%; height: auto; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.18); margin-bottom: 8px;" />
     </a>
   </div>

   > **Tanggal**: YYYY-MM-DD &nbsp;|&nbsp; **Kategori**: [Nama Kategori] &nbsp;|&nbsp; **Estimasi Baca**: ~5 Menit  
   > `🏷️ Tag 1` `🏷️ Tag 2` `🏷️ Tag 3`

   > **💡 The Core Hook:**  
   > *"Satu atau dua kalimat ringkasan paling tajam yang merangkum inti gagasan artikel."*

   **🔑 Poin Kunci Pembahasan:**
   - **Poin 1**: Ringkasan singkat poin pertama.
   - **Poin 2**: Ringkasan singkat poin kedua.
   - **Poin 3**: Ringkasan singkat poin ketiga.
   ```
2. Perbarui hitungan **Statistik Artikel** pada badge di bagian atas [ARTICLES.md](ARTICLES.md).
3. **Jangan Mengubah `CATALOG.md`**: Biarkan `CATALOG.md` tetap murni untuk koleksi buku.
4. Pastikan semua path berformat **relative path**: contoh `articles/<slug-artikel>/index.md`, `articles/<slug-artikel>/cover.jpg`.
   > ⚠️ **PENTING**: DILARANG KERAS menggunakan full path/absolute path lokal sistem (seperti `file:///Users/...` atau `/absolute/path/...`) di dalam file markdown mana pun.
