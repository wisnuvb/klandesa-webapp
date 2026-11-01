# Paket 3 (P9) — Pengadaan barang/jasa, kerja sama desa, kartu pengaduan Dana Desa, impor IDM

Dikerjakan 2026-11-01 sesuai `docs/PLAN_CELAH_FUNGSI.md` P9. Belum di-commit dan belum di-deploy. Empat butir, masing-masing irisan vertikal utuh (skema, servis, rute, UI, tes).

## Temuan hukum yang mengubah rencana (baca dulu)
| Rencana menulis | Teks resmi menunjukkan |
|---|---|
| "Perka LKPP 13/2018" | Tidak ada pedoman pengadaan desa dengan nomor itu. Pedoman yang berlaku adalah **Peraturan LKPP 12/2019** (BN 2019/1455), yang mencabut Perka LKPP 13/2013 dan perubahannya (22/2015). |
| Peraturan LKPP memuat ambang metode | Peraturan LKPP 12/2019 hanyalah **pedoman bagi bupati/wali kota menyusun Perbup** (Pasal 4 ayat 3-4). Ambang nilai antar-metode bukan angka nasional: Pasal 10 ayat 2 huruf c menyerahkannya pada ambang "yang ditetapkan Musrenbangdes", dan Lampiran I hanya memuat **contoh** jenjang (10 juta / 200 juta) yang disebut "dapat ditetapkan berbeda oleh Bupati/Walikota". |
| "Permendagri 114/2014 Pasal 39, 42" mengatur kerja sama | Pasal 39 dan 42 hanyalah tempat **hasil** kesepakatan kerja sama menjadi pedoman rancangan RKP Desa dan RAB kerja sama antar-Desa disepakati para kepala desa. Tata cara kerja samanya ada di **Permendagri 96/2017** (BN 2017/1444), yang kini menjadi dasar modul. |

## Sumber hukum
| Sumber | Status | Dipakai untuk |
|---|---|---|
| Peraturan LKPP 12/2019 Pasal 4-6, 8-11, 13-14 (batang tubuh) | **[V]** dibaca dari PDF peraturan.go.id | swakelola diutamakan; peran Kepala Desa/Kasi-Kaur/TPK; TPK minimal 3 orang gasal (ketua, sekretaris, anggota; unsur perangkat, lembaga, masyarakat); Kaur Keuangan bukan pengelola; Kasi/Kaur dilarang menandatangani perjanjian bila anggaran belum/tidak cukup |
| Peraturan LKPP 12/2019 Lampiran I Bab I-IV dan Lampiran II (contoh Perbup); halaman lampiran berupa gambar, dibaca lewat OCR (angka 10 juta dan 200 juta muncul konsisten di Lampiran I dan di contoh Perbup Lampiran II; nomor ayat/huruf rujukan lampiran sebaiknya dicek ulang ke PDF sebelum dikutip resmi) | **[V]** | HPS/RAB dan syarat tidak melebihi pagu; pembelian langsung / permintaan penawaran (min. 2 penyedia atau alasan satu penyedia) / lelang; negosiasi bila satu penyedia lulus atau harga terendah kembar (BA Hasil Negosiasi); pemenang = harga terendah; surat perjanjian/bukti transaksi; BAST swakelola dan penyedia; pengumuman hasil; BA penyerahan ke Kepala Desa. **Jenjang 10 juta / 200 juta = contoh** |
| Permendagri 20/2018 Pasal 52-55 | **[V]** (dibaca pada fase sebelumnya; Pasal 52, 54, 55 dibaca ulang dari teks di scratchpad) | SPP penyedia diajukan setelah barang/jasa diterima dengan bukti penerimaan (Pasal 55); panjar swakelola (Pasal 54) |
| Perbup pengadaan barang/jasa desa kabupaten Anda | **[R]** belum dibaca | ambang, metode, tata cara yang mengikat desa: diisi desa sendiri |
| Permendagri 96/2017 Pasal 1-26 | **[V]** | seluruh modul kerja sama |
| Permendagri 114/2014 Pasal 39, 41, 42 | **[V]** | hasil kerja sama menjadi pedoman RKP Desa; RAB bersama disepakati para kepala desa |
| Lampiran Permendesa PDT 16/2025 BAB III (Penutup) | **[V]** | nomor pengaduan Dana Desa |
| Permendesa PDT 16/2025 Pasal 8 ayat 2-3 | **[V]** | fokus Dana Desa diutamakan berdasarkan rekomendasi Indeks Desa, dibahas di Musdes Penyusunan RKP Desa |
| Berkas IDM per desa dari portal data Sumbawa Barat (XLSX, per 31 Des 2025) | **[V]** (diunduh dan dibaca; ini salinan daerah, bukan sumber Kemendesa) | struktur kolom: No, Kode/Nama Kabupaten, Kode/Nama Kecamatan, Kode Desa, Nama Desa/Kelurahan, IKS, IKE, IKL, NILAI IDM, STATUS IDM; ada judul 4 baris, baris header, baris nomor kolom negatif |
| Rumusan indikator IDM dari idm.kemendesa.go.id; Permendesa PDTT 2/2016 (definisi, skala, ambang status) | **[R]** tidak diverifikasi | server resmi tak terjangkau dari lingkungan pengembangan (sertifikat kedaluwarsa); tidak ditanam apa pun |

