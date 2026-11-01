# Paket 3 — BUMDes inti

Dikerjakan 2026-11-01 sesuai `docs/PLAN_CELAH_FUNGSI.md` P3 (bagian BUMDes inti). Belum di-commit dan belum di-deploy. UKM pesanan dan tanah kas/sewa bukan bagian dokumen ini.

## Yang dibangun (`/bumdes`, dibangun di atas modul yang sudah ada)
Halaman lama (unit + transaksi tambah-saja) diganti satu halaman bertab; profil, unit, aset, dan API lama tetap.

| Tab | Isi |
|---|---|
| Kas dan unit | Ringkasan kas, unit usaha, transaksi kas. **Ubah** (alasan wajib) dan **batalkan** (alasan wajib) transaksi: baris tidak dihapus, isi sebelum/sesudah masuk riwayat (`bumdes_transaction_revisions`, tak pernah diubah), transaksi dibatalkan tetap tampil dengan alasannya dan tak masuk ringkasan. Transaksi lama (sebelum paket ini) ditandai "belum berjurnal" dan dapat dijurnal sekali tekan (akun bawaan; dapat diperbaiki lewat Ubah). |
| Jurnal | Buku jurnal berpasangan (filter unit/status/sumber/tanggal, paginasi). Jurnal manual (saldo awal, piutang, penyusutan, pindahan pusat-unit) dengan penghitung selisih langsung; **koreksi** = jurnal lama dibatalkan dan diganti jurnal baru tertaut `correctsId`; **batal** beralasan. Jurnal turunan kas/arus APB Desa hanya dikoreksi lewat sumbernya. |
| Laporan | Neraca (posisi keuangan) dan laba rugi per **unit usaha, Kantor Pusat, dan gabungan**; semester I, semester II, tahunan; cetak dan unduh CSV (sel berawalan rumus dinetralkan). Temuan: transaksi belum berjurnal, neraca tak seimbang, akun RK tak saling meniadakan. |
| Periode | Penutupan per semester (mengikuti pola Buku Kas Umum): berurutan, hanya setelah periode berakhir, butuh semua transaksi kas berjurnal dan neraca seimbang; periode tertutup menolak semua tulisan bertanggal di dalamnya; **buka kembali dengan alasan**, tercatat di log; angka laba dan total aset saat ditutup disimpan. Pengingat Musyawarah Desa tahunan (6 bulan setelah tahun buku). |
| Legalitas | Status badan hukum, Musyawarah Desa pendirian (tautan P0), Perdes pendirian, ART, persetujuan nama, sertifikat, NIB (13 angka), NPWP (15/16 angka), bidang usaha, modal awal, peringkat terakhir; pengurus/organ dengan SK dan masa jabatan 5 tahun; daftar kelengkapan dokumen pendaftaran; **lembar cetak** `/bumdes/cetak` untuk mengisi Sistem Informasi Desa. |
| Dana Desa | **Keputusan Musyawarah Desa** (plafon), lalu **penyertaan modal Desa** dan **bagi hasil ke Desa** yang bersandar padanya, bertaut APB Desa (lihat di bawah). |

