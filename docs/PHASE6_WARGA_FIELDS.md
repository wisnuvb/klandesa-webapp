# Paket 6: field warga tambahan (suku, status penduduk, akta, KTP-el, perkawinan, dokumen WNA)

Tanggal: 2026-11-02. Status: **dikode dan teruji lokal; SQL belum dijalankan di DB dev maupun produksi; belum di-commit/deploy.**
Asal: masukan perangkat desa (suku perlu ada; cari field lain yang dibutuhkan). Mendahului laporan LAMPID (butuh status penduduk/tanggal datang) dan wizard "Tambah Keluarga".

## Kolom baru pada `residents` (semua NULL, aditif)

| Kolom | Isi | Catatan |
|---|---|---|
| `ethnicity` | Suku/etnis, VARCHAR(100) | Daftar baku di `lib/residents/ethnicity.ts` (ejaan seragam untuk statistik); teks di luar daftar tetap boleh |
| `residencyStatus` | `TETAP` \| `TIDAK_TETAP` | Penduduk tetap vs sementara/pendatang |
| `arrivalDate` | DATE | Tanggal datang; dasar kategori "Datang" LAMPID |
| `originAddress` | VARCHAR(500) | Alamat/daerah asal |
| `birthCertNo` | VARCHAR(50) | Nomor akta kelahiran |
| `ktpStatus` | `BELUM_WAJIB` \| `BELUM_REKAM` \| `SUDAH_REKAM` \| `SUDAH_CETAK` | Status perekaman KTP-el |
| `marriageDate`, `marriageCertNo` | DATE, VARCHAR(50) | Tercantum di KK |
| `passportNo`, `kitasNo` | VARCHAR(30) | Khusus WNA; form hanya menampilkannya bila kewarganegaraan WNA |

Agama "Kepercayaan" sudah ada di `RELIGION_OPTIONS`, jadi tidak ditambah kolom.

## Penerapan SQL

`PHASE6_WARGA_FIELDS_MIGRATION.sql` (+`_ROLLBACK.sql`). Dibuktikan di MySQL 8.1 sementara: skema lama (HEAD) → MIGRATION → `prisma migrate diff` ke `schema.prisma` kosong; ROLLBACK menghapus 10 kolom; MIGRATION ulang berhasil. Prosedur produksi ikut `memory/prod-deploy-procedure`: SQL dulu, baru kode (Prisma Client baru akan galat bila kolom belum ada).

## Titik yang diubah

- API: `POST /api/residents`, `PUT` dan `PATCH /api/residents/[id]` memakai `parseExtraFields` (`lib/residents/extra-fields.ts`): kunci tak ada = tak disentuh, string kosong/null = kosongkan, nilai tak sah = 400 dengan pesan Indonesia. Kunci body memakai nama kolom (camelCase).
- Impor Excel: 10 field baru di registri (`lib/residents-import/fields.ts`) lengkap dengan sinonim header; normalisasi suku/status memetakan teks bebas ke kode baku, tidak dikenali → dikosongkan dengan peringatan (bukan galat). Mode "isi kolom kosong"/"timpa" ikut (`UPDATABLE`).
- Form: seksi "Kependudukan Tambahan" di Edit Warga (`EthnicityField`: dropdown bisa dicari + "Lainnya (ketik sendiri)"); Detail Warga menampilkan suku dan seksi dokumen.
- Ekspor: kolom Suku ditambahkan pada `/api/residents/export`.
- Privasi: nomor akta, paspor, KITAS, dan alamat asal dimasker di log audit (`RESIDENT_AUDIT_MASKED`).

## Tambahan sesudah rilis awal (2026-11-02)

- Statistik per suku: kartu "Distribusi Suku" di halaman Statistik (klik = daftar warga), sheet "Suku" di ekspor Excel statistik, dimensi `ethnicity` pada daftar/ekspor warga per kategori (kolom "Suku" ditambahkan di akhir ekspor). Kosong dihitung "Tidak Diketahui".
- Filter Suku di modal filter Data Warga (`GET /api/residents?ethnicity=`).
- Keputusan privasi: suku TIDAK ditampilkan di API publik v1, MCP, webhook, maupun aplikasi mobile (semuanya memakai `select` eksplisit yang sengaja minimal dan menyamarkan NIK). Buka hanya bila ada kebutuhan dan dasar izin yang jelas.

## Perbaikan bug jenis kelamin (ditemukan 2026-11-02)

`AddResidentModal` dan `EditResidentModal` mengirim `"M"`/`"F"`, dan API menyimpannya apa adanya, padahal statistik, filter, surat, dan tampilan membaca `"Laki-laki"`/`"Perempuan"`. Akibatnya warga yang ditambah/diubah lewat form itu tidak terhitung di statistik jenis kelamin, dan kolom jenis kelamin di form ubah tampak kosong untuk data normal. Diperbaiki: API menormalkan lewat `lib/residents/gender.ts` (menerima M/F/L/P/varian, menolak yang lain), modal mengirim nilai baku, dan form ubah menampilkan nilai lama "M"/"F" sebagai nilai baku. Data lama yang terlanjur "M"/"F" dikoreksi dengan `PHASE6_GENDER_FIX.sql` (opsional; periksa dulu dengan SELECT di berkas itu).

## Belum dikerjakan (sengaja)

- Kolom Suku di tabel Data Warga (tabel sudah padat; suku terlihat di Detail dan bisa disaring).
- Form tambah warga satu orang (`AddResidentModal`) tetap ada untuk satu orang; wizard "Tambah Keluarga" (PHASE8) untuk satu KK beserta anggotanya.
- Uji di peramban: hanya tes render server, belum dicoba di peramban.