## 1. Pengadaan barang/jasa (`/pengadaan`)
**Dibangun.** Paket per kegiatan APB Desa (kode kegiatan dan rekening belanja dari `lib/apbdes/catalog`, divalidasi), cara (swakelola / penyedia) dan metode, HPS atau RAB pengadaan, Kasi/Kaur pelaksana, rencana waktu; tim TPK; penawaran penyedia (lulus evaluasi, harga negosiasi, penyedia terpilih); berita acara negosiasi; SPK/bukti transaksi; BAST; tanggal pengumuman perencanaan/hasil dan penyerahan kepada Kepala Desa; status bergerbang; cetak SK TPK, BA negosiasi, SPK, BAST (gaya cetak peramban, `/pengadaan/cetak`); tautan baca-saja ke SPP dan panjar.

**Status bergerbang** (server menolak dengan semua alasan sekaligus, 409): Persiapan, Pemilihan penyedia (hanya penyedia), Pelaksanaan, Selesai (BAST), Dibatalkan (butuh alasan).
- Persiapan ke Pemilihan: HPS, metode; TPK sah kecuali pembelian langsung.
- Menuju Pelaksanaan: nama Kasi/Kaur; swakelola: TPK sah; penyedia: jumlah penawaran (permintaan penawaran minimal 2 atau alasan satu penyedia), penyedia terpilih lulus dan berharga terendah, BA negosiasi bila wajib, nomor/tanggal/nilai SPK, tanggal SPK tidak sebelum BA negosiasi, TPK sah (kecuali pembelian langsung).
- **Anggaran** (Pasal 10 ayat 3; Lampiran Bab II): bila ada APB Desa **ditetapkan**, nilai tidak boleh melebihi sisa anggaran kegiatan (pagu belanja kegiatan dikurangi nilai paket lain yang sudah berjalan/selesai) dan kegiatan harus punya anggaran. Tanpa APB Desa ditetapkan: hanya peringatan (data anggaran mungkin di luar Klandesa).
- Menuju Selesai: nomor/tanggal BAST, penyerah, penerima; tanggal BAST tidak sebelum SPK; progres otomatis 100%.
- Paket Selesai/Dibatalkan terkunci kecuali tanggal pengumuman/penyerahan; hapus hanya Persiapan/Dibatalkan.

**Peringatan (tidak memblokir):** melewati ambang metode milik desa; SK TPK belum bernomor; Kaur Keuangan sebagai pengelola; kontrak berbeda dari harga penyedia atau di atas HPS; perencanaan/hasil belum diumumkan; tidak ada anggaran; unsur TPK kurang.

