# Paket 2 (bagian 4) — Progres dukungan KDMP

Dikerjakan 2026-11-01 sesuai `docs/PLAN_CELAH_FUNGSI.md` P2.g. Belum di-commit dan belum di-deploy.

## Sumber hukum [V]
PMK 7/2026 Pasal 15 ayat 3 (pagu KDMP 58,03% dari pagu Dana Desa tiap desa), Pasal 20 ayat 3 (dipakai untuk **angsuran** pembangunan fisik gerai, pergudangan, dan kelengkapan), Pasal 22 ayat 4 (disalurkan **terpisah** dari Dana Desa reguler); Permendesa PDT 16/2025 Pasal 2 ayat 2 (dianggarkan dalam **perubahan APB Desa** setelah penyaluran). Persentase 58,03% dibaca dari `lib/dana-desa/rules.ts` (berversi per tahun) dan hanya dipakai sebagai **acuan informasi**: pagu final dapat berbeda (penyesuaian pagu), jadi pagu KDMP tetap diisi operator di halaman Dana Desa (`dd_year_settings.kdmpCents`).

Yang **tidak** ditemukan di teks yang dibaca: rincian mekanisme angsuran (pihak penerima, jadwal, bentuk perjanjian) dan tolok ukur progres fisik. Karena itu penerima angsuran, nomor perjanjian, dan nilai pekerjaan dicatat sebagai isian bebas milik operator, bukan katalog.

## Yang dibangun (`/kdmp`)
- **Ringkasan tahun:** pagu KDMP, diterima, dianggarkan di APB Desa (kegiatan bertanda fokus KDMP bersumber DD pada dokumen APB Desa/perubahan terbaru), diangsurkan, saldo; dua batang kemajuan (diterima dari pagu, diangsurkan dari yang diterima).
- **Penyaluran dana:** catatan penerimaan (tanggal, jumlah, nomor keputusan/bukti).
- **Angsuran:** tanggal, jumlah, dibayarkan kepada, nomor perjanjian/kuitansi, dikaitkan opsional ke satu gerai/gudang.
- **Gerai, pergudangan, kelengkapan:** nilai pekerjaan, progres fisik 0–100% dengan riwayat berurutan tanggal, tanggal mulai beroperasi (hanya setelah 100%). Status diturunkan otomatis: belum dibangun, dalam pembangunan, selesai dibangun, beroperasi.
- **Tautan koperasi:** nama koperasi desa dan jumlah langkah pembentukan yang selesai (dari pelacak pembentukan yang sudah ada), dengan tautan.
- **Pemeriksaan (temuan):** pagu belum diisi; persentase pagu menyimpang dari acuan (info); penyaluran melebihi pagu (galat); dana diterima belum seluruhnya dianggarkan di APB Desa/perubahan (peringatan, rujukan Permendesa 16/2025 Pasal 2(2)); angsuran melebihi anggaran KDMP di APB Desa (peringatan); angsuran mendahului progres fisik lebih dari 20 poin (peringatan: "periksa"); progres tidak diperbarui lebih dari 60 hari; angsuran tanpa kaitan; nilai pekerjaan belum diisi; saldo belum diangsurkan.

## Aturan yang ditegakkan server (di dalam kunci desa-tahun)
- Total angsuran ≤ total penyaluran (dua angsuran serentak: tepat satu lolos); menghapus penyaluran tidak boleh membuat angsuran melebihi dana.
- Total angsuran per gerai ≤ nilai pekerjaannya; nilai pekerjaan tak boleh diturunkan di bawah angsuran yang sudah dibayar.
- Progres tidak boleh turun menurut urutan tanggal (koreksi dengan menghapus catatan yang salah; progres terakhir dihitung ulang).
- Tanggal tidak boleh di masa depan; batas jumlah baris per tahun (60 penyaluran, 600 angsuran, 50 gerai, 200 catatan progres per gerai).
- Gerai yang sudah punya angsuran tidak dapat dihapus.

## Data dan izin
SQL aditif `PHASE2_KDMP_MIGRATION.sql` (4 tabel `kdmp_*`) + rollback; dilatih apply–rollback–apply di scratch dan diterapkan ke DB lokal. **Produksi belum.** Izin memakai resource `apbdes`: operator dan sekretaris mencatat; Kepala Desa hanya membaca. Menghapus catatan penyaluran dan angsuran (catatan uang) hanya admin (izin delete **dan** approve), dengan audit memuat jumlah dan penerima. Kunci per desa-tahun memakai baris `dd_year_settings` (dibuat kosong bila belum ada; halaman Dana Desa menganggap baris kosong sama dengan belum diisi).

## Batas yang jujur
- Angsuran belum otomatis menjadi catatan Buku Kas Umum/SPP, dan belum ada unggah bukti (foto/PDF perjanjian atau kuitansi).
- Tidak ada impor dari sistem pusat (Simkopdes/OM-SPAN); semua dicatat manual.
- Perbandingan "angsuran vs progres fisik" bergantung pada nilai pekerjaan yang diisi operator; ambang 20 poin dan 60 hari adalah kebijakan aplikasi, bukan angka dari aturan.
- Anggaran KDMP dihitung dari kegiatan APB Desa yang ditandai fokus KDMP di halaman Dana Desa; kegiatan yang belum ditandai tidak terhitung.
- Tidak mengubah APB Desa/DPPA: perubahan anggarannya tetap dibuat di modul APB Desa (DPPA berversi masih dalam daftar "belum").

## Pengujian
`tests/kdmp.test.ts` (16: perhitungan, validasi, izin rute) dan `tests/kdmp.integration.test.ts` (8 tes MySQL, termasuk uji dua-tiga angsuran serentak; tanpa `FOR UPDATE` tes itu gagal 3 dari 3). Browser sungguhan (Chrome): pagu tampil, penyaluran memicu peringatan "baru Rp80 juta dianggarkan", gerai + progres 20% + angsuran 50 juta memicu peringatan mendahului progres, angsuran berlebih ditolak dengan pesan di dalam dialog, riwayat progres; 390px tanpa gulir horizontal di semua tab.