## Cara kerja akuntansi
- Bagan akun = salinan sebagian dari bagan resmi Kepmendes PDTT 136/2022 (kode X.X.XX.XX, golongan 1-7, 145 akun) di `lib/bumdes/catalog.ts`. Akun kontra (penyisihan, akumulasi penyusutan, diskon penjualan) dan pengambilan oleh pemilik (3.2.x) bersaldo normal berlawanan.
- **Jurnal berpasangan:** tiap jurnal berentitas tunggal (unit usaha atau Kantor Pusat), debit = kredit. Dipaksa tiga lapis: pemeriksaan murni `checkLines` sebelum menulis; header menyimpan `totalDebitCents` dan `totalCreditCents` yang dihitung dari baris dalam transaksi yang sama; CHECK MySQL pada header (`debit = kredit > 0`) dan pada baris (satu sisi positif). Kesamaan jumlah baris dengan total header tidak dapat dijaga CHECK (lintas baris), hanya oleh servis dalam satu transaksi dan oleh tes.
- Transaksi kas otomatis menjadi jurnal (pemasukan: debit kas, kredit akun pendapatan; pengeluaran: sebaliknya). Akun lawan dan akun kas dipilih operator (bawaan: 4.1.05.99 / 6.2.99.99 dan 1.1.01.01).
- **Laporan** dihitung dari jurnal aktif lewat satu kueri agregat per (unit, akun). Neraca = kumulatif sampai akhir periode; laba (rugi) tahun-tahun lalu dan tahun berjalan dihitung dari akun nominal (tanpa jurnal penutup tahunan) sehingga aset = kewajiban + ekuitas + laba selalu berlaku bila tiap jurnal seimbang. **Gabungan** menjumlahkan akun yang sama di seluruh entitas dan menyembunyikan akun resiprokal RK Unit Usaha (1.1.99.01) dan RK Pusat (3.8.01.01); sisa yang tak saling meniadakan dilaporkan dan membuat neraca gabungan ditandai tidak seimbang.
- Nomor bukti: `No.urut/bulan/kode unit/tahun` (mis. `0007/03/U42/2026`; kantor pusat `PUSAT`), urut per tahun per BUMDes dan dijamin unik oleh DB.

## Hubungan APB Desa (tab Dana Desa)
- **Penyertaan modal Desa:** pengeluaran pembiayaan **6.2.2.01** di Buku Kas Umum; wajib ada di anggaran APB Desa/perubahan yang berlaku (aturan buku kas yang sama: belanja melebihi anggaran, saldo minus, dan bulan BKU tertutup ditolak). Jurnal BUM Desa: debit kas, kredit 3.1.01.01 Penyertaan Modal Desa. Peringatan bila disalurkan lebih dari 3 bulan sesudah keputusan Musyawarah Desa. Hanya penyertaan berupa **uang** yang dibangun.
- **Bagi hasil usaha:** pendapatan **4.1.1.01 Bagi Hasil BUMDes** di Buku Kas Umum. Jurnal BUM Desa: debit 3.2.01.01 Bagi Hasil Penyertaan Modal Desa, kredit kas. Ditolak bila melebihi laba bersih tahun buku atau saldo kas (lihat di bawah).
- **Wajib bersandar pada keputusan Musyawarah Desa** (`bumdes_musdes_resolutions`): Musyawarah Desa milik desa yang sama, berberita acara **final**, berjenis **`MUSDES_BUMDES`** ("Musyawarah Desa tentang BUM Desa", jenis baru yang ditambahkan aditif ke katalog Musyawarah Desa; jenis lain ditolak), dan **butir keputusan** (`village_meeting_decisions`) yang dipilih ada di berita acara itu. Keputusan memuat **jumlah yang diputuskan** (plafon). Setiap arus bersandar pada satu keputusan; jumlah **kumulatif** arus aktif tidak boleh melebihi plafon, satu butir hanya satu keputusan per jenis, dan keputusan baru dapat dibatalkan hanya bila tak ada arus aktif bersandar padanya. Tanggal arus tak boleh mendahului Musyawarah Desa; bila Musyawarah itu kemudian tak lagi final atau jenisnya berubah, arus baru ditolak. Plafon bersifat isian operator (model keputusan Musyawarah Desa tak punya kolom jumlah); yang dijaga adalah kesesuaian arus dengan angka yang dicatat di sini.
- **Bagi hasil ditolak** (bukan sekadar diperingatkan) bila total bagi hasil tahun buku itu melebihi **laba bersih menurut pembukuan** tahun buku tersebut, atau bila jumlahnya melebihi **saldo akun kas** yang dipilih pada Kantor Pusat sampai tanggal penerimaan. Tahun buku diambil dari keputusan, bukan isian arus. Akibatnya, bagi hasil menuntut pembukuan yang lengkap (jurnal tahun buku itu) lebih dulu.
- Catatan BKU yang dihasilkan arus **tertaut**: `updateEntry` dan `deleteEntry`/`deleteEntryInTx` di `lib/apbdes/service.ts` menolaknya (409, "ubah lewat menu BUMDes") selama arusnya aktif, seperti `LINKED_MSG` untuk SPP/panjar; hanya pembatalan arus (`viaBumdes`) yang boleh menghapusnya. Perubahan di lib/apbdes/service.ts: satu fungsi bantu dan tiga baris pemeriksaan, tanpa kolom baru pada tabel APB Desa.
- Catatan BKU dibuat **hanya** lewat `createEntryInTx` dan dihapus **hanya** lewat `deleteEntryInTx` (tes statis menjaga tak ada penulisan langsung ke `apbdes_entries`). Satu transaksi basis data memuat catatan BKU, jurnal, dan baris arus: bila salah satu ditolak, tak ada yang tertulis.
- Mengapa tidak lewat SPP: SPP di aplikasi ini khusus belanja berkegiatan (swakelola/penyedia); penyertaan modal adalah pengeluaran pembiayaan tanpa kegiatan dan memang dicatat langsung di BKU pada modul APB Desa yang ada (formulir BKU menerima rekening 6.2.x). Ini bukan jalan pintas di sekeliling SPP belanja.
- Pembatalan arus menghapus catatan BKU-nya lewat fungsi buku kas (ditolak bila bulan BKU ditutup) dan membatalkan jurnalnya. Tabel arus tidak memiliki kunci asing ke `apbdes_entries` (model milik modul lain tidak diubah); perubahan langsung ke basis data (di luar aplikasi) tetap terdeteksi di daftar arus ("berbeda"/"hilang") dan pembatalan menolak bila catatan sudah berbeda.

