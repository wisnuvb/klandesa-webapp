# Fase 1 butir 4: Aset Desa (Buku Inventaris, Permendagri 1/2016)

Status: dikode 2026-11-01; belum diuji di browser; SQL produksi belum diterapkan.

## Dasar yang dibaca (sumber resmi)
Berita Negara 2016 No. 53 (peraturan.go.id/files/bn53-2016.pdf), termasuk gambar Lampiran.

- **Tidak ada KIB A–F** di aturan ini. Wajib: *Buku Inventaris Aset Desa* (Lampiran C, 9 kolom: No, Jenis Barang, Kode Barang, Identitas Barang, Asal Usul [APBDesa / Perolehan Lain yang Sah / Aset-Kekayaan Asli Desa], Tanggal Perolehan/Pembelian, Ket.), *Berita Acara Usulan Penghapusan*, *SK Kepala Desa tentang Penghapusan* beserta daftar aset yang dihapus (Jenis, Banyaknya, Tahun Perolehan, Ket.).
- Pasal 2: jenis aset desa; kekayaan asli desa = tanah kas desa, pasar desa, pasar hewan, tambatan perahu, bangunan desa, pelelangan ikan, pelelangan hasil pertanian, hutan, mata air, pemandian umum, lain-lain.
- Pasal 4 ayat 3: **aset strategis** (kekayaan asli desa + tanah ulayat) — Pasal 22: penghapusannya perlu persetujuan Bupati/Wali Kota; aset lain cukup Berita Acara + SK Kepala Desa (Pasal 23).
- Pasal 21: alasan penghapusan = beralih kepemilikan, pemusnahan, sebab lain (hilang/kecurian/terbakar).
- Pasal 10: status penggunaan aset ditetapkan tiap tahun dengan SK Kepala Desa (**belum dibuat**: lihat "Belum").

## Yang dibangun
- Tabel `inventory_items` (SQL aditif: `PHASE1_ASET_MIGRATION.sql`, rollback `PHASE1_ASET_ROLLBACK.sql`). Terpisah dari `village_assets` (titik peta) agar batas modul Peta tidak terpengaruh; boleh ditautkan lewat `mapAssetId` (API saja, belum ada pilihan di layar).
- `lib/aset-desa/{catalog,schema,service,book,http}.ts`, API `/api/aset-desa` (GET, POST), `/[id]` (GET, PATCH), `/[id]/penghapusan` (POST), `/buku?year=&format=csv`.
- Layar `/aset-desa` (daftar, penyaring, ringkasan, catat/ubah, hapus dari buku) dan `/aset-desa/cetak` (Buku Inventaris tahunan + daftar yang dihapus + kolom tanda tangan, cetak A4 lanskap, CSV).
- Izin: resource `aset_desa` (admin & sekretaris CRUD+ekspor; kades baca+ekspor; staf baca). Menghapus dari buku butuh aksi `delete`.

## Aturan penting
- Barang yang dihapus **tidak dihapus dari DB**: berstatus `DISPOSED` dengan nomor SK, tanggal, alasan; tak bisa diubah lagi. Penghapusan memakai UPDATE bersyarat (aman dari klik ganda).
- Aset strategis ditolak tanpa pernyataan persetujuan Bupati/Wali Kota; pernyataan itu dicatat di keterangan.
- Buku per tahun Y = barang dengan tahun perolehan ≤ Y yang belum dihapus atau dihapus setelah 31 Des Y.
- Nilai uang disimpan DECIMAL dan dikirim sebagai string; total dihitung dalam sen (BigInt).
- Ekspor CSV menetralkan rumus spreadsheet.

## Belum
- SK penggunaan aset tahunan (Pasal 10), berita acara penghapusan terisi otomatis (format Lampiran B), penyusutan/penilaian, pemanfaatan (sewa/pinjam pakai), impor Excel, foto/dokumen bukti (tautan ke Arsip Digital), pilihan titik peta di formulir, kode lokasi desa di kepala buku.
- Format SK/BA masih templat resmi; belum di-generate.

## Rilis
SQL `PHASE1_ASET_MIGRATION.sql` ikut rilis tunggal bersama 5 SQL lain (jangan `db push`). Tes: `tests/aset-desa.test.ts`, `tests/aset-desa.integration.test.ts` (butuh `KEP_TEST_DATABASE_URL`).
