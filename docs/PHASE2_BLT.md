# Paket 2 (bagian 2) — BLT Desa

Dikerjakan 2026-11-01 sesuai `docs/PLAN_CELAH_FUNGSI.md` P2.e. Belum di-commit dan belum di-deploy.

## Sumber hukum [V]
Permendesa PDT 16/2025 Pasal 3 (maks. Rp300.000 per bulan per keluarga; dibayar maks. 3 bulan sekaligus; diputuskan Musyawarah Desa) dan Lampiran II.A: mekanisme penetapan keluarga penerima manfaat (data Pemerintah sebagai acuan; 5 kriteria cadangan bila tidak ada), pendataan dari RT/RW/dusun, verifikasi kependudukan (tanpa NIK → surat keterangan domisili), Keputusan Kepala Desa (isi minimal: nama, NIK, alamat, rincian kelompok pekerjaan, jumlah, kategori), dilaporkan kepada bupati melalui camat, penggantian lewat Musyawarah Desa khusus (+ berita acara bila tak ada pengganti), pembayaran tunai dan/atau nontunai. Batas nilai dibaca dari `lib/dana-desa/rules.ts` (berversi per tahun).

## Yang dibangun (`/blt`)
- **Program per tahun** (satu per desa-tahun): nilai per bulan (tidak boleh melebihi batas aturan tahun itu), jumlah bulan, Musdes penetapan (jenis MUSDES_BLT, harus sudah terlaksana), nomor dan tanggal Keputusan Kepala Desa, tanggal dilaporkan ke bupati. Status Draf → Ditetapkan → Selesai; penetapan/penyelesaian/pembukaan hanya Kepala Desa atau admin.
- **Penerima:** dicari dari data warga (NIK disamarkan); satu keluarga (KK) satu penerima; warga meninggal/pindah/desa lain ditolak; sumber Data Pemerintah atau kriteria cadangan Desa (1–5, wajib dipilih); kelompok pekerjaan diambil dari data warga. Peringatan: NIK belum 16 digit (arahan surat domisili), warga tercatat meninggal/pindah, kriteria "tidak menerima PKH" tetapi tercatat pada program bantuan PKH. Daftar **terkunci** setelah SK terbit.
- **Penggantian:** hanya setelah ditetapkan, berdasar Musdes khusus yang sudah terlaksana; yang lama menjadi Diganti/Berakhir (alasan wajib), pengganti berhak mulai bulan setelah bulan terakhir yang sudah dibayarkan kepada yang lama, dengan nomor keputusan perubahan.
- **Pembayaran:** jumlah dihitung server (nilai × bulan), maks. 3 bulan sekaligus, tanpa tumpang tindih bulan, tidak melewati bulan program, tidak sebelum tanggal SK, hanya penerima aktif; dikunci per program (`SELECT … FOR UPDATE`, diuji mutasi). Papan bulan per keluarga; pembatalan salah-input oleh peran berizin hapus, tercatat di audit.
- **Cetak** (izin ekspor, tiap cetak tercatat di audit karena memuat NIK lengkap): lampiran daftar penerima untuk SK (dengan rincian kelompok pekerjaan dan kategori), daftar tanda terima, rekap pembayaran.

## Data dan izin
SQL aditif `PHASE2_BLT_MIGRATION.sql` (3 tabel `blt_*`) + rollback; dilatih apply–rollback–apply di scratch dan diterapkan ke DB lokal. **Produksi belum.** Resource izin baru `blt`: admin penuh; Kepala Desa baca/ekspor/approve; sekretaris CRUD+ekspor; operator baca/buat/ubah (tanpa hapus dan tanpa cetak NIK). Rute dengan id di tengah jalur (`/api/blt/<id>/status`, `/cetak`) dipetakan lewat pola baru di `lib/permissions/api-route-map.ts`.

## Batas yang jujur
- Pembayaran belum otomatis menjadi catatan Buku Kas Umum/SPP; dicatat terpisah.
- Belum ada foto tanda terima dan impor data Pemerintah (DTSEN) massal; usulan DTSEN yang sudah ada belum ditautkan ke calon penerima.
- Anggaran BLT belum dibandingkan otomatis dengan baris APB Desa (kebutuhan anggaran ditampilkan di program).
- Format SK resmi kabupaten belum dibandingkan; lampiran mengikuti isi minimal Lampiran II.A.2.c.3.

## Pengujian
`tests/blt.test.ts` (8) + `tests/blt.integration.test.ts` (9 tes MySQL: batas nilai, duplikasi KK, penetapan, pembayaran, konkurensi, penggantian, siklus status, isolasi antar-desa, NIK/PKH). Uji mutasi: tanpa `FOR UPDATE`, tes konkurensi gagal 3 dari 3 kali. Browser sungguhan: buat program → Musdes + SK → 2 penerima (kriteria Desa wajib) → tetapkan → pembayaran 3 bulan (Rp900.000) → ganti penerima → cetak SK, 390px tanpa gulir horizontal. Itu menangkap satu cacat: kartu warga terpilih tidak ter-reset setelah penambahan (sudah diperbaiki dengan `key`).

## Tinjauan keamanan (agen terpisah) dan perbaikannya
Tanpa temuan Critical/High; tidak ada akses lintas desa, IDOR, atau celah konkurensi. Temuan lain sudah diperbaiki dan diuji:
- **Medium:** batas 3 bulan sekaligus bisa dihindari dengan memecah pembayaran. Sekarang bulan yang sudah dibayarkan pada tanggal yang sama ikut dihitung; tanggal pembayaran di masa depan ditolak.
- **Low-Medium:** operator bisa mengganti/mengakhiri penerima setelah SK. Sekarang hanya sekretaris dan admin (pola rute `…/ganti` → izin hapus, dicek lagi di dalam rute).
- **Low:** pengganti dari KK yang sama ditolak; KK disamarkan seperti NIK (lengkap hanya di data cetak); audit cetak dicatat sebelum data dikirim dan memuat penanda "semua"; audit perubahan program hanya mencatat kolom yang dikenal.
