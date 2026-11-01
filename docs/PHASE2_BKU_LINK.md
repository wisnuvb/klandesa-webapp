# Paket 2 (bagian 5) — Pembayaran BLT, PKTD, dan KDMP dicatat ke Buku Kas Umum

Dikerjakan 2026-11-01 sebagai penutup Paket 2 (`docs/PLAN_CELAH_FUNGSI.md` P2.e: "mencatat PENGELUARAN pada BKU/SPP"). Belum di-commit dan belum di-deploy.

## Masalah yang ditutup
Pembayaran BLT, upah PKTD, dan angsuran KDMP dicatat di modulnya, tetapi uang yang keluar tidak muncul di Buku Kas Umum (BKU), sehingga laporan keuangan desa (buku kas, laporan realisasi, buku pembantu) tidak lengkap dan operator harus mengetik dua kali.

## Cara kerja
- Tiap modul punya tombol **Catat ke BKU**. Operator memilih **kegiatan dan rekening belanja** dari APB Desa yang berlaku (Dana Desa di urutan atas, dengan sisa anggaran), **kas tunai atau rekening bank**, dan **nomor bukti**.
- Satuan pencatatan: **BLT** dan **PKTD** satu catatan per **tanggal bayar** (jumlah seluruh pembayaran/upah tanggal itu yang belum tercatat); **KDMP** satu catatan per angsuran. Tanggal catatan BKU = tanggal bayar.
- Catatan dibuat dengan **aturan buku kas yang sama** dengan pencatatan manual: bulan yang sudah ditutup ditolak, belanja tidak boleh melebihi anggaran kegiatan-rekening di APB Desa yang ditetapkan, saldo kas/bank tidak boleh minus, rekening/kegiatan harus ada di APB Desa. Pesan penolakan tampil di dalam dialog.
- Baris pembayaran menyimpan `bkuEntryId`; modul menampilkan "Tercatat · nomor bukti". Pembayaran yang sudah tercatat **tidak dapat dihapus/dibatalkan** (BLT `voidPayment`, PKTD `deleteWorkDays`, KDMP `removeInstallment`) dan catatan BKU-nya **tidak dapat diubah atau dihapus dari Buku Kas Umum** (pesan: ubah lewat modul asalnya). Untuk mengoreksi: **Batalkan pencatatan** (menghapus catatan BKU, dengan pemeriksaan bulan ditutup dan saldo yang sama), lalu ubah dan catat ulang.
- Pencatatan ke BKU **bukan** SPP: ia mencatat uang yang sudah dibayar. Alur permintaan pembayaran formal (SPP → verifikasi → persetujuan) tetap di modul APBDes dan belum dikaitkan.

## Data dan izin
SQL aditif `PHASE2_BKU_LINK_MIGRATION.sql`: kolom `bkuEntryId INT NULL` + indeks + FK `ON DELETE SET NULL` pada `blt_payments`, `pktd_work_days`, `kdmp_installments`; rollback `PHASE2_BKU_LINK_ROLLBACK.sql` (hanya tautan yang hilang). Dilatih apply–rollback–apply di scratch dan diterapkan ke DB lokal. **Produksi belum.** Mencatat butuh izin tulis keuangan desa (`apbdes` create, diperiksa di dalam rute di samping izin modul); membatalkan butuh `apbdes` delete. Kepala Desa tidak dapat mencatat atau membatalkan.

## Kunci dan konkurensi
Urutan kunci di semua alur tautan: baris modul (raw `SELECT ... FOR UPDATE`, pernyataan pertama) → kunci tahun APB Desa → baru pembacaan lain. Alur BKU manual hanya memegang kunci tahun dan alur biasa modul hanya kunci modulnya, jadi tidak ada siklus. Diuji: tiga pencatatan serentak atas angsuran yang sama menghasilkan satu catatan; dua pencatatan serentak yang bersama-sama melebihi anggaran meloloskan satu; tanpa kunci tahun, tes anggaran gagal 3 dari 3 kali. Kunci baris modul bersifat pertahanan tambahan (tes tetap lulus tanpanya karena kunci tahun sudah menserialkan).

## Batas yang jujur
- Satu catatan per tanggal bayar: pembayaran yang ditambahkan pada tanggal yang sama sesudah pencatatan dicatat sebagai catatan BKU terpisah (sisanya), bukan menambah catatan lama.
- Pajak (PPh/PPN) tidak dipotong dari pembayaran ini (BLT dan upah harian swakelola tanpa potongan); catatan BKU dibuat tanpa pajak.
- Belum ada pencatatan massal lintas tanggal, dan belum ada unggah bukti (kuitansi/tanda terima foto).
- Kegiatan yang tidak punya baris belanja di APB Desa yang ditetapkan tidak muncul sebagai pilihan; tambahkan lewat Perubahan APB Desa.

## Pengujian
`tests/payout-bku.test.ts` (5: masukan, izin rute) dan `tests/payout-bku.integration.test.ts` (9 tes MySQL: pilihan belanja, KDMP, aturan buku kas, dua uji konkurensi, PKTD, BLT, FK SET NULL). Browser sungguhan (Chrome): dialog memuat Dana Desa dengan sisa anggaran dan tidak meluap; angsuran/upah/BLT tercatat dan muncul di BKU; hapus manual dari BKU ditolak 409; tombol hapus/batalkan pembayaran tertaut disembunyikan dan server menolak; penolakan "kas tunai kurang" tampil di dialog; batal pencatatan mengembalikan; 390px tanpa gulir horizontal. Temuan UX yang diperbaiki: pilihan kegiatan yang panjang membuat isi dialog meluap keluar kotak.

## Tinjauan keamanan (agen terpisah) dan perbaikan
Tanpa temuan Tinggi/Sedang; isolasi desa, izin, urutan kunci, dan integritas terbukti dari kode. Sudah diperbaiki: audit memuat kegiatan, rekening, kas, dan tanggal bayar (juga saat pembatalan); transaksi tautan diberi batas waktu 15 detik (bukan 5 detik bawaan) agar antrean kunci tidak menjadi 500; pencatatan tanpa upah/pembayaran yang dapat dicatat pada tanggal itu ditolak sebelum membuat baris tahun APB Desa; nomor bukti bawaan diberi akhiran bila tanggal itu sudah pernah dicatat; Buku Kas Umum kini menandai catatan dari modul pembayaran ("dari modul pembayaran") dan menyembunyikan tombol ubah/hapusnya (server sudah menolak sebelumnya). Dicatat tanpa perubahan: izin staf tidak simetris antara resource `blt` dan `apbdes` (server tetap benar; keputusan produk); kunci celah InnoDB saat FK SET NULL (hanya menunggu singkat).
