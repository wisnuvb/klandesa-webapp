# Paket 3 (P7) — Kalender kepatuhan, bahan cetak gabungan, rekap kabupaten, bantuan narasi

Dikerjakan 2026-11-01. Belum di-commit, belum di-deploy. SQL belum diterapkan ke produksi. Rencana induk: [PLAN_CELAH_FUNGSI.md](PLAN_CELAH_FUNGSI.md) bagian P7.

## Yang dibangun
1. **Registri laporan wajib per desa per tahun anggaran** (`/kepatuhan`): 18 butir bawaan (perencanaan, APB Desa, laporan semester dan tahunan, LPPD/LKPPD, informasi ke masyarakat, Dana Desa, BUM Desa) dengan tenggat, status (belum, draf, terkirim, terlambat), dan bukti kirim (tanggal, nomor surat, catatan, berkas Arsip Digital).
2. **Status otomatis** bila datanya ada di sistem (hanya dibaca, modul itu tidak diubah): APB Desa awal ditetapkan (`apbdes_documents`, versi 0), Perdes RKP Desa dan tanggal daftar usulan (`rkpdes_documents`, `legal_documents`), LPPD dan LKPPD (`village_reports`), fokus/tahap I/tahap II/publikasi Dana Desa (`dd_year_settings`, `dd_publications`). Butir tanpa padanan (semester I, LPJ, informasi masyarakat, BUM Desa) dicatat petugas.
3. **Katalog tenggat sebagai data berversi per tahun** (lihat di bawah), dapat ditimpa per kabupaten.
4. **Pengingat**: endpoint cron `POST /api/cron/kepatuhan-reminders` (notifikasi web + notifikasi/push mobile staf + email Brevo bila terkonfigurasi), idempoten.
5. **Bahan cetak gabungan** (`/kepatuhan/bundel?item=&year=`): tabel/dokumen dari data sistem dalam satu halaman, dicetak lewat peramban (CSS cetak; tidak ada PDF di server), ditambah tautan ke cetakan modul lain dan daftar lampiran yang harus disiapkan sendiri.
6. **Rekap kabupaten** (`/wilayah/kepatuhan`): kepatuhan per desa di dasbor regional, saringan per butir, dan panel katalog (akun kabupaten dapat menimpa/menambah tenggat).
7. **Fungsi servis narasi untuk Laras** (`lib/kepatuhan/narasi.ts`), baca-saja; cara memasangnya di bawah. Berkas Laras tidak disentuh.

## Katalog tenggat (data, bukan kode keras)
- Bawaan di `lib/kepatuhan/catalog.ts`: tiap butir punya daftar **versi per tahun anggaran** (`fromYear`), aturan, pasal, dan label verifikasi.
- Penimpaan di tabel `compliance_catalog_entries`: lapis **GLOBAL** (admin platform, `PUT/DELETE /api/admin/kepatuhan/katalog`; belum ada layar, hanya API) dan lapis **REGENCY** (akun regional kabupaten, panel di `/wilayah/kepatuhan`). Prioritas: kabupaten, lalu global, lalu bawaan; di tiap lapis dipakai `fromYear` terbesar yang tidak melewati tahun anggaran. Butir dapat dimatikan sejak tahun tertentu (wajib menyebut alasan dan rujukan; butir tetap tampil di kalender desa dengan penanda dan dasarnya, tidak dihitung sebagai kewajiban), dan kabupaten dapat menambah butir sendiri (kode `KAB-...`, tenggat tanggal tetap atau tanpa tanggal).
- Jenis aturan: tanggal tetap relatif tahun anggaran (tahun sebelum/sama/sesudah), sekian bulan atau hari kerja setelah peristiwa yang tercatat (Perdes RKP Desa atau Perdes APB Desa ditetapkan), atau tanpa tanggal.
- Label: **V** dibaca dari teks resmi (pasal disebut), **R** belum diverifikasi/tafsiran, **K** ketetapan kabupaten. Akun kabupaten tidak boleh memberi label V, dan label R hanya untuk butir tambahan kabupaten sendiri (butir bawaan hanya K atau dimatikan beralasan); setiap baris, termasuk yang mematikan butir, wajib menyebut dasar (nomor peraturan/pasal). Hanya V dan K yang dihitung sebagai kewajiban (rekap, pengingat, status "terlambat"); butir R tampil sebagai informasi.
- Aturan yang terbit per tahun (Dana Desa) ditandai `perYear`: bila tahun anggaran belum punya aturannya, aturan tahun terakhir dipakai **SEMENTARA** dan layar memperingatkannya. Memperbarui untuk TA 2027 = menambah baris katalog (admin platform atau kabupaten), bukan rilis kode.
- Kecocokan wilayah: akun kabupaten yang punya kode kab/kota (`kodeKabKota`) menyimpan penimpaan berkunci `kode:<kode>`; baris itu hanya berlaku bagi desa yang `settings.wilayah.kode_kab_kota`-nya sama, jadi mengganti teks kabupaten di profil tidak memindahkan desa. Tanpa kode, penimpaan dicocokkan lewat teks `regency` (dan `province`) yang dinormalisasi, sama dengan cara akun regional mencocokkan desa. Kunci yang disimpan tidak pernah dari isian pengguna. Rekap kabupaten menampilkan kolom "wilayah terdaftar di profil desa" dan dasar pencocokan (kode atau teks).

