# Rencana menutup celah fungsi "one-stop" desa

Disusun 2026-11-01 setelah audit kelengkapan. Dokumen kerja untuk pemilik dan sesi pengembangan berikutnya.

**Legenda sumber:** **[V]** = teks resmi sudah saya baca langsung (PDF peraturan.go.id / JDIH Kemenkeu, disimpan di scratchpad sesi). **[R]** = dari pencarian web atau sumber sekunder; teks resmi BELUM dibaca → wajib diverifikasi di "Langkah 0" paket terkait sebelum dikodekan. **[?]** = belum diketahui.

---

## 0. Temuan yang mengubah rencana (dari teks resmi)

| # | Temuan | Dampak |
|---|---|---|
| 1 | **RPJM Desa kini 8 tahun** (Permendesa PDT 16/2025 Pasal 1 angka 4 [V]; UU 3/2024 [R]). Modul RPJMDes kita menerima `periodStart/periodEnd` bebas. | Validasi 8 tahun + masa peralihan untuk dokumen 6 tahun yang sudah ada. |
| 2 | Pemerintah menetapkan **fokus Dana Desa tiap tahun** lewat Permendesa baru (16/2025 untuk TA 2026) dan PMK baru (7/2026). Aturan TA 2027 belum ada [?]. | Katalog aturan harus **berversi per tahun anggaran dan berbasis data**, bukan ditanam di kode. Rilis tahunan = pembaruan data. |
| 3 | Penyaluran DD reguler: tahap I **40%** (paling lambat Juni 2026), tahap II **60%** (paling cepat April 2026); desa berstatus **mandiri** 60% / 40% (PMK 7/2026 Pasal 23 [V]). Sumber sekunder yang saya temukan menulis kebalikannya. | Jangan percaya ringkasan berita; kutip pasal. |
| 4 | **Syarat tahap I:** Perdes APBDes, surat kuasa pemindahbukuan, **laporan realisasi penyerapan dan capaian keluaran DD tahun sebelumnya**. **Tahap II:** laporan realisasi dan capaian keluaran tahap I (Pasal 24 [V]). Capaian keluaran = **rata-rata % capaian seluruh kegiatan desa** (Pasal 25(5) [V]) dalam tabel *bidang, kegiatan, uraian keluaran, volume, satuan, capaian* (Pasal 25(6) [V]). Syarat tambahan "akta Kopdes" dari PMK 81/2025 **tidak ada** di PMK 7/2026; kabupaten dilarang menambah syarat (Pasal 31). | Model `ApbdesActivityPlan` kita sudah punya `outputName/outputVolume/outputUnit/realizedVolume` → fondasinya ada. Perlu papan kesiapan syarat dan ekspor tabel. |
| 5 | **KDMP:** pagu KDMP = **58,03%** dari pagu DD setiap desa (Pasal 15(3) [V]); disalurkan **terpisah** (RKUN → rekening penampung, bukan RKD; Pasal 22(4)); dipakai untuk **angsuran** pembangunan fisik gerai, pergudangan, kelengkapan (Pasal 20(3)); dianggarkan di **perubahan APB Desa** setelah penyaluran (Permendesa 16/2025 Pasal 2(2) [V]). Operasional pemdes ≤ **3% dari pagu reguler** (PMK Pasal 20(5) [V]). | Kopdes butuh **DPPA/perubahan APBDes** → saat ini hanya peringatan "perlu DPPA". DPPA masuk Paket 1. |
| 6 | **BLT Desa:** maks Rp300.000/bulan/KPM, dibayar maks **3 bulan sekaligus**, KPM diputuskan di **Musdes**, dikukuhkan **SK Kepala Desa** (memuat nama, NIK, alamat, rincian jenis pekerjaan, jumlah, kategori), dilaporkan ke bupati lewat camat; penggantian lewat **Musdes khusus + berita acara**; kriteria cadangan 5 butir bila tak ada data pemerintah (Permendesa 16/2025 Pasal 3 & Lampiran II.A [V]). | Alur BLT lengkap bisa dikodekan 1:1 dari teks. |
| 7 | **Publikasi wajib** fokus DD sejak APB Desa ditetapkan (nama kegiatan, lokasi, besaran) lewat sistem informasi desa/papan/website dst; sanksi: kehilangan wewenang alokasi operasional 3% tahun berikutnya (Pasal 10–11 [V]). **Laporan penetapan fokus ke Menteri** digital + Perdes RKPDes + Perdes APBDes, paling lambat **1 bulan setelah RKPDes ditetapkan** (Pasal 12 [V]). | Kalender kepatuhan + bundel dokumen. |
| 8 | **8 larangan** DD (honor kades/perangkat/BPD, perjalanan dinas luar kab, iuran jamsos aparatur, kantor desa > Rp25 jt, bimtek aparatur, bimtek/studi banding luar kab, utang tahun lalu, bantuan hukum pribadi) (Lampiran II.J [V]). | Peringatan otomatis berbasis kode rekening + kata kunci, dengan opsi "pengecualian + alasan". |
| 9 | **PKTD:** upah ≥ **50%** biaya kegiatan, dibayar **harian**, batas atas upah di bawah UMP, prioritas pekerja (penganggur, setengah penganggur, perempuan kepala keluarga, keluarga miskin, marginal) (Lampiran II.F [V]). | Lembar HOK + validator. |
| 10 | **Fokus DD berdasar rekomendasi Indeks Desa** dan dibahas di Musdes RKPDes (Pasal 8 [V]). Modul statistik kita hanya membaca skor IDM luar. | Impor IDM + kartu rekomendasi di halaman perencanaan. |
| 11 | **Siklus RKPDes** (Permendagri 114/2014 Pasal 31–51 [V]): Musdes ≤ Juni → tim penyusun 7–11 orang (wajib ada perempuan) ≤ Juni → pagu indikatif diterima dari kab ≤ Juli → rancangan RKPDes + daftar usulan + RAB diverifikasi tim verifikasi → berita acara → Musrenbangdes (10 unsur peserta) → Perdes RKPDes paling lambat **akhir September** (Pasal 29(4)); APB Desa 31 Des (Pasal 37(3)); daftar usulan ke bupati via camat ≤ 31 Des. Perubahan RKPDes hanya karena peristiwa khusus/perubahan kebijakan (Pasal 49–50). | Dasar alur Paket 1. **Catatan:** sumber sekunder menyebut Permendesa 17/2019 (nomor perlu dicek, mungkin Permendesa 21/2020) bisa mengesampingkan sebagian Permendagri 114/2014 untuk RPJMDes → Langkah 0 Paket 1. |

