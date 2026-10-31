# Strategi Platform: Sistem Operasional Desa + Ekosistem Vibe Coding

Tanggal: 2026-10-31. Dokumen ini hasil riset (regulasi, pesaing, pola platform) dan audit kode.
Status klaim: **[V]** = saya periksa langsung di kode/teks asli; **[R]** = dari riset web, sumber sekunder atau belum dibaca teks resminya; **[?]** = belum terverifikasi.

---

## 0. Ringkasan satu halaman

1. **Kita sudah kuat di pelayanan dan komunikasi, tipis di "tulang punggung data".** Surat (v2), impor warga, iuran/kas RT, pengaduan, absensi, feed warga, website, dashboard kabupaten: nyata dan teruji. Tetapi mutasi penduduk, KK, master RT/RW/dusun, SPJ/pajak, aset (KIB), produk hukum, BPD/LPM, TTE, voting: kosong atau hanya bendera/kolom.
2. **Fondasi platform belum punya permukaan ekstensi sama sekali.** Tidak ada API key, webhook, OpenAPI, MCP, kolom kustom, antrean kerja. Asisten AI tidak bisa membaca/menulis data desa. Jejak audit hampir tidak ada di sisi web.
3. **Fakta regulasi yang mengubah pembingkaian "source of truth": Permendesa PDT 13/2025.** [V] Kemendes membangun "Platform SID / Satu iDesa": *satu data desa + satu peta desa*, "single reference of truth", wajib menyediakan API aman standar SPBE agar sistem lain bisa terhubung (Ps 9 ayat 2). Desa harus menyesuaikan pendataan dan perencanaan paling lambat **±4 Des 2026** (Ps 183 huruf c). Artinya: negara akan jadi *source of truth* hukum. Kita tidak bisa menang dengan klaim itu. Kita menang sebagai **sistem operasional desa (tempat data lahir dan dikerjakan) sekaligus pusat "isi sekali, lapor ke mana-mana"** yang menyuapi Satu iDesa, Siskeudes, DTSEN, Simkopdes.
4. **Vibe coding: posisikan kita sebagai backend ber-governance, bukan pesaing alat bikinan AI.** Alat AI pandai membuat UI, buruk di auth, isolasi data, audit, kepatuhan. Itu persis yang kita sediakan. Urutan: API + kunci + audit, webhook, kolom/tabel kustom, galeri templat, MCP baca-saja, baru "Aplikasi Desa" deklaratif. Runtime kode bebas paling akhir.
5. **Satu bug keamanan P0 ditemukan dan sudah saya verifikasi** (lihat §2.4): `DELETE /api/residents/[id]` tidak memeriksa izin; pengguna desa mana pun yang login (termasuk peran baca-saja) bisa menghapus warga permanen.

---

## 1. Peta kegiatan desa (dari regulasi) vs. yang kita punya

Legenda: ✅ nyata | 🟡 sebagian | 🧱 kerangka/data saja | ❌ tidak ada. Sumber status: audit kode 2026-10-31.