## Pengingat dan cron
- `POST /api/cron/kepatuhan-reminders` dengan `Authorization: Bearer $CRON_SECRET` (pola `isValidCronAuth`, waktu-konstan; 503 bila rahasia kosong, 401 bila salah). Contoh crontab (08.00 WIB): `0 1 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/kepatuhan-reminders`.
- Tahap: 30, 7, dan 1 hari sebelum tenggat, lalu sekali "terlambat" dalam 14 hari setelahnya; satu butir paling banyak empat pengingat. Tahap dipilih dari ambang terkecil yang mencakup sisa hari, jadi tidak ada dua pengingat pada hari yang sama. Hanya butir wajib (V/K) bertanggal yang belum terkirim; desa dengan langganan tidak aktif dilewati. Status dihitung dengan tanggal WIB.
- **Idempotensi**: satu `AdminNotification` per (desa, butir, tahun anggaran, tahap) dengan `sourceKey` `kal:<butir>:<tahun>:<tahap>` (unik per desa) DIKLAIM sebelum mengirim apa pun. Menjalankan ulang atau dua proses serentak tidak mengirim ganda. Konsekuensinya jaminannya **paling banyak sekali**: bila proses mati tepat sesudah klaim, satu pengingat hilang. Kegagalan email tidak membuka klaim (agar push mobile tidak terulang). Pembersihan notifikasi (90 hari) tidak memunculkan ulang pengingat karena jendela tiap tahap jauh lebih pendek.
- Penerima email: admin dan Kepala Desa aktif plus email desa (maks. 5). Mobile: staf dengan izin `apbdes:update` (maks. 15).
- Syarat produksi: `CRON_SECRET` terisi dan crontab dipasang (menyangkut keputusan rotasi rahasia pada plan P9.8).

## Data dan izin
- Tabel baru (awalan `compliance_`): `compliance_catalog_entries` dan `compliance_report_records` (FK ke `villages`, hapus berantai). `archiveId` pada catatan adalah BigInt **tanpa FK**: diperiksa milik desa yang sama saat disimpan, dan layar menampilkan "(berkas sudah dihapus)" bila arsip kemudian dihapus.
- Rute desa memakai resource izin `apbdes` (`/api/kepatuhan` di `api-route-map`): semua peran membaca; admin, sekretaris, dan staf (Kaur Keuangan) mencatat/menghapus catatan; Kepala Desa hanya membaca. `villageId` selalu dari sesi; setiap tulis memakai `auditWeb`.
- Rute regional memakai `requireRegionalApi`. Rekap hanya memuat desa dari lingkup akun (`villageIds`) dan hanya status/tanggal: tidak ada isi laporan, nomor surat, atau data pribadi. Penyuntingan katalog hanya untuk peran `regional_kabupaten` berlingkup `REGENCY`; akun provinsi dan kecamatan hanya membaca. Penghapusan baris dibatasi pada lingkup yang sama (id tebakan dari kabupaten lain atau lapis global tidak bisa dihapus). Penulisan dicatat di `regional_access_logs`.
- Dua pintu masuk lain ke data: `GET /api/kepatuhan/arsip` (hanya judul/nama berkas milik desa sendiri) dan `GET /api/kepatuhan/bundel`.