**Faktor musiman:** hari ini 1 Nov 2026. Perdes RKPDes 2027 seharusnya sudah ditetapkan akhir September (Pasal 29(4)); desa yang belum selesai sudah terlambat. **APBDes 2027 dan daftar usulan RKPDes jatuh tempo 31 Des 2026.** Paket 1 adalah satu-satunya yang punya tenggat nyata dalam ±8 minggu; Paket 2 bergantung pada Permendesa TA 2027 yang belum terbit.

---

## 1. Prinsip kerja (berlaku untuk semua paket)

1. **Langkah 0 per paket:** baca teks resmi, catat [V]/[R], tulis kriteria penerimaan sebelum kode. Tidak ada angka/tenggat hukum yang ditanam tanpa [V].
2. **Aturan = data berversi per tahun anggaran** (`regulation_catalogs`: kunci, tahun efektif, nilai, rujukan pasal, status verifikasi). Ubah tahun = ubah data. Penggantian kabupaten (Perbup juknis, mis. batas upah PKTD) = *override* per desa/kabupaten.
3. **Peringatan, bukan penghalang,** kecuali batas yang tertulis tegas dan mudah diukur (BLT ≤ Rp300rb, tim 7–11 orang). Selalu tampilkan pasal rujukan; izinkan "pengecualian + alasan" yang masuk audit.
4. **Pola modul yang sudah terbukti:** `catalog.ts` murni (aman klien) + `service.ts` Prisma; setiap rute memanggil `requireVillageApiContext` + `attempt()`; tulis ber-`auditWeb`; uang BigInt sen; kunci `FOR UPDATE` sebagai pernyataan pertama transaksi; indeks unik ≤ 64 karakter (`map:`).
5. **SQL aditif + rollback + latihan:** tiap paket punya `docs/*_MIGRATION.sql` dan `*_ROLLBACK.sql`, dilatih pada salinan skema DB produksi (seperti rilis 2026-11-01) sebelum diterapkan; tanpa `db push`.
6. **Tes:** logika murni (unit) + integrasi MySQL (concurrency/kunci/transaksi). **Tambahan baru:** mulai Rilis 1, **tes asap browser (Playwright)** untuk alur kritis, karena saat ini 0 tes e2e dan layar baru terbukti belum pernah dicoba pengguna.
7. **Rilis per paket** (bukan satu rilis raksasa): rehearsal SQL → build bersih → uji asap → swap berdampingan. Bendera per desa untuk fitur berisiko.
8. **Izin & paket langganan:** resource izin baru per domain; tetapkan `billingAddon` (keputusan pemilik, §4).
9. **Data sensitif** (BLT, PBB wajib pajak, kekerasan perempuan/anak, disabilitas, kejadian keamanan): resource izin terpisah, audit baca, penyamaran di API v1.
10. **Dokumentasi jujur:** tiap paket menulis daftar "belum" dan sumber yang belum terverifikasi.
11. **Uji dengan operator:** tiap rilis disertai naskah uji 5–8 langkah (seperti yang akan Anda jalankan di Karanganyar) dan data demo di desa uji (Bedahan).

