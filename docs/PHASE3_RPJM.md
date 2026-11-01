# Paket 3 / RPJM Desa: tahapan penyusunan

Dikerjakan 2026-11-01 (sisa P1 di `docs/PLAN_CELAH_FUNGSI.md`). Belum di-commit dan belum di-deploy. Menu baru **Tahapan RPJM Desa** (`/rpjm`) memperluas `RpjmdesPlan` dan modul RKP Desa/Musdes yang ada; halaman lama `/rpjmdes` tidak ditulis ulang dan hanya diberi tautan.

## Sumber hukum (Langkah 0)

Semua teks di bawah diunduh dari peraturan.bpk.go.id (PDF resmi) dan dibaca; salinannya ada di scratchpad sesi, bukan di repo. Nomor pasal dikutip dari teks itu.

| Sumber | Status | Isi yang dipakai |
|---|---|---|
| UU 3/2024 (perubahan kedua UU Desa) Pasal 39, 79, 118 | **[V]** | Masa jabatan Kepala Desa 8 tahun (Pasal 39 ayat 1); RPJM Desa 8 tahun (Pasal 79 ayat 2 huruf a); Perdes RPJM Desa dan RKP Desa adalah "satu-satunya dokumen perencanaan di Desa" (Pasal 79 ayat 4). Pasal 118 hanya mengatur peralihan masa jabatan, **tidak** mengatur peralihan dokumen RPJM Desa. Catatan: Putusan MK 92/PUU-XXII/2024 menyentuh Pasal 118 huruf e (bukan RPJM). |
| **PP 16/2026** Pasal 142-149 (ditetapkan dan berlaku 27 Maret 2026; mencabut PP 43/2014 dan perubahannya, Pasal 187) | **[V]** | RPJM Desa 8 tahun (143 ayat 2); musyawarah perencanaan dilakukan dalam Musyawarah Desa (144 ayat 2); rancangan dibahas dan disepakati di situ, minimal memuat penjabaran visi-misi dan arah kebijakan (144 ayat 3-4); isi RPJM Desa dan pertimbangan kabupaten/kota (145 ayat 1-3); **ditetapkan paling lama 3 bulan sejak pelantikan Kepala Desa** (145 ayat 4); perubahan karena peristiwa khusus/kebijakan, dibahas dalam musyawarah dan ditetapkan Perdes (148). Tidak ada ketentuan peralihan untuk RPJM Desa lama (Pasal 183-186 hanya perangkat, penghasilan tetap, kerja sama, pilkades serentak). |
| Permendagri 114/2014 **Pasal 4-28** (bukan 14-30 seperti tertulis di plan; Pasal 29+ RKP Desa) | **[V]** teks; status berlaku: BPK mencatat "Berlaku", tetapi PP induknya (PP 43/2014) sudah dicabut dan teksnya masih menyebut "6 tahun" | Tahapan rinci: tim penyusun (Pasal 8: pembina Kades, ketua Sekdes, sekretaris ketua LPM; 7-11 orang; ikutkan perempuan; SK Kades), penyelarasan arah kebijakan kabupaten (10-11), pengkajian keadaan Desa (12-19, berita acara), Musdes (20-22), rancangan (23-24), Musrenbangdes (25-26), Perdes (27), perubahan (28). |
| Permendesa PDTT 21/2020 Pasal 22-33 (pedoman umum) | teks **[V]**; status berlaku **[R]**: BPK menandainya "Tidak berlaku, dicabut dengan Permendesa PDT 13/2025", tetapi Pasal 185 Permendesa PDT 13/2025 hanya mencabut ketentuan SID, Pendataan Desa, dan Rencana Jangka Menengah SDGs Desa. Belum dipastikan bagian RPJM Desa masih berlaku | Urutan tahapan berbeda (Musrenbang Desa dulu, lalu Musdes yang menetapkan, lalu sosialisasi); tim ganjil minimal 7, perempuan minimal 30% (Pasal 27); unsur rancangan: visi-misi, tipologi, prioritas, lokasi, volume, sasaran, waktu per tahun, perkiraan biaya dan sumber, pola pelaksanaan (Pasal 30 ayat 3). |
| Permendesa PDT 13/2025 (Pedoman SID; ditetapkan 28 Nov 2025, diundangkan dan berlaku 4 Des 2025 menurut metadata BPK) Pasal 1 angka 13, 126-136, 183 huruf c, 185 | **[V]** (tanggal pengundangan dari metadata BPK, tanda tangan di PDF tidak terbaca) | RPJM Desa 8 tahun; **Rencana Jangka Menengah SDGs Desa 5 tahun**, diisi Kepala Desa di aplikasi SID dan diintegrasikan ke RPJM Desa; RPJM Desa yang memuatnya menjadi pedoman RKP Desa (126 ayat 4); perencanaan menyesuaikan paling lama 1 tahun sejak diundangkan (183 huruf c) yaitu sekitar 4 Desember 2026. |
| Ketentuan peralihan RPJM Desa 6 tahun menjadi 8 tahun | **[?]** tidak ditemukan di UU 3/2024, PP 16/2026, maupun Permendesa 13/2025 | Sumber sekunder (blog penyuluh, mis. Cipta Desa) menyarankan "perubahan RPJM Desa menambah tahun ke-7 dan ke-8". Tidak ditanam sebagai aturan. |
| Surat edaran / aturan 2024-2026 khusus format RPJM Desa | tidak ditemukan | Format lampiran Permendagri 114/2014 dan Permendesa 21/2020 belum dibandingkan dengan cetakan di sini. |

