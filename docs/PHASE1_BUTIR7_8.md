# Fase 1 butir 7 dan 8: Kopdes, polling, gizi, simpan-pinjam, bank sampah, imunisasi

Status: dikode 2026-11-01; belum diuji di browser; SQL produksi belum diterapkan. Semua SQL aditif (hanya `CREATE TABLE`), rollback tersedia.

| Fitur | Layar | Tabel baru (SQL) | Tes |
|---|---|---|---|
| Pembentukan Kopdes Merah Putih (butir 7) | `/koperasi/pembentukan` | `cooperative_formations` (`PHASE1_KOPDES_*`) | kopdes-formation, gizi-kopdes.integration |
| Polling warga / pemungutan suara | `/polling`; mobile `GET /api/mobile/v1/polls`, `POST .../[id]/vote` | `polls`, `poll_participations`, `poll_votes` (`PHASE1_POLLS_*`) | polls, polls.integration |
| Status gizi balita (z-score WHO) | `/pkk/gizi`, `GET /api/pkk/gizi` | tanpa tabel baru | gizi-zscore, gizi-kopdes.integration |
| Simpan-pinjam koperasi + kalkulator SHU | `/koperasi/simpan-pinjam` | `cooperative_savings`, `cooperative_loans`, `cooperative_loan_payments` (`PHASE1_SIMPANPINJAM_*`) | coop-loan-math, coop-savings-loans.integration |
| Bank sampah transaksional | `/lingkungan/bank-sampah/[id]` | `waste_bank_items`, `waste_bank_accounts`, `waste_bank_txs` (`PHASE1_BANKSAMPAH_*`) | waste-bank, waste-bank.integration |
| Imunisasi anak | `/pkk/imunisasi` | `immunization_records` (`PHASE1_IMUNISASI_*`) | immunization, immunization.integration |

## Butir 7: Kopdes Merah Putih
Riset (Juklak Kemenkop 1/2025 dan sumber pemerintah daerah): musdesus dengan BPD dan unsur masyarakat menghasilkan berita acara, lalu akta notaris, surat komitmen modal awal APBDesa ke pemkab, SK pengesahan, NPWP, akun Simkopdes. Pelacak mencatat delapan langkah itu (tanggal wajar dan berurutan, tidak di masa depan). Anggota memakai modul koperasi yang sudah ada; ada unduhan CSV anggota (umum, memuat NIK, khusus pengelola, tercatat di audit). **Format impor Simkopdes tidak ditemukan di sumber publik**, jadi ekspor ke Simkopdes tidak dibuat. Anggota koperasi bersifat sukarela: tidak ada fitur "daftarkan semua warga".

## Polling warga
Satu warga satu suara, tidak dapat diubah. Kerahasiaan lewat rancangan: partisipasi (siapa) dan suara (apa) disimpan di tabel terpisah tanpa kaitan; tabel suara tanpa id warga dan tanpa waktu, id berupa UUID acak (bukan urutan). Keterbatasan jujur: terlindung dari tampilan aplikasi dan admin, **bukan** dari orang yang punya akses langsung ke basis data dan menganalisis waktu penulisan. Umur minimum (bawaan 17), jadwal buka/tutup, hasil langsung atau setelah ditutup, draf yang bisa diubah sampai diterbitkan. Hasil polling bukan pengganti musyawarah desa. `CommunityProposal.votesCount` tetap tidak dipakai (belum ada alur usulan warga di aplikasi).

## Status gizi (z-score)
Tabel LMS WHO 2006 usia 0–60 bulan **dibangkitkan langsung dari berkas resmi WHO** (`lib/gizi/who-lms.ts`, bukan diketik tangan; skrip pembangkit di sesi ini, sumber who.int). Metode LMS dengan koreksi WHO di luar ±3 SD untuk indikator berat; <24 bulan diasumsikan diukur berbaring. Teruji terhadap nilai terbit WHO (kolom SD) dengan toleransi 0,12. Kategori: TB/U <-3 sangat pendek, -3..<-2 pendek (stunting <-2), BB/U, BB/TB (gizi buruk <-3 sampai obesitas >+3). **Batas bawah dikonfirmasi lintas sumber; kategori batas atas (gizi lebih/obesitas, risiko BB lebih) berbeda antarsumber sekunder dan sebaiknya dicek ke teks resmi Permenkes 2/2020.** Hitungan WHO tidak mengubah tanda stunting di data (`isStunting`); perbedaan hanya ditandai "perlu ditinjau". Alat bantu skrining, bukan diagnosis.

## Simpan-pinjam
Uang dihitung dengan BigInt sen. Simpanan pokok/wajib/sukarela: transaksi tak diubah/dihapus (koreksi dengan transaksi lawan); pokok dan wajib tak dapat ditarik selama anggota aktif; penarikan tak melewati saldo (baris anggota dikunci). Pinjaman: bunga flat per bulan dari pokok awal (0 = tanpa bunga), jadwal angsuran dihitung (tidak disimpan), pembayaran dialokasikan ke angsuran terlama dengan bunga dulu, lunas otomatis, maksimal 3 pinjaman aktif per anggota. Anggota yang punya catatan keuangan tidak dapat dihapus lewat rute. Kalkulator SHU: porsi jasa simpanan sebanding saldo akhir tahun, sisa sebanding bunga yang dibayar; tidak disimpan, **mengikuti keputusan RAT**. Belum terhubung ke buku kas koperasi yang lama (`cooperative_ledger_entries`); tidak ada denda keterlambatan atau metode anuitas.

## Bank sampah
Jenis sampah dan harga per kg; nasabah (warga atau nama bebas); setoran = berat (gram, 3 desimal) x harga saat itu, harga disalin ke transaksi; penarikan tak melewati saldo. Rekap bulan ini per jenis.

## Imunisasi
Jadwal rutin dari halaman Kemenkes "Pekan Imunisasi Dunia 2025" (dosis dan usia anjuran di `lib/gizi/immunization-catalog.ts`); JE (daerah endemis) dan imunisasi sekolah tidak dimasukkan. Mencatat banyak dosis sekaligus; daftar anak 0–24 bulan yang tertinggal; cakupan per jenis. Jadwal bisa berubah dan berbeda antardaerah, patokan akhir buku KIA dan puskesmas.

## Pelajaran teknis (jangan diulang)
- **Kunci baris harus pernyataan PERTAMA dalam transaksi MySQL.** Bacaan biasa sebelum `SELECT ... FOR UPDATE` membuat potret REPEATABLE READ lebih dulu, sehingga saldo dibaca basi dan penarikan serentak lolos semua (tertangkap tes bank sampah; sudah diperbaiki dan dikomentari di `lockAccount`).
- Jangan taruh nilai (bukan tipe) dari berkas yang mengimpor `@prisma/client` ke komponen klien; pisahkan `catalog.ts` murni.
- Hindari `onDelete: Restrict` pada anak yang ikut terhapus saat desa/koperasi dihapus (menghalangi cascade); jaga di rute.
- `processDue` webhook kini bisa dibatasi `villageId` (tes tak lagi ikut mengirim milik tes lain).

## Belum dikerjakan
KIA (ibu hamil/ANC) dan layanan lansia; laporan PDF akuntabilitas (LPPD/LKPPD/LPJ; menunggu butir 3 keuangan); ekspor ke Simkopdes (format tak publik); TTE (ditahan pemilik); penghubung simpan-pinjam ke buku kas; pengusulan/dukungan warga lewat aplikasi (`votesCount`); notifikasi ke warga saat polling dibuka.