---

## 2. Peta dependensi dan urutan rilis

```
P0 Musdes (primitif bersama) ─┬─> P1 Perencanaan v2 + DPPA ──┬─> P2 Dana Desa 2026/2027 (+BLT, PKTD, KDMP)
                              │                              └─> P7 Kalender kepatuhan & bundel laporan
                              ├─> P3 BUMDes/Kopdes/UKM (Musdes pendirian, laporan tahunan)
                              └─> P4 Bencana + P5 Keamanan (primitif "kejadian & respons")
P6 Pertanahan & pajak (tergantung data Bapenda)     P8 Sosial-budaya dst (tergantung perbaikan agregasi widget)
P9 Celah lain (pengadaan, IDM, profil, ekspor tenant, mobile) — diselipkan sesuai kebutuhan
```

| Rilis | Isi | Ukuran | Alasan urutan |
|---|---|---|---|
| **R1** | P0 + P1 (inti) + DPPA | **L** | Tenggat nyata 31 Des 2026; hub rantai perencanaan → APBDes → SPP → LPPD. |
| **R2** | P2 (fokus, kepatuhan, BLT, PKTD, KDMP, laporan keluaran) | **L–XL** | Butuh R1; sebagian menunggu Permendesa TA 2027 → bangun mesin berversi, isi katalog 2026 sekarang. |
| **R3** | P3 (BUMDes inti, UKM pesanan, tanah kas/sewa) | **M–L** | Mandiri; memakai Musdes dan buku besar dari R1/APBDes. |
| **R4** | P4 + P5 (kejadian & respons bersama) | **M–L** | Primitif bersama; tidak bergantung R1–R3. |
| **R5** | P7 + bagian P9 (pengadaan, IDM, profil) | **M** | Nilai tertinggi bagi Dinas PMD (kepatuhan seluruh desa terlihat). |
| **R6** | P6 + P8 | **M–L** | P6 menunggu sampel Bapenda; P8 menunggu perbaikan widget (§P8). |

Ukuran relatif: S ≈ sebagian sesi, M ≈ 1 sesi besar, L ≈ 2–3 sesi, XL ≈ 4+ sesi. Bukan janji tanggal.

---

## 3. Paket

### P0 — Musdes sebagai primitif bersama  (ukuran M) — **DIKODE 2026-11-01**, lihat [PHASE1_PERENCANAAN.md](PHASE1_PERENCANAAN.md)
**Kenapa:** Musdes dipakai di RPJMDes, RKPDes, Musrenbangdes, BLT, penggantian KPM, perubahan APBDes (Kopdes), pendirian BUMDes, laporan BUMDes, DTSEN (sudah ada sebagian di `dtsen_proposals`). Bangun sekali.

- **Dasar:** Permendagri 114/2014 Pasal 31–32, 46, 48 [V]; Permendesa 16/2025 Pasal 3, 8–9 [V].
- **Data (tabel baru):** `village_meetings` (jenis, judul, jadwal, lokasi, status, agenda, teks berita acara, final/dikunci, tautan produk hukum), `village_meeting_attendees` (warga/ketik, unsur [10 unsur Pasal 46(3)], gender, kelompok rentan: miskin/disabilitas/perempuan/anak, tanda hadir), `village_meeting_decisions` (nomor urut, teks, tautan ke objek: kegiatan RKPDes / KPM BLT / dll).
- **Aturan:** peringatan bila peserta tak mencakup perempuan/kelompok miskin/disabilitas (Permendesa 16/2025 Pasal 9(2) [V]); berita acara final terkunci (koreksi = versi baru, bukan edit).
- **Keluaran:** undangan cetak, daftar hadir cetak/QR, berita acara cetak, ekspor.
- **Integrasi:** `legal_documents` (Perdes/SK), `residents`, `village_institutions` (BPD sebagai penyelenggara).
- **Tes:** unit (aturan kehadiran), integrasi (finalisasi atomik, penguncian), asap browser.

### P1 — Perencanaan Desa v2 + DPPA  (ukuran L; **R1**) — **INTI DIKODE 2026-11-01** (siklus RKP Desa, tim, pagu, kegiatan, cetak, kunci setelah Perdes); **belum**: tahapan RPJM Desa, tautan ke APB Desa, DPPA, monev, impor IDM. Lihat [PHASE1_PERENCANAAN.md](PHASE1_PERENCANAAN.md)
**Celah saat ini:** `RpjmdesPlan` periode bebas, `RkpdesActivity` datar (judul/tahun/lokasi/anggaran/SDGs), tanpa tim penyusun, pagu indikatif, berita acara, pelaksana kegiatan, tautan ke APBDes, monev; `CommunityProposal.votesCount` selalu 0.

