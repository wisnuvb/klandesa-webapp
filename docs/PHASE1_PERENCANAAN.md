# Paket 0 + 1 — Musyawarah Desa dan Siklus RKP Desa

Dikerjakan 2026-11-01 sesuai `docs/PLAN_CELAH_FUNGSI.md` (P0 dan inti P1). Belum di-commit dan belum di-deploy.

## Sumber hukum

| Sumber | Status | Dipakai untuk |
|---|---|---|
| Permendagri 114/2014 (BN 2094/2014) Pasal 14–60 | **[V]** dibaca dari teks resmi (peraturan.go.id) | Tahapan dan tenggat RKP Desa, tim penyusun, pagu indikatif, Musrenbangdes, perubahan RKP Desa, pelaksana kegiatan |
| Permendesa PDT 16/2025 Pasal 1 angka 4, 8–9 | **[V]** | RPJM Desa 8 tahun; keterwakilan warga miskin, disabilitas, perempuan, anak |
| UU 3/2024 (masa jabatan 8 tahun, RPJM Desa 8 tahun) | [R] sumber sekunder | Hanya sebagai catatan; angka 8 tahun dikutip dari Permendesa 16/2025 |
| Permendesa 21/2020 atau 17/2019 (pedoman umum pembangunan desa) | [R] nomor belum pasti | **Belum dibaca.** Sumber sekunder menyebutnya bisa mengesampingkan sebagian Permendagri 114/2014 untuk RPJM Desa. Tahapan RPJM Desa (Pasal 8–28) belum dimodelkan |

### Tenggat yang dihitung otomatis (RKP Desa tahun Y, disusun pada tahun berjalan Y-1)

| Tahap | Tenggat | Pasal |
|---|---|---|
| Musyawarah Desa perencanaan | 30 Juni | 31 ayat 3 |
| Tim penyusun dibentuk (keputusan Kepala Desa, 7–11 orang, ada perempuan) | 30 Juni | 33 ayat 3–6 |
| Informasi pagu indikatif dari kabupaten/kota | 31 Juli | 35 ayat 2 |
| **Peraturan Desa RKP Desa ditetapkan** | **30 September** (akhir September) | 29 ayat 4 |
| Daftar usulan RKP Desa ke bupati/wali kota melalui camat | 31 Desember | 51 ayat 2 |

Catatan koreksi: 31 Desember adalah tenggat **APB Desa** (Pasal 37 ayat 3) dan daftar usulan, bukan Perdes RKP Desa. Dokumen plan sebelumnya sempat keliru menulisnya.

## Yang dibangun

**Musyawarah Desa** (`/musdes`): jadwal, jenis (6 jenis dengan dasar hukum dan penyelenggara), peserta per unsur (14 unsur; sepuluh unsur Pasal 46 ayat 3 ditambah Pemerintah Desa, BPD, disabilitas, warga), tambah dari data warga (nama saja; tanpa NIK) atau tambah banyak (maks 100 per sekali), daftar hadir, keputusan bernomor, berita acara. Alur: Dijadwalkan → Terlaksana → Berita acara final (terkunci). Dibatalkan hanya dari Dijadwalkan; hapus hanya yang Dijadwalkan/Dibatalkan. Buka kembali berita acara final butuh izin `approve` dan alasan. Peringatan keterwakilan (tidak memblokir): BPD, perempuan, masyarakat miskin, disabilitas, kelompok anak, dan sepuluh unsur Pasal 46 untuk Musrenbangdes. Cetak: daftar hadir dan berita acara.

**Siklus RKP Desa** (`/rkpdes`): dokumen per tahun (awal, atau perubahan ke-N setelah yang awal ditetapkan), delapan tahap dengan tenggat dan status (selesai, terlambat, segera, akan datang), tautan ke Musdes dan Musrenbangdes terlaksana, tim penyusun (peringatan 7–11 orang, perempuan, pembina/ketua/sekretaris), pagu indikatif per sumber dana, program yang masuk Desa, kegiatan (kode bidang/kegiatan Permendagri 20/2018, keluaran, volume, pelaksana, verifikasi RAB, usulan ke kabupaten), peringatan kelengkapan per kegiatan, peringatan anggaran melebihi pagu per sumber, evaluasi tahun sebelumnya, persetujuan Kepala Desa (izin `approve`). Setelah Perdes dihubungkan, isi **terkunci** (hanya data usulan yang masih boleh dicatat); perubahan lewat dokumen perubahan. Cetak: rancangan, daftar usulan, lampiran tim, pagu dan program masuk.

**RPJM Desa**: kolom jangka waktu kini diberi keterangan (8 tahun sesuai aturan; 6 tahun ditandai aturan lama; lainnya ditandai tak lazim), default isian baru 8 tahun. Tidak memblokir dokumen lama.

## Keselarasan dengan APB Desa (ditambahkan 2026-11-01, tanpa perubahan skema)

Tab **APB Desa** pada dokumen RKP Desa (`/rkpdes/[id]`, API `GET /api/perencanaan/rkpdes/[id]/keselarasan?apbdes=`): mencocokkan anggaran kegiatan RKP Desa dengan belanja APB Desa tahun yang sama **per kode kegiatan**. Status: selaras, APB Desa lebih kecil/besar, belum dianggarkan, tidak ada di RKP Desa; ditambah perbandingan per sumber dana dan peringatan (termasuk kegiatan RKP Desa tanpa kode). Pembanding dapat dipilih (APB Desa atau Perubahan APB Desa ke-N, draf maupun ditetapkan), jadi pemeriksaan sebelum dan sesudah perubahan APB Desa memakai layar yang sama. Hanya membaca; butuh izin baca `perencanaan` dan `apbdes`.