**Ambang metode:** tabel `procurement_settings`, diisi desa (dan dasar, mis. nomor Perbup). Kosong = aplikasi tidak menyarankan metode. Tombol "Pakai contoh ini" mengisi 10 juta / 200 juta dengan penjelasan bahwa itu contoh lampiran.

**Tautan SPP (baca-saja, `lib/apbdes/spp.ts` tidak disentuh).** Paket menampilkan SPP pada (desa, tahun, kegiatan) beserta status, bukti penerimaan, panjar. Peringatan informasi: SPP disetujui/dibayar sebelum BAST (Pasal 55), SPP penyedia tanpa bukti penerimaan, total SPP melebihi nilai paket. Halaman daftar memuat "Pembayaran tanpa paket pengadaan": kegiatan yang punya SPP biasa (bukan BLT/PKTD/KDMP, bukan ditolak) tetapi tanpa paket aktif. Tidak ada jalur baru ke buku kas atau SPP: alur SPP yang ada tetap satu-satunya.

**Data & izin.** Tabel `procurement_settings`, `procurement_packages`, `procurement_team_members`, `procurement_offers` (uang BigInt sen; CHECK pada HPS > 0, progres 0-100, harga > 0, negosiasi <= penawaran). Resource izin `apbdes` (Kepala Desa hanya membaca; operator, sekretaris menulis). Tidak ada data pribadi warga (nama anggota TPK/penyedia saja). Setiap tulisan ber-`auditWeb` dengan nilai sebelum/sesudah.

**Kunci/konkurensi.** Semua tulisan: `SELECT … FOR UPDATE` pada baris `procurement_settings` desa sebagai pernyataan pertama transaksi. Menjamin nomor paket unik berurutan, satu ketua/sekretaris, dan anggaran kegiatan tidak terpakai ganda oleh dua paket yang berjalan serentak.

## 2. Kerja sama desa (`/kerja-sama`)
**Dibangun.** Kerja sama antar-Desa atau dengan pihak ketiga (prakarsa Desa atau pihak ketiga); para pihak (Desa ini dibuat otomatis, penandatangan per pihak); delapan muatan minimal (ruang lingkup, bidang, tata cara, jangka waktu, hak dan kewajiban, pendanaan, perubahan/penundaan/pembatalan, penyelesaian perselisihan: Pasal 6); RAB bersama (baris, pihak penanggung, total, beban Desa ini); tautan ke dua Musyawarah Desa (pembahasan bidang/potensi dan pembahasan penawaran) dari modul Musdes; konfirmasi tercantum di RPJM/RKP Desa; konsultasi ke bupati melalui camat; penandatanganan; pelaporan; berakhir dengan sebab Pasal 17; cetak Surat Penawaran dan Berita Acara Kesepakatan.
**Gerbang:** Penawaran (antar-Desa/prakarsa Desa) butuh Musdes terlaksana + konfirmasi RPJM/RKP + delapan muatan lengkap (antar-Desa); Penyusunan butuh para pihak, Musdes penawaran terlaksana dengan hasil "menyepakati" dan jawaban tertulis (antar-Desa); **Penandatanganan butuh izin `approve` (Kepala Desa/admin)**, muatan lengkap, penandatangan tiap pihak, tanggal kesepakatan, konsultasi ke camat bila ditandai atau ada beban APB Desa (Pasal 13 ayat 4 huruf c), nomor dan tanggal; setelah itu isi, pihak, dan RAB terkunci (perubahan = perjanjian baru yang menggantikan, Pasal 17 huruf e); batal hanya sebelum ditandatangani. Peringatan: tanda tangan lebih dari 7 hari kerja setelah kesepakatan, masa berlaku lewat, laporan belum dicatat, hasil uang masuk rekening kas desa.
**Musdes** dipakai sebagai primitif yang ada: tautan memakai id (`prepMusdesId`, `offerMusdesId`) **tanpa kunci asing** agar tidak mengubah model `VillageMeeting`; servis memeriksa musyawarah milik desa itu, bukan jenis BLT, tidak dibatalkan. Status musyawarah dibaca langsung saat menilai gerbang.
**Data & izin.** `village_agreements`, `village_agreements_parties`, `village_agreements_budget_items` (CHECK jumlah RAB > 0). Resource `perencanaan` (staf membuat/mengubah; penandatanganan lewat pola rute `/api/kerja-sama/{id}/penandatanganan` = approve). Kunci: `FOR UPDATE` pada baris kerja sama.