## Data dan izin
SQL aditif `docs/PHASE3_BUMDES_MIGRATION.sql`: 9 tabel (`bumdes_transaction_revisions`, `bumdes_journals`, `bumdes_journal_lines`, `bumdes_period_closes`, `bumdes_period_logs`, `bumdes_legal_profiles`, `bumdes_officers`, `bumdes_village_flows`, `bumdes_musdes_resolutions`), 7 kolom + 1 indeks pada `bumdes_transactions`, 16 CHECK. Rollback `PHASE3_BUMDES_ROLLBACK.sql` (membuang jurnal, riwayat, periode, legalitas, arus; transaksi kas, unit, aset, dan catatan BKU tidak tersentuh). Tak ada perubahan pada data lama.
Izin dihitung dari **peran di database** (`ctx.dbUser.role`), bukan klaim JWT sesi, sehingga admin yang diturunkan kehilangan akses tulis seketika (berlaku juga untuk rute lama `/api/bumdes`, `units`, `summary`). **Baca** = admin, Kepala Desa, sekretaris, staf (aturan lama modul); **kelola** (transaksi, jurnal, koreksi, tutup/buka periode, legalitas, pengurus) = admin dan Kepala Desa (aturan lama `canManageBumdes`, dipertahankan); **catat/batalkan arus APB Desa** butuh kelola BUMDes **dan** izin `apbdes` create/delete (praktis admin); mencatat/membatalkan **keputusan** Musyawarah Desa hanya butuh kelola BUMDes. `/api/bumdes` termasuk awalan yang dikecualikan dari peta izin pusat, jadi semua rute baru memanggil `requireVillageApiContext` lalu `bumdesScope()` (baca modul, langganan aktif, BUMDes milik desa sesi, izin kelola untuk tulis); `villageId` tak pernah dari body/query. Semua penulisan memakai `auditWeb`; NIB/NPWP tidak masuk detail audit.
Batas paket langganan lama (Starter: 2 unit, 50 transaksi) tetap berlaku untuk transaksi; jurnal **manual** dibatasi sama (50) bagi Starter. Batas keras: 20.000 jurnal/tahun, 40 baris/jurnal, 60 pengurus, 600 catatan arus.