**Siapkan DPA dari RKP Desa** (`POST` rute yang sama; butuh izin ubah `perencanaan` dan `apbdes`): menyalin lokasi, keluaran, volume+satuan, dan tim pelaksana kegiatan RKP Desa menjadi draf Rencana Kerja Kegiatan. Hanya untuk APB Desa yang **sudah ditetapkan**, hanya kegiatan yang punya belanja di dalamnya, **tidak menimpa** DPA yang sudah ada, dan aman diulang (`skipDuplicates` di bawah kunci tahun). Kode kembar di RKP Desa dilewati (isi manual). Pelaksana (Kaur/Kasi) dan bulan pelaksanaan tidak ada di RKP Desa, jadi tetap diisi operator. Alasan setiap kegiatan yang dilewati ditampilkan. Tautan RKP Desa ↔ APB Desa memakai kunci alami (tahun + kode kegiatan), bukan kolom baru; asal tercatat di log audit.

Sengaja belum: **DPPA sebagai dokumen berversi** (saat ini penanda "perlu DPPA" pada DPA yang anggarannya berubah sudah ada; pergeseran antar objek belum), dan penerbitan baris APB Desa dari RKP Desa (baris butuh kode rekening objek yang tidak ada di RKP Desa).

## Data (SQL aditif, `docs/PHASE1_PERENCANAAN_MIGRATION.sql`)

Tujuh tabel baru: `village_meetings`, `village_meeting_attendees`, `village_meeting_decisions`, `rkpdes_documents`, `rkpdes_team_members`, `rkpdes_pagu_indicative`, `rkpdes_incoming_programs`; plus 14 kolom nullable/berdefault pada `rkpdes_activities`. Tanpa DROP. Rollback: `PHASE1_PERENCANAAN_ROLLBACK.sql`. Sudah dilatih pada DB scratch (terapkan, rollback, terapkan ulang; `migrate diff` nol) dan diterapkan ke DB lokal. **Produksi belum.** Terapkan setelah semua SQL sebelumnya (tidak bergantung pada SQL lain selain tabel lama `villages`, `residents`, `rpjmdes_plans`, `legal_documents`).

## Izin dan audit

Resource baru `perencanaan`: admin penuh + approve; Kepala Desa baca/ekspor/approve; sekretaris CRUD+ekspor; operator baca/buat/ubah/ekspor. Semua rute memanggil `requireVillageApiContext` dan mencatat audit pada setiap tulis. Pencarian warga (`/api/musdes/warga`) hanya mengembalikan nama, jenis kelamin, RT/RW.

## Pengujian

- Unit: `tests/musdes.test.ts`, `tests/rkpdes.test.ts`, `tests/perencanaan-render.test.tsx`.
- Integrasi MySQL: `tests/perencanaan.integration.test.ts` (13 tes: alur dan penguncian, isolasi antar-desa, konkurensi). **Uji mutasi:** tanpa `FOR UPDATE`, tes konkurensi nomor keputusan dan pagu gagal; kunci dipulihkan.
- **Browser sungguhan** (Chrome + puppeteer-core, dev server lokal, sesi admin Desa Bedahan): jadwalkan Musrenbangdes → tambah peserta (banyak dan satu) → peringatan keterwakilan → terlaksana → keputusan → berita acara → finalkan → terkunci → cetak; buat RKP Desa 2027 → tahap terlambat → hubungkan Musrenbangdes → tim → pagu → program masuk → kegiatan → evaluasi → cetak rancangan. Semua lulus, tanpa galat konsol/jaringan dari kode ini. Skrip ada di scratchpad sesi, bukan di repo.
- Seluruh suite 2071 lulus; tsc dan eslint bersih.

## Temuan di luar paket ini

- Peringatan hidrasi React muncul acak di dev (juga di `/aset-desa` lama) dan menunjuk ke `AppShell`/`Sidebar`, bukan komponen paket ini. Belum diselidiki.
- Nama desa pada data uji berawalan "Desa"; kop cetak memotong awalan itu (`villageTitle`).

## Belum dikerjakan (jujur)

- **Tahapan RPJM Desa** (Pasal 8–28: pengkajian keadaan desa, Musdes, rancangan, Perdes) belum dimodelkan; hanya keterangan jangka waktu. Perlu baca Permendesa 21/2020 dulu.
- **DPPA berversi / pergeseran anggaran** (pemeriksaan selisih dan DPA awal sudah ada, lihat atas), **monev kemajuan fisik** (log progres + foto), **impor Indeks Desa** (rekomendasi fokus), **usulan warga ke Musrenbangdes** (menggantikan `votesCount` yang mati).
- Salin kegiatan dari RKP Desa awal ke dokumen perubahan; peringatan pagu memakai sumber dana kegiatan (perbandingan dengan APB Desa ada di tab APB Desa).
- Format resmi lampiran Permendagri 114/2014 (rancangan RKP Desa, daftar usulan) belum dibandingkan dengan cetakan di sini; cetakan mengikuti isi Pasal 41 dan 43, bukan tata letak lampiran. Perlu contoh dari kabupaten.
- Layar baru belum dicoba operator desa; uji browser dilakukan lewat skrip.