**Langkah 0:** (a) tetapkan peraturan yang berlaku untuk RPJMDes 8 tahun: UU 3/2024 Pasal 79(2) [R], Permendagri 114/2014 vs Permendesa 21/2020 atau 17/2019 [R] — baca teks; (b) baca format lampiran Permendagri 114/2014 (format RKPDes, daftar usulan, pagu indikatif).

**Alur dan data (aditif):**
1. **RPJMDes:** validasi 8 tahun (+ bendera "dokumen 6 tahun lama"), tautan Perdes, versi/perubahan; visi-misi sudah ada.
2. **Siklus RKPDes** `rkpdes_documents` (tahun, status bertahap: PERSIAPAN → TIM_DIBENTUK → PAGU_DICERMATI → RANCANGAN → VERIFIKASI → MUSRENBANGDES → PERDES_DITETAPKAN; perubahan khusus Pasal 49 [V]). **Tenggat otomatis** dari katalog aturan: Musdes ≤ Juni, tim ≤ Juni, pagu ≤ Juli, APBDes 31 Des, usulan ke bupati 31 Des [V].
3. `rkpdes_team_members` (7–11 orang, minimal satu perempuan, SK) [V Pasal 33].
4. `rkpdes_pagu_indicative` (sumber: DD, ADD, bagi hasil pajak/retribusi, bankeu provinsi/kabupaten, PADes, swadaya) [V Pasal 36–47].
5. **Kegiatan** (perluas `rkpdes_activities` secara aditif): bidang/subbidang (kode A.1 dari `lib/apbdes/codes.ts`), sumber dana, lokasi (+ titik peta), keluaran/volume/satuan, cara (swakelola/kerja sama), pelaksana (ketua, sekretaris, bendahara, anggota; ≥1 perempuan, Pasal 40 [V]), RAB terlampir terverifikasi (Pasal 42 [V]), skor prioritas (sudah ada).
6. **Daftar usulan RKPDes** ke bupati via camat (cetak + status) [V Pasal 43, 51].
7. **Tautan ke APBDes:** kolom nullable `rkpdesActivityId` pada `apbdes_activity_plans`; "Terbitkan ke APBDes" menyalin kegiatan disetujui menjadi baris/rencana dengan jejak asal. Cek selisih rencana vs anggaran.
8. **Monev:** `activity_progress_logs` (tanggal, % fisik, catatan, foto, titik) → alimentasi `realizedVolume` dan layar publik "Pantau pembangunan" (Pasal 59 sosialisasi [V]).
9. **Usulan warga:** hubungkan `CommunityProposal` ke Musdes/Musrenbangdes (dukungan nyata, menggantikan `votesCount` mati).
10. **DPPA / perubahan APBDes:** dokumen perubahan DPA, pergeseran antar objek, tautan ke RKPDes perubahan (Pasal 50(4) [V]); prasyarat KDMP.
11. **Kartu rekomendasi Indeks Desa** (Permendesa 16/2025 Pasal 8(2) [V]): impor CSV IDM per desa dari sumber publik; tampilkan indikator terlemah sebagai saran fokus.

**Keluaran:** cetak SK tim, berita acara Musdes/Musrenbangdes, rancangan RKPDes, daftar usulan, lampiran Perdes RKPDes (draf).
**Tes:** unit (tenggat, validasi 7–11, 8 tahun), integrasi (penerbitan ke APBDes atomik, tak ganda), asap browser alur penuh pada Bedahan.
**Risiko/[?]:** format resmi lampiran dapat berbeda per kabupaten; desa mungkin sudah memakai Siskeudes/OpenSID untuk RKPDes → fitur impor/ekspor mungkin diminta; minta contoh dari Karanganyar.

### P2 — Dana Desa (TA 2026, mesin berversi untuk 2027+)  (ukuran L–XL; **R2**) — **P2.a–d DIKODE 2026-11-01** (lihat [PHASE2_DANADESA.md](PHASE2_DANADESA.md)); **belum**: P2.e BLT, P2.f PKTD, P2.g KDMP
**Langkah 0:** unduh dan baca PMK 7/2026 [V sebagian: Pasal 15, 20–33 sudah dibaca; **Lampiran (tabel referensi keluaran) belum**], Permendesa 16/2025 [V penuh]; konfirmasi dengan Dinas PMD Karanganyar: Perbup juknis DD 2026, batas upah PKTD, format tabel referensi OM-SPAN TKD.

