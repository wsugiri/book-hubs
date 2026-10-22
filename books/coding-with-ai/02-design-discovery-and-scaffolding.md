# Part 2: Desain Arsitektur, Discovery & Pembangunan Fondasi Aplikasi

> 📖 Hub Buku: **[Coding with AI](index.md)**

---

## 📖 Narasi Pembuka: Jebakan 'Code-First' & Hari-Hari Melelahkan Membongkar Database

Seorang developer junior dan seorang tech lead senior sedang memulai sebuah aplikasi baru: sistem pelacak pengeluaran tim (*expense tracker*) yang harus terintegrasi dengan pemindai kuitansi digital, multi-mata uang, dan persetujuan bertingkat (*multi-level approval*).

Developer junior langsung membuka editor kodenya, mengetik prompt ke AI:
> *"Buatkan saya seluruh aplikasi expense tracker lengkap dengan backend FastAPI, database PostgreSQL, dan frontend React."*

AI segera memuntahkan ratusan baris kode sekaligus dalam beberapa detik. Tampilannya tampak menakjubkan. Si junior merasa seperti penyihir. 

Namun tiga hari kemudian, malapetaka teknis terjadi:
* Skema database yang dibuat AI ternyata tidak mempertimbangkan pembulatan angka desimal mata uang (*floating-point rounding errors*)—saldo kas perusahaan selisih beberapa sen di setiap transaksi.
* Model relasi antara karyawan, manajer penyetujui, dan departemen ternyata berbentuk *circular dependency* yang mengunci kueri database.
* Untuk memperbaiki kesalahan ini, seluruh backend dan antarmuka harus dibongkar total dari awal. Waktu tiga hari terbuang sia-sia.

Jeremy Morgan menyoroti fenomena ini sebagai **Sindrom Tergesa Mengetik Kode (*The Code-First Trap*)**. Ketika mengetik kode menjadi sangat murah dan instan berkat AI, godaan terbesar developer adalah langsung melompat ke penulisan kode tanpa melakukan fase **Discovery & Desain Arsitektur**.

Insinyur perangkat lunak kelas dunia tidak memulai proyek dengan meminta AI menulis kode implementasi. Mereka menggunakan AI terlebih dahulu sebagai **mitra diskusi arsitektur (*architectural sparring partner*)** untuk menguji asumsi, membedah *trade-offs*, dan merancang skema domain sebelum satu baris kode pun ditulis.

---

## 🔬 Teardown Konsep & Wawasan Utama

### 1. Fase Discovery: Menggunakan AI untuk Analisis *Trade-Offs* Arsitektur
Sebelum memilih pustaka atau basis data, gunakan AI untuk membedah kelebihan dan kekurangan dari berbagai pilihan desain sistem:

```text
               ALUR FASE DISCOVERY BERSAMA AI
               
  1. DEFINISI KEBUTUHAN               2. SPARRING ARSITEKTUR
     "Sistem butuh menangani 5.000       Minta AI membandingkan:
     transaksi/detik dengan audit        • PostgreSQL vs DynamoDB
     trail ketat."                       • REST vs gRPC untuk antarlayanan
           │                                          │
           ▼                                          ▼
  4. VALIDASI AKHIR                   3. SPESIFIKASI KONTRAK (SCHEMA)
     Insinyur memilih arsitektur terbaik  AI menyusun skema OpenAPI / ERD
     berdasarkan analisis trade-off.     sebelum kode ditulis.
```

#### Contoh Prompt Discovery yang Efektif:
> *"Saya sedang merancang layanan backend untuk memproses log transaksi finansial yang membutuhkan audit trail tidak dapat diubah (immutable). Volume awal 500 transaksi per menit dengan puncak 10.000/menit. Bandingkan 3 pendekatan arsitektur: (A) PostgreSQL dengan partitioned tables, (B) MongoDB dengan time-series collections, dan (C) Event Sourcing menggunakan PostgreSQL + Kafka. Analisis berdasarkan kemudahan pemeliharaan, konsistensi data (ACID), dan kompleksitas operasional tim kecil 3 orang."*

