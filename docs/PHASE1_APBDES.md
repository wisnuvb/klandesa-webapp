# Fase 1 butir 3: Keuangan desa menurut Permendagri 20/2018

Status: dikode 2026-11-01; belum diuji di browser; SQL produksi belum diterapkan (`PHASE1_APBDES_MIGRATION.sql`, lima tabel baru, rollback tersedia). **Tidak menyentuh modul Keuangan lama** (`/keuangan`, tabel `transactions` dan `budgets`): modul baru berdiri sendiri di `/apbdes`. Tidak ada impor otomatis dari catatan lama karena kategorinya bebas dan tidak bisa dipetakan ke kode rekening dengan pasti.

## Sumber
Dibangun dari **teks resmi Permendagri 20/2018** (salinan PDF di situs Balai Pemdes Kemendagri), bukan dari ringkasan blog. Daftar kode Lampiran A.1 (5 bidang, 27 sub bidang, 175 kegiatan) dan A.2 (204 rekening) dibangkitkan dari teks itu ke `lib/apbdes/codes.ts`; tes memeriksa jumlahnya, induk tiap kode, dan beberapa nilai yang dikenal. Surat Edaran Mendagri 100.3.2.3/4716/SJ (ditetapkan 17 Juni 2026; Permendagri 20/2018 tidak dicabut) menambah kode, tetapi **ringkasan blog yang bisa dibaca tidak memuat nomor kodenya**, sehingga tambahan itu tidak ikut. Isinya menurut blog: kegiatan jaminan sosial bagi BPD, pengadaan tanah kas desa dan tanah kas desa hasil tukar-menukar, pengurukan tanah (mendukung Kopdes Merah Putih); rekening jaminan kesehatan dan ketenagakerjaan anggota BPD (belanja pegawai) dan iuran jaminan ketenagakerjaan pekerja pada belanja modal. Sampai kodenya didapat dari teks SE, desa yang butuh kegiatan itu memakai kode lain-lain 90-99 yang memang disediakan peraturan. Bila desa memegang SE itu, kirim teksnya dan kodenya mudah ditambahkan.

## Yang dibangun
| Fitur | Dasar | Catatan |
|---|---|---|
| APB Desa awal dan Perubahan APB Desa (draf, lalu ditetapkan dengan nomor dan tanggal Perdes) | Pasal 32-42, Lampiran C.2 dan F.2 | Dokumen yang ditetapkan terkunci. Perubahan menyalin dokumen terakhir yang ditetapkan. **Sekali setahun**; perubahan kedua dan seterusnya wajib alasan keadaan luar biasa (Pasal 40 ayat 2). Keseimbangan anggaran hanya diperingatkan, tidak memblokir penetapan |
| Buku Kas Umum | Pasal 63, Lampiran P | Penerimaan, pengeluaran (bruto, dengan pajak dipotong), setoran pajak, tarik tunai, setor tunai. Belanja hanya pada kegiatan+rekening yang ada di APB Desa berlaku dan **tidak boleh melebihi pagu**; saldo tunai, bank, dan titipan pajak tidak boleh minus |
| Penutupan bulan, verifikasi Sekretaris Desa, persetujuan Kepala Desa | Pasal 63 ayat 3, Pasal 67 | Bulan tertutup terkunci (tambah, ubah, hapus ditolak). Berurutan; bulan yang belum dimulai tidak bisa ditutup; buka kembali dari bulan paling akhir dan bukan oleh operator biasa |
| Buku Pembantu Bank, Buku Kas Pembantu Pajak | Pasal 64, Lampiran Q.1 dan Q.2 | Kolom mengikuti lampiran |
| Laporan Semester Pertama (realisasi sampai 30 Juni), Laporan Realisasi APB Desa, rincian realisasi, rekap per kegiatan | Pasal 68 dan 70, Lampiran S dan T.2.a | Cetak lewat peramban dan unduh CSV |
| Informasi untuk masyarakat | Pasal 72 | Lima bagian minimal: realisasi APB Desa, realisasi kegiatan, kegiatan belum selesai/tidak terlaksana, sisa anggaran, alamat pengaduan |
| Peringatan tenggat | Pasal 67, 68, 70 | Tanggal 10 bulan berikutnya dihitung; "minggu kedua Juli" dan "3 bulan setelah akhir tahun" hanya ditampilkan sebagai teks |

Saldo kas awal tahun dicatat sebagai penerimaan rekening 6.1.1.01 (SiLPA tahun sebelumnya), jadi tidak ada kolom saldo awal terpisah.

## Pajak
Pasal 58: Kaur Keuangan memotong pajak atas belanja pegawai, barang/jasa, dan modal lalu menyetorkannya. Aplikasi **tidak menghitung tarif**; petugas mengisi jumlah dan jenis pajak (PPN, PPh 21/22/23, lainnya). Pajak yang dipotong tertahan di kas (kas keluar = jumlah dikurangi pajak) sampai dicatat sebagai setoran pajak, dan setoran tidak boleh melebihi yang dipotong.

## Pelajaran teknis
- Seluruh perubahan Buku Kas Umum berjalan dalam transaksi yang **mengunci baris `apbdes_years` sebagai pernyataan pertama** (aturan sama dengan bank sampah). Tes serentak (6 belanja 40 dari saldo 100) hanya meloloskan dua; saya cabut kunci sementara dan tes itu gagal, jadi tes memang menjaga kunci.
- Pemeriksaan saldo menjalankan ulang seluruh catatan tahun itu berurutan tanggal, sehingga catatan mundur yang menjebol saldo sesudahnya, atau penghapusan penerimaan yang menopang belanja, ditolak.
- Pemeriksaan pagu hanya untuk kunci kegiatan+rekening yang sedang ditulis, supaya pagu yang terlewati oleh perubahan anggaran tidak menghalangi catatan lain.