Sub-paket (masing-masing dapat dirilis sendiri):
- **P2.a Katalog aturan + fokus:** `regulation_catalogs` (P0 prinsip 2) memuat 8 fokus, 8 larangan, batas (BLT 300rb, ≤3 bulan, operasional 3%, upah ≥50%), tenggat (Pasal 12 laporan 1 bulan, publikasi). Penandaan **fokus a–h** pada rencana kegiatan (`ddFocus` nullable pada `apbdes_activity_plans`).
- **P2.b Dasbor kepatuhan DD:** pagu reguler vs KDMP (hitung 58,03% dan bandingkan input), serapan per fokus, operasional ≤3% dari pagu reguler [V], peringatan 8 larangan (kode rekening + kata kunci, pengecualian beralasan), tahap penyaluran 40/60 atau 60/40 mandiri [V].
- **P2.c Publikasi (Pasal 10 [V]):** hasilkan daftar "nama kegiatan, lokasi, anggaran" untuk website desa/papan informasi (cetak/baliho), catat tanggal & kanal publikasi sebagai bukti (sanksi Pasal 11).
- **P2.d Laporan:** (1) paket Laporan Penetapan Fokus ke Menteri: dokumen + Perdes RKPDes + Perdes APBDes, tenggat 1 bulan setelah RKPDes [V Pasal 12]; (2) **Laporan realisasi penyerapan & capaian keluaran** per kegiatan, rata-rata % capaian [V Pasal 25]; (3) **Papan kesiapan syarat tahap I/II** (Perdes APBDes? laporan tahun lalu? laporan tahap I?) [V Pasal 24]. Ekspor CSV mengikuti kolom Pasal 25(6); format OM-SPAN persisnya [?].
- **P2.e BLT Desa** (Permendesa 16/2025 Pasal 3 + Lampiran II.A [V]): `blt_programs` (tahun, nominal ≤ 300rb hard, maks 3 bulan sekaligus hard), `blt_beneficiaries` (KK/`households`, sumber data pemerintah/desa, 5 kriteria cadangan, status), alur: pendataan RT/RW/dusun → verifikasi kependudukan (pakai `residents`/`households`; tanpa NIK → surat domisili) → **Musdes BLT (P0)** → **SK Kades** (cetak dengan isi minimal Lampiran II.A.2.c.3 [V]) → laporan ke bupati lewat camat → pembayaran batch (`blt_payments`: periode, metode tunai/nontunai, tanda terima + foto) → mencatat PENGELUARAN pada BKU/SPP → penggantian KPM lewat Musdes khusus + berita acara [V]. Silang cek dengan `social_benefit_beneficiaries` (kriteria "tidak menerima PKH") dan alur DTSEN yang sudah ada. **Data sensitif:** resource izin `blt`.
- **P2.f PKTD:** `pktd_work_logs` per kegiatan (pekerja dari `residents`, hari kerja, upah harian, tanda terima), validator **upah ≥ 50% biaya kegiatan**, pembayaran harian, kategori prioritas pekerja, batas upah dari katalog (override Perbup) [V Lampiran II.F]; opsi jaminan sosial ketenagakerjaan.
- **P2.g KDMP:** `kdmp_support` (tahun, pagu 58,03% dihitung, penyaluran per keputusan menteri, angsuran, progres gerai/gudang), tautan `cooperative_formations`, tautan perubahan APBDes (DPPA, P1). **Catatan:** syarat tahap II lama (akta Kopdes) tidak ada di PMK 7/2026 [V].
- **P2.h Mesin tahun berikutnya:** begitu Permendesa/PMK TA 2027 terbit, perbarui `regulation_catalogs` + naskah uji; tidak ada rilis kode.

**Tes:** unit per aturan (nilai batas, 40/60 vs 60/40, 3%), integrasi (BLT penggantian atomik, pembayaran ↔ BKU), asap browser.
**Risiko:** tafsir "larangan" butuh pengecualian; aturan kabupaten beragam; fokus DD berubah tiap tahun (ditangani katalog).

