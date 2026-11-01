# Paket 2 (bagian 3) — Padat Karya Tunai Desa (PKTD)

Dikerjakan 2026-11-01 sesuai `docs/PLAN_CELAH_FUNGSI.md` P2.f. Belum di-commit dan belum di-deploy.

## Sumber hukum [V]
Permendesa PDT 16/2025 Pasal 4 ayat 2 dan Lampiran II.F: PKTD pola swakelola utama untuk fokus Dana Desa; pekerja diprioritaskan penganggur, setengah penganggur, perempuan kepala keluarga, anggota keluarga miskin, dan masyarakat marginal (disabilitas dilibatkan, prinsip inklusif); **upah dibayar setiap hari**; **upah paling sedikit 50% dari total biaya kegiatan** (termasuk mengangkut material, menyiapkan lokasi, dan pelaksanaan); batas bawah/atas upah harian dari kesepakatan Musyawarah Desa (batas atas di bawah UMP) atau Perbup; jaminan sosial ketenagakerjaan bagi pekerja boleh dibiayai. Angka 50% dibaca dari `lib/dana-desa/rules.ts` (berversi per tahun).

## Yang dibangun (`/pktd`)
- **Kegiatan** per tahun: biaya (RAB), rencana upah, jadwal, lokasi, kode kegiatan APB Desa (menampilkan anggarannya sebagai pembanding), batas upah harian dan dasar penetapannya.
- **Pekerja:** dari data warga (NIK tidak ditampilkan) atau nama manual; kelompok prioritas; jenis kelamin dari data warga.
- **Hari kerja:** pencatatan banyak pekerja sekaligus per tanggal (jenis pekerjaan, upah harian); satu pekerja satu hari; upah di luar batas bawah/atas ditolak; tidak di masa depan dan harus dalam periode kegiatan; total upah tidak boleh melebihi total biaya; opsi "dibayar hari ini juga"; penandaan dibayar per tanggal.
- **Pemeriksaan:** batang rasio upah (rencana dan realisasi) dengan penanda 50%; peringatan rencana upah <50%, kegiatan selesai tetapi realisasi <50%, upah belum dibayar, batas upah belum ditetapkan, tanpa pekerja prioritas.
- **Cetak:** lembar daftar hadir dan upah harian per periode dengan kolom tanda tangan (tanpa NIK).

## Data dan izin
SQL aditif `PHASE2_PKTD_MIGRATION.sql` (3 tabel `pktd_*`) + rollback; dilatih apply–rollback–apply di scratch dan diterapkan ke DB lokal. **Produksi belum.** Izin memakai resource `apbdes` (keuangan): operator dan sekretaris mengelola; Kepala Desa hanya membaca. Pembukaan kembali kegiatan selesai dan penghapusan catatan upah yang sudah dibayar hanya untuk admin (izin approve).

## Batas yang jujur
- Pembayaran upah belum otomatis menjadi catatan Buku Kas Umum/SPP, dan belum ada tanda terima foto.
- Batas atas upah belum dibandingkan otomatis dengan UMP provinsi (aturan hanya menyebut "di bawah UMP"; UMP belum disimpan); dicatat sebagai dasar penetapan teks.
- Penghitungan bagian upah memakai biaya dan rencana upah yang diisi operator, bukan dihitung ulang dari RAB rinci.

## Pengujian dan tinjauan keamanan
`tests/pktd.test.ts` (10) + `tests/pktd.integration.test.ts` (9 tes MySQL, termasuk konkurensi yang diuji mutasi: tanpa `FOR UPDATE` gagal 3 dari 3). Browser sungguhan: buat kegiatan → rencana upah 40% diperingatkan → koreksi → pekerja (warga dan manual) → upah di atas batas ditolak → hari kerja dibayar → cetak tanpa NIK; 390px tanpa gulir horizontal.
Ditinjau agen keamanan terpisah (tanpa akses lintas desa/bypass izin). Temuan yang sudah diperbaiki: total biaya tidak boleh diturunkan di bawah upah tercatat (Medium); catatan upah yang sudah dibayar tidak dapat dihapus oleh operator dan pembukaan kembali hanya admin, dengan audit memuat jumlah (Medium); status Selesai kini juga mengunci penandaan pembayaran dan penghapusan pekerja; agregasi hari kerja dipindah ke SQL dan jumlah catatan dibatasi (Low).
