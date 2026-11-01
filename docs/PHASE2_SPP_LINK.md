# Paket 2 (bagian 5) — Pembayaran BLT, PKTD, dan KDMP dibiayai SPP

Dikerjakan 2026-11-01 sebagai penutup Paket 2. Belum di-commit dan belum di-deploy.

## Keputusan pemilik
Urutan hukum: **SPP dulu, baru pembayaran boleh dicatat** (Permendagri 20/2018 Pasal 52–56: SPP diajukan → diverifikasi Sekretaris Desa → disetujui Kepala Desa → dibayar). Semula saya membangun pencatatan langsung ke Buku Kas Umum; fitur itu **dicabut seluruhnya** (belum pernah dirilis) karena menjadi jalan pintas di sekeliling SPP.

## Cara kerja
1. **Ajukan SPP dari modul** (tombol "Ajukan SPP" pada panel "Dana dari SPP" di BLT, PKTD, dan KDMP): pilih kegiatan dan rekening belanja dari APB Desa (Dana Desa di atas), jumlah, dan penerima. BLT/PKTD memakai mode **swakelola** (nama Kaur/Kasi penerima panjar); KDMP memakai mode **penyedia** (nama penyedia dan centang bukti terlampir). Jumlah dibatasi **kebutuhan yang belum didanai**: BLT = nilai per bulan × bulan hak penerima aktif − yang sudah dibayar; PKTD = yang lebih besar antara rencana upah dan upah tercatat − upah dibayar; KDMP = dana diterima − diangsurkan; dikurangi SPP yang sudah diajukan atau dibayar tetapi belum disalurkan (dana panjar yang dikembalikan membebaskan kebutuhan itu lagi).
2. **Pemeriksaan SPP biasa tetap berlaku** (`createRequestInTx`): DPA kegiatan harus sudah disetujui Kepala Desa (Pasal 52), rekening harus ada di APB Desa yang ditetapkan, tidak melebihi sisa anggaran (termasuk SPP yang berjalan) maupun rencana penarikan (RAK) sampai bulan ini (Pasal 53).
3. **Verifikasi, persetujuan, dan pembayaran SPP** dilakukan di menu APBDes seperti SPP lain. Pembayaran menghasilkan catatan Buku Kas Umum lewat jalur SPP biasa (tertaut `requestId`, tak dapat diubah dari buku kas) dan, untuk swakelola, **panjar** kepada pelaksana (batas 10 hari kerja).
4. **Pembayaran modul baru dapat dicatat hanya dari SPP yang sudah dibayar** (`pickFunding`): SPP dibayar tertua yang sisa dananya cukup dan sudah dibayar pada atau sebelum tanggal pembayaran; pembayaran tidak dipecah antar SPP. Tanpa SPP, saat SPP masih diajukan, tanggal sebelum SPP dibayar, atau dana tidak cukup: ditolak dengan pesan yang menunjuk ke langkah berikutnya. Mencatat hari kerja belum dibayar tidak butuh SPP; menandai dibayar atau membayar sekaligus butuh.
5. **Pembayaran menjadi pertanggungjawaban panjar secara otomatis**: saldo panjar = diberikan − pertanggungjawaban manual − pembayaran modul − dikembalikan. Panjar di APBDes menampilkan "Termasuk Rp… yang dicatat di modul …". Sisa dana dikembalikan lewat fitur pengembalian panjar yang sudah ada (tidak dapat melebihi saldo).
6. Membatalkan pembayaran (BLT `voidPayment`, PKTD `deleteWorkDays`, KDMP `removeInstallment`) otomatis mengembalikan dananya ke SPP karena sisa dana dihitung dari pembayaran yang ada. SPP yang ditolak melepas dananya.

## Data dan izin
SQL aditif `PHASE2_SPP_LINK_MIGRATION.sql`: `apbdes_pay_requests.sourceKind/sourceId`, kolom `sppId` (NULL) pada `blt_payments`, `pktd_work_days`, `kdmp_installments`, indeks, FK `ON DELETE SET NULL`; rollback `PHASE2_SPP_LINK_ROLLBACK.sql` (SPP dan pembayaran tidak tersentuh). **Harus setelah** SQL BLT, PKTD, dan KDMP. Dilatih apply–rollback–apply di scratch dan diterapkan ke DB lokal. **Produksi belum.** Mengajukan butuh izin modul dan `apbdes` create (diperiksa di dalam rute); Kepala Desa tidak mengajukan (ia menyetujui di APBDes), sehingga pemisahan tugas pengaju–penyetuju tetap terjaga.

