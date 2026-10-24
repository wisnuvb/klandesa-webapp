# Klandesa Mobile v2 — Roadmap Unggulan (harga baru + gap + moat)

> Draf 2026-10-24. Melengkapi `MOBILE_V2_PLAN.md` (teknis), `MOBILE_V2_PRODUCT_SPEC.md` (UX) dan `MOBILE_SECURITY_REVIEW.md`.
> **Keputusan harga (pemilik produk, 2026-10-24):** Rp3.500.000 di awal (termasuk tahun ke-1), lalu Rp100.000/bulan mulai tahun ke-2.
> **Catatan jujur:** analisis kompetitor berasal dari halaman pemasaran mereka (belum diverifikasi independen). Estimasi biaya/waktu di bawah adalah perkiraan kasar untuk 1–2 developer, bukan komitmen. Angka bertanda **[ISI]** harus diisi dari data nyata Anda.

---

## 1. Dampak keputusan harga

| | Sebelum (katalog `lib/billing/catalog.ts`) | Sesudah |
|---|---|---|
| Biaya awal paket dasar | Rp10.000.000 (Starter) | **Rp3.500.000** (sudah termasuk tahun 1) |
| Biaya tahunan | Rp1.200.000 (Starter) | Rp1.200.000 (Rp100rb × 12) mulai tahun 2 |
| Pendapatan per desa, tahun 1 | Rp11,2 jt | **Rp3,5 jt** (−69%) |
| Pendapatan per desa, tahun 2+ | Rp1,2 jt | Rp1,2 jt (tetap) |

Pembanding (dari situs mereka): OpenSID SiapPakai Rp3,57 jt/tahun, OpenSID Premium Rp1,02 jt/tahun, EasyDes Basic Rp5 jt + Rp2 jt/tahun server (tahun 1 ≈ Rp7 jt). Harga baru: tahun 1 sebanding OpenSID berbayar tetapi dengan app warga, dan tahun 2+ lebih murah dari EasyDes.

**Konsekuensi yang harus diterima:**
1. Margin tahun 1 tipis. Pendapatan per desa hanya kembali bila **biaya akuisisi + onboarding per desa sangat rendah**. Biaya terbesar bukan server (suara push gratis, tanpa OTP, foto ±11 GB/desa/tahun murah), melainkan **jam manusia**: sales, pelatihan, impor data, support. Jadi onboarding harus self-serve.
2. Pendapatan harus dibangun dari **luar paket dasar**: add-on modul (sudah ada di katalog, Rp49–249rb/bulan), take-rate pembayaran (iuran/retribusi lewat LinkQu), dan lisensi kabupaten.
3. Paket Profesional (Rp45 jt) dan Enterprise (Rp75 jt) menjadi tidak konsisten dengan paket dasar Rp3,5 jt. Putuskan: (a) hapus/ubah jadi bundel add-on, atau (b) tetapkan ulang sebagai paket kabupaten/instansi. **Jangan dibiarkan.**
4. Karena harga rendah, **jangan kunci Warga (feed sosial) sebagai add-on berbayar** di tahap awal. Fitur ini adalah pendorong penggunaan harian dan efek jaringan; menjadikannya bagian paket dasar menaikkan retensi (alasan desa memperpanjang Rp100rb/bulan). Pertahankan tombol "matikan" bagi desa yang belum siap moderasi.
5. Pantau satu angka sejak hari pertama: **jam kerja manusia per desa baru**. Target awal: ≤ **[ISI]** jam. Bila tahun 1 melewati itu, harga Rp3,5 jt merugi.

### Unit economics yang perlu Anda isi (rumus)
```
Margin tahun 1  = 3.500.000 − (CAC + jam_onboarding × biaya_per_jam + infra_tahun1 + biaya_payment_gateway)
Margin tahun 2+ = 1.200.000 − (jam_support × biaya_per_jam + infra_tahun)
Payback         = CAC / margin_bulanan_rata2
```
Infra per desa (storage foto, DB, bandwidth) kecil dibanding jam manusia; ukur nyata di desa pilot.

