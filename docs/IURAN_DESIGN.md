# Iuran, Retribusi, dan Kas RT — Desain dan Keputusan yang Dibutuhkan

> Draf 2026-10-24. **Keputusan 2026-10-29: pilih A (pencatatan; Klandesa tidak memegang dana), bendahara = Ketua RT, cakupan selengkap mungkin. Sudah dibangun (lihat §7).** Bagian di bawah ini adalah analisis awal.
> (Catatan lama: Belum ada kode. Alasannya: bagian ini menyentuh uang warga, dan satu keputusan (siapa yang memegang dana) menentukan desain, biaya, dan risiko hukum. Isi dokumen ini adalah analisis, bukan nasihat hukum; pastikan dengan konsultan hukum dan LinkQu sebelum membangun.

## 1. Fakta dari kode saat ini
- Integrasi LinkQu (`lib/linkqu`, `lib/billing`) memakai **satu akun merchant milik Klandesa** (kredensial dari env). Pembayaran masuk ke akun Klandesa. Itu cocok untuk tagihan langganan Klandesa ke desa, **bukan** untuk iuran warga ke desa/RT.
- Tidak ada konsep sub-merchant, pencairan (payout), atau rekonsiliasi per desa di kode.
- Integrasi Siskeudes yang ada hanya **ekspor CSV** APBDes (`lib/integrations/adapters/apbdes-siskeudes.ts`), bukan sinkronisasi dua arah.

## 2. Pilihan alur uang
| | A. Pencatatan, bayar langsung ke RT/desa | B. LinkQu dengan penyelesaian langsung ke rekening desa/RT | C. Klandesa menampung dulu lalu mencairkan |
|---|---|---|---|
| Siapa memegang uang | RT/desa (rekening/QRIS milik mereka sendiri) | Rekening desa/RT, lewat sub-merchant LinkQu | **Klandesa** |
| Yang dibangun | Tagihan, catatan lunas (+ foto bukti), kas, laporan | A + pembayaran online + rekonsiliasi otomatis | B + pencairan dan pembukuan dana titipan |
| Pendapatan Klandesa | Tidak ada langsung (nilai: retensi, alat kerja RT) | Selisih biaya per transaksi (bila LinkQu mengizinkan) | Selisih biaya per transaksi |
| Risiko hukum | Rendah | Sedang: bergantung ketentuan LinkQu dan izin | **Tinggi**: berpotensi masuk penyelenggara jasa pembayaran (perlu izin Bank Indonesia/OJK sesuai bentuknya) |
| Ketergantungan | Tidak ada | LinkQu harus mendukung sub-merchant dan penyelesaian per desa | Izin, modal, tim operasional |
| Waktu perkiraan | 3–4 minggu | 4–8 minggu setelah LinkQu memastikan | Tidak disarankan sekarang |

**Rekomendasi:** mulai dari **A** (nilainya nyata untuk RT: menggantikan buku kas dan grup WhatsApp, dan tidak menyentuh uang). Sambil jalan, tanyakan ke LinkQu pertanyaan di §4. **Jangan memilih C** tanpa nasihat hukum tertulis.

## 3. Rancangan alur A (bila disetujui)
Peran: petugas RT yang sudah ada (`village_role_assignments`) ditambah peran **bendahara** (penugasan baru) atau bendahara = Ketua RT pada tahap awal.
- **Tagihan:** Ketua RT/bendahara membuat jadwal iuran (nama, nominal, bulanan/sekali, cakupan RT atau seluruh desa untuk retribusi). Sistem membuat tagihan per KK untuk tiap periode.
- **Warga:** layar "Tagihan saya" (jumlah, jatuh tempo, status), petunjuk bayar: rekening/QRIS RT yang diisi bendahara (teks/gambar), tombol "Saya sudah bayar" dengan foto bukti opsional.
- **Bendahara:** daftar tagihan per KK, tandai lunas (tunai/transfer), terima konfirmasi dari warga, bebaskan (keringanan) dengan alasan, catat pengeluaran kas.
- **Kas & laporan:** saldo, pemasukan/pengeluaran, rekap bulanan yang bisa dibagikan ke warga (transparansi), ekspor CSV.
- **Keamanan:** tagihan hanya terlihat oleh KK terkait; bendahara hanya cakupan RT-nya (pola yang sama dengan `requireRt`); semua perubahan status dicatat (siapa, kapan); NIK tersamar; data keuangan tidak keluar dari desa.
- **Tabel baru (aditif, perkiraan):** `fee_schedules`, `fee_charges` (unik per jadwal+KK+periode), `fee_payments` (riwayat, bukti), `cash_entries`.

## 4. Pertanyaan untuk LinkQu (sebelum memilih B)
1. Apakah ada **sub-merchant / multi-merchant** (satu akun induk, banyak desa/RT) dengan **penyelesaian langsung ke rekening masing-masing**?
2. Biaya per transaksi (QRIS, VA, e-wallet), biaya pencairan, dan apakah Klandesa boleh menambah biaya layanan?
3. Waktu penyelesaian dan API rekonsiliasi/laporan per sub-merchant; dukungan **QRIS dinamis per merchant** (NMID masing-masing).
4. Prosedur **KYC desa/RT**: dokumen apa yang diminta untuk rekening desa dan RT (RT biasanya tidak berbadan hukum).
5. Apakah skema ini sudah termasuk izin LinkQu sebagai penyelenggara jasa pembayaran, dan apa **tanggung jawab Klandesa** sebagai pihak yang mengintegrasikan?
6. Penanganan dana salah transfer, pengembalian dana, dan sengketa.

## 5. Yang perlu diputuskan pemilik produk
1. Alur uang: A dulu (rekomendasi), langsung B, atau menunggu jawaban LinkQu.
2. Apakah **bendahara** peran terpisah dari Ketua RT sejak awal?
3. Cakupan awal: hanya **iuran RT** (kas lingkungan), atau juga **retribusi desa** (sampah, keamanan) dan **PBB**? Saran: iuran RT dulu; PBB melibatkan sistem pemerintah dan tidak dimulai sekarang.
4. Siapa yang mengurus pertanyaan hukum (konsultan) dan kontak LinkQu.


## 7. Yang dibangun (2026-10-29, versi A)
- **Tabel baru (migrasi `20261029100000`):** `fee_schedules`, `fee_charges` (unik per jadwal+KK+periode), `fee_payments`, `cash_entries`.
- **Dua cakupan:** Ketua RT (jadwal/kas RT-nya) dan perangkat desa (retribusi desa, izin `finance`). Cakupan selalu dari token + DB, tidak dari klien. PBB hanya sebagai **kategori pencatatan** (tidak ada integrasi sistem pajak).
- **Alur:** jadwal (bulanan/sekali, nominal per KK, jatuh tempo, cara bayar + gambar QRIS milik RT/desa) → tagihan per KK dibuat otomatis (saat jadwal dibuat, saat dibuka, dan job harian `POST /api/cron/fees` dengan `CRON_SECRET`) → warga membayar langsung ke RT/desa lalu menekan "Saya sudah bayar" (foto bukti opsional) → bendahara menekan "Uang sudah diterima"/"Belum diterima", atau mencatat pembayaran langsung (tunai/transfer/QRIS, termasuk cicilan) → keringanan (bebaskan) dengan alasan → buku kas (pemasukan/pengeluaran, foto nota, pembatalan beralasan, tidak dihapus) → rekap bulanan, saldo, ekspor CSV (rumus spreadsheet dinetralkan).
- **Warga:** layar Tagihan iuran (status berikon + teks, cara bayar, lapor bayar) dan Kas RT (transparansi: total saja, tanpa nama pembayar; pengeluaran 90 hari).
- **Notifikasi:** tagihan baru, pengingat 3 hari setelah jatuh tempo lalu paling cepat seminggu sekali, pembayaran dikonfirmasi/ditolak, laporan bayar baru untuk bendahara.
- **Tidak dibangun (sengaja):** pembayaran online, rekonsiliasi bank, pencairan dana.
- **Batas yang perlu diketahui:** tagihan dibuat untuk KK yang punya nomor KK di data warga; maksimal 12 bulan susulan; nominal per jadwal tidak bisa diubah setelah dibuat (buat jadwal baru); satu RT = satu bendahara (Ketua RT).