## Sumber hukum
| Dasar | Status | Yang dipakai |
|---|---|---|
| Permendagri 20/2018 Pasal 38 ayat (2), (4) | **[V]** | Perdes APB Desa paling lambat 31 Des tahun sebelumnya; disampaikan ke bupati paling lama 7 hari kerja setelah ditetapkan. (Catatan koreksi: plan menulis Pasal 37; yang benar Pasal 38.) |
| Permendagri 20/2018 Pasal 68 ayat (1)-(3) | **[V]** teks, **[R]** tanggal | Laporan semester I ke bupati melalui camat, disusun paling lambat "minggu kedua bulan Juli tahun berjalan". Teks tidak menyebut tanggal; dipakai **14 Juli** sebagai penafsiran (disebut di layar, dapat ditimpa). |
| Permendagri 20/2018 Pasal 70 ayat (1)-(3) | **[V]** | Laporan pertanggungjawaban ditetapkan dengan Perdes, paling lambat 3 bulan setelah akhir tahun anggaran (31 Maret); isinya (laporan keuangan, laporan realisasi kegiatan, daftar program sektoral/daerah). |
| Permendagri 20/2018 Pasal 72 | **[V]** teks, **[R]** tenggat | Laporan Pasal 68 dan 70 diinformasikan kepada masyarakat; isi minimal ayat (2). Tidak ada tenggat sendiri: butir "informasi semester I" memakai tenggat laporan induk sebagai tafsiran (label R). Dasar plan "Pasal 72" itu pasal Permendagri ini, bukan Pasal 72 UU 6/2014. |
| Permendagri 46/2016 Pasal 3 ayat (1), 5, 8 ayat (1), 10 ayat (3) | **[V]** (teks BN 1099/2016 dari peraturan.go.id) | LPPD akhir tahun dan LKPPD kepada BPD paling lambat 3 bulan setelah tahun anggaran; informasi ke masyarakat tertulis paling lambat 3 bulan setelah tahun anggaran (media: papan pengumuman, radio komunikasi, dan lainnya). Pasal 5 (akhir masa jabatan) tidak dimasukkan ke registri tahunan karena bergantung tanggal akhir jabatan. |
| Permendagri 114/2014 Pasal 29 ayat (4), 51 ayat (2) | **[V]** | Perdes RKP Desa paling lambat akhir September tahun berjalan; daftar usulan ke bupati melalui camat paling lambat 31 Des tahun berjalan. |
| Permendesa PDT 16/2025 Pasal 10-12 | **[V]** | Publikasi fokus Dana Desa sejak APB Desa ditetapkan (tanpa tanggal batas); sanksi Pasal 11; laporan penetapan fokus ke Menteri paling lambat 1 bulan sejak RKP Desa ditetapkan (Pasal 12 ayat 5). |
| PMK 7/2026 Pasal 23, 24 ayat (2), (4), 25 ayat (5)-(6) | **[V]** | Syarat tahap I (Perdes APB Desa, surat kuasa, laporan realisasi dan capaian keluaran tahun lalu) diterima paling lambat **15 Juni 2026** (batas di pusat, dari bupati; batas dari desa lebih awal dan ditentukan kabupaten); syarat tahap II (laporan tahap I) "sesuai ketentuan langkah-langkah akhir tahun" tanpa tanggal. |
| PP 11/2021 Pasal 58-59 | **[V]** | Laporan semesteran ke penasihat, laporan tahunan ke Musyawarah Desa setelah ditelaah penasihat dan pengawas. **Tidak ada tenggat tertulis**: butir tanpa tanggal sampai kabupaten menetapkannya. (PDF sumber hasil pindai, terbaca; ejaan angka sempat berantakan, isi pasal terbaca utuh.) |
| UU 6/2014 Pasal 26 ayat (4) huruf p, 27, 28 | **[V]** (teks 2014) | Kewajiban laporan akhir tahun ke bupati, laporan keterangan ke BPD, informasi tertulis ke masyarakat; sanksi administratif Pasal 28. Perubahan UU 3/2024 **belum diperiksa** untuk pasal-pasal ini. |
| UU 14/2008 Pasal 9 ayat (1)-(3) | **[V]** teks, **[R]** penerapan | Informasi berkala diumumkan paling singkat 6 bulan sekali. Penerapan pada pemerintah desa dan tanggal 30 Juni/31 Des adalah penjadwalan wajar: butir berlabel R. |
| Peraturan Komisi Informasi (Perki) | **[R]** tidak dibaca | Tidak dipakai. |
| Perubahan/pencabutan Permendagri 20/2018, 46/2016, 114/2014, PP 11/2021 setelah teks yang dibaca | **[R]** tidak dicek | Teks yang dibaca adalah salinan asli/lama; keberlakuan terkini perlu dikonfirmasi ke Dinas PMD. |
| Hari libur nasional untuk "hari kerja" | **[R]** | Hitungan 7 hari kerja memakai Senin-Jumat tanpa mengurangi libur nasional (menghasilkan batas paling awal). |

