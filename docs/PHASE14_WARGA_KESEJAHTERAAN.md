# Paket 14: kesejahteraan & hunian warga (jenis BPJS, rumah, listrik, jenis bantuan)

Tanggal: 2026-11-16. Status: **dikode dan teruji; SQL BELUM dijalankan di produksi; belum di-commit/deploy.**
Asal: masukan perangkat desa (Pak Hermansah): BPJS (Mandiri / bantuan pemerintah), rumah (milik sendiri / sewa / numpang), listrik (berapa kWh / pasang sendiri / non meteran), jenis bantuan (PKH / BPNT-Sembako / lain-lain). Harus bisa dilengkapi dan diubah dari halaman Data Warga dan selalu tampil di Detail Warga.

## Kolom (tabel `residents`)

| Kolom | Isi | Catatan |
|---|---|---|
| `isBpjsKis` | (sudah ada) peserta BPJS ya/tidak | tetap sumber kebenaran "punya BPJS" untuk statistik, SDGs, Laras |
| `bpjsType` | `MANDIRI` \| `BANTUAN_PEMERINTAH` (NULL = belum dicatat) | hanya bermakna bila `isBpjsKis` = true |
| `houseOwnership` | (sudah ada) Milik Sendiri / Sewa / Kontrak / Menumpang / Dinas / Lainnya | tanpa kolom baru; kini dipindah ke bagian "Kesejahteraan & Hunian" dan divalidasi |
| `electricityType` | `METERAN` \| `PASANG_SENDIRI` \| `NON_METERAN` | |
| `electricityPowerVa` | INT, daya terpasang dalam VA (mis. 450, 900, 1300) | hanya untuk `METERAN`; 1 sampai 99.999 |
| `aidPkh`, `aidBpnt` | BOOLEAN NOT NULL DEFAULT false | menerima PKH / BPNT-Sembako |
| `aidOther` | VARCHAR(255) NULL | bantuan lain-lain (teks bebas); terisi = menerima bantuan lain |

## Penerapan SQL

`PHASE14_WARGA_KESEJAHTERAAN_MIGRATION.sql` (+`_ROLLBACK.sql`), salinan identik di `prisma/migrations/20261116120000_resident_welfare_fields/`. ADITIF: 6 kolom, baris lama otomatis NULL/false. Dibuktikan di MySQL 8.1 sementara: skema lama (HEAD) + 3 warga → MIGRATION → warga utuh dan nilai `houseOwnership`/`isBpjsKis` lama tak berubah; `prisma migrate diff` ke `schema.prisma` = empty migration; ROLLBACK menghapus 6 kolom (3 warga utuh); MIGRATION ulang → kosong lagi. Urutan produksi: SQL dulu, baru kode (Prisma Client baru galat bila kolom belum ada).

## Aturan (lib/residents/welfare-fields.ts, dipakai POST/PUT/PATCH lewat parseExtraFields)

- Semantik parsial: kunci tak ada = tak disentuh; null/"" = kosongkan.
- Memilih `bpjsType` otomatis menandai `isBpjsKis` = true; `isBpjsKis` false membersihkan `bpjsType`; keduanya sekaligus (false + jenis) = 400.
- `electricityType` selain METERAN membersihkan daya; mengirim daya bersama jenis bukan-meteran = 400; mengirim daya saja diperiksa terhadap jenis yang TERSIMPAN (400 bila bukan METERAN) lewat `reconcileWelfare` di PUT/PATCH.
- `houseOwnership` divalidasi ke daftar opsi (huruf besar/kecil diabaikan; "Numpang" = "Menumpang"); nilai asing = 400. Nilai lama di DB yang di luar daftar dibiarkan sampai diubah.

## Titik yang diubah

- API: `parseExtraFields` memuat kolom baru; PUT/PATCH memanggil `reconcileWelfare` setelah membaca data tersimpan. Ekspor `/api/residents/export` menambah 5 kolom di akhir (Peserta BPJS, Jenis BPJS, Kepemilikan Rumah, Listrik, Jenis Bantuan).
- Layar: bagian baru "Kesejahteraan & Hunian" (`ResidentWelfareFields`) di formulir Tambah dan Ubah; Detail Warga: "Jenis Kepesertaan BPJS" dan bagian "Ekonomi, Hunian & Bantuan" (selalu tampil, "-" bila kosong).
- Formulir Ubah hanya mengirim isian yang berubah dan membuang nilai kosong, jadi isian kesejahteraan yang dikosongkan (jenis BPJS, rumah, listrik, daya, bantuan lain) dikirim eksplisit sebagai `null` (`CLEARABLE_WELFARE_KEYS`).
- Privasi: kolom baru TIDAK ikut API publik v1, MCP, webhook, maupun aplikasi mobile (semuanya memakai `select` eksplisit minimal), sama seperti suku.

## Asumsi yang belum dikonfirmasi ke Pak Hermansah

- "Listrik berapa kwh" diartikan **daya terpasang (VA)**, bukan pemakaian bulanan.
- Rumah dan listrik disimpan **per warga** (seperti `houseOwnership` yang sudah ada), bukan per KK; anggota satu KK harus diisi masing-masing.
- "Jenis bantuan" di sini = catatan di profil warga; terpisah dari daftar penerima program (`SocialBenefitProgram`, dipakai untuk cek bantuan publik lewat NIK) dan tidak tersinkron otomatis.
- Opsi rumah mengikuti daftar yang sudah ada (ada Kontrak, Dinas, Lainnya selain tiga yang diminta).

## Belum dikerjakan (sengaja)

- Impor Excel untuk kolom baru (registri `lib/residents-import/fields.ts` + normalisasi).
- Filter di tabel Data Warga dan statistik per jenis BPJS / bantuan.
- Wizard "Tambah Keluarga": isian baru kosong, dilengkapi lewat Ubah.
- Formulir Ubah umumnya tidak bisa mengosongkan isian lama selain kolom kesejahteraan (batasan yang sudah ada).
