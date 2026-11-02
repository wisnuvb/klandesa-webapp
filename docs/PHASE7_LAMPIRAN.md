# Paket 7: lampiran berkas lintas modul (gelombang 1)

Tanggal: 2026-11-02. Status: **dikode dan teruji lokal (unit + MySQL sementara); SQL belum dijalankan di DB dev/produksi; belum di-commit/deploy.**
Asal: masukan perangkat desa ("surat masuk, SK, dll perlu field file karena penyimpanan kini digital"). Keputusan pemilik: semua berkas yang diunggah dicatat ukurannya untuk mengukur pemakaian storage.

## Rancangan

Satu tabel tautan generik, bukan kolom per modul: `record_attachments(villageId, entityType, entityId, archiveId, label)` menaut rekaman mana pun ke baris `digital_archives`. Berkas tidak disalin.

- **Ukuran dan kuota** tetap dicatat Arsip Digital: `digital_archives.fileSize` (diambil dari objek nyata di storage, bukan klaim klien) dan `villages.storageUsed`. Unggah lampiran lewat jalur yang sama (presign, PUT, `POST /api/digital-archives`), jadi cek kuota dan verifikasi objek ikut berlaku. Semua lampiran masuk kategori "Lampiran" dengan subfolder per modul (mis. Lampiran/Register Surat), privat.
- Jalur unggah lain yang sudah ada: unggahan mobile dan foto warga dihitung agregat di `village_media_usage.mobileBytes` (bukan per berkas).
- **Izin** ditentukan rekaman induknya (bukan sumber daya `archive`): membaca daftar/berkas = `read`, melampirkan/melepas = `update` pada sumber daya modul (katalog: `lib/attachments/catalog.ts`). Berkas privat di Arsip Digital biasanya hanya terbuka bagi pengunggah/admin; rute lampiran mengalirkannya berdasarkan izin atas rekaman induk, jadi staf lain yang boleh membaca surat itu boleh membuka lampirannya. Tidak ada URL publik.
- **Integritas:** menghapus berkas arsip yang masih terlampir ditolak 409 (lepas lampiran dulu). Melepas lampiran TIDAK menghapus berkas (tetap di Arsip Digital dan tetap terhitung storage). Tautan yatim (berkas terhapus lewat jalur lain) ditampilkan "berkas sudah dihapus", bukan galat. Maksimal 20 lampiran per rekaman. Berkas yang sama tak bisa dilampirkan dua kali pada rekaman yang sama.
- Bila penautan gagal sesudah unggah, berkas yang baru diunggah dibersihkan lagi (tidak jadi yatim yang memakan kuota).

## Berkas

| Bagian | Berkas |
|---|---|
| Skema + SQL | `RecordAttachment` di `prisma/schema.prisma`; `PHASE7_LAMPIRAN_MIGRATION.sql`, `PHASE7_LAMPIRAN_ROLLBACK.sql` (1 tabel; MIGRATION dibuktikan identik dengan skema lewat `prisma migrate diff`) |
| Katalog, servis | `lib/attachments/catalog.ts` (klien-aman), `lib/attachments/service.ts` (pemeriksaan desa, batas, duplikat) |
| API | `GET/POST /api/lampiran`, `DELETE /api/lampiran/[attId]`, `GET /api/lampiran/[attId]/file`; pembantu aliran bersama `lib/digitalArchive/stream.ts` (rute berkas arsip lama memakainya juga, perilaku sama) |
| Klien | `lib/attachments/client.ts` (unggah+tautkan), `components/app/attachments/{useAttachments,AttachmentsSection}` |
| Tes | `tests/attachments.test.ts` (katalog, parsing, statis rute), `tests/attachments.integration.test.ts` (11 tes MySQL: isolasi antar-desa, duplikat, batas, yatim, cascade) |

## Terpasang di (20 jenis rekaman)

Gelombang 1: Register Surat (form; antrean saat surat baru), Produk Hukum (form), Lembaga Desa (form), Perangkat Desa (form tambah, dialog ubah, dialog detail baca-saja), Musyawarah (halaman detail; boleh ditambah kapan saja termasuk sesudah final), Mutasi Penduduk (form catat dengan antrean unggah, plus kartu "Lampiran dokumen").

Gelombang 2: Pengadaan, Kerja Sama, BLT (program), PKTD (kegiatan), Inventaris/Aset (baris), Usulan DTSEN (baris), Mediasi keamanan (kartu) dan SK anggota Satlinmas (baris), Laporan Kepala Desa, Transaksi kas (dialog detail), SPP APBDes (baris), legalitas dan pengurus BUMDes, pembentukan koperasi.

- Rekaman tunggal yang barisnya dibuat saat simpan pertama (laporan kepala desa, legalitas BUMDes, pembentukan koperasi) memperlihatkan "Simpan datanya terlebih dahulu" sampai ada `id`; `id` ditambahkan ke tampilan (null bila belum tersimpan).
- Tabel anak BUMDes/koperasi tidak punya `villageId` sendiri, jadi kepemilikan desa diperiksa lewat induknya (`bumdes.villageId`, `cooperative.villageId`); teruji lintas desa.
- Izin BUMDes mengikuti matriks (`bumdes`): kepala desa bisa membaca dan menyetujui, tetapi tidak melampirkan, lebih ketat daripada aturan kelola BUMDes sendiri (admin dan kepala desa).
- Penanda "N lampiran" di daftar: `GET /api/lampiran/ringkasan?type=&ids=` (satu permintaan per halaman), dipakai Register Surat, Produk Hukum, Lembaga, Perangkat (tabel), Musyawarah, Mutasi, Aset, DTSEN; diperbarui otomatis saat lampiran berubah (peristiwa `lampiran:changed`).
- Sidebar Arsip Digital memuat kartu "Pemakaian per Sumber" (`lib/digitalArchive/usage.ts`): lampiran dirinci per modul ("Lampiran · Register Surat"), sisanya per kategori; delapan baris teratas, sisanya "Lainnya".

Menambah modul: satu entri di `ATTACHMENT_ENTITIES`, satu `case` di `entityExists`, lalu `useAttachments`/`LiveAttachments`/`AttachmentDisclosure` di UI-nya. Tes statis memastikan setiap jenis katalog terpasang minimal sekali; tes integrasi memastikan setiap jenis terisolasi antar desa.

## Belum dikerjakan (sengaja)

- Kolom lama yang tak terpakai (`Official.skPengangkatan`, `Transaction.receiptUrl/attachments`, `MailAttachment`, `Request.attachments`) dibiarkan.
- Modul tanpa kebutuhan jelas dilewati: Absensi, Posyandu, Forum, Feed sosial, Billing, Website, Mitra, Pangan.
- Uji di peramban/perangkat: belum (hanya tes render, tipe, lint, dan integrasi servis).