### P3 — Ekonomi desa: BUMDes, Kopdes, UKM, tanah kas  (ukuran M–L; **R3**)
**Langkah 0:** baca PP 11/2021 (terutama Pasal 58 laporan semester/tahunan [R]), Permendesa 3/2021 (pendaftaran/pemeringkatan [R]), Kepmendes 136/2022 pedoman laporan keuangan [R].
- **BUMDes inti:** ubah/batal transaksi (kini hanya tambah) dengan jejak; buku kas + **jurnal berpasangan sederhana** (bagan akun ringkas: kas, piutang, persediaan, aset tetap, utang, modal, pendapatan, beban) → **neraca & laba rugi** per unit usaha dan konsolidasi (semester & tahunan [R]); penutupan periode seperti Buku Kas Umum.
- **Hubungan dengan APBDes:** penyertaan modal (belanja/pembiayaan) dan **bagi hasil → PADes** tercatat sebagai penerimaan APBDes bertautan; keduanya wajib disepakati Musdes (P0).
- **Legalitas & data:** badan hukum, NIB, NPWP, AD/ART, pengurus, SK; ekspor untuk pendaftaran [R].
- **UKM / pasar desa:** dari katalog → **pesanan via tautan WhatsApp + status pesanan** dulu (risiko rendah), pembayaran LinkQu menyusul setelah ada operator nyata; layar mobile warga.
- **Tanah kas desa & sewa:** perluas `inventory_items` (tanah: luas, batas, bukti hak, pemanfaatan, perjanjian sewa) dengan penerimaan sewa → PADes. Aset strategis butuh persetujuan bupati (sudah di Aset, Permendagri 1/2016 [V]).
- **Tidak dibangun:** akuntansi PSAK penuh, integrasi bank otomatis.
**Tes:** unit (neraca seimbang), integrasi (konsolidasi, penutupan periode), asap browser.

### P4 — Bencana & lingkungan (Destana)  (ukuran M–L; **R4**)
**Langkah 0:** baca Perka BNPB 1/2012 dan tentukan apakah masih berlaku atau sudah diganti (Perka BNPB 6/2025 menyebutnya "tidak sesuai perkembangan" [R]); baca SNI 8357:2017 indikator Destana [R]. Cek apakah BPBD Karanganyar memakai formulir tertentu.
- **Primitif bersama "kejadian & respons"** (dipakai juga P5): `village_incidents` (jenis, lokasi/peta, waktu, dampak, status, laporan ke supra-desa), `incident_responses` (log tindakan), `incident_logistics` (distribusi bantuan ke KK) — mendukung pengecualian DD bencana (PMK 7/2026 Pasal 20(7) [V]) dan logistik operasional (Lampiran II.I [V]).
- **Kesiapsiagaan:** `drm_hazards` (ancaman per wilayah, dari `DisasterPoint`), `drm_resources` (peralatan, shelter, titik kumpul, jalur evakuasi pada peta), `drm_volunteers` (relawan/tim siaga dari `residents`), dokumen rencana (rencana penanggulangan/kontinjensi) sebagai lampiran `legal_documents`.
- **Peringatan dini:** siaran lewat modul notifikasi/push mobile yang sudah ada, per RT/RW; templat pesan; log pengiriman.
- **Skor kesiapan** (indikator Destana setelah diverifikasi) → kartu "Desa Tangguh Bencana" untuk fokus DD (b) [V].
- **Iklim & lingkungan:** bank sampah (sudah), penanaman/vegetasi sebagai aksi tercatat (data kustom).
**Risiko:** integrasi BPBD tidak ada; data kejadian sensitif sedang (korban).

### P5 — Keamanan & ketertiban  (ukuran M; **R4**)
**Langkah 0:** tentukan peraturan Linmas yang berlaku (Permendagri 5/2018 vs 26/2020 [R: sumber saling bertentangan]) dan Perpol 4/2020 + Perpol 1/2023 (Satkamling) [R]; tidak ada yang ditanam sebelum dibaca.
- **Satlinmas:** roster anggota (dari perangkat/warga, SK), perlengkapan (inventaris).
- **Ronda/siskamling:** jadwal rotasi per RT (generator + tukar giliran), absen ronda lewat mobile (memakai infrastruktur presensi yang ada, QR/geofence opsional), catatan temuan.
- **Kejadian keamanan & mediasi:** pakai primitif P4; BA mediasi dengan pihak, hasil, tindak lanjut (fokus operasional [V Lampiran II.I.2.b]); tautan ke Pengaduan yang sudah lengkap.
- **Kerawanan:** peta kerawanan sederhana.
- **Privasi:** resource izin `keamanan`; laporan kekerasan perempuan/anak **hanya rujukan** (kontak P2TP2A/layanan), bukan basis data kasus.
**Tes:** unit (rotasi adil, tukar giliran), integrasi, asap.