---

## 2. Prinsip menjadi unggul (urutan prioritas)

1. **Kepercayaan sebelum fitur.** Warga/desa lebih memakai app yang resmi, transparan, dan tidak pernah salah data. Gap Dana Desa/Bantuan/Info Desa adalah fitur kepercayaan.
2. **Aktivasi adalah metrik utama,** bukan jumlah fitur. Desa memperpanjang bila warganya memakai.
3. **Moat = data akuntabilitas + jaringan warga + identitas terverifikasi,** bukan surat (surat sudah standar di semua pesaing).
4. **Skala lewat saluran, bukan penjualan satu per satu:** kabupaten/kecamatan, mitra, dan referral desa-ke-desa.
5. **Self-serve onboarding** agar harga rendah tetap sehat.

---

## 3. Roadmap bertahap

### Fase A — Gerbang rilis (±2 minggu) — *tidak ada fitur baru*
Tujuan: app aman diuji warga. Selesai bila 1 desa staging berjalan penuh.
- [ ] Kunci `applicationId`, upload key, Play App Signing; isi `KLANDESA_ANDROID_PACKAGE`, `versionCode > Flutter`.
- [ ] Aset: ikon, adaptive icon, splash (`mobile/assets` kosong).
- [ ] Deploy staging; terapkan 6 migrasi berurutan; isi `AUTH_SECRET`, `SPACES_*`, `EXPO_ACCESS_TOKEN`; Nginx `X-Real-IP` + `client_max_body_size 1m`.
- [ ] Jalankan seluruh checklist uji manual di `MOBILE_SECURITY_REVIEW.md` (IDOR antar warga/desa, brute-force login, hapus akun).
- [ ] Pelaporan crash (Sentry atau Crashlytics), `/config` untuk force-update, CI: `tsc`, `lint`, `test:unit`, tes mobile.
- [ ] Rapikan tipe `tests/` web (TS5097/BigInt) dan pisahkan perubahan web yang belum di-commit dari rilis mobile.
- [ ] Audit akun lama dari freelancer (base URL API, format hash, jumlah akun valid) → tentukan jalur impor atau daftar ulang.
**Gate:** build `preview` (APK) lolos uji 2 perangkat Android murah; tidak ada temuan IDOR; crash-free ≥ 99% pada uji internal.

### Fase B — Tutup gap kepercayaan (±3–4 minggu)
Semua datanya sudah ada di backend; pekerjaannya DTO + layar.
| Fitur | Backend | Catatan best practice |
|---|---|---|
| **Info Desa** (profil, perangkat, jam layanan, kontak, darurat) | `GET /village/profile`, `/village/officials` dari `Village/Official/Position` | Panggilan 1 tap. Tanpa panic button otomatis (risiko salah-tekan dan tanggung jawab hukum). |
| **Dana Desa** (agregat) | `GET /village/budget-summary` dari `Budget/Transaction` | Desa memilih apa yang ditampilkan (flag publik); bahasa awam; hanya agregat. |
| **Bantuan Saya** | `GET /benefits/mine` dari `SocialBenefitBeneficiary` | Hanya data NIK/KK sendiri; disclaimer; panduan "mungkin berhak". |
| **Surat populer** | `GET /mail/popular` (agregat 30/90 hari, default global bila data < 20) | Normalisasi `mailType` → `mailServiceId` (kolom nullable). |
| **PDF surat ber-QR + halaman verifikasi publik** | Perluas `.../document`; halaman web `/verifikasi-surat/:token` | Tanpa klaim TTE; teks jelas "dokumen digital, verifikasi di URL". |
| **Koreksi data** | `DataChangeRequest` + antrean staf | Warga tidak mengedit data induk langsung. |
| **Bagikan ke WhatsApp** | Deep link + gambar bagikan | Pintu pertumbuhan warga ke warga. |
| **Ukuran huruf, offline queue (surat/laporan/post)** | Klien | Draf tidak boleh hilang; tampilkan "Menunggu sinyal". |
**Gate:** 1 desa pilot memakai penuh 2 minggu; tes otomatis untuk semua DTO baru (tidak ada NIK penuh bocor).

