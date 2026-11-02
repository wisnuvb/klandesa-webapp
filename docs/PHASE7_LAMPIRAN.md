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

## Terpasang di (gelombang 1)

Register Surat (form catat/ubah; antrean saat surat baru), Produk Hukum (form), Lembaga Desa (form), Perangkat Desa (form tambah, dialog ubah, dialog detail baca-saja), Musyawarah (halaman detail; boleh ditambah kapan saja termasuk sesudah final), Mutasi Penduduk (kartu: "Lampiran dokumen").

Menambah modul: satu entri di `ATTACHMENT_ENTITIES`, satu `case` di `entityExists`, lalu `useAttachments`/`LiveAttachments` di form. Tes statis memastikan setiap jenis katalog terpasang minimal sekali.

## Belum dikerjakan (sengaja)

- Gelombang 2 (BUMDes, koperasi/KDMP, aset, BLT/PKTD/DTSEN, keamanan/bencana, pengadaan, keuangan, laporan kepala desa).
- Penanda klip/jumlah lampiran di daftar (register, produk hukum, dst.).
- Form catat Mutasi belum punya antrean unggah (ActionResult tidak mengembalikan id); lampiran ditambah dari kartu sesudah dicatat.
- Pemakaian storage per sumber (lampiran vs arsip biasa) belum ada layar tersendiri; bisa dihitung dari kategori "Lampiran".
- Kolom lama yang tak terpakai (`Official.skPengangkatan`, `Transaction.receiptUrl/attachments`, `MailAttachment`, `Request.attachments`) dibiarkan.
- Uji di peramban/perangkat: belum (hanya tes render, tipe, lint, dan integrasi servis).