## 3. Kartu "Pengaduan Dana Desa ke Kemendesa"
`app/(app)/dana-desa/_components/PengaduanCard.tsx`, dipasang dengan dua baris di `SummaryTab.tsx` (impor dan `<PengaduanCard />` di akhir). Nomor dibaca dari teks resmi Lampiran Permendesa PDT 16/2025 BAB III: telepon **1500040**, SMS **081288990040**, WhatsApp **087788990040** (plus situs kemendesa.go.id dan sipemandu.kemendesa.go.id). Tautan `tel:`, `sms:`, `https://wa.me/6287788990040`.

## 4. Impor IDM (`/idm`)
**Dibangun.** Wizard impor yang membaca berkas **di peramban** (XLSX lewat pembaca yang sama dengan impor warga, CSV dengan pembaca sendiri karena SheetJS membaca "0,7563" sebagai 7563): pilih berkas, deteksi baris judul dan tata letak, pemetaan kolom yang dapat diubah, tahun data (diambil dari judul "IKS 2024" atau nama berkas bila ada), pemilihan baris desa (cocok lewat kode IDM di pengaturan desa, lalu nama tanpa awalan Desa/Kelurahan, lalu kecamatan; atau cari manual), pratinjau; server hanya menerima baris terpilih. Dua tata letak: **satu baris per desa** (IKS, IKE, IKL, nilai IDM, status) dan **satu baris per indikator** (dimensi, kode, indikator, skor, skor maksimal, keterangan, kegiatan). Disimpan per desa-tahun (`idm_scores`, `idm_indicators`); impor ulang menggantikan. Tampilan: kartu skor, perubahan dari tahun sebelumnya (dengan peringatan beda skala), tren antar tahun, **rekomendasi fokus**: dimensi terlemah, lima indikator terendah (rasio skor/skor maksimal bila semua punya maksimal; selain itu skor mentah dengan keterangan), tiga terendah per dimensi, teks "kegiatan yang dapat dilakukan" dari berkas bila ada, tautan ke Musdes/RKP Desa/Dana Desa dengan rujukan Permendesa 16/2025 Pasal 8. Hapus per tahun.
**Prinsip kejujuran:** skor disimpan apa adanya. Berkas publik yang diverifikasi (Sumbawa Barat) berisi jumlah poin (mis. IKS 53, IKE 113, IKL 62, nilai 228), bukan 0-1: skala berbeda antar sumber, jadi tidak ada validasi skala 0-1, tidak ada perhitungan ulang status, dan tren dengan skala berbeda diberi peringatan.
**Data & izin.** `idm_scores`, `idm_indicators` (CHECK skor >= 0). Resource `perencanaan` (impor = create, hapus = delete: staf tidak dapat menghapus). Kunci: baris `idm_scores` (desa, tahun) dibuat kosong dulu lalu `FOR UPDATE` sebagai pernyataan pertama.