| # | Domain | Dasar utama [R] | Status kita | Catatan celah |
|---|---|---|---|---|
| 1 | Tata kelola & produk hukum | UU 3/2024; Permendagri 111/2014 (Perdes), 84/2015 | ❌ | Tidak ada model Perdes/Perkades/SK/agenda surat; hanya unggahan di Arsip. BPD/LPM/Karang Taruna/lembaga: tidak ada. |
| 2 | Kependudukan & Adminduk | UU 24/2013; Prodeskel | 🟡 | Warga CRUD 56 kolom + impor + koreksi data: kuat. **Tidak ada entitas KK** (hanya string), **mutasi lahir/mati/pindah/datang hanya flag**, RT/RW/dusun string bebas, tak ada riwayat/soft delete. |
| 3 | Pelayanan surat | Permendesa 13/2025 | ✅ | Surat v2, penomoran, permohonan RT→staf, kiosk, QR. **TTE tersertifikasi tidak ada** (QR hanya cek rekaman). Tak ada register surat masuk/keluar. |
| 4 | Keuangan desa (APBDes) | Permendagri 20/2018 | 🟡 | Anggaran = kategori datar, bukan bidang/kegiatan/rincian; tak ada perubahan APBDes, SPJ, pajak, BKU formal. Ekspor "Siskeudes" memakai kolom buatan sendiri, bukan templat impor resmi. Iuran/kas RT sangat baik. |
| 5 | Perencanaan & pembangunan | Permendagri 114/2014 | 🟡 | RPJMDes/RKPDes/Musdes ada; belum tersambung ke Anggaran; proyek tanpa progres/RAB; tak ada berita acara musdes; tak ada monev. |
| 6 | Prioritas Dana Desa 2026 | Permendesa PDT 16/2025; PMK 7/2026 | ❌ | 8 fokus (BLT ≤Rp300rb, iklim, kesehatan, pangan, Kopdes, PKTD, digital, potensi lokal). **58,03% pagu untuk Kopdes Merah Putih** [R] perlu pencatatan terpisah. Belum ada pelacakan. |
| 7 | Perlindungan sosial / DTSEN | Inpres 4/2025 | 🧱 | Bansos hanya daftar penerima; `desil` teks bebas; tak ada alur usulan/verifikasi/musdes DTSEN (min. triwulanan [R]). |
| 8 | Kesehatan, gizi, stunting | SPM kesehatan; ILP | 🟡 | Posyandu sesi/kunjungan ada, `isStunting` manual (tanpa z-score), tanpa imunisasi/KIA/lansia. |
| 9 | Ekonomi: BUMDes, Kopdes, UKM | PP 11/2021; Inpres 9/2025 | 🟡 | BUMDes unit/transaksi (tanpa ubah/hapus), koperasi tanpa simpan-pinjam/SHU, UKM katalog saja, **tanpa pasar desa/checkout**, aset BUMDes tak terpakai. |
| 10 | Aset desa | Permendagri 1/2016 | 🧱 | `VillageAsset` hanya titik peta. Tak ada KIB/nilai/penyusutan. |
| 11 | Pertanahan & pajak | UU HKPD | ❌ | Hanya templat surat + kategori iuran PBB. |
| 12 | Kelembagaan | Permendagri 84/2015 | 🟡 | Perangkat/jabatan/absensi kuat; BPD/LPM/RT-RW sebagai lembaga tidak ada. |
| 13 | Data, statistik, indeks | Satu Data; Indeks Desa | ✅/🟡 | Statistik & SDGs kuat; IDM hanya membaca skor luar. |
| 14 | Bencana & lingkungan | Permendesa 16/2025 | 🧱 | Titik bencana & bank sampah berupa daftar; tanpa peringatan dini/logistik/setoran. |
| 15 | Keamanan & ketertiban | — | ✅/❌ | Pengaduan sangat lengkap; siskamling tidak ada. |
| 16 | Komunikasi & partisipasi | — | ✅ | Pengumuman, forum, feed warga, notifikasi, website: kuat. **Polling/e-voting tidak ada**; `votesCount` tidak pernah ditulis [V]. |
| 17 | Pelaporan & akuntabilitas | PP 43/2014 | 🟡 | Dashboard kabupaten (11 rute agregat) kuat; tak ada generator laporan PDF (LPPD/LKPPD/LPJ). |
| 18 | Sosial-budaya, pendidikan, tenaga kerja, zakat/masjid | — | ❌ | Hanya kolom di warga. |

**Kekuatan mengejutkan:** pipeline impor warga (produksi-grade), feed warga (lebih matang daripada modul administrasi mana pun), iuran/kas RT, dashboard kabupaten, surat v2, mesin website (domain kustom + paket tema + AI). Dokumentasi kita jujur soal apa yang bukan nyata (TTE, sinkron Siskeudes).

**Kode mati terverifikasi [V]:** model `Request` dan `BumdesAsset` tidak dipakai; `Statistic` (snapshot) tidak dipakai.

---

## 2. Fondasi platform: kesiapan jadi "sistem rujukan + ekosistem"

### 2.1 Yang sudah baik
- Auth mobile (JWT 15 mnt + refresh berputar + deteksi reuse) adalah acuan terbaik untuk desain token API nanti.
- Registri isian surat v2 (allowlist kolom + dokumen JSON tervalidasi zod + form turunan) dan manifes paket tema website (dengan alur tinjau) adalah **dua pola deklaratif yang bisa digeneralisasi**.
- CI ada (typecheck, unit test, mobile). ~77 berkas tes, kebanyakan logika murni.

