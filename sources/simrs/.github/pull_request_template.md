### 📋 Checklist Pembuatan Fitur / Modul Baru

Sebelum mengajukan Pull Request (PR), pastikan Anda telah mencentang seluruh poin berikut:

1. [ ] **Penempatan Berkas**: Apakah fitur baru Anda berada di dalam folder domain yang tepat di `src/modules/<nama-modul>/`?
2. [ ] **Isolasi Database**: Apakah model Sequelize Anda hanya mendefinisikan tabel milik modul Anda sendiri tanpa deklarasi `belongsTo`/`hasMany` ke modul lain?
3. [ ] **Kontrak Publik**: Jika modul lain membutuhkan fungsi dari fitur Anda, apakah fungsi tersebut sudah didaftarkan di `src/modules/<nama-modul>/index.js`?
4. [ ] **Skinny Handler**: Apakah fungsi di `handlers/` Anda hanya melakukan validasi, memanggil service, dan mengembalikan `sendSuccess` (maksimal ~25 baris)?
5. [ ] **Pure Service**: Apakah fungsi di `services/` Anda 100% bebas dari objek `c` (Hono Context)?
6. [ ] **Validasi Zod**: Apakah semua input mutasi (`POST`/`PUT`/`PATCH`) telah divalidasi dengan Zod schema?
7. [ ] **Error Handling**: Apakah Anda melempar `AppError` alih-alih `Error` biasa untuk validasi aturan bisnis?
8. [ ] **Guardrail Batas Modul**: Apakah `npm run lint` dan `npx depcruise src` lulus tanpa pelanggaran batas modul?
9. [ ] **Transaksi Lintas Modul**: Jika Anda meneruskan `transaction` ke service modul lain, apakah alasannya sudah dicatat di ADR?
10. [ ] **Audit Trail**: Untuk tabel klinis, apakah tidak ada bulk update/destroy tanpa `individualHooks: true`?