## Tinjauan keamanan independen dan perbaikannya
| Temuan | Perbaikan |
|---|---|
| TINGGI: id ter-encode (`/api/kerja-sama/%31%32/penandatanganan`) dapat jatuh ke awalan `perencanaan:create` sehingga gerbang `approve` terlewati | Rute `penandatanganan` kini mengecek `permissions(ctx,"perencanaan").approve` sendiri sebelum memanggil servis, dan servis `sign` mewajibkan `canApprove === true` (403 bila tidak). Hal yang sama untuk rute pengadaan yang butuh izin lebih tinggi dari create: menetapkan penyedia terpilih (`approve`, di rute dan servis) dan memulai pelaksanaan (`approve`; peta rute memberi gerbang `read`, rute memeriksa `update` untuk tahap lain). Pola peta rute khusus modul ditambahkan; `resolveApiPermission` tidak disentuh. Tes membaca berkas rute dan memanggil servis tanpa izin |
| SEDANG: nilai kontrak dapat dinaikkan setelah pelaksanaan tanpa pagar anggaran | Nomor, tanggal, nilai SPK dan catatan negosiasi **terkunci** setelah PELAKSANAAN (hanya tanggal mulai/selesai kontrak boleh diisi); peringatan OVER_BUDGET kini juga tampil pada pelaksanaan/selesai. Perubahan nilai = batalkan dan buat paket baru |
| SEDANG: penjaga enum `v in OBJ` meloloskan `constructor`, `__proto__`, `toString` | Semua diganti `Object.hasOwn` (katalog tiga modul, `to in STATUS` di dua servis, pilihan dokumen cetak). Tes untuk tiap enum, dan integrasi: `layout:"constructor"` tidak lagi menghapus indikator, `kind:"constructor"` ditolak 400. Nilai terlalu panjang untuk kolom ditolak per kolom (tes untuk tiap kolom teks) |
| RENDAH: nama penandatangan pihak dapat diubah setelah ditandatangani; audit tanpa nilai lama/baru | Nama pihak dan penandatangan **terkunci** setelah ditandatangani/berakhir/batal; audit pengubahan pihak memuat nilai sebelum/sesudah |
| RENDAH: pemisahan tugas hanya peringatan regex | Menuju pelaksanaan kini diblokir bila jabatan Kasi/Kaur kosong (tidak dapat dihilangkan dengan mengosongkan jabatan), memuat "keuangan" (Pasal 10 ayat 4), nama pelaksana sama dengan anggota TPK, atau penyedia terpilih sama dengan anggota TPK/pelaksana (pertentangan kepentingan, Pasal 3 huruf e); menetapkan penyedia juga menolak yang sama dengan anggota TPK/pelaksana; keduanya butuh `approve` (Kepala Desa/admin). Pencocokan nama tak peka huruf besar dan spasi, namun hanya berbasis teks nama: orang yang sama dengan ejaan berbeda lolos |
| RENDAH: `xlsx` 0.18.5 rentan CVE-2023-30533 (prototype pollution) dan CVE-2024-22363 (ReDoS) | Dependensi tidak diganti (dipakai juga impor warga). Jalur XLSX impor IDM kini memakai pembaca terbatas (`lib/idm/read-xlsx.ts`): `sheetRows` membatasi baris yang diurai (100.000, lebih dari itu ditolak), kolom 200, lembar 10, berkas 20 MB. **Batas jujur:** pembatasan hanya mengurangi dampak, bukan menutup kerentanan; impor hanya berkas dari sumber tepercaya dan perbarui `xlsx` (SheetJS >= 0.20.2 dari CDN resmi atau pengganti) pada kesempatan pemutakhiran dependensi |

Dampak operasional: **operator/sekretaris tidak lagi dapat menetapkan penyedia terpilih atau memulai pelaksanaan**; itu dilakukan Kepala Desa atau admin (izin `approve`). Pemisahan peran yang lebih halus (mis. Kasi/Kaur vs. Kaur Keuangan sebagai peran terpisah) tetap keputusan pemilik.

## Titik pemasangan bersama yang diubah
`prisma/schema.prisma` (9 model di atas `// >>> models:pengadaan`, 5 relasi balik di atas `// >>> back-relations:pengadaan`), `lib/modules/registry.ts` (3 entri: pengadaan, kerja-sama, idm), `lib/permissions/api-route-map.ts` (3 awalan + 3 pola: `penandatanganan`, `pemenang`, `status` pengadaan), `SummaryTab.tsx` (2 baris). Komponen bersama baru: `components/app/FindingList.tsx`, `components/app/PatchFieldsDialog.tsx`.