**Status Fase B (2026-10-24):**
- [x] Info Desa: `GET /village/profile`, layar `info-desa` (kantor, jam layanan, nomor penting, perangkat; tanpa NIK/telepon pribadi).
- [x] Dana Desa: `GET /village/budget-summary`, layar `dana-desa` (agregat per kategori; hanya bila desa menyalakan `budgetPublic`).
- [x] Bantuan Saya: `GET /benefits/mine`, layar `bantuan` (NIK diambil dari akun, bukan dari klien).
- [x] Pengaturan desa: `GET/PATCH /staff/village-info` + layar staf `staff/pengaturan-desa` (anggaran publik, nomor penting, jam layanan).
- [x] Surat populer: sudah ada sejak Fase 1 (`/mail/services` menandai `popular`; data ≥ 20 permohonan memakai agregat desa, selain itu daftar baku).
- [x] PDF surat ber-QR + halaman verifikasi publik `/verifikasi-surat/<token>` (token HMAC tanpa kolom DB baru; nama pemohon tersamar; bukan TTE).
- [x] Koreksi data: tabel `data_change_requests` (migrasi `20261024100000`), `GET/POST /me/data-changes`, `GET /staff/data-changes`, `POST /staff/data-changes/:id/decision`, layar `koreksi` (warga) dan `staff/koreksi`. Alamat/telepon/pekerjaan/pendidikan/agama/status kawin diterapkan otomatis saat disetujui; kolom identitas hanya ditandai disetujui (staf mengubah manual di web).
- [x] Bagikan kabar ke WhatsApp (menu bagikan sistem; teks memuat tautan Play Store).
- [x] Antrean offline untuk laporan dan permohonan surat (disimpan di HP, kirim otomatis; dibersihkan saat keluar akun). **Batas:** foto harus sudah terunggah; kegagalan jaringan setelah server menerima bisa membuat kiriman ganda.
- [ ] Ukuran huruf di dalam app: belum. Sistem Android (Pengaturan > Tampilan > Ukuran huruf) sudah dihormati. Opsi di dalam app butuh refaktor tipografi (layar memakai `Text` mentah berukuran tetap).

### Fase C — RT dan alur surat penuh (±3–4 minggu)
- `VillageRoleAssignment` (rt/rw/kadus + scope), status surat `PENDING_RT → PENDING_DESA → APPROVED → READY`, kompatibel mundur dengan web.
- Tab sesuai peran + pengalih peran (satu akun bisa multi-peran).
- Antrean pengantar RT, daftar warga RT, broadcast RT, kegiatan RT (`RtRwActivity`).
- **Matriks uji otomatis per peran × desa × RT** (warga, RT-A, RT-B, staf, kades, lintas desa) sebagai syarat merge.
**Gate:** surat end-to-end warga → RT → desa → PDF tanpa kertas di desa pilot.