### 2.2 Yang tidak ada (semua [R: audit], bagian tertentu [V] di bawah)
| Blok | Kondisi |
|---|---|
| Kredensial untuk pemanggil non-manusia (API key/PAT/OAuth) | Tidak ada. Satu-satunya mirip: `KioskDevice.keyHash`. |
| Izin berbutir halus | Hanya 4 peran tetap × 28 sumber daya × 6 aksi; tanpa peran kustom, per-rekaman, per-kolom. |
| API publik berversi + OpenAPI/SDK/llms.txt | Tidak ada. `/api/mobile/v1` (≈56–93 rute) terdekat tetapi terikat akun warga/staf. |
| Webhook keluar / bus kejadian | Tidak ada (hanya callback LinkQu masuk). Notifikasi web berbasis polling. |
| Antrean kerja | Tidak ada; cron via curl, efek samping di dalam request. |
| Kolom/tabel kustom, form builder, otomasi | Tidak ada. Inti `Resident` ±60 kolom kaku. |
| Audit & asal-usul data | `AuditLog` hanya 3 titik tulis (semua mobile); CRUD web tak tercatat; tak ada riwayat/soft delete; tak ada provenance per kolom. |
| Kualitas data | NIK hanya regex 16 digit; unik per desa, bukan global; tak ada dedupe/merge; impor tak mencatat batch. |
| Ekspor penuh / cadangan | Tidak ada prosedur; `LISENSI_KABUPATEN.md` menjanjikan prosedur keluar yang belum dibangun. |
| AI beragensi | Asisten = satu panggilan chat, konteks agregat saja, tanpa tool-calling. Pesan bebas pengguna masuk ke pihak ketiga tanpa pembersihan PII. |

### 2.3 Isolasi tenant (risiko struktural)
Isolasi = filter `villageId` manual di tiap query. Tak ada `$extends`, RLS, atau klien ber-scope. `requireVillageApiContext` dipakai ~138 dari 315 rute; sisanya meracik sendiri. Beberapa rute mengambil `villageId` dari body/query (`finance/budgets`, `admin/villages`, `partner/commissions`) dan **belum diverifikasi**. Tidak ada tes lintas-tenant. **Semua rencana ekstensi bergantung pada ini diperbaiki dulu**: token pihak ketiga yang bocor lintas desa = insiden data kependudukan.

### 2.4 Bug P0 terverifikasi [V]
`resolveApiPermission` (peta rute → izin) hanya dipanggil dari `requireVillageApiContext` (`lib/api-village-context.ts:91`). `app/api/residents/[id]/route.ts` tidak memakainya: GET/PUT/PATCH/DELETE hanya cek sesi + `villageId`. Akibatnya **peran `village_head` (baca-saja) bisa menghapus warga permanen** (DELETE = hard delete, tanpa audit). Rute lain yang disebut audit meracik sendiri dan perlu dicek serupa: `contacts/*`, `coop/route.ts`, `finance/spp`.

---

## 3. Lanskap pesaing dan peluang

| Pemain | Cakupan | Kekuatan / kelemahan | Moat |
|---|---|---|---|
| OpenSID/OpenDK | Penduduk, surat, layanan mandiri, web, PBB (Premium) | Gratis, komunitas besar (~14,6rb desa [R]); swa-host, beban upgrade, lemah di keuangan/perencanaan | Komunitas & basis terpasang. **Kode bukan moat di pasar ini.** |
| Siskeudes (BPKP/Kemendagri) | Keuangan & aset | Standar de facto; versi luring, pasang ulang tiap tahun; versi daring/SIKD sedang disiapkan | Mandat regulasi |
| e-Prodeskel, SDGs Desa/Indeks Desa | Profil & pendataan | Entri ganda berat | Mandat |
| **Satu iDesa (Kemendes)** | "Super app" nasional, 17 kategori Data Desa | Belum terlihat di pasar; **tak diketahui apakah wajib dipakai** | Mandat hukum (Permendesa 13/2025) |
| SIDEKA-NG (Komdigi) | Website desa baku | Diusulkan jadi kanal utama (RUU Satu Data) | Sponsor pemerintah |
| Simkopdes, Digi Koperasi | Kopdes Merah Putih | Dikuasai negara/Telkom | Mandat/BUMN |
| IDESA (ASQI) | "Super app" desa, mengklaim Siskeudes Link | **Analog strategis terdekat**; harga tak dipublikasi, bayar dari APBDes tahun depan | Pelopor, jejak tak jelas |
| Desa BRILiaN | Program BUMDes/digitalisasi (5.245 desa [R]) | Corong perbankan | Relasi bank |

