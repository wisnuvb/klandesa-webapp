# Impor Data Warga via Excel

Impor membaca Excel milik desa apa adanya (template tidak wajib), lalu menampilkannya di tabel review yang bisa diedit sebelum disimpan.

## Alur

1. **Unggah** — `.xlsx`, `.xls`, `.csv` (maks 30 MB, 50.000 baris).
2. **Cocokkan kolom** — sistem menebak sheet dan kolom; pengguna bisa mengubahnya.
3. **Tinjau & perbaiki** — tabel editable, validasi per sel saat blur/Enter, saringan status.
4. **Hasil** — ditambahkan / diperbarui / dilewati / ditolak + unduh laporan baris bermasalah.

## Kode

Semua logika murni ada di `lib/residents-import/` dan dipakai identik oleh browser (preview) dan server (`app/api/residents/bulk`).

| Berkas | Isi |
|---|---|
| `fields.ts` | Registry field (label, sinonim header, tipe, contoh). Sumber tunggal template, pemetaan, dan validasi |
| `mapper.ts` | Pemeta kolom: sinonim + fuzzy header + profil isi kolom, penyelesaian konflik |
| `sheet-structure.ts` | Deteksi baris header, header bertingkat/sel gabungan, baris sampah, peran sheet |
| `vocab.ts` | Kosakata baku, alias, kode Dukcapil (jenis kelamin, agama, kawin, SHDK, pendidikan, darah, pekerjaan) |
| `nik-date.ts` | NIK (turunan tanggal lahir/gender), parse tanggal gaya Indonesia, serial Excel |
| `normalize.ts` | `normalizeRow` (normalisasi + validasi satu baris, idempoten) dan `toDbRecord` |
| `batch.ts` | Penggabungan lintas sheet, NIK ganda, Kepala Keluarga per KK, penautan NIK ayah/ibu |
| `plan.ts` | Rencana impor per workbook (sheet terpilih default, penyebaran pemetaan) |
| `read-workbook.ts` / `template.ts` | Pembaca SheetJS; template dan laporan error |

UI: `components/app/data-warga/ExcelUploadDialog.tsx` + `components/app/data-warga/import/`.

## Aturan penting

- **Tanggal lahir tidak pernah diisi "hari ini".** Bila kosong/placeholder (`1970-01-01`), diisi dari NIK; bila tak bisa, baris ditandai error.
- Jenis kelamin kosong diisi dari NIK; bentrok dengan NIK menjadi peringatan.
- NIK wajib 16 digit. NIK numerik 15+ digit berakhiran `0` ditandai kemungkinan terpotong Excel.
- Nilai baku tidak dikenali → peringatan (nilai asli dipertahankan), bisa dipetakan sekali untuk semua baris.
- Golongan darah "Tidak Tahu" disimpan kosong (kolom DB hanya 5 karakter).
- Error memblokir baris itu saja; baris lain tetap diimpor. Peringatan tidak memblokir.
- Server memvalidasi ulang semua baris; payload klien tidak dipercaya.

## Sheet

| Jenis | Default | Perlakuan |
|---|---|---|
| Data induk | dipilih | diimpor |
| Pecahan per RW/RT | dilewati bila ada sheet induk | salinan; digabung per NIK bila dipilih |
| Meninggal | dipilih | `isAlive=false`; menimpa baris induk yang NIK-nya sama |
| Pindah | **tidak** dipilih | bila dipilih: `moveDate` dari kolom, atau tanggal impor bila tak ada kolomnya |
| Daftar bantu | dilewati | bukan data induk |

> Catatan: statistik saat ini hanya memfilter `isAlive`, belum `moveDate`; warga pindah yang diimpor tetap terhitung.

## API

- `POST /api/residents/bulk` — `{ mode: "skip"|"fill"|"overwrite", rows: [{ ref, values }] }`, maks 5.000 baris/permintaan (klien mengirim per 1.000). Respons: `residentsCreated`, `residentsUpdated`, `skipped`, `accountsSuspended`, `rejected[{ref, errors}]`.
- `POST /api/residents/bulk/check` — `{ niks: string[] }` → `{ existing: string[] }`.

Bentuk lama `{ residents: [...] }` masih diterima.

## Performa (data ribuan baris)

- File dibaca di **Web Worker** (`read.worker.ts`); bila Worker tidak tersedia/gagal dimuat, jatuh ke thread utama.
- Penyusunan baris menyerahkan kendali ke browser tiap 2.000 baris (progress bar). Ukur di Node: 50.000 baris ±2,6 dtk.
- Tabel review dirender per 50 baris; analisis lintas-baris (NIK ganda, KK) dihitung ulang hanya bila field kuncinya diedit.
- Klien mengirim 1.000 baris per permintaan dan hanya kolom yang terisi (payload jauh lebih kecil).
- Server: `createMany` per 1.000; mode "lewati" hanya `SELECT id, nik`; pembaruan (mode isi/timpa) dilewati bila tidak ada perubahan dan dijalankan paralel (8 koneksi), bukan satu per satu.

## Sambungan ke aplikasi mobile

Impor **tidak membuat akun apa pun** (tidak menulis ke `users` maupun `citizen_accounts`). Warga membuat akunnya sendiri di aplikasi, dan password-nya hanya diketahui mereka. Impor hanya menyiapkan data `residents` yang akan dicocokkan:

| Jalur daftar mobile (`lib/mobile/citizen-register.ts`) | Syarat pada data hasil impor |
|---|---|
| Identitas | NIK 16 digit, **tanggal lahir persis**, **nama ibu kandung** (`namesMatch`), `isAlive` bukan false, `moveDate` kosong |
| Kode aktivasi KK (dibuat staf di aplikasi staf) | `kk` 16 digit dan sama dengan KK pada kode |

- Tinjauan impor menampilkan **kesiapan mobile** per warga (Mandiri / Kode KK / Belum bisa) dan saringannya; aturannya `lib/residents-import/mobile-readiness.ts`, memakai pencocok nama yang sama persis dengan mobile (`lib/mobile/person-name.ts`).
- **Meninggal/pindah** menonaktifkan akun mobile (`CitizenAccount.status = SUSPENDED`), karena mobile hanya memeriksa status akun. Berlaku untuk impor (mode *Timpa* dan *Perbarui status saja*) dan untuk edit manual di web (`/api/residents/[id]`). Aturan bersama: `lib/mobile/citizen-status-logic.ts`.
- Mode **Perbarui status meninggal/pindah saja** dipakai untuk mengimpor daftar MENINGGAL/PINDAH terhadap warga yang sudah terdaftar; tidak menambah warga baru dan tidak mengubah kolom lain.
- Tanggal lahir disimpan 00:00 UTC; `sameCalendarDay` di mobile menerima tafsiran UTC maupun WIB.

## Pengujian

`node --import tsx --test tests/residents-import.test.ts tests/residents-import-ui.test.tsx` (juga ada di `pnpm test:unit`).

## Belum dikerjakan

- Undo batch impor (butuh tabel batch/ID impor di skema).
- Profil pemetaan disimpan di DB (saat ini di `localStorage` per peramban).
- Saran AI untuk header yang tak terpetakan (sengaja ditunda; data kependudukan tidak boleh dikirim ke model pihak ketiga).