### P6 — Pertanahan & pajak  (ukuran M + L terblokir; **R6**)
**Langkah 0:** baca UU 1/2022 (HKPD) pasal PBB-P2 dan PP 43/2014 Pasal 72 bagi hasil ≥10% [R]; baca Perbup Karanganyar tentang pelimpahan pemungutan PBB-P2 ke desa [?].
- **PBB-P2 pendampingan (terblokir data Bapenda):** impor daftar SPPT (NOP, nama WP, alamat objek, luas, NJOP, terutang, status) → `pbb_objects`; pemantauan penagihan per RT/RW/dusun; pengingat ke WP (sesuai izin); rekonsiliasi setoran; pelacak insentif/bagi hasil → penerimaan PADes. **Default: pelacakan saja, tanpa menangani uang** kecuali Perbup melimpahkan pemungutan (keputusan pemilik §4). Data wajib pajak = data pribadi → izin `pbb`, penyamaran API.
- **Buku tanah desa & tanah kas:** lihat P3; register bukti hak (SHM, letter C/girik, persil) sebagai atribut tanah [R verifikasi istilah].
- **Retribusi & PADes:** pasar, tambatan, wisata: karcis/penerimaan harian → entri penerimaan APBDes bertautan.
- **Surat pertanahan:** templat SKT/keterangan waris sudah ada; tambah tautan ke register.
**Risiko:** benchmark OpenSID Premium punya modul PBB; tanpa sampel Bapenda hanya bisa bangun kerangka.

### P7 — Pelaporan: kalender kepatuhan, bundel, narasi  (ukuran M; **R5**)
- **Registri laporan wajib per desa** dengan tenggat dari katalog aturan [V sebagian]: APBDes ditetapkan 31 Des; laporan semester I (minggu kedua Juli) & LPJ tahunan 31 Mar (Permendagri 20/2018 [V]); laporan penetapan fokus DD (1 bulan setelah RKPDes [V]); laporan keluaran DD tahap I/II (PMK 7/2026 [V]); LPPD/LKPPD (Permendagri 46/2016 [V]); laporan BUMDes semester/tahunan [R]; informasi ke masyarakat (Pasal 72 [V]). Status: belum/draf/terkirim + pengingat (notifikasi web/mobile/email).
- **Bundel dokumen** (ZIP/PDF) per laporan: gabungkan cetak yang sudah ada + lampiran; PDF lewat gaya cetak browser (server RAM sempit; jangan render PDF di server).
- **Bantuan narasi (Laras):** draf narasi LPPD/LKPPD dari data terstruktur, bertanda sumber, **tanpa mengarang angka**, wajib disetujui manusia; alat baca-saja yang sudah ada.
- **Rekap kabupaten:** perluas dasbor kabupaten dengan kepatuhan per desa (APBDes ditetapkan? laporan terkirim?) — nilai jual ke Dinas PMD.
- **Profil desa/Prodeskel/monografi:** generator dari data penduduk, wilayah, aset, kelembagaan [R: baca Permendagri 12/2007 / format Prodeskel].
- **Ekspor Siskeudes:** tetap terblokir templat (lihat §4).

### P8 — Sosial-budaya, pendidikan, keagamaan, kepemudaan (zakat/masjid, dll)  (ukuran M; **R6**)
**Pendekatan:** bukan modul bespoke. Domain ini minim aturan baku → bangun sebagai **templat resmi Aplikasi Desa** di atas Data Kustom (Fase 4), dengan `piiClass` eksplisit.
- **Templat awal:** Karang Taruna & kepemudaan; masjid/lembaga ibadah + kas lembaga sederhana; sanggar seni, adat & objek pemajuan kebudayaan (UU 5/2017 [R]); PAUD/TK/taman bacaan/perpustakaan desa (beasiswa sudah ada); olahraga (agenda, fasilitas); tenaga kerja (pencari kerja/pelatihan); disabilitas (register inklusi, **sensitif**).
- **Zakat:** desa bukan amil resmi (BAZNAS/UPZ); lingkup default **mencatat UPZ setempat dan penyaluran sebagai transparansi**, tanpa memegang dana. Perlu keputusan pemilik (§4).
- **Prasyarat teknis (wajib sebelum templat resmi):** ubah widget `breakdown/sum` ke **agregasi SQL** (kini memindai 20.000 baris di memori; tercatat di catatan Fase 4); tambah widget agenda/kalender dan hitung status.
- **Publikasi:** butuh penerbit resmi di admin platform; Anda memutuskan siapa yang meninjau templat.