### Apa yang dijadikan keras, peringatan, atau data

* **Angka 8 tahun** [V] dan **3 bulan sejak pelantikan** [V] ada di `RPJM_RULES` (`lib/rpjm/catalog.ts`) agar mudah ditinjau. Periode lain tetap bisa disimpan: hanya bendera "perlu penyesuaian", tidak pernah memblokir (keputusan default pemilik no. 8).
* **Gerbang keras (server)** hanya yang sama di ketiga sumber tahapan: (1) rancangan baru boleh ditandai selesai bila visi, misi, arah kebijakan terisi dan ada minimal satu program (PP 16/2026 Pasal 144 ayat 4 dan 145 ayat 1); (2) persetujuan Kepala Desa butuh rancangan selesai (114/2014 Pasal 24); (3) Perdes baru boleh dihubungkan bila rancangan selesai, **disetujui Kepala Desa**, **dan** sudah dibahas/disepakati dalam musyawarah yang terlaksana (114/2014 Pasal 26-27; 21/2020 Pasal 31-33; PP 16/2026 Pasal 144 ayat 3).
* **Urutan Musdes/Musrenbang tidak dipaksakan** karena sumbernya bertentangan. Tautan "pembahasan rancangan" menerima Musrenbangdes **atau** Musyawarah Desa perencanaan; tautan "Musdes pengkajian" (114/2014 Pasal 20-22) hanya peringatan langkah.
* **Komposisi tim penyusun** hanya peringatan. Yang sama di kedua Permen tampil biasa (minimal 7, ada perempuan, satu pembina/ketua/sekretaris). Yang hanya ada di satu sumber diberi label "Catatan satu sumber" dan status berlakunya "belum dipastikan": maksimum 11 (114/2014), perempuan 30% dan jumlah ganjil (21/2020).
* **Tenggat Perdes** (pelantikan + 3 bulan) hanya dihitung bila tanggal pelantikan diisi. Tanggal pelantikan tidak ada di data lain aplikasi; disimpan di kolom baru `headInauguratedOn`.
* **Keselarasan dengan masa jabatan** (periode vs 8 tahun sejak pelantikan) hanya **catatan** berlabel: peraturan tidak menyebut keduanya harus identik.

## Yang dibangun