**Ancaman & peluang:**
- Negara sengaja membangun sumber kebenaran gratis. Moat kita = **kualitas alur kerja, ketersediaan, dan integrasi**, bukan kepemilikan data.
- Peluang: Ps 9(1)(o) & 9(2) mengundang sistem lain berintegrasi lewat API SPBE; Komdigi sendiri bilang sistem desa "tidak boleh menambah beban administrasi perangkat". Keluhan nyata operator: terlalu banyak aplikasi lapor; operator tunggal; internet tak stabil; Siskeudes dipasang luring.
- Anggaran ada: target Kemendes 75.265 desa mendanai "desa digital" dari APBDes 2025 [R].

**Pitch yang didukung bukti:** *"Isi sekali, lapor ke mana-mana, tetap jalan tanpa internet."*

---

## 4. Moat yang realistis (urut kekuatan)

1. **Integrasi dengan sistem negara** (Satu iDesa API, Siskeudes, DTSEN/SIKS-NG, Simkopdes, Dukcapil verifikasi). Paling kuat jika tercapai; butuh niat baik pemerintah.
2. **Distribusi lewat kabupaten** (Lumajang, Kukar). OpenSID menang lewat Diskominfo/DPMD. Dashboard kabupaten + galeri templat resmi kabupaten = ikatan.
3. **Data gravity + jejak audit.** Penomoran surat, buku kas, aset, persetujuan bertahun-tahun; riwayat siapa mengubah apa. Hanya bernilai bila audit/riwayat benar-benar dibangun (saat ini belum).
4. **Kepatuhan yang dikirim terpusat.** Regulasi berubah tiap tahun (PMK 7/2026, PMK 15/2026, Permendesa 16/2025). Vendor yang mengirim pembaruan cepat menang atas Dinas yang tidak.
5. **Kepercayaan hukum**: UU PDP, PSE, e-sign tersertifikasi (Ps 100–101 Permendesa 13/2025), cadangan & pemulihan (Ps 102).
6. **Ekosistem** (templat, aplikasi, mitra bersertifikat): efek jaringan lemah per desa, nyata di tingkat kabupaten.

---

## 5. Strategi vibe coding: "Bangun di atas Klandesa"

### 5.1 Sikap
Alat AI pandai menghasilkan UI; lemah di auth, isolasi data, audit, kepatuhan, hosting, perawatan (CVE-2025-48757: aplikasi Lovable tanpa RLS bocor [R]). Desa tidak akan mengurus itu sendiri. Jadi: **kita = backend + tata kelola; AI/orang = frontend & logika kecil.** Jalur resmi harus lebih mudah daripada Google Form/spreadsheet.

Siapa pembangunnya: perangkat desa melek teknologi, mahasiswa KKN, freelancer lokal, staf Diskominfo kabupaten, mitra kita.

### 5.2 Prinsip desain (dari praktik Salesforce, Supabase, Shopify, MCP spec, X-Road)
- **Izin warisan**: agen/aplikasi mewarisi izin & aturan isolasi platform, tidak lebih (Salesforce "Headless 360").
- **Token per-desa, per-aplikasi, per-scope, berumur pendek**; tak pernah menembus tenant; filter tenant di lapisan data yang tak bisa dilewati token.
- **Kelas data & penyamaran bawaan**: NIK disamarkan (4 digit terakhir), telepon/alamat tersembunyi kecuali scope eksplisit; buka-samar per kolom & per sesi, tercatat.
- **Aturan Dua** (Meta/Willison): satu sesi agen maksimal dua dari tiga: input tak tepercaya, data sensitif, kemampuan mengubah/mengirim. Teks bebas kita (pengaduan, permohonan surat, feed) = **tak tepercaya**; perlakukan sebagai musuh.
- **Tulis = usulan dulu** (pola Shopify): agen mengajukan, manusia menyetujui. Tulis langsung hanya ke tabel non-sensitif.
- **Lingkungan bangun bawaan = tenant sandbox berisi data sintetis.** Jangan pernah sambungkan agen ke data produksi desa saat membangun.
- **Log akses per desa yang bisa dilihat kades** (pola X-Road/data tracker).
- **Tombol mati per aplikasi dan per desa**, rate limit per desa/aplikasi, kuota kredit AI.
- **Integrasi Dukcapil tetap di inti, verifikasi-saja.** Aplikasi pihak ketiga tidak boleh jadi pintu belakang data turunan Dukcapil (MoU/PKS mensyaratkan keterbatasan) [R, teks resmi belum dibaca].