### P9 — Celah lain yang teridentifikasi  (diselipkan; ukuran S–M masing-masing)
1. **Pengadaan barang/jasa desa** (Perka LKPP 13/2018 [R]): tim pelaksana, penawaran, BA negosiasi, SPK, BAST; tautan ke SPP/panjar. (M, R5)
2. **Kerja sama antar-desa/pihak ketiga** (Permendagri 114/2014 Pasal 39, 42 [V]): BA kesepakatan, RAB bersama. (S)
3. **Impor Indeks Desa** (lihat P1.11). (S)
4. **Kartu "Pengaduan Dana Desa Kemendesa"** (nomor resmi di Lampiran Permendesa 16/2025 [V]) pada halaman DD. (S)
5. **Ekspor penuh & cadangan per desa + klien Prisma ber-scope + tes isolasi lintas-tenant** — sisa Fase 0 & prasyarat kepercayaan jual ke kabupaten. (L, paralel; sebaiknya sebelum desa kedua dipakai sungguhan)
6. **Mobile warga:** layar polling (API sudah ada), transparansi APBDes/DD, pantau pembangunan, status BLT milik sendiri (privasi), PBB milik sendiri (setelah P6). (M)
7. **Interop pemerintah:** OM-SPAN TKD, Siskeudes, Satu iDesa — semua terblokir informasi (§4); jembatan sementara = ekspor CSV mengikuti kolom resmi.
8. **Cron produksi:** `CRON_SECRET` + crontab (webhook, rekonsiliasi kependudukan, pengingat kalender kepatuhan) — sesudah rotasi rahasia.

---

## 4. Keputusan dan masukan yang saya butuhkan dari Anda / desa

| # | Butuh | Untuk | Default jika tak dijawab |
|---|---|---|---|
| 1 | Contoh dari Karanganyar: berkas impor/ekspor Siskeudes, format RKPDes/daftar usulan, format LPPD dari camat | P1, P7, interop | Ekspor CSV buatan sendiri mengikuti lampiran peraturan |
| 2 | Perbup juknis DD 2026 + batas upah PKTD Karanganyar; format tabel referensi OM-SPAN TKD dari Dinas PMD | P2 | Katalog aturan tanpa override kabupaten |
| 3 | Format data SPPT dari Bapenda + Perbup pelimpahan pemungutan PBB-P2 | P6 | Pelacakan saja, tanpa penanganan uang |
| 4 | Data/format Destana dari BPBD | P4 | Indikator dari Perka/SNI setelah diverifikasi |
| 5 | Paket langganan: modul baru (APBDes, Perencanaan, Dana Desa, BUMDes v2…) jadi add-on atau termasuk paket dasar? | semua | Termasuk paket dasar sementara; tidak ada gating |
| 6 | Lingkup zakat/masjid: hanya pencatatan transparansi? | P8 | Pencatatan saja |
| 7 | Siapa meninjau/menerbitkan templat resmi Aplikasi Desa | P8 | Admin platform (Anda) |
| 8 | Perlakuan RPJMDes 6 tahun yang sudah ada saat aturan 8 tahun | P1 | Bendera "perlu penyesuaian", tidak diblokir |
| 9 | Siapa menguji tiap rilis dan kapan (operator + jadwal) | semua | Rilis ke produksi dengan bendera per desa, uji bertahap |

---

## 5. Daftar verifikasi sumber (Langkah 0 gabungan)

| Sumber | Status | Dibutuhkan oleh |
|---|---|---|
| Permendesa PDT 16/2025 | **[V] penuh** | P2, P1 |
| PMK 7/2026 (batang tubuh Pasal 15, 20–33) | **[V] sebagian**; Lampiran belum | P2 |
| Permendagri 114/2014 (Pasal 31–60) | **[V] sebagian**; RPJMDes (Pasal 14–30) dan lampiran format belum | P1 |
| Permendagri 20/2018, 46/2016, 1/2016 | [V] (dibaca pada fase sebelumnya) | P1, P7, P3 |
| UU 3/2024 (RPJMDes 8 tahun, masa jabatan) | [R] | P1 |
| Permendesa 21/2020 / 17/2019 (pedoman pembangunan desa) | [R] nomor belum pasti | P1 |
| PP 11/2021, Permendesa 3/2021, Kepmendes 136/2022 | [R] | P3 |
| Perka BNPB 1/2012 (status), SNI 8357:2017 | [R] | P4 |
| Permendagri Linmas 5/2018 / 26/2020, Perpol 4/2020 & 1/2023 | [R] bertentangan | P5 |
| UU 1/2022 HKPD (PBB-P2), PP 43/2014 Ps 72 | [R] | P6 |
| UU 5/2017 Pemajuan Kebudayaan; Perka LKPP 13/2018; Permendagri 12/2007 | [R] | P8, P9, P7 |

---

## 6. Definisi selesai (per paket)

1. Teks resmi dibaca dan [V]/[R] tercatat di dokumen paket.
2. SQL aditif + rollback; dilatih pada salinan skema produksi; tanpa DROP.
3. Tes unit + integrasi MySQL hijau; tsc + lint bersih; tes asap browser untuk alur kritis.
4. Izin, audit tulis, dan penyamaran API diterapkan; resource izin baru terdaftar di `api-route-map`.
5. Data demo di desa uji + naskah uji operator.
6. Dokumen paket menuliskan "belum" dan asumsi.
7. Rilis berdampingan dengan rollback siap; bendera per desa untuk fitur berisiko.
