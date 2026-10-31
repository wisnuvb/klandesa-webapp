# Fase 2.3: Data Kustom (tabel dan kolom buatan desa)

Tanggal: 2026-10-31. Status: **dikode dan teruji (MySQL sementara); skema diterapkan ke DB lokal; BELUM di produksi.**
Induk: [PLATFORM_STRATEGY.md](PLATFORM_STRATEGY.md) §5.4 konsep iii dan §6 Fase 2 butir 5. Kunci API dan `/api/v1`: [PHASE2_API_KEYS.md](PHASE2_API_KEYS.md).

## Tujuan
Desa menutup celah data (kategori Satu iDesa yang belum tercakup, program lokal, inventaris) tanpa menunggu pengembangan, dan tanpa kembali ke spreadsheet. Setiap tabel otomatis punya formulir, daftar, unduhan CSV, jejak audit, dan akses API yang aman.

## Batasan yang disengaja
- **Tipe terbatas:** teks pendek, teks panjang, angka (min/maks/satuan), tanggal, ya/tidak, pilihan. Tanpa SQL bebas, tanpa rumus.
- **Skema hanya bertambah:** kolom tidak dihapus (diarsipkan, isinya tetap), jenis isian tidak bisa diubah, kolom wajib baru tidak boleh pada tabel yang sudah berisi data, pilihan hanya bisa ditambah.
- **Kelas data per kolom** (`NONE | PERSONAL | SENSITIVE`): hanya `NONE` yang pernah keluar lewat API. Kolom yang diarsipkan juga tidak keluar. Membuka kolom pribadi menjadi `NONE` memunculkan peringatan di pratinjau.
- **Pratinjau wajib:** membuat tabel melewati langkah ringkasan; mengubah susunan memakai `PATCH … { dryRun: true }` yang menghitung perubahan tanpa menulis.
- **Batas:** 20 tabel/desa, 30 kolom aktif (60 termasuk arsip)/tabel, 20.000 baris/tabel, 30 pilihan/kolom.
- **Hapus lunak** untuk baris (`deletedAt`): hilang dari aplikasi dan API, masih ada untuk pemulihan teknisi. Tabel hanya diarsipkan.
- Tabel boleh **terkait warga** (`linkResident`): tiap baris menunjuk satu warga milik desa yang sama (dicek); warga dipilih dari Data Warga. Tautan ini tidak pernah keluar lewat API; CSV hanya memuat nama dan 4 digit terakhir NIK.

## Berkas
| | |
|---|---|
| Skema | `CustomTable`, `CustomField`, `CustomRecord` di `prisma/schema.prisma`; SQL `PHASE2_CUSTOM_DATA_MIGRATION.sql` (hanya CREATE + FK), rollback `PHASE2_CUSTOM_DATA_ROLLBACK.sql` |
| Logika murni | `lib/custom-data/schema.ts` (validasi tabel/nilai/evolusi skema, CSV), `ui-model.ts` (templat, payload, ringkasan), `public.ts` (kolom yang boleh keluar) |
| Layanan DB | `lib/custom-data/service.ts` (semua kueri dibatasi `villageId`) |
| API operator | `/api/custom-data/tables`, `/tables/[id]` (GET/PATCH/DELETE=arsip), `/tables/[id]/records`, `/tables/[id]/export`, `/records/[id]` |
| API publik | `/api/v1/data`, `/api/v1/data/{slug}` dengan scope `data-kustom:read` (tercantum di OpenAPI dan `llms.txt`) |
| Izin | resource `custom_data` (admin/sekretaris CRUD+ekspor, staf CRUD, kepala desa baca); **ubah susunan tabel khusus admin dan sekretaris** (dicek di rute). Modul `data-kustom` di sidebar (Pengaturan), tersedia di semua paket |
| Layar | `/data-kustom` (daftar, buat tabel dengan contoh siap pakai + ringkasan), `/data-kustom/[id]` (data, tambah/ubah/hapus, unduh CSV, ubah susunan dengan pratinjau, arsipkan) |
| Tes | `custom-data-schema.test.ts` (12), `custom-data-ui-model.test.ts` (7), `custom-data.integration.test.ts` (MySQL: 13) |

## Keamanan yang dibuktikan tes
Isolasi antar-desa (tabel, baris, mengubah, menghapus, mengarsipkan, warga terkait); kolom PERSONAL/SENSITIVE/arsip dan tautan warga tidak pernah ada di jawaban API; CSV menetralkan rumus spreadsheet; audit mencatat struktur dan id, bukan isi baris; kunci `__proto__` pada masukan ditolak sebagai kolom tak dikenal (tes menangkap cacat nyata: galatnya sempat tertelan).

## Belum
Galeri templat lintas desa/kabupaten; formulir dari prompt AI (kredit AI); webhook saat baris berubah; pencarian/penyaringan di dalam tabel; impor CSV; enkripsi kolom SENSITIVE di DB; pemulihan baris terhapus dari layar; kuota/penagihan tabel ekstra (add-on).