### 5.3 Tangga kepercayaan (aplikasi baru selalu mulai di anak tangga 1)
1. Baca-saja, PII tersamar
2. Baca dengan buka-samar per kolom/sesi (tercatat)
3. Tulis sebagai usulan yang disetujui manusia
4. Tulis langsung ke tabel non-sensitif
5. Otonomi terbatas (terjadwal/berbasis kejadian) dengan kuota + tombol mati

Naik satu anak tangga hanya setelah berjalan bersih di bawahnya.

### 5.4 Konsep produk bertahap
| # | Konsep | Usaha | Risiko | Versi minimum | Hindari |
|---|---|---|---|---|---|
| i | Data API + API key + OpenAPI + `llms.txt` | S–M | Rendah | Kunci per-desa, scope per modul & kelas kolom, baca-saja dulu; rate limit; log audit | Satu kunci melihat segalanya; NIK terbuka |
| ii | Webhook + resep otomasi | S–M | Rendah–sedang | Pemicu tetap (rekaman baru, status berubah, jadwal), aksi tetap (notifikasi, tugas, webhook); n8n/Zapier jadi perekat | Membangun mesin alur kerja umum |
| iii | Tabel/kolom kustom + form dari prompt | M | Sedang | Tipe terbatas, kelas PII per kolom, pratinjau skema yang wajib disetujui operator; otomatis menghasilkan form, daftar, ekspor, API | SQL bebas; AI mengubah tabel inti |
| iv | Galeri templat lintas desa/kabupaten | M | Rendah–sedang | Ekspor skema+form tanpa data, ditinjau, lalu klon (mis. Posyandu dari Desa A ke B); kabupaten bisa menerbitkan templat resmi | Templat berisi data/PII; unggah publik tanpa tinjau |
| v | MCP hosted baca-saja | M | Sedang–tinggi | OAuth per-desa sesuai spek MCP 2025-11-25, alat baca tersamar, sandbox; tulis-sebagai-usulan menyusul | Menggabungkan teks tak tepercaya + kolom sensitif + alat tulis dalam satu set |
| vi | "Aplikasi Desa" deklaratif (manifes) | L | Tinggi | Manifes + konfigurasi (layar, kueri, aksi) dirender host; kode terisolasi (iframe/worker, CSP ketat) belakangan | Plugin dalam-proses; kode bebas sebelum jalur tinjau ada |

**Alur tinjau aplikasi (bila dibagikan di luar satu desa):** cek otomatis (manifes vs panggilan nyata, kelas PII dideklarasikan, tanpa jaringan luar) → uji di sandbox sintetis → tinjau manusia untuk anak tangga ≥3 atau kolom sensitif → bertanda tangan & berversi, tinjau ulang bila izin berubah → jalur pencabutan; identitas penerbit terverifikasi (desa/kabupaten/mitra bersertifikat).

**Model bisnis (selaras keputusan harga Rp3,5jt + Rp100rb/bln):** Data API + kunci + MCP baca-saja ikut paket dasar (inilah "ramah pengembang"); ukur volume tulis & kredit AI (sudah ada); add-on untuk tabel kustom ekstra/otomasi/slot aplikasi; galeri templat gratis dulu; program mitra bersertifikat (sandbox + pelatihan + lencana) lebih murah daripada marketplace. Jangan salin angka bagi hasil marketplace Salesforce/Shopify: tidak terverifikasi.

---

## 6. Peta jalan yang disarankan

Prinsip urutan: keamanan sebelum eksposur; kedalaman data inti sebelum ekosistem; tak ada agen menyentuh PII produksi sebelum penyamaran + audit selesai.

