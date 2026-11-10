# Part 5: Compliance Kesehatan: Audit Trail RME, BPJS, & SATUSEHAT FHIR

> 📖 Hub Buku: **[The SIMRS Backend Playbook](index.md)**

---

## 📖 Narasi Pembuka & Latar Belakang (The Narrative Context)

Pada suatu sore di ruang sidang sengketa medis, seorang dokter spesialis bedah dan manajemen rumah sakit dihadapkan pada tuntutan hukum terkait dugaan malapraktik. Penggugat menduga ada perubahan dosis obat pasca-operasi pada catatan rekam medis pasien setelah pasien mengalami komplikasi fatal.

Hakim menoleh kepada saksi ahli teknologi informasi rumah sakit dan bertanya:
*"Dapatkah pihak rumah sakit membuktikan secara sah, siapa yang mengetik dosis awal obat tersebut, apakah ada pihak yang mengubahnya di kemudian hari, jam berapa perubahan itu terjadi, dari komputer mana, dan apa nilai dosis sebelum perubahan dilakukan?"*

Di banyak rumah sakit yang sistemnya dibangun secara serampangan, pertanyaan ini menjadi vonis kekalahan telak. Basis data mereka hanya menyimpan nilai terakhir (*overwrite column*) dengan kolom `updatedAt` tanpa riwayat mutasi nilai historis. 

Di Indonesia, **Permenkes No. 24 Tahun 2022 tentang Rekam Medis** secara eksplisit mewajibkan seluruh fasilitas pelayanan kesehatan menyelenggarakan Rekam Medis Elektronik (RME) yang memenuhi prinsip **Kerahasiaan, Integritas, Ketersediaan, dan Keterlacakan (Audit Trail)**. Catatan klinis yang sudah ditandatangani dokter bersifat *legally binding* dan tidak boleh diubah secara siluman.

Di sisi lain, beban operasional rumah sakit di Indonesia semakin dipersulit oleh integrasi wajib ke dua platform raksasa eksternal: **BPJS Kesehatan (VClaim & Antrean RS)** dan **Kementerian Kesehatan (SATUSEHAT FHIR)**. Masalahnya: server eksternal ini kerap mengalami *intermittent downtime*, latensi tinggi hingga belasan detik, atau perubahan struktur payload tanpa pemberitahuan matang. 

Jika arsitektur backend Anda mencampur aduk pemanggilan API BPJS dan SATUSEHAT di dalam alur pendaftaran atau kasir pasien, maka saat server BPJS *down*, seluruh loket rumah sakit seketika lumpuh. Pasien mengamuk di lobi, dan direktur rumah sakit akan memanggil tim IT ke ruang rapat darurat.

Bab ini mengupas bagaimana merancang arsitektur backend yang memenuhi kepatuhan hukum (*regulatory compliance by design*) dan membangun benteng isolasi (*resilient bulkhead*) untuk integrasi eksternal.

---

## 🔬 Teardown Konsep & Wawasan Utama (Deep-Dive Insights)

```text
                  ARSITEKTUR RESILIENSI BRIDGING & AUDIT TRAIL
  
  [ ALUR AUDIT TRAIL OTOMATIS ]
  Request HTTP ──► [ AsyncLocalStorage Middleware ] (Simpan actor & requestId)
                            │
                            ▼
                    [ Service EMR / Pharmacy ]
                            │ (Mutasi Data)
                            ▼
                    [ Sequelize Global Hook ] ──► Tulis ke 'clinical_audit_trails'
                                                   (actorId, oldValues, newValues, ip)
  
  ─────────────────────────────────────────────────────────────────────────────
  
  [ ALUR ISOLASI BRIDGING BPJS & SATUSEHAT ]
  Modul Admisi ──► [ Local DB Trx ] ──► Tulis ke 'bridging_outbox' (STATUS: PENDING)
                                                   │
                                                   ▼ (Asynchronous Worker)
                                        [ Circuit Breaker & Retry ]
                                                   │
                            ┌──────────────────────┴──────────────────────┐
                            ▼                                             ▼
                   [ API BPJS VClaim ]                          [ Kemenkes SATUSEHAT ]
                 (Jika Timeout -> Retry)                     (Jika Gagal -> Dead Letter)
```

---

### 1. Transparent Audit Trail by Design (Sesuai Permenkes RME)

Jangan pernah membebani setiap engineer untuk menulis manual kode pencatatan audit seperti:  
`await AuditLog.create({ actorId, before, after })` di setiap endpoint. Pendekatan manual ini 100% pasti akan terlupa saat developer terburu-buru mengejar deadline.

Audit trail harus bersifat **transparan dan otomatis di lapisan infrastruktur**, memanfaatkan kombinasi **`AsyncLocalStorage`** (Node.js native) dan **Sequelize Global Hooks**.

