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

## Belum dikerjakan (sengaja)

- Statistik per suku (halaman Statistik, modal daftar, ekspor): wiring dimensi baru menyentuh banyak berkas.
- Filter/kolom tabel Data Warga untuk suku.
- Form tambah warga satu orang (`AddResidentModal` tidak terpasang di mana pun); digantikan wizard "Tambah Keluarga".
- Penyaringan field ini di API publik v1, MCP, webhook, dan aplikasi mobile: belum diperiksa (belum ada yang memetakan kolom baru).
- Uji di browser: hanya tes render server, belum dicoba di peramban.