## Lanjutan (2026-11-01): DPA, RAK, RAB, SPP, panjar, laporan pertanggungjawaban
SQL tambahan: `PHASE1_APBDES2_MIGRATION.sql` (jalankan SETELAH `PHASE1_APBDES_MIGRATION.sql`; satu `ALTER` pada `apbdes_entries` dan sembilan tabel baru; rollback tersedia dan sudah dicoba bolak-balik di DB scratch). Semua dari teks Permendagri 20/2018.

| Fitur | Dasar | Aturan yang dijaga |
|---|---|---|
| DPA per kegiatan: Rencana Kerja (RKK), rencana penarikan per bulan (dasar RAK), RAB | Pasal 45-48, Lampiran H | Rencana penarikan tak boleh melebihi anggaran rekening; verifikasi Sekretaris Desa butuh rencana yang sama persis dengan anggaran; disetujui Kepala Desa; setelah itu terkunci; tak bisa dibuka kembali bila sudah ada SPP |
| SPP (swakelola dan penyedia) | Pasal 52-56, Lampiran M.1 dan M.2 | Hanya kegiatan dengan DPA disetujui; tidak melebihi sisa anggaran (termasuk SPP yang masih berjalan) maupun rencana penarikan kumulatif sampai bulan ini (Pasal 53); penyedia wajib bukti penerimaan; alur ajukan, verifikasi, setujui, bayar (atau tolak dengan alasan); pembayaran menghasilkan catatan Buku Kas Umum dalam satu transaksi dan gagal utuh bila saldo kurang |
| Panjar swakelola | Pasal 54, Lampiran Q.3 | Terbentuk saat SPP swakelola dibayar; batas 10 hari kerja (Senin-Jumat; hari libur nasional tidak dihitung, jadi tenggat bisa lebih awal dari yang sebenarnya); pertanggungjawaban dan pengembalian tak melebihi saldo; pengembalian sisa mengurangi realisasi belanja rekening yang dipilih; Sekretaris Desa menandai bukti diperiksa |
| Laporan baru | Lampiran H, J, M, Q.3, T.2.b, T.3, T.4 | RKA, RAB, RKK, RAK Desa, SPP, Pernyataan Tanggung Jawab Belanja, Buku Pembantu Panjar, Laporan Realisasi Kegiatan (akhir tahun dan semester pertama, dengan pembagian Dana Desa/ADD/lainnya), Program Sektoral (daftar diisi petugas), Catatan atas Laporan Keuangan (rekonsiliasi SiLPA dan kas dihitung dan dicek otomatis) |

Catatan: catatan buku kas yang berasal dari SPP atau panjar tidak bisa diubah atau dihapus lewat formulir umum. Catatan manual tetap ada untuk transaksi di luar SPP.

### Perbaikan hasil tinjauan independen (semuanya terbukti dengan tes)
- Catatan pada bulan terbuka yang mendahului bulan tertutup ditolak (menggeser saldo bulan yang sudah disetujui).
- Bulan yang sedang berjalan tidak bisa ditutup; bulan yang sudah disetujui Kepala Desa hanya bisa dibuka kembali oleh peran berwenang menyetujui.
- Verifikasi bulan/DPA/SPP, penetapan APB Desa, dan pengaturan laporan bukan wewenang operator (`staff`); `staff` boleh mencetak buku kas.
- Kolom jenis catatan terlalu pendek untuk "PANJAR_KEMBALI" (tertangkap tes, dilebarkan ke 16).
- Layar: sen kini bisa dimasukkan (sebelumnya mengubah catatan bersen menggandakan nilainya 100x), kas yang tampil sama dengan yang dikirim, tanggal bawaan memakai jam perangkat, Buku Bank memuat baris kumulatif.

## Belum dikerjakan (jujur)
- **Ekspor ke Siskeudes**: templat impor resminya tidak publik. Menunggu contoh berkas dari desa.
- Buku Kas Pembantu Kegiatan (K.1) dan K.2 (swadaya), laporan perkembangan pelaksanaan kegiatan (L), DPAL (DPPA berversi sudah ada: [PHASE2_DPPA.md](PHASE2_DPPA.md)), kuitansi (R), rencana arus kas masuk bulanan pada RAK.
- Rencana Kerja Kegiatan: rincian sasaran per jenis kelamin dan A-RTM (Lampiran H.2) belum dicatat; "bentuk lain" pada sumber dana T.3 belum.
- CaLK bagian 19 (catatan lain) diisi manual; saldo awal potongan pajak tidak dibawa dari tahun sebelumnya.
- Pergeseran antar objek lewat Peraturan Kepala Desa (Pasal 41) belum ada alurnya.
- Belum terhubung ke modul Anggaran/Keuangan lama dan RKPDes.

## Yang perlu diperiksa pemilik/desa
- Peraturan Bupati/Wali Kota setempat boleh menambah kegiatan 90-99, mengatur batas kas tunai (Pasal 44), dan kriteria keadaan luar biasa. Belum ada pengaturan per kabupaten.
- Tampilan belum dicoba di browser.