* **Tahapan** (`/rpjm/[id]`, tab Tahapan): tujuh langkah dengan dasar pasal, tenggat, status (selesai, terlambat, segera, belum), dan editor tiap langkah: tim dibentuk (SK), pengkajian keadaan desa (berita acara), Musdes (tautkan musyawarah dari menu Musyawarah Desa; jenis dan kepemilikan divalidasi, satu musyawarah tidak dipakai dua RPJM), rancangan selesai, persetujuan Kepala Desa (izin `approve`), pembahasan rancangan, Perdes. Gerbang yang belum terpenuhi tampil sebagai daftar alasan dan tombolnya nonaktif (terhubung `aria-describedby`).
* **Isi rancangan**: judul, periode, pelantikan, visi, misi, arah kebijakan, ringkasan pengkajian, catatan Rencana Jangka Menengah SDGs Desa (tanggal selesai diisi di SID; aplikasi ini **tidak** terhubung ke SID).
* **Program** (`rpjm_programs`): per bidang (4 bidang, kode sama dengan bidang 1-4 Permendagri 20/2018) per tahun dalam periode, kode kegiatan (harus pada bidang yang sama), lokasi, volume dan satuan, sasaran/manfaat, anggaran indikatif (sen), sumber dana, pola pelaksanaan; catatan kelengkapan per program; filter tahun; berapa kegiatan RKP Desa yang menjabarkannya.
* **Tim penyusun** (`rpjm_team_members`), dari data warga (nama saja) atau diketik.
* **Keselarasan**: bendera (jangka waktu 6 tahun "aturan lama", periode lain, selaras masa jabatan, Perdes lewat 3 bulan, visi/misi/arah kosong, program di luar periode, bidang dan tahun tanpa program, SDGs belum dicatat dan tenggat 4 Des 2026), matriks anggaran per bidang per tahun, riwayat pembukaan kunci.
* **Kunci setelah Perdes**: setelah Perdes dihubungkan seluruh isi (judul, periode, visi, misi, program, tim, tautan, persetujuan) ditolak 409; hanya catatan SDGs yang masih boleh. **Buka kunci untuk perubahan** (`approve`, wajib alasan menurut 114/2014 Pasal 28 / PP 16/2026 Pasal 148 + penjelasan) membatalkan penanda rancangan selesai, persetujuan, tautan pembahasan, dan Perdes; semuanya harus diulang; tercatat di `rpjm_events` dan log audit; Musrenbang khusus perubahan baru diterima sesudahnya.
* **Tautan ke RKP Desa**: pada formulir kegiatan RKP Desa muncul pilihan opsional "Ambil dari program RPJM Desa" (program RPJM tahun dokumen itu). Memilih mengisi nama, kode, lokasi, anggaran, sumber, cara, volume (bisa diubah); kosongkan untuk kegiatan di luar RPJM. Disimpan di `rkpdes_activities.rpjmProgramId` (divalidasi: milik desa dan RPJM dokumen itu; tidak mengubah tautan bila kolom tidak dikirim; `null` melepas; program dihapus melepas tautan, kegiatan tetap). Tidak ada paksaan atau peringatan bagi kegiatan tanpa tautan.
* **Cetak** (gaya cetak browser yang ada, A4 lanskap): Dokumen RPJM Desa (visi-misi, arah kebijakan, ringkasan pengkajian, program per bidang, matriks), Matriks program dan anggaran, Lampiran tim penyusun.

### RPJM Desa lama

Dokumen lama (dibuat di `/rpjmdes`) tidak diubah dan tidak terkunci. Selama belum ada data tahapan ("belum disentuh") isinya tidak dinilai kelengkapannya; hanya bendera jangka waktu (6 tahun) yang muncul. Penyuntingan lama (`PATCH /api/rpjmdes/plans/[id]`) kini menolak perubahan isi bila Perdes sudah dihubungkan lewat alur baru, menolak periode yang menyingkirkan program, dan `DELETE` menolak dokumen terkunci atau yang punya program.

Perdes RPJM Desa yang sudah ada sebelum desa memakai aplikasi: pada langkah Perdes, centang "sudah ditetapkan sebelum memakai aplikasi" melewati gerbang (tercatat di `enactedBeforeApp`, tidak ada tenggat) tetapi tetap mengunci. Hanya pemegang izin `approve`, wajib alasan, hanya bersama penautan Perdes, dan tercatat di `rpjm_events` (BYPASS).

## Data (SQL aditif, `docs/PHASE3_RPJM_MIGRATION.sql`)