**Status Fase C (2026-10-24):**
- [x] Peran RT: tabel `village_role_assignments` + kolom `rtStatus/rtNote/rtDecidedAt/rtDecidedByResidentId/applicantRt/applicantRw` di `mail_requests` (migrasi `20261024110000`, aditif). Cakupan RT/RW dinormalkan ("RT 03" = "3"); RT 03 di RW 01 tidak mencakup RT 03 di RW 02.
- [x] Alur surat: `rtStatus` null → alur lama tidak berubah. Bila desa menyalakan "Surat lewat pengantar RT" (`Village.settings.mobile.mail.rtApproval`) dan ada Ketua RT aktif untuk RT/RW pemohon: permohonan menunggu RT (`pending`) → RT setuju: masuk antrean desa; RT tolak: status surat `rejected` dengan alasan "Ditolak RT: ...". Pemohon yang sendiri Ketua RT-nya melewati tahap RT. Antrean staf dan keputusan staf mengabaikan permohonan yang masih menunggu RT.
- [x] Endpoint: `GET /rt/summary`, `GET /rt/requests`, `GET /rt/requests/:id`, `POST /rt/requests/:id/decision`, `GET /rt/residents` (NIK tersamar, 40 pencarian/menit); staf: `GET/POST /staff/rt-assignments`, `DELETE /staff/rt-assignments/:id`; `/me` memuat `roles`.
- [x] Mobile: tab RT (Pengantar, Warga RT) hanya muncul untuk warga yang ditugaskan, lencana jumlah menunggu, layar `rt/surat/[id]`, layar staf `staff/rt-penugasan`, toggle di Pengaturan Info Desa, langkah "Pengantar RT" di status surat warga.
- [x] Tes: `tests/mobile-rt.test.ts` memuat matriks akses (RT yang tepat, RT lain, RW lain, desa lain, permohonan sendiri, tanpa tahap RT).
- [ ] Belum: broadcast RT, kegiatan RT, lapor tamu/pendatang, RW/kadus. Web admin belum menampilkan status RT (staf web masih melihat semua permohonan).
- [ ] Pengujian nyata: matriks akses baru diuji di level logika. Belum ada uji end-to-end terhadap database staging.

### Fase D — Bangun moat (±4–6 minggu, paralel dengan C bila ada kapasitas)
1. **Dashboard akuntabilitas.**
   - Metrik per desa: median waktu surat selesai, % pengaduan ditanggapi < 3 hari, % "sudah beres" menurut pelapor, aktivasi warga.
   - Tampilan untuk kades (web + mobile) dan akun regional (`RegionalUser`) untuk kecamatan/kabupaten.
   - Ini aset data yang tidak dimiliki pesaing dan produk yang bisa dijual ke kabupaten.
2. **Kartu rapor desa** yang dapat dibagikan (opsional, publik) sebagai alat sosialisasi dan motivasi antar desa.
3. **Warga (feed) sebagai jangkar penggunaan harian:** SOP moderasi 1 halaman, template aturan komunitas, antrean moderasi yang cepat, metrik DAU/MAU, % warga yang pernah posting, rasio laporan/postingan.
4. **Loop retensi:** notifikasi bermakna (maks 3/hari kecuali darurat), digest, tindak lanjut pengaduan.
**Gate:** ada minimal 3 angka akuntabilitas yang bisa dipresentasikan ke kabupaten dari data nyata desa pilot.

### Fase E — Monetisasi di luar paket dasar (setelah B–C stabil)
- **Iuran/retribusi/PBB/kas RT** lewat infra LinkQu yang ada; take-rate dihitung supaya menutup biaya gateway (verifikasi biaya aktual dengan LinkQu).
- **Cek integrasi Siskeudes/BPKP di sisi web.** Pesaing (DesaDigi, IDESA) menonjolkannya; bila belum ada, evaluasi apakah perlu atau cukup impor/ekspor.
- Add-on modul tetap bertingkat di katalog (BUMDes, PKK, keuangan, SDGs, GIS, integrasi).
- **Lisensi kabupaten:** paket multi-desa dengan dashboard regional; harga per desa lebih rendah, kontrak lebih besar.

---

## 4. Growth dan onboarding (inilah yang membuat harga murah menguntungkan)

| Tuas | Praktik |
|---|---|
| **Onboarding self-serve** | Wizard aktivasi desa di web; impor data warga lewat Excel (`BULK_UPLOAD_GUIDE.md`) dengan validasi dan laporan kesalahan; cetak lembar kode aktivasi per KK (PDF); poster QR unduh app per desa. |
| **Migrasi 10.000 pengguna lama** | Impor hash bila memungkinkan; bila tidak, layar pengantar "Akun lama diperbarui" + daftar ulang 3 faktor; API lama hidup 60–90 hari; pantau % login ulang dalam 14 hari. |
| **Saluran kabupaten/kecamatan** | Dashboard regional + demo data nyata; paket multi-desa. Satu kabupaten = puluhan desa dengan satu penjualan. |
| **Referral desa-ke-desa** | Kode referral (sudah ada di web) diberi insentif; kades merujuk kades. |
| **Kit sosialisasi** | Poster, template pengumuman, video 1 menit, skrip untuk kades dan RT. Adopsi ditentukan sosialisasi desa, bukan fitur. |
| **Metrik pilot** | Aktivasi ≥ 30% dalam 3 bulan; pendaftaran selesai ≥ 80%; surat via app ≥ 40%; D30 ≥ 35%; crash-free ≥ 99%. |