## Kunci dan konkurensi
Setiap penulisan: `SELECT … FOR UPDATE` pada baris `bumdes` sebagai pernyataan pertama transaksi interaktif. Arus APB Desa lalu mengambil kunci tahun APB Desa (`apbdes_years`). **Urutan seragam: bumdes → apbdes_years**; tak ada alur yang berurutan terbalik. Uji mutasi (cabut kunci/penjaga → tes gagal), semuanya dijalankan:
1. `lockBumdes` dikosongkan → tes balapan nomor jurnal serentak gagal.
2. Hanya penutupan periode tanpa kunci (penulis tetap berkunci) → tes tutup-vs-catat gagal pada putaran pertama (angka saat ditutup 0 ≠ laporan 1.110).
3. `lockYear` dicabut dari `createFlow` → tes arus melawan pengeluaran BKU serentak gagal (dua-duanya lolos, saldo kas Desa minus).
4. `assertOpen` dicabut dari `createJournalInTx` → tes periode tertutup gagal.
5. `write: true` dicabut dari satu rute tulis → tes statis rute gagal.
6. Penjaga hasil tinjauan keamanan (masing-masing dicabut → tes gagal): jenis Musyawarah Desa, plafon kumulatif keputusan, penolakan bagi hasil di atas laba bersih, penolakan di atas saldo kas, penolakan ubah dan hapus catatan BKU tertaut (dua penjaga terpisah), rantai penutupan antar tahun, penolakan buka kembali lintas tahun, peran dari database (dikembalikan ke JWT), rekonsiliasi akun modal di laporan, dan penolakan akun khusus pada isian transaksi kas/jurnal.

## Pengujian
- `tests/bumdes.test.ts` (36): bagan akun, jurnal berpasangan, periode/nomor bukti, neraca/laba rugi/konsolidasi/eliminasi RK, **uji sifat** (400 jurnal acak seimbang → neraca seimbang pada S1/S2/tahunan), detektor ketidakseimbangan yang hidup, validasi isian (koersi ketat, tanggal, NIB/NPWP), izin, guard rute.
- `tests/bumdes-render.test.tsx` (4): komponen bersama.
- `tests/bumdes.integration.test.ts` (22, MySQL scratch; CHECK dipasang dari berkas migrasi): transaksi→jurnal, ubah berjejak, batal berjejak, pagar CHECK DB (jurnal tak seimbang, baris dua sisi, status liar, arus nol), jurnal manual/koreksi, neraca per unit dan gabungan (semester/tahun), transaksi lama tanpa jurnal, penutupan periode (semua jalur tulis ditolak, buka kembali beralasan, urutan, log), balapan, isolasi desa, legalitas/pengurus/tenggat, penyertaan modal (BKU + jurnal + atomik), bagi hasil, pembatalan arus (BKU ditutup/berubah/hilang), periode BUMDes tertutup menolak arus, tak ada penulisan langsung ke `apbdes_entries`.
- Regresi: `tests/apbdes*`, `apbdes-spp`, `apbdes-dppa`, `spp-funding*`, `laporan-desa.integration`, `musdes`, `api-guard-coverage` lolos setelah perubahan kecil di `lib/apbdes/service.ts` dan `lib/musdes/catalog.ts`. `kdmp.integration` hanya gagal pada tes CHECK DB karena DB scratch ini tidak memuat CHECK migrasi KDMP (bukan regresi).
- Latihan SQL (diulang setelah tinjauan keamanan, 9 tabel dan 16 CHECK): DB dari skema sebelum paket berisi satu transaksi lama → terapkan → data utuh (status AKTIF, revisi 0) dan selisih skema untuk tabel `bumdes_*` kosong → rollback → DB identik dengan skema asal (selisih kosong) → terapkan lagi → selisih kosong.
- **Tidak dijalankan:** peramban sungguhan (halaman baru belum pernah dibuka di Chrome; hanya `tsc`, `eslint`, dan tes render komponen).

## Sumber hukum (Langkah 0)
Teks resmi diunduh dari peraturan.bpk.go.id (PDF hasil pindai; teks OCR berderau, dibaca dan dicocokkan urutan pasalnya).