## Kunci dan konkurensi
Pengajuan: kunci baris modul (raw `SELECT … FOR UPDATE`, pernyataan pertama) → kunci tahun APB Desa → baru pembacaan lain. Pencatatan pembayaran hanya memegang kunci modulnya: status SPP DIBAYAR tak pernah mundur dan semua pembayaran satu lingkup ditulis di bawah kunci modul yang sama. Uji mutasi: tanpa kunci pada pencatatan, tes tiga angsuran serentak gagal 3 dari 3 kali.

## Batas yang jujur
- Pertanggungjawaban otomatis hanya jumlah pembayaran; **bukti fisik** (tanda terima/foto) belum ada, dan pemeriksaan bukti oleh Sekretaris Desa untuk pembayaran modul belum dikaitkan ke alur "periksa SPJ" panjar.
- Pembayaran tidak dipecah antar SPP: bila dua SPP masing-masing bersisa kecil, pembayaran besar ditolak; ajukan SPP tambahan.
- Pembayaran yang sudah ada sebelum fitur ini dipakai (data lama) tidak punya SPP; baru ada pembayaran seperti itu bila Anda mengimpor data (belum ada fitur impor). Parameter `skipFunding` pada servis hanya untuk tes.
- KDMP dilingkupi per tahun (bukan per gerai); kebutuhan dihitung dari dana diterima.
- Pajak dan potongan tidak diterapkan pada SPP yang diajukan dari modul (BLT dan upah harian swakelola tanpa potongan).

## Pengujian
`tests/spp-funding.test.ts` (4) dan `tests/spp-funding.integration.test.ts` (10 tes MySQL, termasuk uji balapan pencatatan melawan pengembalian panjar yang terbukti lewat mutasi 4 dari 4: rantai KDMP, SPP ditolak melepas dana, DPA belum disetujui, konkurensi, PKTD dengan panjar dan pengembalian, hapus hari kerja mengembalikan dana, BLT dengan pembatalan pembayaran, isolasi antar desa). Browser sungguhan (Chrome): angsuran tanpa SPP ditolak → ajukan SPP lewat dialog → masih ditolak selagi diajukan → SPP dibayar → angsuran tercatat → melebihi sisa ditolak; PKTD dan BLT sama, dan panjar di APBDes menampilkan pembayaran dari modul; 390px tanpa gulir horizontal.

## Tinjauan keamanan (agen terpisah) dan perbaikan
Tanpa temuan Kritis/Tinggi; gerbang `pickFunding` tidak dapat dilewati dari HTTP (hanya empat penulis pembayaran, `skipFunding` tak terjangkau dari rute, `sppId` tak pernah diubah) dan tidak ada akses lintas desa. Dua temuan Sedang sudah diperbaiki dan diuji:
- **SPJ manual menggandakan pertanggungjawaban:** `addPanjarSpj` kini menolak panjar dari SPP bersumber modul (pertanggungjawabannya otomatis dari pembayaran modul).
- **Balapan pencatatan vs pengembalian panjar:** `returnPanjar` untuk SPP bersumber modul kini mengambil kunci baris modul sebagai pernyataan pertama (modul lalu tahun, urutan yang sama dengan pengajuan). Tanpa kunci ini, uji balapan gagal 4 dari 4 kali.
Temuan Rendah yang diperbaiki: SPP KDMP wajib `hasReceipt` benar di server (Pasal 55), bukan hanya di UI; program/kegiatan yang punya SPP diajukan atau dibayar tidak dapat dihapus (BLT juga tidak dapat dicabut penetapannya); `sppId` masuk jejak audit pembayaran; jumlah bawaan dialog dibulatkan ke bawah.

## Batas yang diterima atau ditunda (jujur)
- **Pemisahan tugas per orang tidak ditegakkan:** hanya per peran (Kepala Desa menyetujui dan tidak dapat mengajukan; staf tidak dapat memverifikasi). Admin dapat melakukan semua tahap sendiri; tidak ada larangan pengaju = pembayar. Berlaku untuk semua SPP APBDes, bukan hanya modul ini.
- **Relevansi kegiatan tidak dibatasi:** operator dapat memilih kegiatan/rekening belanja APB Desa mana pun yang DPA-nya disetujui; pengendalinya verifikasi Sekretaris Desa dan persetujuan Kepala Desa.
- Pembayaran sesudah tenggat panjar (10 hari kerja) tetap dapat dicatat (panjar ditandai terlambat); KDMP (penyedia) tidak membentuk panjar, jadi dana SPP KDMP yang tidak terpakai tidak punya jalur pelepasan selain menghapus angsuran/menolak SPP sebelum dibayar.
- SQL `PHASE2_BKU_LINK_*` dari rancangan pertama sudah dihapus dan tidak pernah dijalankan di produksi; di DB lokal dan scratch kolomnya sudah dicabut.