---

## 5. Praktik rekayasa (best practice)

- **Kontrak API:** paket `packages/shared` (zod + tipe DTO + enum status/peran) agar web dan mobile tidak drift; versi API `v1`, header `X-App-Version`, `minSupportedVersion` di `/config`.
- **Migrasi database:** aditif saja (kolom nullable), uji di staging, rencana rollback; satu rilis satu set migrasi.
- **Pengujian:** unit untuk logika (sudah baik: 64 tes backend, 8 mobile); tambah tes otomatis akses per peran; uji alur kritis di perangkat (Maestro atau serupa) untuk daftar, buat surat, lacak surat, lapor.
- **Rilis:** internal → closed testing (desa client) → 10% → 100%; OTA (`expo-updates`) hanya untuk perbaikan JS yang aman; kanal `staging`/`production`.
- **Performa HP murah:** APK < 40 MB, beranda < 2 detik dari cache, daftar virtualisasi, gambar dikompres (≤300 KB). Ukur di perangkat RAM 2–3 GB.
- **Privasi dan hukum (UU PDP):** NIK dimasking; log audit setiap akses staf; kebijakan retensi (foto arsip, penghapusan akun); klausul UGC di syarat layanan desa-Klandesa; konsultasi hukum sebelum membuka fitur Warga untuk umum; Data Safety Play Store diisi akurat.
- **Operasional:** runbook insiden, pemantauan (error rate, antrean push, kuota storage), job pembersih foto yatim, backup DB teruji.
- **Aksesibilitas:** TalkBack, huruf hingga 200%, kontras ≥ 4,5:1, tombol ≥ 56dp.

---

## 6. Implementasi harga di kode (belum dikerjakan)

- Ubah `lib/billing/catalog.ts`: paket dasar `setupFee = 3.500.000` termasuk tahun 1; tagihan Rp100.000/bulan mulai bulan ke-13 (atau Rp1.200.000/tahun).
- Putuskan nasib Profesional/Enterprise (lihat §1.3) sebelum mengubah katalog, agar tampilan billing tidak membingungkan.
- Pastikan app mobile dan Warga masuk paket dasar; gating hanya untuk add-on (`lib/modules/entitlements.ts`).
- Tampilan "Desa tidak aktif" di app harus ramah (tanpa kata "langganan") saat masa berlangganan habis.
- Tambahkan pengingat perpanjangan ke kades 60/30/7 hari sebelum tahun 2 dimulai; ini titik churn terbesar.

---

## 7. Metrik utama yang dipantau tiap minggu

| Kategori | Metrik |
|---|---|
| Bisnis | desa baru/bulan, jam onboarding per desa, margin tahun 1, perpanjangan tahun 2, MRR add-on, volume pembayaran |
| Produk | aktivasi warga, pendaftaran selesai, surat via app, median waktu surat, % pengaduan ditanggapi < 3 hari, "sudah beres" |
| Engagement | DAU/MAU, D7/D30, % warga yang pernah posting, push dibuka |
| Kualitas | crash-free, waktu respons API, laporan moderasi < 24 jam, error pendaftaran |

---