| Fakta | Sumber | Status |
|---|---|---|
| BUM Desa didirikan berdasarkan Musyawarah Desa, ditetapkan Perdes yang memuat pendirian, Anggaran Dasar, besar penyertaan modal | PP 11/2021 Pasal 7 ayat 1, 6 | [V] |
| Status badan hukum saat sertifikat pendaftaran elektronik terbit; pendaftaran lewat Sistem Informasi Desa | PP 11/2021 Pasal 8-9 | [V] |
| Isi minimal Anggaran Dasar; ART ditetapkan Peraturan Kepala Desa | PP 11/2021 Pasal 11 ayat 2, Pasal 13 ayat 3 | [V] |
| Organ: Musyawarah Desa, penasihat (Kepala Desa rangkap), pelaksana operasional, pengawas; sekretaris dan bendahara diangkat Musyawarah Desa | PP 11/2021 Pasal 15, 17 huruf e-g, 21 ayat 1 | [V] |
| Pelaksana operasional dan pengawas menjabat 5 tahun | PP 11/2021 Pasal 26 dan Pasal 30 (nomor Pasal 30 dibaca dari urutan; OCR menulis "Pasal-?O") | [V] |
| Musyawarah Desa tahunan paling lama 6 bulan setelah tahun buku; menetapkan pembagian laba bersih, penggunaan laba, prioritas bagian hasil untuk Desa, menerima laporan tahunan | PP 11/2021 Pasal 19 ayat 3, Pasal 17 huruf l, m, p, q | [V] |
| Penyertaan modal Desa bersumber dari APB Desa, ditetapkan Perdes; berupa uang dan/atau barang selain tanah dan bangunan; dibahas dan diputuskan Musyawarah Desa | PP 11/2021 Pasal 40 ayat 3, Pasal 41 ayat 2 dan 4 | [V] |
| Penyertaan modal disalurkan paling lambat 3 bulan sejak keputusan Musyawarah Desa; uang ditempatkan di rekening BUM Desa; barang dicatat di laporan keuangan | PP 11/2021 Pasal 43 | [V] (3 bulan hanya sebagai peringatan, bukan penolakan) |
| Laporan semesteran (posisi keuangan, laba rugi, penjelasan; kepada penasihat) dan tahunan (ditambah laporan gabungan unit usaha; kepada Musyawarah Desa setelah ditelaah) | PP 11/2021 Pasal 58 | [V] |
| Hasil usaha = pendapatan dikurangi biaya setahun buku; bagian Desa menjadi pendapatan Desa; Musyawarah Desa menyepakati prioritas penggunaan | PP 11/2021 Pasal 60 ayat 1-2, Pasal 59 ayat 2 | [V] |
| Pendaftaran nama sebelum Musyawarah Desa pendirian; persetujuan nama berlaku paling lama 40 hari kerja | Permendesa PDTT 3/2021 Pasal 2-7 | [V] |
| Pendaftaran paling lama 20 hari kerja sejak Perdes pendirian, bila lewat diulang dari pendaftaran nama; isi formulir dan dokumen pendukung (BA Musyawarah Desa, Perdes+AD, ART, rencana program kerja) | Permendesa PDTT 3/2021 Pasal 9 ayat 2-5, Pasal 10 | [V] |
| Pemeringkatan oleh Kementerian, Februari, level A (≥85) sampai D (<55) | Permendesa PDTT 3/2021 Pasal 22 | [V] (hanya dicatat apa adanya; tidak dihitung) |
| Bagan akun 4 tingkat X.X.XX.XX; periode akuntansi 1 Jan-31 Des; laporan lengkap semesteran dan tahunan (neraca, laba rugi, perubahan ekuitas, arus kas, CaLK); catat di kantor pusat dan unit lalu gabung; akun RK dieliminasi; tata buku berpasangan; penomoran bukti | Kepmendes PDTT 136/2022 Lampiran I Bab II A.3 dan A.8, Bab III, Bab V | [V] |
| Pengelolaan BUM Desa profesional; boleh bekerja sama dengan BUMN/BUMD/swasta/koperasi | UU 3/2024 (perubahan kedua UU Desa) angka 24, Pasal 87A | [V] (tidak mengubah fitur) |
| Kode APB Desa 6.2.2.01 Penyertaan Modal Desa dan 4.1.1.01 Bagi Hasil BUMDes | `lib/apbdes/codes.ts` (lampiran Permendagri 20/2018 yang sudah ada di aplikasi) | dari katalog aplikasi |
| Permendesa PDT 13/2025 (Pedoman Sistem Informasi Desa, berlaku 4 Des 2025) menggantikan ketentuan SID Permendesa 21/2020; dapat mengubah kanal pendaftaran/pelaporan BUM Desa | hasil pencarian, **teks belum dibaca** | [R] |
| Kepmendesa PDT 3/2025: sedikitnya 20% Dana Desa untuk ketahanan pangan, dapat berupa penyertaan modal BUM Desa; Permendesa 16/2025 menyebut pelaksana ketahanan pangan dapat BUM Desa | Permendesa 16/2025 Lampiran (bagian ketahanan pangan, dibaca di berkas Paket 2); angka 20% dari pencarian | [R] (angka 20% tak ditanam) |
| Tidak ditemukan peraturan 2025-2026 yang mengubah PP 11/2021 tentang laporan | pencarian web | [R] (ketiadaan tidak terbukti; cek JDIH sebelum rilis) |
| Format NPWP 16 digit | pengetahuan umum | [R] (validator menerima 15 atau 16 angka) |

