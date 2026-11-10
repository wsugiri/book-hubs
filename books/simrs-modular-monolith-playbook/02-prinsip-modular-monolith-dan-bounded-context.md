# Part 2: Paradigma Modular Monolith & Bounded Contexts

> 📖 Hub Buku: **[The SIMRS Backend Playbook](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Pada awal dekade 2010-an, industri rekayasa perangkat lunak terpukau oleh janji manis arsitektur *Microservices*. Banyak tim engineering terburu-buru memecah aplikasi monolit mereka menjadi belasan hingga puluhan layanan mini. Di atas kertas, argumennya terdengar sempurna: setiap tim memiliki layanannya sendiri, dapat menggunakan teknologi berbeda, dan dapat melakukan *deploy* kapan saja secara independen.

Namun ketika arsitektur microservices diterapkan prematur pada sistem rumah sakit, banyak organisasi justru terperosok ke dalam *"Microservices Nightmare"*:
* Transaksi admisi rawat inap membutuhkan koordinasi terdistribusi yang rumit (*two-phase commit* atau *distributed saga*) antara service Admisi, Tempat Tidur, Kasir, dan Rekam Medis.
* Latensi jaringan internal melonjak drastis, membuat dokter di poliklinik menunggu 8 detik hanya untuk membuka rekam medis riwayat pasien.
* Biaya infrastruktur membengkak untuk mengelola Kubernetes cluster, service mesh, API gateway, dan sistem distributed tracing yang rumit.

Banyak Chief Technology Officer (CTO) rumah sakit akhirnya menyadari kebenaran fundamental: **Masalah utama mereka bukanlah ukuran berkas monolit (*deployment unit*), melainkan batas-batas logika bisnis (*logical boundaries*) yang hancur.**

Solusi modern untuk paradoks ini adalah **Modular Monolith**. Kita tetap mempertahankan kesederhanaan *single deployment unit* (satu repositori, satu proses server, satu basis data fisik), tetapi menegakkan disiplin isolasi domain yang sekeras microservices.

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

```text
                  CETAK BIRU MODULAR MONOLITH SIMRS (SRC/)
  
  src/
  ├── core/                           # SHARED KERNEL
  │   ├── config/                     # Environment, Logger, Database Config
  │   ├── database/                   # Sequelize Singleton & Transaction Wrapper
  │   ├── errors/                     # AppError & Error Types
  │   ├── http/                       # Response Helper & Error Middleware
  │   └── middlewares/                # Auth JWT, RBAC, Request Tracing, Audit Log
  │
  └── modules/                        # BOUNDED CONTEXTS (INDEPENDENT DOMAINS)
      ├── master-data/                # ICD-10, ICD-9-CM, Poliklinik, Nakes, Tarif
      ├── admission/                  # Admisi: IGD, Rawat Jalan, Rawat Inap, Antrean
      ├── emr/                        # Rekam Medis Elektronik: CPPT, SOAP, Asesmen
      ├── pharmacy/                   # E-Resep, Stok Obat, Depo, Racikan, Mutasi
      ├── billing/                    # Kasir, Split Bill, Klaim Asuransi, Invoice
      └── bridging/                   # Integrasi BPJS (VClaim/Antrol) & SATUSEHAT (FHIR)
          ├── handlers/               # HTTP Delivery Layer (Hono Context parser)
          ├── services/               # Pure Business Logic Layer (Protocol-Agnostic)
          ├── repositories/           # Data Access Layer (Sequelize Query Isolation)
          ├── models/                 # Database Models (Tabel privat milik modul ini)
          ├── validators/             # Request Validation Schema (Zod)
          ├── routes.js               # Sub-Router Hono
          └── index.js                # PUBLIC API KONTRAK (Pintu keluar resmi modul)
```

### 1. Bounded Contexts: Memetakan Domain Rumah Sakit

Dalam metodologi *Domain-Driven Design (DDD)*, setiap domain medis dan administratif rumah sakit memiliki bahasa (*Ubiquitous Language*) dan aturan mainnya sendiri:

| Modul (Bounded Context) | Fokus Domain Utama | Entitas Inti | Yang Boleh Diakses Modul Lain |
| :--- | :--- | :--- | :--- |
| **`master-data`** | Kamus data standar rumah sakit | Diagnosa ICD-10, Tindakan ICD-9, Nakes, Poliklinik, Tarif Dasar | Lookup master data, validasi ID poli/nakes |
| **`admission`** | Manajemen kunjungan & tempat tidur | Pasien, Kunjungan (Visit), Antrean, Alokasi Bed | Status kunjungan aktif, trigger admisi baru, discharge |
| **`emr`** | Rekam Medis Elektronik (RME) | Catatan Perkembangan Pasien Terintegrasi (CPPT), SOAP, Odontogram | Ringkasan riwayat medis untuk billing klaim |
| **`pharmacy`** | Pengelolaan obat & dispensing | E-Resep, Stok Depo, Batch Obat, Racikan | Status penyerahan obat, total biaya obat resep |
| **`billing`** | Finansial & kasir | Invoice, Payment, Split Bill (BPJS/Pribadi), Jurnal Kasir | Buat invoice awal, cek status lunas, penambahan item tagihan |
| **`bridging`** | Gerbang integrasi eksternal | BPJS VClaim, Antrean RS BPJS, Kemenkes SATUSEHAT (HL7/FHIR) | Pengiriman data rujukan, sinkronisasi SEP, kirim bundle FHIR |

---

### 2. Aturan Emas Isolasi Modul (The Golden Rules)

Untuk menjamin modular monolith tidak berubah menjadi "big ball of mud", seluruh tim rekayasa wajib mematuhi **Empat Aturan Emas**:

#### Aturan 1: Dilarang Keras Cross-Import Internal Folder Milik Modul Lain
Modul `billing` **DILARANG KERAS** meng-import berkas apa pun dari dalam:
* `src/modules/admission/models/*`
* `src/modules/admission/repositories/*`
* `src/modules/admission/handlers/*`

Satu-satunya berkas yang boleh di-import oleh modul lain adalah **`index.js`** yang bertindak sebagai pintu gerbang (*Public API*) modul tersebut.

```javascript
// ❌ DIHARAMKAN: Mengintip jeroan modul lain
import { Visit } from '../admission/models/Visit.js';
import * as admissionRepo from '../admission/repositories/admission.repository.js';

// ✅ DIIZINKAN: Memanggil Service Kontrak resmi melalui index.js
import { admissionService } from '../admission/index.js';
```

#### Aturan 2: Anatomi Berkas `index.js` sebagai Kontrak Publik
File `src/modules/<nama-modul>/index.js` bertindak sebagai *firewall*. Hanya fungsi-fungsi yang sengaja diekspor yang boleh digunakan oleh modul lain:

```javascript
// src/modules/admission/index.js
// 1. Ekspor routes untuk di-mount di src/app.js
export { admissionRoutes } from './routes.js';

// 2. Ekspor Service Public Contract untuk dipanggil modul lain
import * as registrationService from './services/registration.service.js';
import * as visitQueryService from './services/visit-query.service.js';

export const admissionService = {
  getVisitSummary: visitQueryService.getSummaryById,
  checkActiveVisit: visitQueryService.isPatientCurrentlyAdmitted,
  markPatientAsDischarged: registrationService.dischargePatient
};
```

#### Aturan 3: Relasi Antar-Modul Menggunakan ID Biasa (Tanpa Sequelize Associations)
Di dalam ORM seperti Sequelize, godaan terbesar adalah membuat relasi relasional lintas folder:

```javascript
// ❌ SANGAT BERBAHAYA: Mengunci skema database lintas modul
// src/modules/billing/models/Invoice.js
import { Visit } from '../../admission/models/Visit.js';

Invoice.belongsTo(Visit, { foreignKey: 'visitId' }); // Menghancurkan batas database!
```

Jika relasi ini dibuat, developer billing akan terbiasa melakukan *deep eager loading*:
`Invoice.findAll({ include: [{ model: Visit, include: [Patient] }] })`.

Ketika kelak modul `admission` dipisah menjadi database mikro terpisah di AWS Aurora terpisah, seluruh query di modul `billing` seketika hancur dan harus ditulis ulang.

**Pola yang Benar**:
Simpan foreign key sebagai tipe data murni (`UUID` atau `BIGINT`):

```javascript
// ✅ BERSIH & DECOUPLED: Foreign Key murni tanpa ORM Join
// src/modules/billing/models/Invoice.js
import { DataTypes, Model } from 'sequelize';

export class Invoice extends Model {}
Invoice.init({
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  visitId: { type: DataTypes.UUID, allowNull: false }, // ID referensi murni
  patientId: { type: DataTypes.UUID, allowNull: false },
  totalAmount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID'), defaultValue: 'UNPAID' }
}, { sequelize, tableName: 'billing_invoices' });
```

Jika modul `billing` membutuhkan informasi nama pasien atau status kunjungan saat mencetak kuitansi, panggil `admissionService.getVisitSummary(invoice.visitId)` di service layer, bukan melakukan SQL JOIN otomatis.

---

### 3. Otomasi Penegakan Aturan Menggunakan ESLint

Kebaikan hati developer tidak cukup untuk menjaga arsitektur; kita membutuhkan **mesin pemeriksa otomatis** di pipeline CI/CD.

> [!WARNING]
> **Jebakan `no-restricted-imports` berbasis path relatif.** Pola seperti `'../**/models/*'` terlihat benar, tetapi juga cocok dengan import **sah di dalam modul sendiri** (misalnya `services/` meng-import `../models/Visit.js`). Aturan ini tidak bisa membedakan "modul sendiri" dan "modul lain" karena hanya mencocokkan string path. Gunakan alat yang sadar batas modul.

**Opsi 1 – `eslint-plugin-boundaries` (umpan balik langsung di editor):**

```javascript
// eslint.config.js
import boundaries from 'eslint-plugin-boundaries';

export default [
  {
    files: ['src/**/*.js'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'src/core/*' },
        { type: 'module-public', pattern: 'src/modules/*/index.js', mode: 'file', capture: ['module'] },
        { type: 'module-internal', pattern: 'src/modules/*/**', capture: ['module'] }
      ]
    },
    rules: {
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          { from: 'core', allow: ['core'] },
          // Internal modul boleh ke core, ke internal modul SENDIRI, dan ke index.js modul LAIN
          { from: 'module-internal', allow: [
            'core',
            ['module-internal', { module: '${from.module}' }],
            'module-public'
          ] },
          { from: 'module-public', allow: ['core', ['module-internal', { module: '${from.module}' }]] }
        ]
      }]
    }
  }
];
```

**Opsi 2 – `dependency-cruiser` (penjaga di CI, juga bisa menggambar grafik dependensi):**

```javascript
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    {
      name: 'no-cross-module-internals',
      severity: 'error',
      comment: 'Modul hanya boleh mengakses modul lain via index.js',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/(?!index\\.js$)',
        pathNot: '^src/modules/$1/'
      }
    },
    {
      name: 'core-must-not-depend-on-modules',
      severity: 'error',
      from: { path: '^src/core/', pathNot: '^src/core/database/register-models\\.js$' },
      to: { path: '^src/modules/' }
    }
  ]
};
```

Jalankan `npx depcruise src --config .dependency-cruiser.cjs` di pipeline CI. Struktur lengkap konfigurasi dan letaknya ada di [Lampiran A](07-lampiran-struktur-kode-referensi.md).

Setiap kali ada engineer yang mencoba jalan pintas dengan meng-import model milik modul tetangga, perintah `npm run lint` atau GitHub Actions akan langsung menolak PR (*Pull Request*) tersebut dengan pesan galat yang jelas.

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Ilustrasi Kasus: Skenario Transaksi Admisi Pasien & Pembuatan Invoice Awal

Bayangkan seorang pasien datang ke loket pendaftaran rawat jalan:
1. Petugas pendaftaran memilih Poli Penyakit Dalam dan Dokter Spesialis.
2. Modul `admission` harus membuat rekam kunjungan baru (`Visit`).
3. Namun sebelum kunjungan sah, modul `billing` harus membuat invoice awal untuk biaya karcis pendaftaran dan administrasi rumah sakit.
4. Karena kita berada dalam satu Monolith, kita ingin operasi ini bersifat **Atomik** (ACID): jika pembuatan invoice gagal, kunjungan pasien harus dibatalkan (*rollback*).

Bagaimana modul `admission` berkomunikasi dengan modul `billing` tanpa melanggar batasan arsitektur?

```text
  [ Client (HTTP Request) ]
             │
             ▼
  [ admission.handler.js ]
             │ (ekstrak payload & user)
             ▼
  [ registration.service.js ] ──(Memulai Managed DB Transaction: 't')
             │
             ├─► [ visit.repository.js ] (Simpan kunjungan di tabel admission_visits, trx: t)
             │
             └─► [ billing.index.js ] -> billingService.initializeInvoice(..., { transaction: t })
                                                │
                                                ▼
                                         (Simpan invoice di billing_invoices, trx: t)
```

Dengan meneruskan objek Sequelize `{ transaction: t }` melalui kontrak Service, pendaftaran dan invoice awal tetap atomik selama keduanya masih berada di satu database fisik.

> [!WARNING]
> **Trade-off yang harus disadari tim.** Meneruskan `transaction` Sequelize lewat kontrak publik berarti **detail infrastruktur bocor ke dalam kontrak antar modul**. Ini bertentangan dengan janji "siap dicabut menjadi microservice": begitu `billing` pindah ke database lain, transaksi bersama ini mustahil dan kontraknya harus diubah.
>
> Aturan praktis yang kami sarankan:
> - **Boleh** berbagi transaksi hanya jika kegagalan langkah kedua memang harus membatalkan langkah pertama secara bisnis (misalnya pendaftaran tidak sah tanpa invoice karcis). Catat setiap kasus seperti ini di ADR.
> - **Utamakan** pola event: `admission` menyimpan kunjungan dan menulis event `admission.visit.registered` ke tabel outbox dalam transaksi lokalnya sendiri, lalu `billing` membuat invoice saat menerima event tersebut (konsistensi eventual).
> - Saat modul benar-benar dipecah, transaksi bersama diganti dengan **Saga** (langkah kompensasi, misalnya membatalkan kunjungan jika invoice gagal dibuat).

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

1. [ ] **Buat Struktur Folder Modul Baru**: Restrukturisasi direktori `src/` menjadi `src/core/` dan `src/modules/`.
2. [ ] **Definisikan Batas 6 Modul Utama**: Petakan tabel-tabel database yang ada saat ini ke dalam 6 folder domain: `master-data`, `admission`, `emr`, `pharmacy`, `billing`, dan `bridging`.
3. [ ] **Hapus Eager Loading Cross-Module**: Cari semua deklarasi `include: [...]` pada query Sequelize yang memuat tabel milik domain lain. Ubah menjadi pemanggilan fungsi Service melalui `index.js`.
4. [ ] **Konfigurasi Guardrail Batas Modul**: Pasang `eslint-plugin-boundaries` (umpan balik di editor) dan `dependency-cruiser` (penjaga di CI) agar pelanggaran batas modul terdeteksi otomatis. Jangan mengandalkan `no-restricted-imports` berbasis path relatif saja.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Batas arsitektur yang baik bukanlah tembok yang kaku, melainkan pintu gerbang dengan penjaga yang disiplin. Jadikan `index.js` sebagai penjaga pintu domain Anda."*  
> — Catatan Architecture Guild (kutipan ilustratif)

**Pertanyaan Refleksi Tim**:
* *"Apakah di dalam codebase SIMRS kita hari ini, seorang developer baru bisa mengetahui batas sebuah modul hanya dengan melihat struktur folder, ataukah ia harus membaca ribuan baris kode untuk menebak ketergantungannya?"*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 1: Anatomi SIMRS & Jebakan Arsitektur](01-anatomi-simrs-dan-jebakan-arsitektur.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 3: Clean Implementation & Standar Kode](03-standar-kode-clean-architecture-hono-sequelize.md)**