### Fase 0: Higiene & keamanan (sekarang, 2–4 minggu)
- [x] Perbaiki `residents/[id]` (izin per metode); resolver keuangan tak lagi jatuh ke JWT saat izin ditolak (`finance/spp`, `finance/budgets` POST); `contacts` khusus admin platform; `DELETE /api/statistics` berguard. *(selesai 2026-10-31)*
- [x] `AuditLog` di semua mutasi web lane desa (±100 handler, helper `lib/audit/`; nilai sensitif disamarkan otomatis) + tes statis `tests/api-guard-coverage.test.ts` yang menggagalkan CI bila ada rute tanpa guard atau handler tulis tanpa audit. *(selesai 2026-10-31; mesin website lama & Laras dikecualikan bertulis)*
- [x] Tiga PATCH yang menerima id relasi dari klien kini memeriksa kepemilikan desa (`posyandu/sessions/[id]`, `pertanian/plots/[id]`, `gis/projects/[id]`).
- [x] CI: lint web ditambahkan (0 galat). Build web belum (butuh env).
- [x] Riwayat hapus warga: **diganti `resident_archives`** (aditif, tanpa mengubah kueri) alih-alih `deletedAt`; arsip ditulis saat hapus (desa berbendera), bisa dipulihkan admin, dibuang setelah 365 hari. *(selesai 2026-10-31)*
- [ ] Klien Prisma ber-scope (`$extends`) + tes isolasi lintas-tenant yang menyentuh DB (butuh DB uji).
- [x] `createdBy: 1` pada POST anggaran kunci layanan → admin aktif desa yang sama; id non-numerik → 400 di 7 rute. *(selesai)*
- [x] Rapikan sisa: `budgets` PUT kini tanpa jalur JWT yang melewati izin, perbandingan kunci waktu-konstan, pencarian hanya di desa pemanggil, id non-numerik → 400. Sisanya (id numerik, cek langganan `ukm-products`, peran rename arsip) sudah diperiksa 2026-10-31: sudah benar / dikelola matriks izin. *(selesai)*
- [ ] Hapus model mati: `Request` dan `Statistic` tidak dipakai kode (tetapi menghapus = DROP TABLE di produksi; lakukan hanya setelah cek jumlah baris saat rilis). `BumdesAsset` ternyata dipakai Laras (bukan mati). `CommunityProposal.votesCount` selalu 0 (tidak ada mekanisme dukungan): hanya dibaca API RT/RW dan Laras; belum diubah.
- [ ] Langkah hukum paralel: perjanjian pengendali–pemroses, kontak DPO, prosedur pelanggaran data 3×24 jam, pendaftaran PSE Lingkup Privat; konfirmasi advokat Indonesia (peran desa = pengendali, kita = pemroses belum dipastikan).

### Fase 1: Kedalaman "sistem operasional" (Q4 2026 – Q1 2027)
*Rancangan terperinci KK + mutasi + wilayah + pemetaan Satu iDesa: [PHASE1_KEPENDUDUKAN_DESIGN.md](PHASE1_KEPENDUDUKAN_DESIGN.md) (logika murni sudah di `lib/kependudukan/`, skema belum diterapkan).*
Urut nilai × kesiapan Satu iDesa:
1. **Entitas KK + mutasi penduduk** (peristiwa lahir/mati/pindah/datang dengan persetujuan, riwayat, laporan) + **master wilayah RT/RW/dusun**.
2. **Pemetaan 17 kategori Data Desa (Permendesa 13/2025 Ps 57)** + ekspor/API kompatibel Satu iDesa + tanda tangan kades pada data baseline + penyegaran 6 bulanan. Batas ±4 Des 2026 hampir tiba: targetkan *pemetaan + ekspor*, bukan fitur penuh. **Cek dulu ke Kemendes/DPMD apakah Satu iDesa wajib & kapan API terbuka.**
3. **Keuangan sesuai Permendagri 20/2018**: struktur bidang/kegiatan/rincian, perubahan APBDes, SPJ, pajak, BKU formal; ekspor mengikuti templat impor Siskeudes resmi; jalur pelacakan Dana Desa 2026 (8 fokus, BLT, **sekat Kopdes 58,03%**).
4. **Aset Desa** (Permendagri 1/2016) — **SELESAI dikode 2026-11-01** ([PHASE1_ASET.md](PHASE1_ASET.md)). Koreksi: Permendagri 1/2016 TIDAK mewajibkan KIB A–F (itu aturan barang milik daerah); yang wajib ialah Buku Inventaris Aset Desa 9 kolom + berita acara dan SK penghapusan, jadi modul mengikuti itu. **Produk hukum/Perdes, register surat masuk/keluar, dan BPD/LPM/lembaga: SELESAI dikode 2026-11-01** ([PHASE1_TATAKELOLA.md](PHASE1_TATAKELOLA.md)). Butir 4 tuntas.
5. **DTSEN & bansos**: alur usulan/verifikasi/musdes triwulanan, impor daftar KPM; BLT.
6. **TTE tersertifikasi**: pilih PSrE yang boleh melayani desa (BSrE mungkin hanya untuk instansi pemerintah [?]).
7. Kopdes Merah Putih: cermin data (anggota, notulen musdesus, persetujuan kades) + ekspor Simkopdes; jangan menandingi sistem negara.
8. Lanjutan: simpan-pinjam koperasi, z-score stunting/imunisasi/KIA, bank sampah transaksional, polling/e-voting sungguhan, laporan PDF (LPPD/LKPPD/LPJ).