## Bahan cetak gabungan
Per butir: rincian APB Desa (Perdes APB Desa), laporan semester I + realisasi kegiatan semester, LPJ (realisasi, CaLK, realisasi kegiatan, program sektoral), dokumen LPPD atau LKPPD lengkap, informasi publik (Pasal 72), tabel capaian keluaran Dana Desa (kolom Pasal 25 ayat 6), daftar publikasi Dana Desa, serta tautan ke cetakan Perencanaan dan BUM Desa. Semua dibaca lewat fungsi laporan yang sudah ada (`buildReport`, `loadMoreReport`, `loadDocument`, `getOverview`, `publicList`). **ZIP tidak dibuat**: proyek belum punya pustaka/pola ZIP; lampiran non-data hanya didaftar sebagai daftar periksa.

## Narasi untuk Laras (belum dipasang; berkas Laras milik sesi lain)
`buildNarrationFacts(prisma, { villageId, year })` mengembalikan `facts` (ID `F1..`, kalimat berangka terformat, sumber yang bisa ditelusuri), `sections` (id bagian Laporan Kepala Desa, draf kalimat dari templat dengan kutipan `[F3]`, atau `needsHuman: true` dan kosong untuk keberhasilan/permasalahan/upaya/tujuan/kesimpulan/saran), `warnings`, dan `instruction` (aturan untuk model). `narrationToPrompt` membentuk teks datar. Fungsi ini tidak memanggil model, tidak menulis data, dan hanya menyebut agregat (jumlah penduduk dan KK, tanpa nama/NIK).
Cara memasang di `lib/ai/laras-tools.ts` (satu entri pada daftar `LARAS_TOOLS`, meniru `bumdes_summary`):
```ts
{
  name: "village_report_narration_facts",
  description: "Fakta bertanda sumber dan draf kalimat untuk LPPD/LKPPD satu tahun anggaran. Hanya data APBDes, RPJM Desa, dan jumlah penduduk; tidak mengarang angka. Hasil WAJIB dibaca dan disetujui petugas.",
  parameters: { type: "object", properties: { year: { type: "integer", minimum: 2000, maximum: 2100 } }, additionalProperties: false },
  resource: "apbdes", permission: "read", moduleId: null /* sesuaikan: modul APBDes */,
  schema: yearOnlySchema,
  run: (async (ctx, a) => {
    const r = await buildNarrationFacts(prisma, { villageId: ctx.villageId, year: a.year ?? new Date().getFullYear() - 1 });
    return r.ok ? narrationToPrompt(r.data) : { error: r.errors[0] };
  }) as LarasTool["run"],
}
```
`villageId` harus dari `ctx` (server), jangan dari argumen model. Tambahkan juga satu kalimat pada persona Laras: bila pengguna meminta draf LPPD/LKPPD, panggil alat ini, pakai hanya fakta yang dikembalikan, kutip ID fakta, dan nyatakan hasilnya draf. Tes yang menjaga "tidak ada angka karangan" ada di `tests/kepatuhan-narasi.integration.test.ts` dan bisa dijadikan acuan tes Laras.

## Tinjauan keamanan (agen terpisah) dan perbaikan
- **Rendah, kolom internal bocor**: baris katalog menyebar seluruh baris Prisma sehingga akun regional bisa melihat `updatedByLabel` (`platform:<id>`) dan `updatedByRegionalId`. Kini `toRow` memilih kolom satu per satu; tes (`kepatuhan.integration`) memeriksa bahwa respons katalog dan register desa tidak memuat kolom/nilai internal, dan kabupaten lain tidak melihat baris kabupaten ini. Uji mutasi tertangkap.
- **Rendah, wilayah dapat diubah admin desa**: kunci kabupaten kini memakai kode wilayah resmi (`settings.wilayah.kode_kab_kota`, disimpan di pengaturan wilayah desa) bila akun regional punya kode, dengan cadangan teks. Tes: baris berkunci kode tidak berlaku untuk desa tanpa kode, kode lain, atau teks yang meniru kunci; mengganti teks kabupaten tidak memindahkan desa. Uji mutasi tertangkap.
- **Desain, mematikan/menurunkan tenggat nasional secara diam-diam**: `disabled` kini wajib beralasan dan berrujukan; akun kabupaten tidak bisa memberi label R pada butir bawaan; butir yang dimatikan tidak hilang dari kalender desa, melainkan tampil dengan penanda "Dimatikan oleh kabupaten" beserta dasarnya, dan butir yang tenggatnya diubah menampilkan penanda serupa (di luar bagian lipat). Butir dimatikan tidak bisa dicatat, tidak diingatkan, dan tidak dihitung pada rekap. Tes dan uji mutasi untuk semuanya.

