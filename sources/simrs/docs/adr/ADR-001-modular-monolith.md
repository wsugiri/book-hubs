# ADR-001: Mengadopsi Pola Modular Monolith di atas Microservices untuk SIMRS

- **Status**: ACCEPTED
- **Tanggal**: 2026-11-10
- **Pengambil Keputusan**: SIMRS Architecture Guild

## 1. Konteks
Sistem rumah sakit memiliki alur pelayanan pasien yang sangat terintegrasi (Admisi -> Rekam Medis -> Kasir -> Farmasi). Tim engineering beranggotakan 8-12 orang dengan latar belakang keahlian menengah. Biaya operasional cloud harus dapat ditekan seminimal mungkin, dan sistem harus bisa di-deploy di rumah sakit daerah yang hanya memiliki server lokal (on-premise).

## 2. Keputusan
Kami memutuskan untuk mengadopsi pola **Modular Monolith** dengan pendekatan Bounded Context (Domain-First), menggunakan Hono dan Sequelize. Seluruh modul berada dalam satu repositori dan basis data fisik yang sama, namun dipisahkan secara logis dengan aturan isolasi folder yang ketat.

## 3. Konsekuensi Positif
- Deployment sangat sederhana: hanya 1 container Docker atau 1 AWS Lambda function.
- Menghilangkan latensi jaringan internal (zero internal network hops).
- Mendukung transaksi ACID basis data lokal yang aman untuk kasir dan admisi.
- Struktur folder modular menjamin kemudahan pemisahan ke Microservice di masa depan jika ada modul yang membutuhkan penskalaan independen.

## 4. Konsekuensi Negatif & Kompromi
- Memerlukan disiplin tim yang ketat untuk tidak melakukan cross-import langsung.
- Penegakan aturan harus diotomatisasi melalui custom ESLint rules dan dependency-cruiser di CI/CD.