## 8. Risiko utama dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Margin tahun 1 negatif karena onboarding manual | Self-serve, batasi jam support, ukur sejak pilot, saluran kabupaten |
| Perpanjangan tahun 2 rendah | Aktivasi warga tinggi, rapor desa, pengingat, nilai Warga harian |
| Kontroversi konten Warga | Pra-moderasi desa pilot, SOP, bisa dimatikan, konsultasi hukum |
| Migrasi 10.000 akun gagal | Audit dini, jalur ganda (impor atau daftar ulang), API lama tetap hidup |
| Harga turun lagi karena kompetitor gratis (OpenSID) | Jangan bersaing pada fitur dasar; unggul di UX warga, akuntabilitas, jaringan, layanan terkelola |
| Peluang pesaing meniru fitur | Moat di data historis dan jaringan, bukan di fitur tunggal |

---

## 9. Keputusan (2026-10-24)

| # | Keputusan |
|---|-----------|
| 1 | Rp3,5 jt berlaku untuk **semua desa baru**. Desa lama yang sudah aktif **tidak diubah** (grandfathered; harga dan hak mereka tetap). |
| 2 | Paket Profesional dan Enterprise **dihapus**; satu **paket lengkap**. |
| 3 | Warga (feed sosial) masuk paket (mengikuti rekomendasi); desa tetap bisa mematikannya. |
| 4 | Anggaran onboarding: **maksimal 8 jam per desa**. |
| 5 | Desa pilot: **Karanganyar**. |
| 6 | Belum ada kontak kabupaten/kecamatan → saluran kabupaten dimulai dari nol (lihat §4). |

### 9.1 Konsekuensi dan hal yang perlu diputuskan lanjut
- **Isi "paket lengkap" belum didefinisikan.** Rekomendasi: semua modul inti (web admin, app warga/staf, surat, pengaduan, Warga, RT, keuangan, BUMDes, PKK, SDGs, partisipasi RT/RW) ikut dalam paket. **Konsekuensinya pendapatan add-on modul (Rp49–249rb/bulan) hilang untuk desa baru.** Pendapatan tambahan hanya dari yang berbiaya variabel: kredit AI, penyimpanan arsip di atas kuota, GPS absensi, website desa, take-rate pembayaran, dan lisensi kabupaten. Pastikan kuota "adil" agar biaya infra tidak meledak (mis. kuota foto/storage per desa).
- **Pertanyaan terbuka:** apakah GIS/Peta Infrastruktur dan Sinkronisasi Data (add-on termahal) ikut paket lengkap atau tetap berbayar? Rekomendasi: tetap add-on (biaya dan dukungan tinggi, hanya relevan sebagian desa).
- **Anggaran 8 jam harus dirancang, bukan diharapkan.** Pembagian awal: 1 jam setup akun/desa, 2 jam impor data warga (Excel) + validasi, 1 jam cetak lembar kode dan poster, 2 jam pelatihan perangkat desa/RT, 1 jam pendampingan hari pertama, 1 jam cadangan. Bila Karanganyar melebihi 8 jam, catat penyebabnya (itu daftar yang harus diotomasi).
- **Karanganyar:** "Karanganyar" ada di banyak provinsi (kabupaten di Jawa Tengah, juga desa dengan nama itu di tempat lain). Konfirmasi desa mana dan apakah sudah punya data `Resident` di sistem, supaya jadwal impor data akurat.

### 9.2 Migrasi paket di kode (belum dikerjakan)
Skema saat ini memakai tiga tier (`Village.subscriptionPlan`: starter/profesional/enterprise) dan menjadi dasar entitlement. Sekitar 23 file bergantung padanya (billing, `lib/modules/*`, arsip, absensi, marketing). Pendekatan aman:
1. **Jangan hapus tier di database.** Tambahkan tier baru `lengkap` (nama final: ditentukan Anda); desa lama tetap `starter/profesional/enterprise` agar tidak kehilangan fitur atau kena tagihan baru.
2. Entitlement: `lengkap` ≥ semua modul inti (setara profesional untuk hak akses, kecuali add-on yang disebut §9.1).
3. Katalog: `lengkap` = setup Rp3.500.000 termasuk tahun 1, lalu Rp100.000/bulan mulai bulan ke-13. Checkout dan pengingat perpanjangan mengikuti.
4. UI billing/marketing: tampilkan satu paket untuk desa baru; desa lama melihat paketnya sendiri sampai mereka bermigrasi.
5. Tes unit untuk: desa lama tidak berubah, desa baru mendapat hak lengkap, tagihan bulan ke-13.
Ini perubahan billing yang menyentuh uang dan akses pelanggan aktif, jadi dikerjakan di cabang tersendiri, diuji di staging, dan **tidak digabung ke rilis mobile pertama**.