Pelajaran produk: mulai dari *"isi sekali, lapor ke mana-mana"* dan mode luring yang kuat; operator tunggal dan internet putus adalah kenyataan.

### Fase 2: Permukaan platform (Q1–Q2 2027)
1. ~~Tabel kredensial~~ **selesai 2026-10-31** (kunci API per desa, scope baca-saja, jejak akses, batas laju, layar admin; lihat [PHASE2_API_KEYS.md](PHASE2_API_KEYS.md)). Peran kustom belum.
2. ~~`/api/v1`~~ **baca-saja selesai 2026-10-31** (10 endpoint, penyamaran terpusat, paginasi kursor, kode galat stabil, OpenAPI + `llms.txt` dibangkitkan dari satu daftar; lihat [PHASE2_API_KEYS.md](PHASE2_API_KEYS.md)). Tulis-sebagai-usulan belum.
3. ~~Bus kejadian + webhook keluar~~ **selesai 2026-11-01** (kejadian tipis tanpa PII, HMAC + cap waktu, antrean keluar dengan kirim ulang bertahap, anti-SSRF, layar admin; lihat [PHASE2_WEBHOOKS_PROPOSALS.md](PHASE2_WEBHOOKS_PROPOSALS.md)). Antrean kerja umum (impor/ekspor/AI) belum: tabel pengiriman webhook hanya melayani webhook.
4. Kualitas data: **sebagian selesai 2026-11-01**: periksa NIK (bentuk, provinsi, tanggal, kecocokan, kemungkinan ganda) dan **usulan maker-checker** untuk data kustom (kunci hanya bisa mengusulkan, admin menyetujui; `DataChangeRequest` warga lama dibiarkan terpisah). Belum: status verifikasi per kolom, penggabungan data ganda, batch impor tercatat, ekspor penuh tenant + prosedur cadangan/pulih, maker-checker untuk data penduduk.
5. ~~Tabel/kolom kustom~~ **selesai 2026-10-31** (tipe terbatas, kelas data per kolom, pratinjau, form/daftar/CSV/API otomatis; lihat [PHASE2_CUSTOM_DATA.md](PHASE2_CUSTOM_DATA.md)). Form dari prompt AI dan galeri templat belum.

### Fase 3: Lapisan AI (Q2–Q3 2027)
- ~~MCP hosted baca-saja~~ **selesai 2026-11-01** dengan kunci API sebagai bearer, penyamaran PII dan jejak akses lewat penangan `/api/v1` yang sama, Aturan Dua pada kunci (lihat [PHASE3_MCP.md](PHASE3_MCP.md)). **Belum:** OAuth per-desa, sandbox sintetis, pembersihan PII sebelum panggilan model, audit AI per tenant.
- Asisten dengan tool-calling di atas API ber-scope; tulis-sebagai-usulan.
- Uji tembus injeksi prompt pada teks bebas sebelum buka ke publik.

### Fase 4: Ekosistem (setelah Fase 3 stabil)
- ~~"Aplikasi Desa" deklaratif + alur tinjau~~ **selesai 2026-11-01** (manifes data murni, galeri berjenjang tinjau oleh admin platform, pasang = buat tabel kosong, dasbor; lihat [PHASE4_APPS.md](PHASE4_APPS.md)). **Belum:** templat resmi kabupaten (butuh peran penerbit regional), program mitra bersertifikat (keputusan bisnis).
- Runtime kode terisolasi hanya bila ada permintaan nyata dan jalur tinjau sudah berjalan.