#### A. Menangkap Konteks Permintaan via AsyncLocalStorage
`AsyncLocalStorage` memungkinkan kita menyimpan identitas dokter/petugas dan `requestId` secara global di sepanjang siklus hidup satu request tanpa perlu mengoper parameter `actor` ke setiap fungsi:

```javascript
// src/core/http/context.js
import { AsyncLocalStorage } from 'node:async_hooks';

export const requestContext = new AsyncLocalStorage();

// Middleware Hono untuk mendaftarkan store konteks
export const contextMiddleware = async (c, next) => {
  const store = {
    requestId: c.get('requestId') || 'system',
    actorId: c.get('user')?.id || 'unauthenticated',
    actorRole: c.get('user')?.role || 'ANONYMOUS',
    clientIp: c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || '127.0.0.1'
  };

  await requestContext.run(store, async () => {
    await next();
  });
};
```

#### B. Mengikat Audit Trail Otomatis via Sequelize Global Hooks
Setiap kali ada model klinis (seperti `MedicalRecord`, `Prescription`, `Diagnosis`) yang dibuat, diubah, atau dihapus, hook Sequelize secara otomatis mencatat perbedaan nilai (*diff*):

```javascript
// src/core/database/audit-hook.js
import { requestContext } from '../http/context.js';

export const registerAuditHooks = (sequelize) => {
  // Hook setelah pembaruan data (UPDATE)
  sequelize.addHook('afterUpdate', async (instance, options) => {
    // Abaikan jika model bukan entitas klinis/audit (misal tabel log itu sendiri)
    if (instance.constructor.name === 'AuditLog') return;

    const context = requestContext.getStore() || { actorId: 'SYSTEM', requestId: 'auto' };
    const changedFields = instance.changed();

    if (!changedFields || changedFields.length === 0) return;

    const oldValues = {};
    const newValues = {};

    changedFields.forEach((field) => {
      oldValues[field] = instance.previous(field);
      newValues[field] = instance.get(field);
    });

    // Simpan ke tabel audit log
    await sequelize.models.ClinicalAuditTrail.create({
      tableName: instance.constructor.tableName,
      recordId: instance.id,
      action: 'UPDATE',
      actorId: context.actorId,
      actorRole: context.actorRole,
      requestId: context.requestId,
      clientIp: context.clientIp,
      oldValues,
      newValues,
      timestamp: new Date()
    }, { transaction: options.transaction });
  });
};
```

Dengan arsitektur ini, bahkan jika seorang developer magang lupa memikirkan audit trail, basis data SIMRS secara otomatis dan deterministik mencatat setiap perubahan data medis.

---

### 2. Isolasi Modul Bridging: Melindungi SIMRS dari Kerentanan Pihak Ketiga

API pihak ketiga adalah entitas yang tidak berada di bawah kendali kita:
* API BPJS VClaim sering mengalami lonjakan waktu respons hingga 20 detik pada awal bulan.
* API SATUSEHAT Kementerian Kesehatan memiliki aturan rate limit ketat (misal 100 request/menit).

#### Aturan Mutlak Modul Bridging:
1. **Dilarang Menjalankan Panggilan API Eksternal di dalam Transaksi Database Inti**:  
   Jangan pernah memanggil `axios.post('https://api.bpjs.../vclaim')` di dalam blok `sequelize.transaction(...)`. Jika server BPJS mengalami hang selama 30 detik, transaksi database lokal rumah sakit akan mengunci tabel (*row lock*) selama 30 detik, menyebabkan seluruh antrean loket membeku.
2. **Pola Transaksional Outbox (Transactional Outbox Pattern)**:  
   Simpan payload yang perlu dikirim ke BPJS/SATUSEHAT ke dalam tabel lokal `bridging_outbox` pada transaksi yang sama dengan pendaftaran pasien. Biarkan *background worker* asinkron yang mengirimkan payload tersebut dengan mekanisme *retry* dan *backoff* eksponensial.

```text
  [ Alur Pelayanan Pasien ]
  1. Pasien daftar di loket ──► DB Transaksi Lokal (Simpan Visit & Tulis ke Outbox) ──► Sukses (Pasien langsung ke poli)
                                                  │
                                                  ▼ (Di latar belakang / Asinkron)
  2. Background Outbox Worker ───────────────────► Kirim ke BPJS VClaim / SATUSEHAT
                                                  ├── Sukses: Update status outbox ke 'DELIVERED'
                                                  └── Gagal/Timeout: Retry 3x -> Alert Tim IT
```

#### Implementasi Circuit Breaker pada Modul Bridging:
Jika API eksternal mengalami kegagalan berturut-turut (misal 5 kali berturut-turut gagal), *Circuit Breaker* harus terbuka (*OPEN*) untuk menolak panggilan eksternal sementara waktu dan mengembalikan pesan fallback (*degraded mode*) tanpa membebani jaringan rumah sakit:

```javascript
// src/modules/bridging/services/circuit-breaker.js
export class SimpleCircuitBreaker {
  constructor(failureThreshold = 5, cooldownPeriodMs = 30000) {
    this.failureThreshold = failureThreshold;
    this.cooldownPeriodMs = cooldownPeriodMs;
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(asyncAction, fallbackAction) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
      } else {
        console.warn('[CIRCUIT BREAKER] Sirkuit sedang OPEN. Mengalihkan ke fallback.');
        return fallbackAction();
      }
    }

    try {
      const result = await asyncAction();
      this.reset();
      return result;
    } catch (err) {
      this.recordFailure();
      if (this.state === 'OPEN') {
        return fallbackAction();
      }
      throw err;
    }
  }

  recordFailure() {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.cooldownPeriodMs;
      console.error(`[CIRCUIT BREAKER] Terbuka! Kegagalan mencapai ${this.failureCount}. Cooldown selama ${this.cooldownPeriodMs}ms`);
    }
  }

  reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
}
```

---

## 🧠 Eksperimen Pikiran & Contoh Kasus di Dunia Nyata

### Kasus Nyata: Kegagalan Masal Saat Server Rujukan BPJS Down

Pada hari Selasa pukul 08:30 pagi, server bridging rujukan BPJS mengalami pemeliharaan jaringan tak terencana (*unannounced downtime*). 

**Di Rumah Sakit A (Arsitektur Lawan/Kopel Langsung)**:  
Tombol pendaftaran di loket admisi langsung memanggil endpoint BPJS secara synchronous di dalam handler. Setiap kali petugas mengklik "Daftar", sistem menunggu 60 detik sebelum muncul pesan error. Dalam waktu 15 menit, ratusan pasien lansia menumpuk di lobi, sistem pendaftaran lumpuh, dan petugas terpaksa beralih menggunakan buku tulis manual.

**Di Rumah Sakit B (Arsitektur Modular Monolith dengan Outbox Pattern)**:  
Modul `admission` menyimpan pendaftaran pasien secara lokal di database rumah sakit, mencetak nomor antrean poliklinik, dan menulis tugas sinkronisasi ke tabel `bridging_outbox` dengan status `PENDING`. Pasien dapat langsung berjalan menuju ruang dokter. Ketika server BPJS pulih pada pukul 09:15, background worker secara otomatis menyelesaikan pengiriman data SEP (Surat Eligibilitas Peserta) tanpa ada satu pun pasien yang terganggu di loket.

---

## ⚡ Panduan Aksi Nyata dari Bagian Ini (Action Checklist)

1. [ ] **Audit Tabel Audit Trail**: Pastikan tabel `clinical_audit_trails` memiliki indeks pada kolom `recordId`, `tableName`, dan `timestamp` agar pencarian riwayat medis di pengadilan berjalan instan.
2. [ ] **Terapkan AsyncLocalStorage Context**: Pasang middleware konteks di `src/app.js` untuk mengalirkan identitas pengguna dan `requestId` ke seluruh hook database.
3. [ ] **Haramkan HTTP Call di dalam DB Transaction**: Periksa seluruh basis kode dan pastikan tidak ada `axios`, `fetch`, atau SDK BPJS/SATUSEHAT yang berjalan di dalam blok `sequelize.transaction`.
4. [ ] **Gunakan Outbox Pattern untuk SATUSEHAT**: Standarisasi pengiriman FHIR Resource (Encounter, Condition, Observation) secara asinkron agar kegagalan jaringan internet rumah sakit tidak menghambat dokter dalam mengisi CPPT/SOAP.

---

## 💬 Kutipan Pilihan & Catatan Reflektif

> *"Dalam rekayasa sistem kesehatan, audit trail bukan sekadar fitur log untuk debugging programmer; audit trail adalah instrumen perlindungan hukum bagi dokter, kepastian hak bagi pasien, dan benteng pertahanan integritas institusi rumah sakit."*  
> — Health Informatics Legal Expert

**Pertanyaan Refleksi Tim**:
* *"Jika server BPJS atau SATUSEHAT mengalami downtime selama 2 jam besok pagi, apakah loket pendaftaran dan kasir di rumah sakit kita masih tetap bisa melayani pasien secara normal?"*

---

## 🧭 Navigasi Bab Selanjutnya

⬅️ **[Kembali ke Part 4: Dual-Runtime Architecture](04-dual-runtime-docker-dan-aws-lambda.md)** &nbsp;&nbsp;|&nbsp;&nbsp; 📖 **[Hub Buku](index.md)** &nbsp;&nbsp;|&nbsp;&nbsp; ➡️ **[Lanjut ke Part 6: Migration Playbook, Team Governance, & Living ADR](06-migration-playbook-dan-team-governance.md)**