18 kolom nullable/berdefault pada `rpjmdes_plans`; 1 kolom nullable pada `rkpdes_activities` (`rpjmProgramId`); tiga tabel: `rpjm_team_members`, `rpjm_programs`, `rpjm_events`; indeks unik `rpjmdes_plans.legalDocumentId` (satu Perdes hanya untuk satu RPJM; NULL berganda diizinkan); FK berefek SET NULL ke `village_meetings`, `legal_documents`, `rpjm_programs`. Tanpa DROP/UPDATE/DELETE. Rollback: `PHASE3_RPJM_ROLLBACK.sql` (data tahapan dibuang; dokumen lama dan kegiatan RKP utuh). Back-relation ditambahkan pada model `VillageMeeting` dan `LegalDocument` (dua baris) di luar penanda skema karena Prisma mewajibkannya.

## Izin dan audit

Memakai resource `perencanaan` yang ada (tanpa resource baru). Rute `/api/perencanaan/rpjm/**`: semua memanggil `requireVillageApiContext`, membungkus `attempt()`, menulis `auditWeb` (tanpa isi teks). `villageId` hanya dari sesi. `persetujuan` dan `buka-kunci` = `approve` (admin dan Kepala Desa) lewat dua pola baru di `lib/permissions/api-route-map.ts`, dicek ulang di dalam rute. Modul menu baru `rpjm` di `lib/modules/registry.ts` (sortOrder 708).

## Kunci dan konkurensi

Setiap penulisan membuka transaksi interaktif dan **pernyataan pertamanya** `SELECT … FOR UPDATE` pada baris `rpjmdes_plans` (`lockPlan`). Uji mutasi: tanpa `FOR UPDATE` tes balapan "tanda selesai rancangan vs hapus program terakhir" gagal 3 dari 3 kali; kunci dipulihkan. Perdes yang sama untuk dua RPJM sekaligus dijaga indeks unik + pemeriksaan (tes `Promise.all`: tepat satu berhasil; tidak diuji mutasi).

## Pengujian

* `tests/rpjm.test.ts` (24 tes murni): tanggal/tenggat, gerbang, tim, program, bendera, matriks sen, validasi masukan jahat, izin rute.
* `tests/rpjm-render.test.tsx` (4 tes render server): pengelompokan, keadaan kosong, sanitasi, bendera berteks, matriks bertajuk, tanpa izin tanpa tombol.
* `tests/rpjm.integration.test.ts` (19 tes MySQL): alur penuh dan penguncian, validasi tautan musyawarah/Perdes (jenis, desa lain, ganda, dipakai RKP), balapan Perdes, dokumen lama, Perdes sebelum aplikasi, buka kunci, program dan periode, anggaran sen, tim, isolasi lintas desa, tautan RKP (valid/asing/lepas/SetNull), balapan penguncian.
* Tes lama yang menyentuh kode ini tetap lulus (`perencanaan.integration`, `musdes`, `rkpdes`, `perencanaan-permissions`, `perencanaan-render`, `api-guard-coverage`, `select-render`). `module-routes` gagal hanya karena modul agen lain (bencana, kerja-sama, idm) belum punya halaman.
* tsc dan eslint bersih untuk berkas paket ini.

## Tinjauan keamanan (perbaikan 2026-11-01)

Peninjau independen menemukan enam hal; semuanya diperbaiki, tanpa perubahan skema/SQL.