Tidak dibaca: Lampiran format dokumen Permendesa PDTT 3/2021 (Lampiran I-III) dan contoh format laporan Kepmendes 136/2022 Bab VI (hanya struktur laporan yang diikuti, bukan tata letaknya).

## Tinjauan keamanan independen dan perbaikannya
| Temuan | Perbaikan |
|---|---|
| Sedang: akun 3.1.01.01 dan 3.2.01.01 bisa dijurnal manual lewat transaksi kas/jurnal sehingga melewati APB Desa dan Musyawarah Desa | Ditolak di tiga lapis: `parseCash`, `parseJournal`, dan `createJournalInTx` (pemeriksa `reservedAccountViolation` per sumber jurnal). Jalur khusus berlabel **jurnal pembukaan** (`SALDO_AWAL`, hanya Kantor Pusat, hanya akun modal 3.1.01.01) untuk modal Desa yang ada sebelum pencatatan; koreksi mempertahankan sumbernya. Laporan memuat **rekonsiliasi**: total 3.1.01.01 menurut jurnal arus harus sama dengan total arus penyertaan modal aktif (dan 3.2.01.01 dengan bagi hasil); jurnal bukan-arus pada akun itu = ERROR; saldo pembukaan = INFO. |
| Sedang: kontrol Musyawarah Desa formalitas (jenis rapat tak dicek, satu rapat dipakai berulang, bagi hasil melebihi laba hanya peringatan, kas tak dicek, BKU hasil arus bisa diubah dari menu APB Desa) | Jenis `MUSDES_BUMDES` (baru, aditif) wajib; keputusan bertaut butir keputusan dengan plafon kumulatif dan satu butir satu keputusan; bagi hasil **ditolak** di atas laba bersih tahun buku dan di atas saldo kas; catatan BKU hasil arus **tertaut** (ubah/hapus dari APB Desa ditolak; perubahan kecil di `lib/apbdes/service.ts`). |
| Rendah: penutupan periode tak berantai antar tahun | Tutup Semester I mewajibkan Semester II tahun sebelumnya tertutup bila tahun itu punya jurnal; buka kembali ditolak bila ada penutupan lebih akhir (lintas tahun). |
| Rendah: peran dari JWT | Semua pemeriksaan baca/kelola memakai `ctx.dbUser.role`. |
| (Butir 3) ringkasan Laras tak menyaring status | Di luar kewenangan paket; dicatat untuk pemilik berkas Laras. |