---

## 7. Keputusan yang butuh pemilik produk

1. **Posisi terhadap Satu iDesa:** "operasional + pusat sinkronisasi" (rekomendasi) vs. bersaing sebagai sumber kebenaran. Bukti hukum condong ke yang pertama.
2. **Prioritas 4 Des 2026:** cukup pemetaan + ekspor (rekomendasi) atau menunggu kejelasan API Kemendes?
3. **Batas keterbukaan:** apakah API/MCP baca-saja masuk Paket Lengkap tanpa biaya (rekomendasi, selaras keputusan "semua fitur dibuka"), dengan biaya hanya pada volume tulis/kredit AI/slot?
4. **Perubahan skema DB** (KK, mutasi, wilayah, audit, kredensial, kolom kustom) memerlukan persetujuan Anda sebelum migrasi dijalankan (sesuai catatan: `migrate deploy` tidak aman di DB ini; pakai prosedur yang disepakati).
5. **Konfirmasi hukum** peran pengendali/pemroses dan PSrE yang boleh dipakai desa.

---

## 8. Ketidakpastian yang belum terselesaikan
- Tanggal peluncuran, operator, dan sifat wajib-pakai Satu iDesa: tidak ditemukan. Teks Permendesa 13/2025 dibaca, tetapi tidak menjawab ini.
- PP 33/2026 (turunan UU PDP) berlaku mulai ±16 Jan 2027 menurut ringkasan vendor; teks resmi belum dibaca, sumber berbeda soal tanggal.
- Teks resmi Permendagri 102/2019 jo. 17/2023 (akses data Dukcapil), Permenkominfo 5/2020 (PSE), Permendagri tata naskah, dan "Sipades": belum dibaca/terkonfirmasi.
- Harga/model OpenSID Premium, IDESA, Digides tidak ditemukan; data EasyDes, Desa Pintar, DesaKu, SIDEKEM, Qoin, "Jaringan Desa", "Pondok Desa" tidak ditemukan.
- Detail izin agen Airtable, Notion Workers, bagi hasil marketplace: tak terverifikasi; pelajaran India/Beckn tak ada yang dapat dipakai.
- Rute yang mengambil `villageId` dari body dan beberapa rute yang meracik guard sendiri belum diperiksa satu per satu.
- Teks tak tepercaya + data sensitif: belum diuji tembus.

## 9. Sumber utama
- Permendesa PDT 13/2025 (JDIH Kemendes; BPK JDIH): https://peraturan.bpk.go.id/Details/342744/permendesa-pdt-kemendesa-pdt-no-13-tahun-2025
- Komdigi/RUU Satu Data (IndoTelko, 11 Jul 2026): https://www.indotelko.com/read/1783696106/ruu-satu-data-indonesia-arahkan-desa-jadi-fondasi-tata-kelola-data-nasional
- Dana Desa 2026: Republika (Permendesa 16/2025) https://ekonomi.republika.co.id/berita/t9ikr0370/kemendes-tetapkan-delapan-fokus-penggunaan-dana-desa-2026 ; Kontan (PMK 7/2026) https://nasional.kontan.co.id/news/aturan-baru-menkeu-purbaya-wajibkan-58-dana-desa-2026-untuk-koperasi-merah-putih
- Beban aplikasi operator desa: https://www.ayokaltim.com/kunjungi-sumedang-ujang-bey-soroti-beban-aplikasi-yang-hambat-pelayanan-desa/
- Salesforce Headless 360: https://www.salesforceben.com/salesforce-headless-360-and-agentforce-vibes-2-0-revealed-at-tdx-2026/
- Supabase, defense in depth for MCP: https://supabase.com/blog/defense-in-depth-mcp
- Meta, Agents Rule of Two: https://ai.meta.com/blog/practical-ai-agent-security/
- Willison, lethal trifecta: https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
- MCP spec 2025-11-25: https://modelcontextprotocol.io/specification/2025-11-25/changelog
- Shopify Sidekick/AI: https://shopify.dev/docs/apps/build/ai.md
- e-Estonia X-Road: https://e-estonia.com/service/interoperability-services/