Alih-alih langsung menerima jawaban mentah, AI akan menyajikan matriks perbandingan objektif yang membantu tim mengambil keputusan berlandaskan data, bukan sekadar opini subjektif.

---

### 2. Seni Memecah Masalah: Pendekatan Modular vs Monolitik Sekaligus
Kesalahan paling fatal saat bekerja dengan AI coding adalah **Menuangkan Seluruh Spesifikasi Sekaligus (*The Spec Dump*)**:

```text
   PENDEKATAN SALAH (Spec Dump)           PENDEKATAN BENAR (Iteratif Modular)
  ───────────────────────────────        ─────────────────────────────────────
  [Prompt 500 Kata: Semua Fitur]         Langkah 1: Skema Model Data (Pydantic/ORM)
                │                                           │
                ▼                                           ▼
  AI menghasilkan 500 baris kode         Langkah 2: Repositori Database (CRUD murni)
  campur aduk (Router + DB + UI);                           │
  konteks terpotong, bug logika                             ▼
  tersembunyi di mana-mana.              Langkah 3: Service Layer (Logika Bisnis)
                                                            │
                                                            ▼
                                         Langkah 4: Endpoint Controller / API Router
```

Morgan menegaskan aturan **Prinsip Tanggung Jawab Tunggal (*Single Responsibility Principle*)** untuk AI:
* **Fokuskan AI pada satu lapisan (*layer*) dalam satu waktu**.
* Jangan minta AI menulis logika otentikasi JWT bersamaan dengan kueri analitik pelaporan dalam satu prompt.
* Buat kontrak antarmuka (*interface contract*) terlebih dahulu. Setelah kontrak antarmuka disepakati, baru minta AI mengimplementasikan masing-masing komponen secara terpisah.

---

### 3. Pembangunan Fondasi Backend: Menjinakkan Boilerplate API
Salah satu nilai praktis terbesar AI adalah kemampuannya menghasilkan fondasi backend (REST API) yang mematuhi standar modern dalam hitungan menit.

#### Membangun API Endpoint yang Tangguh (Contoh FastAPI & Pydantic)
Ketika meminta AI membuat endpoint API, developer berpengalaman selalu menyertakan batasan validasi dan penanganan status HTTP yang eksplisit:

```python
# Contoh Kontrak yang Dihasilkan Melalui Prompt Berbatas Jelas:
from pydantic import BaseModel, Field, EmailStr
from decimal import Decimal
from typing import Optional
from datetime import datetime

class ExpenseCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=100, description="Judul pengeluaran")
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="Jumlah nominal wajib positif")
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    category_id: int
    receipt_url: Optional[str] = None

class ExpenseResponse(ExpenseCreateRequest):
    id: int
    created_at: datetime
    status: str = Field(default="pending")

    class Config:
        from_attributes = True
```

Dengan menginstruksikan AI untuk menggunakan `Decimal` (bukan `float`) dan validasi regex ISO untuk mata uang, Anda secara proaktif mencegah celah keamanan dan bug perhitungan finansial sebelum kode backend menyentuh basis data.

---

### 4. Ekosistem Alat Bantu Developer: Tabnine, Copilot, & Agen Generasi Baru
Morgan membandingkan berbagai kategori alat bantu AI yang ada di pasar:

| Kategori Alat | Contoh Alat | Keunggulan Utama | Kasus Penggunaan Ideal |
| :--- | :--- | :--- | :--- |
| **In-Line Autocomplete** | GitHub Copilot, Tabnine | Pelengkap baris kode kilat (*tab-to-complete*) saat sedang mengetik. | Menulis fungsi sederhana, melengkapi argumen fungsi, data array. |
| **Chat & Architecture** | ChatGPT, Gemini Web, Claude | Diskusi strategi tingkat tinggi, analisis perbandingan arsitektur, refactoring blok besar. | Fase discovery, evaluasi bug rumit, penjelasan arsitektur. |
| **Agentic Workspace** | Google Antigravity, Cursor, Blackbox | Membaca struktur seluruh direktori, memodifikasi multi-file, menjalankan terminal. | Pembangunan proyek dari nol, refactoring arsitektur global, debugging otomatis. |