## SQL
`PHASE3_PENGADAAN_MIGRATION.sql` (9 CREATE TABLE, 10 FK, 7 CHECK; aditif) dan `PHASE3_PENGADAAN_ROLLBACK.sql` (9 DROP TABLE). Dilatih pada `klandesa_pengadaan_scratch2` yang dibuat dari snapshot skema sebelum Paket 3: terapkan, rollback (tabel hilang bersih), terapkan lagi; `prisma migrate diff` dari DB itu ke skema: **0 selisih** pada sembilan tabel saya (selisih lain milik agen lain). CHECK terbukti menolak HPS 0 dan progres 101 pada MySQL. **Produksi belum.**

## Pengujian
| Berkas | Jumlah | Isi |
|---|---|---|
| `tests/pengadaan.test.ts` | 27 | TPK, pemenang/negosiasi, setiap pagar status, anggaran, ambang metode, temuan SPP, validasi masukan jahat, izin rute |
| `tests/pengadaan.integration.test.ts` | 15 (MySQL) | alur penuh, negosiasi/pembelian langsung, swakelola, anggaran, **kunci** (anggaran serentak, nomor unik serentak, satu ketua serentak), isolasi lintas desa, SPP baca-saja (SPP tak berubah), ambang, batas berpindah, masukan jahat |
| `tests/pengadaan-render.test.tsx` | 3 | kartu pengaduan (nomor, tautan, rel aman), daftar temuan |
| `tests/kerja-sama.test.ts` | 16 | pagar, hari kerja, temuan, validasi, izin (penandatanganan = approve) |
| `tests/kerja-sama.integration.test.ts` | 9 (MySQL) | alur antar-Desa penuh dan pihak ketiga, tautan Musdes (desa lain/BLT/batal ditolak), isolasi, RAB/pihak, **kunci** (penandatanganan serentak sekali, pihak kembar serentak), jahat |
| `tests/idm.test.ts` | 17 | angka koma/titik, CSV titik koma, struktur berkas publik (judul, baris nomor negatif, kelurahan tanpa skor), pencocokan desa, kolom bertahun, indikator, rekomendasi, validasi server, izin |
| `tests/idm.integration.test.ts` | 6 (MySQL) | skor apa adanya (skala poin), penggantian, rekomendasi, isolasi, **impor serentak**, jahat |

**Uji mutasi** (cabut `FOR UPDATE`, jalankan 3 kali, tes harus gagal): pengadaan 3 tes gagal dari 3 (anggaran serentak, nomor unik, satu ketua) pada 3/3 putaran; kerja sama 1 tes gagal (penandatanganan serentak + pihak kembar) pada 3/3 putaran; IDM 1 tes gagal (impor serentak) pada 3/3 putaran. Kode dipulihkan setelah tiap mutasi. Tes tambahan yang lolos: `tests/module-routes.test.ts`, `tests/api-guard-coverage.test.ts`, `tests/perencanaan-permissions.test.ts`, `tests/select-render.test.tsx`.