---

## 10. Rincian Paket Lengkap (draf 2026-10-24)

> **Status:** hipotesis berbasis nilai/biaya, belum divalidasi dengan data pemakaian. Sebelum dikunci, jalankan query pemakaian modul di database produksi (read-only, per desa aktif, 90 hari terakhir) dan wawancara Karanganyar (§10.5). Harga add-on di bawah memakai angka katalog saat ini (`lib/billing/catalog.ts`); belum diputuskan naik/turun.

### 10.1 Prinsip pengelompokan
Satu modul masuk **Paket Lengkap (Rp3,5 jt + Rp100rb/bln tahun 2)** hanya bila:
1. memenuhi kebutuhan inti desa/warga (J1–J7 di spec) **dan** biayanya (infra + support + maintenance) rendah, atau
2. menjadi **alasan memakai app** (mengerek aktivasi dan perpanjangan).

Modul **dipisah sebagai add-on berbayar** bila nilainya besar untuk sebagian desa **dan/atau** biaya variabelnya nyata (storage, LLM, pihak ketiga, dukungan). Modul **dilepas/digabung** bila nilainya kecil atau tumpang tindih dengan fitur lain. Modul yang butuh **investasi pengembangan besar** ditandai *butuh modal*.

### 10.2 Keputusan per modul

| Modul (id) | Keputusan | Alasan |
|---|---|---|
| Dashboard, Data Warga, Kartu Keluarga, Perangkat Desa, Struktur Jabatan, Statistik Penduduk, Profil & Kop Surat, Billing | **Termasuk** | Fondasi data; biaya rendah |
| Template Surat, Permohonan, Kiosk Mandiri | **Termasuk** | Inti J1; pembeda utama desa memakai app |
| Pengaduan Warga | **Termasuk** | Inti J2 dan bahan moat akuntabilitas |
| Informasi/Pengumuman | **Termasuk** | Inti J3 |
| Bansos & Program (Bantuan Saya) | **Termasuk** | Inti J4; data sudah ada |
| Anggaran Desa (ringkasan APBDes/transparansi) | **Termasuk** | Inti J6; hanya agregat |
| Absensi Perangkat (QR) | **Termasuk** | Murah, sering dipakai staf. GPS tetap add-on seperti sekarang |
| Arsip Digital | **Termasuk dengan kuota** (mis. 5 GB), tambahan berbayar | Biaya storage nyata |
| Potensi Desa | **Termasuk** | Murah, memperkaya Info Desa |
| **Warga (feed sosial)** (mobile) | **Termasuk**, dapat dimatikan desa | Alat retensi harian; biaya storage dibatasi lewat kuota foto |
| **RT (role, pengantar, broadcast)** (Fase C) | **Termasuk** | Inti alur surat |
| Forum Diskusi (web) | **Dilepas/gabung ke Warga** | Tumpang tindih dengan feed Warga; teks saja, dibuat staf |
| Galeri Kegiatan | **Dilepas/gabung ke Warga** (filter "Kegiatan") | Tumpang tindih; foto sudah ditangani feed |
| Katalog UMKM | **Gabung ke Warga** (filter "Usaha") | Nilai kecil terpisah; tampil bila Warga aktif |
| Koperasi Desa | **Tahan, validasi** | Bisa bernilai tinggi bila terkait Koperasi Desa/Kopdes; cek pemakaian dan regulasi sebelum diputuskan |
| Lingkungan Hidup, Pertanian | **Opsional berbayar murah** (atau dilepas) | Niche; tidak dipakai semua desa. Putuskan setelah data pemakaian |
| Kegiatan RT/RW (web) | **Termasuk** (terkait RT di Fase C) | Mendukung peran RT |
| Keuangan Desa | **Add-on berbayar (nilai besar)** | Dipakai kaur keuangan, kerap jadi alasan desa membayar; risiko regulasi |
| BUMDes (+QRIS) | **Add-on berbayar** | Nilai besar untuk desa dengan unit usaha; ada pembayaran |
| PKK & Posyandu | **Add-on berbayar** | Bernilai untuk desa aktif; batas Starter tetap sebagai demo |
| SDGs + RPJMDes | **Add-on berbayar** | Nilai tinggi untuk pelaporan; ekspor diblokir tanpa add-on |
| Website Desa | **Add-on berbayar** | Hosting/domain, dukungan |
| Peta Infrastruktur (GIS) | **Add-on berbayar** | Biaya dan dukungan tinggi, relevan sebagian desa |
| Sinkronisasi Data (integrasi) | **Add-on berbayar** | Dukungan tinggi; relevan bila ada integrasi pemerintah |
| Asisten Desa AI | **Add-on berbasis kredit** | Biaya LLM nyata, harus berbayar sesuai pemakaian |
| Iuran/pembayaran (mobile) — *baru* | **Berbasis take-rate**, butuh modal | Perlu integrasi dan kontrak LinkQu, rekonsiliasi, kepatuhan |
| Integrasi Siskeudes/BPKP — *baru* | **Add-on, butuh modal** | Nilai tinggi (pesaing menonjolkannya); pengembangan dan dukungan besar |
| Dashboard kabupaten (regional) | **Lisensi kabupaten** | Dijual per kabupaten, bukan per desa |