Kunci efisiensi seorang developer modern adalah **mengombinasikan alat-alat ini secara harmonis**, bukan terpaku pada satu alat saja.

---

## 🧠 Eksperimen Pikiran & Kasus Nyata

### Kasus: Menghindari Masalah N+1 Query pada ORM
Masalah klasik yang sering lolos dalam kode yang dihasilkan AI adalah masalah **N+1 Query** pada Object-Relational Mapping (seperti SQLAlchemy atau Prisma).

Ketika diminta: *"Buatkan endpoint untuk mengambil daftar 100 pengguna beserta daftar 5 pesanan terakhir mereka"*, AI pemula cenderung menghasilkan kode yang melakukan 1 kueri untuk mengambil 100 pengguna, lalu melakukan 100 kueri tambahan di dalam perulangan (*loop*) untuk mengambil pesanan masing-masing pengguna. Di lingkungan pengujian lokal dengan 3 data, kode ini berjalan secepat kilat. Namun di *production* dengan 10.000 pengguna, server database akan langsung mengalami *crash*.

**Taktik Developer Cerdas**:
Sertakan instruksi optimasi database dalam prompt Anda:
> *"Tuliskan endpoint ini menggunakan SQLAlchemy 2.0 dengan teknik `joinedload` atau `selectinload` untuk mencegah N+1 query problem. Pastikan hanya ada maksimal 2 kueri database SQL yang dieksekusi secara keseluruhan."*

Dengan menyebutkan kata kunci arsitektur yang tepat, AI akan segera menghasilkan kode optimal tingkat lanjut yang siap menangani skala beban tinggi.

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

1. [ ] **Terapkan 'Discovery Prompt' Sebelum Proyek Dimulai**: Jangan menulis kode sebelum Anda meminta AI membuatkan perbandingan trade-off arsitektur dan skema entitas domain (ERD).
2. [ ] **Pecah Pembangunan Aplikasi Menjadi 4 Lapisan**: (1) Domain Model & Validasi -> (2) Database Repository -> (3) Business Logic Service -> (4) HTTP API Controllers.
3. [ ] **Wajib Gunakan Tipe Data Spesifik**: Instruksikan AI untuk selalu menggunakan anotasi tipe data ketat (*strict typing*) seperti Pydantic di Python atau TypeScript di JavaScript guna memangkas *runtime error*.
4. [ ] **Awasi Masalah Kueri Database**: Selalu periksa kode ORM yang dihasilkan AI untuk memastikan tidak ada pemanggilan kueri di dalam perulangan (*N+1 problem*).

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Menulis kode tanpa desain arsitektur yang matang seperti membangun rumah di atas pasir hisap. Semakin cepat Anda mengetik dengan bantuan AI, semakin cepat pula struktur tersebut akan runtuh."*  
> — **Jeremy Morgan**

> *"Kekuatan sejati developer modern bukan lagi terletak pada kecepatan jarinya menari di atas papan ketik, melainkan pada kemampuannya menguraikan masalah rumit menjadi potongan-potongan instruksi terisolasi yang dapat dieksekusi mesin dengan presisi sempurna."*  
> — **Jeremy Morgan**

**Pertanyaan Refleksi Diri**:
- *Apakah Anda sering tergoda langsung menyuruh AI menghasilkan seluruh aplikasi dalam satu prompt raksasa, hanya untuk kemudian frustrasi karena kodenya penuh bug dan sulit dipahami?*
- *Bagaimana Anda bisa membagi tugas besar berikutnya menjadi 3 langkah modular yang lebih terukur dan mudah diverifikasi?*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 1: Pergeseran Paradigma & Langkah Awal](01-paradigm-shift-and-first-steps.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku (index.md)](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 3: Otomasi Pengujian & Pertahanan Kualitas Kode](03-effective-testing-and-code-quality.md)**