## BATAS YANG JUJUR
- **Bukan akuntansi penuh.** Tidak ada laporan perubahan ekuitas, arus kas, dan catatan atas laporan keuangan (Kepmendes 136/2022 mewajibkannya untuk laporan lengkap); tidak ada penyusutan otomatis, jurnal penyesuaian terjadwal, buku besar/neraca saldo tersendiri, atau jurnal penutup tahunan (laba ditahan dihitung). Laporan tahunan Pasal 58 ayat 6 huruf c-f (keadaan usaha, masalah, laporan pengurusan/pengawasan/nasihat) belum ada; hanya bagian keuangannya.
- Bagan akun salinan sebagian, tak dapat disunting per desa; RK disederhanakan menjadi satu akun per sisi.
- Penutupan periode **per semester**, bukan bulanan (Kepmendes menyarankan laba rugi bulanan bila bagi hasil bulanan; belum ada).
- Jumlah di formulir memakai `CurrencyInput` (rupiah bulat); sen hanya dari data lama/API.
- Plafon keputusan adalah angka yang diketik operator saat mencatat keputusan (model keputusan Musyawarah Desa tidak punya kolom jumlah); jenis `MUSDES_BUMDES` dan final-nya berita acara dijaga, kebenaran angkanya terhadap isi berita acara tidak. Modal Desa awal lewat jurnal pembukaan tidak melewati keputusan/BKU (hanya ditandai INFO di laporan).
- Rapat berjenis lama (mis. `MUSDES_LAINNYA`) tidak lagi diterima sebagai dasar arus; buat rapat berjenis BUM Desa. Tautan Musyawarah Desa pendirian di tab Legalitas tetap menerima rapat final jenis apa pun.
- Arus APB Desa: penyertaan **barang** (selain tanah/bangunan) tidak dibangun; tidak ada tautan ke Perdes APB Desa/perubahan sebagai dokumen; tidak ada pemeriksaan "disalurkan paling lambat 3 bulan" sebagai penolakan; tak ada alur persetujuan Kepala Desa (mengikuti BKU yang ada); pembatalan menghapus catatan BKU (BKU tak punya konsep pembatalan).
- Tidak ada kunci asing dari arus ke catatan BKU (lihat di atas; penjaga ada di fungsi buku kas, bukan di DB); tidak ada pengiriman otomatis ke Sistem Informasi Desa/Kemenkumham, tidak ada unggah dokumen legalitas (hanya nomor dan tanggal), tidak ada penghitungan skor pemeringkatan.
- Jejak koreksi manual dan transaksi tersimpan, tetapi pembaca lain jadi lebih lunak: tak ada pemisahan tugas per orang (admin dapat mencatat, mengoreksi, dan menutup sendiri).
- **Pembaca lain tabel transaksi tidak diubah** (di luar kewenangan paket): `lib/ai/laras-insights.ts` (`bumdesSummaryForAi`) menjumlah `bumdes_transactions` tanpa saringan status, sehingga transaksi **dibatalkan** ikut terhitung di ringkasan Laras sampai ditambahkan `status: "AKTIF"` pada `where` `groupBy` (satu baris). Pembaca lain yang diperiksa (`regional-aggregate`, `sdgs/collect-metrics`, `ai/village-assistant`) hanya membaca tabel `bumdes`.
- Halaman belum diuji di peramban; kemungkinan ada polesan tata letak.

## Keputusan yang menunggu pemilik
1. Peran: bolehkah **sekretaris/bendahara desa** mencatat pembukuan (kini hanya admin dan Kepala Desa, aturan lama modul)? Pemisahan pencatat-penutup-pembuka?
2. Perlukah **penutupan bulanan** (laba rugi bulanan untuk bagi hasil bulanan)?
3. Laporan perubahan ekuitas, arus kas, dan CaLK (agar sesuai penuh Kepmendes 136/2022): bangun di Paket berikutnya?
4. Penyertaan modal **barang** (aset desa non-tanah/bangunan) dan keterkaitannya dengan Aset Desa?
5. Setelah Permendesa 13/2025 dibaca: apakah pendaftaran/laporan BUM Desa kini lewat kanal baru yang perlu diekspor dalam format tertentu?
6. Tambahkan filter `status: "AKTIF"` di `laras-insights.ts` (sekarang di luar kewenangan paket).