### 10.3 Harga add-on (usulan awal, belum final)
Pertahankan angka katalog (Rp49–249rb/bulan) untuk saat ini. Pertimbangan:
- Satu desa membayar paket Rp100rb/bulan; add-on Rp99rb membuat tagihan ±2×. Tawarkan **diskon tahunan** (bayar 10 bulan = setahun) untuk menekan churn.
- **Bundel "Keuangan + Laporan" atau "BUMDes + Pembayaran"** lebih mudah dijual daripada add-on satuan.
- Jangan menaikkan harga sebelum ada data bahwa desa memakai modulnya.
- Add-on berbasis kredit (AI) dan take-rate pembayaran menjadi sumber margin yang tumbuh seiring pemakaian.

### 10.4 Dampak pada kode (belum dikerjakan)
- Tier baru `lengkap` di `DesaPackageTier` dan `BILLING_CATALOG.desa_package`; desa lama tetap di tier lamanya (`starter/profesional/enterprise`).
- `MODULE_ENTITLEMENTS`: modul "Termasuk" memakai `minPackageTier: starter` (bisa diakses semua tier, tetap dibatasi kuota seperti di `lib/modules/resource-limits.ts`); modul add-on memakai `addonProductCode` seperti sekarang; modul "Dilepas" disembunyikan dari menu desa baru, bukan dihapus dari database.
- Kuota (storage arsip, foto Warga) ditentukan per tier `lengkap`.
- Tes: desa lama tidak berubah; desa baru mendapat hak sesuai tabel; add-on membuka batas.

### 10.5 Validasi sebelum dikunci
1. **Data pemakaian (read-only, produksi):** per modul, jumlah desa aktif dan jumlah catatan 90 hari terakhir. Aturan: modul dengan < 10% desa aktif → kandidat dilepas; modul dengan > 40% desa aktif dan biaya rendah → Termasuk.
2. **Wawancara Karanganyar (Yosowilangun, Lumajang):** modul mana yang dipakai sehari-hari, mana yang tidak dipakai, dan apa yang mau mereka bayar tambahan.
3. **Uji harga ke 5–10 desa client:** tawarkan paket + 2 add-on terpopuler; ukur penerimaan, bukan opini.
4. **Hitung biaya per modul** (storage, LLM, pihak ketiga, jam dukungan) agar keputusan "add-on atau termasuk" berbasis angka.