* **Gerbang tidak mengikat (sedang):** (a) `enactedBeforeApp` kini hanya dapat dipasang pemegang `approve`, wajib `enactedReason` (>= 10 karakter), hanya bersama `legalDocumentId`, dan dicatat `BYPASS` di `rpjm_events`; (b) `perdesBlockers` mensyaratkan `draftApprovedAt`; (c) mengubah visi, misi, arah kebijakan, ringkasan pengkajian, periode, atau program (tambah/ubah/hapus) setelah disetujui mencabut persetujuan otomatis (dan penanda selesai bila isi tak lagi memenuhi gerbang) dan mencatat `REVOKE`; PATCH yang mengubah isi sekaligus menautkan Perdes menilai gerbang dengan persetujuan yang sudah dicabut, jadi ditolak tanpa menyimpan apa pun. Mengubah isi setelah musyawarah tetap sah (114/2014 Pasal 27 ayat 1) tetapi harus disetujui ulang. Perubahan tim **tidak** mencabut persetujuan (tim bukan isi rancangan). Rute lama `PATCH /api/rpjmdes/plans/[id]` menolak ubah isi pada rencana terkunci atau sudah disetujui (`legacyPlanEditBlock`).
* **Penjaga enum (rendah):** `v in OBJ` diganti `Object.hasOwn` pada katalog RPJM, RKP Desa, dan Musdes; `constructor`, `__proto__`, `toString` ditolak (tes).
* **Dua kebijakan satu tabel (rendah):** semua rute `/api/perencanaan/rpjm/**` juga mensyaratkan izin `rpjmdes` yang setara (`lib/rpjm/http.ts`: baca, buat, ubah, hapus; `approve` = `rpjmdes.approve` atau `update`); `can` untuk layar adalah irisan keduanya, jadi staf hanya membaca. Rute lama `PATCH`/`DELETE` kini berjalan dalam transaksi dengan `FOR UPDATE` pada baris dokumen. **Entitlement paket:** `/api/rpjmdes` terkena gerbang modul `rpjmdes` (add-on SDGs), sedangkan `/api/perencanaan/rpjm` dan menu `rpjm` tidak (sama seperti RKP Desa dan Musdes; plan default no. 5: tanpa gating). Menambahkan pemetaan hanya pada API akan membuat menu tampil tetapi API menolak, jadi **tidak ditambahkan**; ini keputusan pemilik.
* **Satu musyawarah/Perdes dua dokumen lewat balapan (rendah):** `patchPlan` kini membuka transaksi dengan `SELECT … FOR UPDATE` pada baris musyawarah (urut id), lalu baris Perdes, lalu baris dokumen; `patchDocument` RKP Desa mengunci baris Perdes lebih dulu. Kunci desa (`villages`) sengaja tidak dipakai: penyisipan anak memegang kunci bersama pada baris desa dan akan membuat kebuntuan dengan kunci dokumen. Uji mutasi: tanpa kunci musyawarah dan tanpa kunci Perdes tes balapan masing-masing gagal.
* Uji mutasi tambahan (semua gagal bila dicabut): pemeriksaan `canApprove`, pencabutan persetujuan otomatis, syarat persetujuan pada `perdesBlockers`.

Tes kini: `rpjm.test.ts` (24), `rpjm-render.test.tsx` (4), `rpjm.integration.test.ts` (19).

Batas tambahan: rute lama hanya diuji lewat fungsi murni `legacyPlanEditBlock` (tidak ada tes HTTP dengan sesi); pencabutan otomatis tidak mengirim pemberitahuan ke Kepala Desa (hanya terlihat di status dan Riwayat peristiwa); `listPlans` tidak dioptimalkan.

## Perbaikan temuan uji browser (E1)

* **Konfirmasi tindakan destruktif:** hapus program dan hapus anggota tim memakai `ConfirmDelete` dengan teks yang menyebut nama dan dampak (program yang sudah dijabarkan ke RKP Desa: tautan dilepas, kegiatan tetap). Komponen baru `ConfirmAction` memberi konfirmasi pada: lepas tautan musyawarah, batalkan penanda rancangan selesai, cabut persetujuan, dan "Hubungkan dan kunci" (mengunci isi). Buka kunci sudah berdialog beralasan. Hapus kegiatan RKP Desa (`ActivitiesTab`) juga kini berkonfirmasi. Tombol hapus di tab Pagu/Tim RKP Desa dan Musdes belum diperiksa.
* **Meluap di 390px:** semua `<form>` dan `<fieldset>` di dalam dialog RKP Desa, Musdes, komponen bersama perencanaan, dan RPJM diberi `min-w-0` (fieldset bawaan `min-width: min-content` mendorong dialog bergrid). Tidak diukur ulang di browser; dijamin lewat pola kode.
* **Terlambat vs bendera:** keduanya kini satu sumber. Tenggat Perdes lewat tanpa Perdes menghasilkan bendera `PERDES_OVERDUE` ("perlu penyesuaian") di Keselarasan. Setelah buka kunci, perubahan RPJM **tidak** punya tenggat 3 bulan (hanya RPJM awal, PP 16/2026 Pasal 145 ayat 4; perubahan: Pasal 148), jadi langkah Perdes tidak lagi "Terlambat".
* **Target sentuh:** tautan dan tombol-tautan inline pada Tahapan kini `inline-flex min-h-11`.
* Tes kini: `rpjm.test.ts` 24, `rpjm.integration.test.ts` 19.

