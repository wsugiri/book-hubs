# ADR-002: Pola Komunikasi Antar-Modul (Zero-Class Domain Event Bus & Transactional Outbox)

- **Status**: ACCEPTED
- **Tanggal**: 2026-11-11
- **Pengambil Keputusan**: SIMRS Architecture Guild

## 1. Konteks
Dalam arsitektur Modular Monolith SIMRS, modul-modul bisnis (`admission`, `emr`, `pharmacy`, `billing`, dan `bridging`) harus bersifat **independen (zero cross-module coupling)**. Jika modul pengirim (`admission`) memanggil langsung service modul lain (`billingService` atau `bridgingService`) saat mutasi pendaftaran, maka:
1. Modul `admission` menjadi terikat (*tightly coupled*) pada detail bisnis modul lain.
2. Setiap ada kebutuhan baru (misal: tambah notifikasi antrean atau tambah pelaporan Kemenkes), kode inti `registration.service.js` harus terus dibongkar pasang (*melanggar Open-Closed Principle*).

## 2. Keputusan
Kami menetapkan prinsip **Functional, Zero-Class & Event-Driven Decoupling**:

1. **In-Process Domain Event Bus (`src/core/events/event-bus.js`)**:
   - Dibangun menggunakan *pure factory function* (`createEventBus`) tanpa ES6 `class`.
   - Saat perubahan state terjadi (misal: pasien terdaftar di `admission`), modul `admission` hanya menerbitkan **satu** domain event:
     ```javascript
     await eventBus.publish(createVisitRegisteredEvent(newVisit), { transaction: t });
     ```
   - Konteks transaksi database `{ transaction: t }` diteruskan ke para subscriber agar konsistensi ACID tetap terjaga.

2. **Autonomous Module Subscribers (`src/modules/<domain>/subscribers/`)**:
   - Setiap modul bertanggung jawab mendaftarkan subscriber-nya sendiri di `src/app.js`:
     - **Modul Billing** (`registerBillingSubscribers`): Mendengarkan `admission.visit.registered` -> membuat tagihan karcis pendaftaran.
     - **Modul Bridging** (`registerBridgingSubscribers`): Mendengarkan `admission.visit.registered` -> menjadwalkan pengiriman ke tabel `bridging_outbox` (`BPJS_VCLAIM` atau `SATUSEHAT_FHIR`).
     - **Modul EMR** (`registerEmrSubscribers`): Mendengarkan `admission.visit.registered` -> menyiapkan lembar awal pengkajian medis poli.

3. **Two-Phase Claim pada Outbox Worker (`outbox.worker.js`)**:
   - Worker mengklaim baris `PENDING` menjadi `PROCESSING` dalam transaksi singkat (`FOR UPDATE SKIP LOCKED`), langsung melakukan `COMMIT`, baru kemudian mengeksekusi panggilan HTTP ke BPJS/SATUSEHAT di luar transaksi DB dengan pelindung `createCircuitBreaker`.

## 3. Konsekuensi Positif
- **100% Independen**: Tidak ada satu pun modul di `src/modules/*` yang meng-import modul lain untuk efek samping bisnis.
- **Zero-Class Consistency**: Seluruh codebase konsisten menggunakan *plain functions / closures* tanpa beban pewarisan objek (`class` / `this`).
- **Database Connection Pool Aman**: Transaksi database tidak pernah ditahan selama pemanggilan jaringan HTTP eksternal.
