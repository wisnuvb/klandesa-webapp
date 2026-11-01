# Paket 2 (bagian 1) — Dana Desa: kepatuhan, fokus, larangan, publikasi, kesiapan laporan

Dikerjakan 2026-11-01 sesuai `docs/PLAN_CELAH_FUNGSI.md` P2.a–P2.d. Belum di-commit dan belum di-deploy. **BLT Desa (P2.e), PKTD (P2.f), dan progres KDMP (P2.g) belum dibuat.**

## Sumber hukum (dibaca dari teks resmi, TA 2026)
- Permendesa PDT 16/2025: fokus a–h (Pasal 2), BLT (Pasal 3), penetapan fokus (Pasal 8), publikasi dan sanksi (Pasal 10–11), laporan ke Menteri (Pasal 12), Lampiran II.A, F, I, J (larangan).
- PMK 7/2026: pagu KDMP 58,03% (Pasal 15 ayat 3), operasional ≤3% pagu reguler (Pasal 20 ayat 5), tahap 40/60 dan Desa mandiri 60/40 (Pasal 23), syarat tahap I/II (Pasal 24), capaian keluaran = rata-rata persen seluruh kegiatan (Pasal 25).
- Aturan hanya hidup di `lib/dana-desa/rules.ts`, **berversi per tahun**. Tahun tanpa katalog memakai katalog terdekat dan layar menampilkan peringatan "belum tersedia". Pembaruan tahunan = ubah satu berkas itu (angka + pasal), lalu uji.

## Yang dibangun (`/dana-desa`)
- **Ringkasan:** pagu reguler dan KDMP (diisi dari keputusan pagu; KDMP **tidak** dihitung otomatis karena pagu reguler akhir sudah dikoreksi antar-Desa, PMK Pasal 15 ayat 5–7), temuan berjenjang (perlu diperbaiki / diperiksa / catatan, tiap temuan memuat dasar pasalnya), sebaran per fokus.
- **Fokus kegiatan:** penandaan fokus a–h dan Operasional per kegiatan APB Desa bersumber DD, dengan saran dari kode kegiatan.
- **Larangan:** 8 larangan Lampiran II.J. Berdasar rekening (pasti) atau uraian (perkiraan). Pengecualian beralasan (≥15 huruf) hanya oleh Kepala Desa/admin, hanya untuk baris yang memang terindikasi, tidak menimpa alasan lama, tercatat di audit lengkap dengan alasannya.
- **Publikasi:** daftar nama kegiatan, lokasi, anggaran siap cetak (`/dana-desa/publikasi`), dan catatan bukti publikasi per kanal Pasal 10.
- **Penyaluran dan laporan:** tahap 40/60 atau 60/40, daftar kesiapan syarat (Perdes APB Desa otomatis; laporan tahun lalu, laporan penetapan fokus [tenggat 1 bulan sejak Perdes RKP Desa], laporan tahap I dicatat tanggalnya), capaian keluaran dari DPA + unduh CSV (kolom Pasal 25 ayat 6).

## Data
SQL aditif `PHASE2_DANADESA_MIGRATION.sql` (4 tabel `dd_*`, tanpa mengubah tabel lama) + `PHASE2_DANADESA_ROLLBACK.sql`; dilatih apply–rollback–apply di DB scratch dan diterapkan ke DB lokal. **Produksi belum.**

## Izin
Memakai resource `apbdes`: baca untuk semua peran yang boleh membaca APB Desa; simpan pagu/fokus/publikasi = create/update; **pengecualian = approve** (admin, Kepala Desa).

## Batas yang jujur
- Realisasi per sumber dana tidak ada (Buku Kas tidak mencatat sumber dana); sebaran memakai **anggaran**.
- Indikasi larangan berdasar kata kunci bisa keliru (positif/negatif palsu); itu sebabnya ada jalur pengecualian dan label "perkiraan".
- Operasional dihitung dari kegiatan yang **ditandai** Operasional, bukan ditebak.
- Format baku OM-SPAN TKD dan Perbup juknis kabupaten belum dibandingkan; CSV mengikuti kolom Pasal 25 ayat 6 saja.
- Pengeluaran pembiayaan bersumber DD (6.2) masuk total tetapi tidak ke sebaran per fokus (tak punya kode kegiatan).

## Pengujian
`tests/dana-desa.test.ts` (20 unit: angka katalog, larangan, batas 3%, KDMP, tahap, tenggat, validasi), `tests/dana-desa.integration.test.ts` (5 tes MySQL: ringkasan, pengecualian, publikasi, KDMP, isolasi antar-desa). Browser sungguhan (Chrome, admin Desa Bedahan lokal): alur pagu → fokus → larangan → pengecualian → publikasi → laporan → cetak, tanpa galat konsol/jaringan di luar penolakan alasan pendek yang disengaja; 390px tanpa gulir horizontal. Ditinjau agen keamanan terpisah: tanpa temuan Critical/High/Medium; 2 temuan Low (pengecualian tak terikat baris, alasan bisa ditimpa tanpa audit) sudah diperbaiki.
