# Produk UKM milik warga

Produk UKM (baris `Potential` dengan `category` `UMKM`/`UKM`, halaman web `/ukm`) bisa **ditautkan ke warga pemilik**. Warga itu
melihat, mengunggah, dan memperbaiki produknya dari aplikasi mobile; semua warga melihat katalog produk desa di halaman
"Produk desa".

## Model data

- `Potential.residentId` (nullable, FK ke `residents`, `ON DELETE SET NULL`). Null = dikelola desa. Menghapus warga tidak menghapus produknya.
- `Potential.contactPhone` (nomor yang **diketik pemilik untuk produk ini**, bukan nomor terdaftar warga) dan `Potential.contactVisible` (bawaan `false`). Pemilik yang memutuskan nomor tampil atau tidak.
- Pengaturan desa disimpan di `villages.settings.ukm.moderation` (JSON, tanpa kolom baru; kunci lain seperti `wilayah` tidak disentuh).
- Tidak ada tabel baru. SQL: `docs/PHASE1_UKM_PEMILIK_MIGRATION.sql` (rollback: `..._ROLLBACK.sql`). Sudah diuji di MySQL 8.1: hasilnya identik dengan `schema.prisma` (`prisma migrate diff` kosong).
- Kategori produk **tetap dikelola admin**. Admin membuat kategori kosong sebagai baris "Kategori: X" berstatus `inactive` (cara lama), jadi baris itu tidak boleh pernah tampil sebagai produk. Pemilik hanya memilih dari daftar kategori yang ada.

## Status produk (`Potential.status`)

| Status | Arti | Siapa yang mengubah |
|---|---|---|
| `active` | Tayang di katalog (dan satu-satunya yang keluar di API publik v1 `/api/v1/potensi`) | Admin menyetujui; pemilik menayangkan kembali |
| `pending` | Kiriman warga, menunggu persetujuan admin | Otomatis saat warga membuat produk atau memperbaiki produk `inactive` |
| `hidden` | Disembunyikan oleh pemilik | Pemilik (bolak-balik dengan `active`) |
| `inactive` | Disembunyikan oleh admin desa | Admin (menolak/menyembunyikan) |

### Persetujuan admin bersifat opsional

Sakelar **"Periksa produk warga sebelum tayang"** di halaman `/ukm` (izin `ukm` + `update`; API `GET/PATCH /api/ukm-products/settings`, tercatat di audit).

| Pengaturan | Produk baru dari mobile | Staf diberi tahu |
|---|---|---|
| **Aktif** (bawaan) | `pending` sampai admin menyetujui | ya |
| Mati | langsung `active` | tidak (tidak ada yang perlu diputuskan) |

Yang **tidak** berubah oleh pengaturan ini: memperbaiki produk yang sudah `active` langsung berlaku; pemilik **tidak bisa** menayangkan sendiri produk
`pending`/`inactive`; produk `inactive` (sengaja ditutup admin) yang diperbaiki pemilik **tetap `pending`**, supaya penutupan admin tidak bisa dilewati.
Mematikan pengaturan tidak menayangkan produk yang sudah `pending`; admin tetap meninjaunya. Logika murni: `lib/mobile/ukm-logic.ts`.

### Kontak penjual (pilihan pemilik)

Di formulir mobile pemilik mengisi nomor dan sakelar **"Tampilkan nomor ke warga lain"**. Aturan:

- Orang lain hanya menerima `contactPhone` bila `contactVisible` **dan** produk `active`. Selain itu `null`. `showContact` hanya benar untuk pemilik.
- Pemilik selalu melihat nomornya sendiri. Mengosongkan nomor otomatis mematikan tampil; menampilkan tanpa nomor ditolak (400).
- Nomor: 8–15 digit, "+" di depan boleh, spasi/titik/kurung/strip dibuang.
- Daftar katalog dan "Produk saya" tidak pernah memuat nomor; hanya detail produk. Tidak ada di API publik v1 (`POTENTIAL_SELECT` eksplisit).
- Admin web hanya **melihat** (baris di kartu produk), tidak mengubahnya; itu keputusan pemilik.
- Aplikasi: penjual tidak mencantumkan kontak → "Tanyakan lewat kantor desa". Ada kontak → tombol WhatsApp (`wa.me`, awalan 62) dan Telepon.

## API mobile (`/api/mobile/v1`)

| Endpoint | Fungsi |
|---|---|
| `GET /ukm?q=&category=&cursor=` | Katalog (hanya `active`), 20 per halaman, kursor = id terakhir. Warga dan perangkat desa |
| `GET /ukm/mine` | Semua produk milik saya + `categories` + `limits` + `moderation` (true = produk baru diperiksa desa dulu) |
| `GET /ukm/{id}` | Detail: produk tayang, atau milik saya (semua status) |
| `POST /ukm` | Buat produk. Status `pending` atau `active` sesuai pengaturan desa; badan boleh memuat `contactPhone`, `showContact` |
| `PATCH /ukm/{id}` | Ubah sebagian bidang (termasuk `contactPhone`, `showContact`) dan/atau `{ visible }`; hanya pemilik |
| `POST /uploads/presign` `kind:"ukm"` | Foto ke `villages/<kode>/mobile-ukm/…` |

Batas (`UKM_LIMITS`): 30 produk tidak-tersembunyi per warga, 4 foto per produk, 5 produk baru per 24 jam, 20 permintaan tulis per 10 menit.
Respons **tidak pernah** memuat `productNotes` (catatan internal penjual), NIK, RT/RW, atau id pemilik; penjual tampil sebagai "Siti A." dan
`sellerArea` hanya dusun. Foto hanya boleh dari folder `mobile-ukm` desa itu sendiri atau yang sudah ada di produk (mis. unggahan admin lewat web).

## Web (admin)

- Modal produk: pilih **Pemilik produk (warga)** lewat `ResidentPicker` (hanya 4 digit NIK terakhir yang tampil).
- `PATCH /api/ukm-products/{id}` menerima `residentId` (null melepas tautan; harus warga hidup di desa yang sama) dan `status` (`active`/`inactive`).
- Kartu produk: lencana status (ikon + teks), pemilik, tombol **Setujui/Tolak/Tayangkan/Sembunyikan**, filter status, dan banner "N produk menunggu persetujuan".
- Saat admin mengubah status, pemilik menerima notifikasi di app (`deepLink` `/ukm/{id}`). Staf desa diberi tahu saat ada kiriman/ajuan ulang.

## Urutan rilis

1. Terapkan `PHASE1_UKM_PEMILIK_MIGRATION.sql` (aditif; kode lama tetap jalan: kolom baru nullable/berdefault). Sudah diuji bolak-balik dengan rollback; `prisma migrate diff` kosong.
2. Deploy web/API.
3. Rilis build aplikasi mobile baru (EAS). Aplikasi lama tidak punya halaman ini, tetapi tidak terganggu.

## Tes

- `tests/mobile-ukm.test.ts`: logika murni (validasi, status, pengaturan desa, kontak, serialisasi, kursor).
- `tests/ukm-owner.integration.test.ts`: rute mobile + helper web terhadap MySQL sungguhan (isolasi lintas desa/pemilik, kuota, audit, notifikasi, FK, persetujuan opsional, kebocoran kontak). Jalankan dengan `KEP_TEST_DATABASE_URL` ke DB bernama `*scratch*`/`*test*` yang skemanya sudah di-push.
- `mobile/tests/ukm-logic.test.ts`: validasi formulir di aplikasi.
