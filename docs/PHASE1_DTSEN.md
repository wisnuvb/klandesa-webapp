# Fase 1 butir 5: Usulan DTSEN (alur desa)

Status: dikode 2026-11-01; belum diuji di browser; SQL produksi belum diterapkan.

## Apa yang boleh dan tidak boleh dilakukan desa
Dari sumber sekunder (media dan situs desa; teks Permensos/Kepmensos 2025 belum dibaca langsung): **desa tidak menetapkan desil**. Peran desa: menerima usulan, verifikasi/validasi lapangan, membahasnya di musyawarah desa, dan meneruskan ke Dinas Sosial; hasil ditetapkan pemerintah pusat. Karena itu modul ini hanya **mencatat alur**, tidak menghitung atau mengubah desil. Kolom `Resident.desil` yang lama tidak disentuh.

## Alur (satu arah, dipaksa di server)
`DIAJUKAN → TERVERIFIKASI → DISETUJUI_MUSDES | DITOLAK_MUSDES → DITERUSKAN → SELESAI (DITERIMA/DITOLAK)`; `DIBATALKAN` dari tahap mana pun sebelum diteruskan (wajib beralasan). Status akhir: DITOLAK_MUSDES, SELESAI, DIBATALKAN.
- Tiap tahap mewajibkan isiannya: verifikasi (tanggal, nama, hasil lapangan), musyawarah (tanggal, nomor berita acara), diteruskan (tanggal, nomor surat), hasil (outcome, tanggal).
- Urutan tanggal dijaga (musyawarah ≥ verifikasi, diteruskan ≥ musyawarah, hasil ≥ diteruskan); tanggal tak boleh di masa depan.
- Proses **massal** (maks 100): satu berita acara musyawarah untuk banyak usulan. Yang tak memenuhi syarat dilaporkan per usulan, sisanya tetap berjalan. Pemindahan memakai UPDATE bersyarat pada status lama, jadi dua operator serentak tak saling menimpa (teruji).
- Satu warga hanya boleh punya satu usulan sejenis yang masih berjalan.
- Usulan yang diam >30 hari di satu tahap diberi penanda "mandek" (pengingat kerja, **bukan** tenggat hukum).

## Data dan privasi
Tabel `dtsen_proposals` (SQL `PHASE1_DTSEN_MIGRATION.sql`, rollback `..._ROLLBACK.sql`). Nama dan RT/RW warga disalin saat usulan dibuat (riwayat tetap terbaca bila warga dihapus); **NIK tidak disalin**. Audit hanya memuat jenis dan id warga. Tidak dibuka lewat API v1/MCP/webhook. Izin: resource `dtsen_usulan` (staf: baca/catat/proses; kades: baca; admin & sekretaris: penuh); tahap lanjut memakai `update` yang dicek dalam rute karena POST.

## Layar
`/dtsen` (daftar, penyaring tahap, pilih banyak lalu aksi tahap berikutnya, catat usulan) dan `/dtsen/cetak` (daftar usulan terverifikasi untuk bahan musyawarah; tanpa NIK).

## Belum
Impor daftar KPM/penerima dari berkas Kemensos, pengaitan hasil ke program bansos desa (`SocialBenefitProgram`), BLT Dana Desa (menunggu jalur keuangan), formulir verifikasi terstruktur (skor kondisi rumah), berita acara musyawarah otomatis, unggah lampiran/foto, pengusulan oleh warga lewat aplikasi mobile.

## Rilis
SQL ini menjadi berkas kedelapan untuk rilis tunggal (jangan `db push`). Tes: `tests/dtsen.test.ts`, `tests/dtsen.integration.test.ts`.