## Kunci dan konkurensi
Tidak ada invarian saldo/uang. Invarian yang dijaga: satu catatan per (desa, tahun, butir) lewat indeks unik; simpan serentak memakai `upsert` dengan ulang sekali bila `P2002`. Satu klaim pengingat per (desa, butir, tahun, tahap) lewat indeks unik `admin_notifications(villageId, sourceKey)`. Tidak ada `SELECT … FOR UPDATE`.

## Pengujian
- `tests/kepatuhan.test.ts` (38 tes murni): tenggat tiap butir sesuai teks, versi per tahun dan SEMENTARA, prioritas penimpaan (kabupaten > global > bawaan), tidak bocor lintas kabupaten/provinsi, butir KAB-, status dan bukti, tahap pengingat (batas 30/7/1 dan jendela 14 hari), turunan otomatis, validasi masukan jahat, batas penyuntingan regional, disiplin sumber (butir V wajib menyebut pasal; R tak dihitung).
- `tests/kepatuhan.integration.test.ts` (12 tes MySQL): status dari modul lain, catatan (butir tak berlaku/berkas desa lain ditolak), isolasi antar desa, simpan serentak, penimpaan per kabupaten (desa kabupaten lain tak terpengaruh, hapus dibatasi pemilik, label V hanya admin, butir KAB-), lapis global, rekap hanya desa yang diberikan, pengingat (idempoten, dua proses serentak, butir terkirim/R/desa tak berlangganan dilewati, tahap berikutnya, jendela terlambat), bahan cetak.
- `tests/kepatuhan-narasi.integration.test.ts` (3 tes MySQL): setiap angka di draf berasal dari fakta yang dikutip, bagian penilaian dibiarkan kosong, tanpa APB Desa tidak ada angka, tidak bocor antar desa, baca-saja.
- `tests/kepatuhan-route.test.tsx` (8 tes): izin rute per peran, cron 503/401, pemakaian `isValidCronAuth`, guard rute regional/admin, render lencana status.
- **Uji mutasi** (penjaga dicabut, tes harus gagal; semuanya tertangkap): sourceKey acak (idempotensi), butir R ikut diingatkan, hapus katalog tanpa batas cakupan, berkas arsip tanpa cek desa, butir tak berlaku diterima, penimpaan lintas kabupaten, desa tak berlangganan diingatkan, butir terkirim diingatkan, hapus catatan tanpa `villageId`, akun non-kabupaten boleh menulis, label V untuk kabupaten, satu mutasi narasi (angka karangan "15%" ditambahkan ke draf), dan enam mutasi tinjauan keamanan (mematikan tanpa alasan, kunci kode diabaikan, butir dimatikan dihapus diam-diam, kolom internal ikut respons, label R untuk butir bawaan, butir dimatikan masih bisa dicatat).
- Tes penjaga yang ada: `api-guard-coverage` dan `cron-auth` lolos. `module-routes` gagal hanya karena modul agen lain yang sedang dikerjakan (bencana, kerja-sama, idm).
- **Belum diuji**: browser sungguhan (layar `/kepatuhan`, bahan cetak, `/wilayah/kepatuhan`, dialog) dan 390px; tidak ada render komponen halaman lengkap. Dirancang untuk 390px (kartu, bukan tabel lebar; dialog `max-h` + gulir dalam; tabel bawaan di dalam `overflow-x-auto`) tetapi tidak dicoba. Pengiriman email Brevo dan push Expo sungguhan tidak dicoba (diuji dengan pengganti).