## Batas yang jujur
- **Uji browser sungguhan tidak dilakukan** (halaman daftar, detail, dialog, cetak, wizard IDM hanya diperiksa tsc, eslint, dan tes render ringan). Wizard IDM belum dicoba dengan berkas XLSX 20 MB atau ratusan ribu baris; pembacaan sinkron dapat membekukan tab sesaat.
- Ambang metode **tidak ditanam**; contoh lampiran hanya tombol pengisi awal. Perbup kabupaten belum dibaca, sehingga pagar yang berasal dari **pedoman** (TPK 3 orang gasal, dua penawaran, BA negosiasi) bisa lebih ketat atau lebih longgar dari Perbup kabupaten Anda. Sunting katalog bila Perbup berbeda.
- Teks dokumen cetak (SK TPK, SPK, BAST, surat penawaran, BA kesepakatan) adalah **templat awal**, bukan format baku; Peraturan LKPP 12/2019 hanya berlampiran I (pedoman) dan II (contoh Perbup); tidak ada formulir dokumen resmi di dalamnya.
- Honorarium TPK, pajak pengadaan, jaminan, denda keterlambatan, keadaan kahar, pemutusan kontrak, dan perubahan SPK (Lampiran I Bab III.B.5, Pasal 26-30 contoh Perbup) **tidak dimodelkan**. Pembelian langsung ke penyedia yang sama lebih dari dua tahun anggaran tidak dideteksi.
- Pengadaan tidak menembus SPP: tidak ada tombol "ajukan SPP dari paket"; hubungan paket-SPP hanya lewat kegiatan yang sama, sehingga bila satu kegiatan punya beberapa paket, SPP tidak dapat dipetakan ke paket tertentu.
- Anggaran dibaca dari APB Desa ditetapkan versi terbaru (termasuk perubahan); DPA/DPPA dan rincian objek belanja per rekening tidak dibandingkan (hanya total belanja per kegiatan).
- Kerja sama: bagian "musyawarah antar-desa" (Pasal 3 ayat 3) dicatat sebagai Musdes desa ini; berita acara Musdes desa mitra tidak dilacak. Tidak ada BKAD (badan kerja sama antar-Desa) sebagai entitas. Laporan ke bupati tidak otomatis masuk Laporan Penyelenggaraan Pemerintahan Desa (hanya dicatat tanggalnya). Hasil uang kerja sama tidak otomatis menjadi pencatatan pendapatan di Buku Kas (hanya diingatkan).
- IDM: tidak ada unduhan otomatis dari Kemendesa (server resmi tak terverifikasi); format "rumusan" per indikator dan definisi resmi indikator **[R]**. Rekomendasi hanyalah peringkat angka dalam satu berkas (bukan metodologi IDM resmi) dan bergantung pada keterisian skor maksimal. Berkas multi-sheet memakai lembar terbesar (dapat dipilih). Berkas lebar multi-tahun (satu desa, kolom per tahun) belum dipisah otomatis menjadi beberapa tahun: diimpor per tahun lewat pemetaan kolom bertahun.
- Kartu pengaduan memuat nomor sesuai teks Permendesa 16/2025 (TA 2026); nomor dapat berubah pada aturan tahun berikutnya.
- Tidak ada ekspor CSV format Siskeudes/OM-SPAN, tidak ada notifikasi kalender, dan tidak ada integrasi mobile.

## Keputusan yang menunggu pemilik
1. **Ambang metode** Karanganyar (Perbup tentang pengadaan barang/jasa di desa): kirim salinannya agar katalog pagar (TPK, jumlah penawaran) disesuaikan, dan agar dapat diisikan sebagai nilai awal.
2. Apakah **anggaran tidak tersedia** sebaiknya hanya peringatan (default sekarang memblokir bila ada APB Desa ditetapkan tetapi kegiatan tanpa anggaran/terlampaui, mengikuti Pasal 10 ayat 3)?
3. Resource izin: pengadaan memakai `apbdes` (Kaur Keuangan sebagai operator dapat menulis; padahal Kaur Keuangan dilarang jadi pengelola pengadaan: perlu peran terpisah? Penetapan penyedia dan mulai pelaksanaan kini hanya `approve`).
4. Format dokumen resmi kabupaten untuk SK TPK, SPK, BAST (agar templat cetak diganti).
5. Apakah **kerja sama dengan pihak ketiga yang menyangkut APB Desa** perlu juga membuka tautan ke modul BUMDes/aset (hasil uang, aset hasil kerja sama)?
6. Sumber IDM: dari mana Dinas PMD Karanganyar mendapatkan berkas IDM tahunan (contoh berkas diperlukan untuk memverifikasi tata letak per indikator).
