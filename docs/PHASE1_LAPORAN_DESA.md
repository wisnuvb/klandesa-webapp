# Laporan Kepala Desa: LPPD, LKPPD, LPPD akhir masa jabatan

Status: dikode 2026-11-01; belum diuji di browser. Tabel `village_reports` ada di `PHASE1_APBDES2_MIGRATION.sql`. Layar `/laporan-kepala-desa` (editor) dan `/laporan-kepala-desa/cetak`; memakai izin `apbdes`.

## Sumber
Teks resmi Permendagri 46/2016 (Berita Negara 2016 No. 1099, salinan di peraturan.go.id). Struktur bagian mengikuti pasalnya:
- **LPPD akhir tahun anggaran (Pasal 3)**: disampaikan ke Bupati/Wali Kota melalui camat, tertulis, paling lambat 3 bulan setelah tahun anggaran berakhir (31 Maret). Bagian: pendahuluan (tujuan, visi dan misi, strategi dan kebijakan), program kerja empat bidang, pelaksanaan APB Desa, keberhasilan-permasalahan-upaya per bidang, penutup (kesimpulan, terima kasih, saran). Lampiran: rekapitulasi penduduk.
- **LKPPD (Pasal 8-9)**: ke BPD, 3 bulan setelah tahun anggaran berakhir; langkah-langkah kebijakan dalam pelaksanaan Perdes, khususnya APB Desa.
- **LPPD akhir masa jabatan (Pasal 5-6)**: 5 bulan sebelum masa jabatan berakhir; laporan selama masa jabatan dan rencana kegiatan 5 bulan sisa (dasar memori serah terima). Tenggat dihitung dari tanggal berakhir yang diisi petugas.

## Cara kerja
- Petugas menulis uraian per bagian (maks. 20.000 karakter, paragraf dipertahankan). Peringatan sebelum meninggalkan halaman bila ada perubahan belum disimpan.
- Terisi otomatis dari data aplikasi: Perdes APB Desa (nomor dan tanggal), kegiatan per bidang dengan anggaran dan realisasi (di bawah bagian program kerja), Lampiran Rincian Pelaksanaan APB Desa (ringkasan anggaran dan realisasi), dan rekapitulasi penduduk (laki-laki, perempuan, KK, mutasi tahun itu). Visi dan misi dapat disalin dari RPJMDes aktif lewat tombol, tidak otomatis.
- Penyerahan: Kepala Desa (atau admin) menandai diserahkan dengan tanggal dan keterangan; semua bagian wajib harus terisi; setelah itu terkunci sampai dibuka kembali. Aplikasi hanya mencatat penyerahan, bukan mengirimkannya.

## Keterbatasan
- Aplikasi menyimpan data warga saat ini, bukan potret 31 Desember: untuk tahun lampau, jumlah penduduk di lampiran bisa berbeda dan perlu diperiksa.
- Format cetak mengikuti urutan pasal; lampiran Permendagri 46/2016 menyediakan kerangka angka (Rincian APB Desa A.1 dan B), yang di sini diganti ringkasan realisasi menurut Permendagri 20/2018 (T.2.a). Bila camat meminta format lampiran persis, bagian ini perlu disesuaikan.
- Bagian naratif tidak ditulis oleh aplikasi; tidak ada isi bawaan yang mengarang capaian desa.