## Batas yang jujur

* **Tidak diuji di browser sungguhan** (hanya tes render server dan tsc). Layar baru belum dicoba operator desa.
* Tahapan **penyelarasan arah kebijakan kabupaten** (114/2014 Pasal 10-11) dan **penggalian gagasan masyarakat/rekap usulan dusun** (Pasal 14-17) hanya ada sebagai ringkasan teks pengkajian, belum tabel sendiri; data program kabupaten yang masuk desa dipakai modul RKP, belum disalin ke RPJM.
* Format lampiran resmi (Permendagri 114/2014, Permendesa 21/2020 Lampiran II) **belum dibandingkan**; cetakan mengikuti isi pasal, bukan tata letak lampiran.
* Perubahan RPJM Desa hanya lewat "buka kunci"; belum ada versi berdampingan (dokumen asli dan perubahan) ataupun perbandingan sebelum/sesudah. Isi sebelum dibuka hanya terekam di log audit, bukan salinan.
* Rencana Jangka Menengah SDGs Desa (5 tahun, SID) hanya dicatat tanggalnya; tidak ada impor/ekspor ke SID. Tidak ada kartu rekomendasi Indeks Desa.
* Pemilihan program RPJM di RKP Desa tidak menandai kegiatan RKP yang tak punya rujukan RPJM, dan tidak menyalin otomatis semua program tahun berikutnya ke RKP (sengaja, "tanpa memaksa").
* `listPlans` membaca semua program tiap RPJM untuk menghitung ringkasan; wajar untuk satu-dua dokumen dengan ratusan program, belum dioptimalkan untuk ribuan.
* Tidak ada penghapusan dokumen RPJM dari layar baru (hanya lewat menu lama, dengan penjagaan di atas).
* SQL belum dijalankan di DB dev pemilik maupun produksi.

## Temuan di luar paket ini

* **Modul RKP Desa memakai "mulai disusun Juli" (114/2014 Pasal 29 ayat 3)**, sedangkan **PP 16/2026 Pasal 146 ayat 5 menyebut Juni**; Musdes RKP paling lambat Juni (146 ayat 4) dan Perdes akhir September (146 ayat 6) sama dengan yang dipakai. Teks langkah "rancangan" di `lib/rkpdes/steps.ts` dan dokumennya perlu ditinjau; tidak diubah di sini.
* PP 43/2014 dicabut oleh PP 16/2026 (27 Maret 2026). Dokumen paket lain yang menyebut dasar PP 43/2014 atau menandai UU 3/2024 sebagai [R] perlu dimutakhirkan (UU 3/2024 kini [V]).
* `docs/PLAN_CELAH_FUNGSI.md` menulis RPJM Desa di "Pasal 14-30"; yang benar Pasal 4-28 (Pasal 29-51 RKP Desa).

## Keputusan yang menunggu pemilik

1. Dasar tahapan yang dipegang: Permendagri 114/2014, Permendesa 21/2020, atau hanya PP 16/2026? Saat ini aplikasi hanya menegakkan titik temu ketiganya. Perlu konfirmasi dinas PMD kabupaten (Karanganyar) atau Kemendesa tentang status berlaku Permendagri 114/2014 dan Permendesa 21/2020 setelah PP 16/2026.
2. Perlakuan RPJM Desa 6 tahun yang sudah ada: tetap hanya bendera (default no. 8). Perlu ditanyakan apakah perubahan (tambah tahun ke-7 dan ke-8) wajib dan batas waktunya.
3. Apakah cetakan harus mengikuti tata letak lampiran resmi; butuh contoh dokumen dari kabupaten.
4. Perlu integrasi dengan SID (Rencana Jangka Menengah SDGs Desa)? Tenggat penyesuaian sekitar 4 Desember 2026.
5. Perubahan RPJM Desa berversi (dokumen asli + perubahan) atau cukup "buka kunci"?