## Batas yang jujur
- Tidak ada layar admin platform untuk katalog global (hanya API); update katalog TA 2027 saat aturan terbit dilakukan lewat API itu atau panel kabupaten.
- Butir Dana Desa bawaan hanya untuk TA 2026 (dipakai sementara untuk tahun berikutnya dengan peringatan). Tenggat dari desa ke kabupaten untuk syarat tahap I/II tidak ada di PMK: perlu ditimpa kabupaten.
- Status otomatis hanya untuk butir yang punya padanan; semester I, LPJ, penyampaian ke bupati, informasi masyarakat, dan BUM Desa dicatat petugas. Tidak ada deteksi otomatis Perdes pertanggungjawaban di `legal_documents`.
- "Terkirim" dari catatan petugas tidak diverifikasi (tidak ada tanda terima dari kabupaten). Desa yang belum memakai aplikasi tampak "belum" pada rekap kabupaten; tidak berarti terlambat di dunia nyata.
- LPPD akhir masa jabatan (Pasal 5) dan laporan bulanan internal (BKU ke sekretaris desa tanggal 10, Pasal 67) tidak masuk registri.
- Rekap kabupaten menghitung desa berlangganan aktif saja (kebijakan agregat regional yang ada).
- **Wilayah desa masih bisa diubah admin desa sendiri** (teks kabupaten dan kode wilayah di profil/pengaturan desa; rute profil milik modul lain dan tidak diubah). Tidak ada riwayat perubahan wilayah, jadi perpindahan tidak dapat dideteksi atau ditandai "berubah sejak tanggal tertentu". Mitigasi yang ada: kunci kode untuk akun berkode, kolom "wilayah terdaftar" pada rekap, dan penanda sumber pada kalender desa. Bila teks kabupaten pada desa berbeda ejaan dari desa lain, penimpaan berkunci teks tidak berlaku bagi desa itu; desa tanpa kode tidak tercakup penimpaan berkunci kode.
- Pengingat bersifat paling banyak sekali (lihat di atas); tidak ada pengiriman ulang manual.
- Narasi: templat deterministik, tidak memperhalus bahasa; belum dipasang di Laras. Angka penduduk adalah data saat ini, bukan potret 31 Desember.
- Ekspor Siskeudes: **tidak dibuat** (tetap terblokir templat resmi).
- Profil desa/Prodeskel/monografi (butir P7 lain di plan) tidak dikerjakan di paket ini.

## Keputusan yang menunggu pemilik
1. Pasang cron produksi (jadwal dan `CRON_SECRET`) dan putuskan apakah email pengingat dinyalakan (butuh Brevo).
2. Tanggal pengganti "minggu kedua Juli" (14 Juli dipakai); konfirmasi ke Dinas PMD Karanganyar.
3. Siapa mengelola katalog platform (API saja) dan apakah perlu layar admin.
4. Butir berlabel R (informasi berkala UU 14/2008, informasi semester I) tetap tampil sebagai informasi, atau disembunyikan sampai diverifikasi?
5. Buat akun regional kabupaten untuk Karanganyar agar Dinas PMD bisa menetapkan tenggat setempat (batas penyampaian syarat tahap I/II Dana Desa, laporan BUM Desa).
6. Pasang alat narasi di Laras (sesi pemilik berkas Laras).
7. Perlu ZIP bahan cetak? Butuh keputusan pustaka (tidak ada di proyek).
8. Kunci wilayah desa: batasi penyuntingan teks kabupaten dan kode wilayah pada profil hanya untuk admin platform, atau catat riwayat perubahannya (di modul profil, bukan modul ini), dan isi kode kab/kota pada akun regional serta desa-desanya.
9. Paket langganan: ikut modul APBDes (resource izin `apbdes`) atau add-on tersendiri.

## Titik pemasangan bersama yang diubah
`prisma/schema.prisma` (dua model di atas penanda `models:kalender`, satu relasi balik `complianceRecords` di atas `back-relations:kalender`), `lib/modules/registry.ts` (modul `kepatuhan`, sortOrder 357), `lib/permissions/api-route-map.ts` (`/api/kepatuhan` → `apbdes`), `lib/regional-nav.ts` (menu "Kepatuhan laporan").

## SQL
`PHASE3_KALENDER_MIGRATION.sql` (aditif, dua tabel + satu FK) dan `PHASE3_KALENDER_ROLLBACK.sql`. Dilatih di `klandesa_kalender_scratch2` yang dibuat dari snapshot skema sebelum Paket 3: terapkan, isi satu baris, rollback (tabel hilang, `villages` utuh), terapkan lagi; `prisma migrate diff` dari DB hasil latihan ke skema akhir tidak memuat satu pun baris untuk tabel `compliance_*`.
