/**
 * Daftar kode rekening APB Desa menurut Permendagri 20/2018 (Lampiran A.1 dan A.2).
 * Dibangkitkan dari teks resmi peraturan (salinan Kemendagri), bukan diketik tangan; jangan diubah manual.
 * Kegiatan berkode 90-99 ("lain-lain") ditetapkan kabupaten/kota. Kode tambahan lewat Surat Edaran Mendagri
 * belakangan tidak ada di daftar ini; kegiatan dan rekening lain-lain memakai 90-99.
 */

export interface CodeEntry {
  code: string;
  name: string;
}

/** A.1: bidang (1 digit), sub bidang (1.1), kegiatan (1.1.01; lain-lain 1.1.90-99; bencana 5.1.00). */
export const BIDANG: readonly CodeEntry[] = [
  { code: "1", name: "Penyelenggaraan Pemerintahan Desa" },
  { code: "2", name: "Pelaksanaan Pembangunan Desa" },
  { code: "3", name: "Pembinaan Kemasyarakatan Desa" },
  { code: "4", name: "Pemberdayaan Masyarakat Desa" },
  { code: "5", name: "Penanggulangan Bencana, Keadaan Darurat dan Mendesak" },
];
export const SUB_BIDANG: readonly CodeEntry[] = [
  {
    code: "1.1",
    name: "Penyelenggaraan Belanja Penghasilan Tetap, Tunjangan dan Operasional Pemerintahan Desa (Maksimal 30 % untuk kegiatan 1-7)",
  },
  { code: "1.2", name: "Sarana dan Prasarana Pemerintahan Desa" },
  {
    code: "1.3",
    name: "Administrasi Kependudukan, Pencatatan Sipil, Statistik dan Kearsipan",
  },
  {
    code: "1.4",
    name: "Tata Praja Pemerintahan, Perencanaan, Keuangan dan Pelaporan",
  },
  { code: "1.5", name: "Pertanahan" },
  { code: "2.1", name: "Pendidikan" },
  { code: "2.2", name: "Kesehatan" },
  { code: "2.3", name: "Pekerjaan Umum dan Penataan Ruang" },
  { code: "2.4", name: "Kawasan Permukiman" },
  { code: "2.5", name: "Kehutanan dan Lingkungan Hidup" },
  { code: "2.6", name: "Perhubungan, Komunikasi, dan Informatika" },
  { code: "2.7", name: "Energi dan Sumber Daya Mineral" },
  { code: "2.8", name: "Pariwisata" },
  {
    code: "3.1",
    name: "Ketenteraman, Ketertiban Umum, dan Pelindungan Masyarakat",
  },
  { code: "3.2", name: "Kebudayaan dan Keagamaan" },
  { code: "3.3", name: "Kepemudaan dan Olah Raga" },
  { code: "3.4", name: "Kelembagaan Masyarakat" },
  { code: "4.1", name: "Kelautan dan Perikanan" },
  { code: "4.2", name: "Pertanian dan Peternakan" },
  { code: "4.3", name: "Peningkatan Kapasitas Aparatur Desa" },
  {
    code: "4.4",
    name: "Pemberdayaan Perempuan, Perlindungan Anak dan Keluarga",
  },
  { code: "4.5", name: "Koperasi, Usaha Mikro Kecil dan Menengah (UMKM)" },
  { code: "4.6", name: "Dukungan Penanaman Modal" },
  { code: "4.7", name: "Perdagangan dan Perindustrian" },
  { code: "5.1", name: "Penanggulangan Bencana" },
  { code: "5.2", name: "Keadaan Darurat" },
  { code: "5.3", name: "Keadaan Mendesak." },
];
export const KEGIATAN: readonly CodeEntry[] = [
  {
    code: "1.1.01",
    name: "Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa",
  },
  {
    code: "1.1.02",
    name: "Penyediaan Penghasilan Tetap dan Tunjangan Perangkat Desa",
  },
  {
    code: "1.1.03",
    name: "Penyediaan Jaminan Sosial bagi Kepala Desa dan Perangkat Desa",
  },
  {
    code: "1.1.04",
    name: "Penyediaan Operasional Pemerintah Desa (ATK, Honorarium PKPKD dan PPKD, perlengkapan perkantoran, pakaian dinas/atribut, listrik/telpon, dll)",
  },
  { code: "1.1.05", name: "Penyediaan Tunjangan BPD" },
  {
    code: "1.1.06",
    name: "Penyediaan Operasional BPD (Rapat-rapat (ATK, makan-minum), perlengkapan perkantoran, Pakaian Seragam, perjalanan dinas, listrik/telpon, dll)",
  },
  { code: "1.1.07", name: "Penyediaan Insentif/Operasional RT/RW" },
  {
    code: "1.1.90-99",
    name: "Lain-lain Sub Bidang Penyelenggaraan Belanja Penghasilan Tetap, Tunjangan dan Operasional Pemerintahan Desa",
  },
  {
    code: "1.2.01",
    name: "Penyediaan sarana (aset tetap) perkantoran/pemerintahan",
  },
  { code: "1.2.02", name: "Pemeliharaan Gedung/Prasarana Kantor Desa" },
  {
    code: "1.2.03",
    name: "Pembangunan/Rehabilitasi/Peningkatan Gedung/Prasarana Kantor Desa",
  },
  {
    code: "1.2.90-99",
    name: "lain-lain kegiatan sub bidang sarana dan prasarana pemerintahan Desa",
  },
  {
    code: "1.3.01",
    name: "Pelayanan administrasi umum dan kependudukan (Surat Pengantar/Pelayanan KTP, Akta Kelahiran, Kartu Keluarga, dll)",
  },
  {
    code: "1.3.02",
    name: "Penyusunan/Pendataan/Pemutakhiran Profil Desa (profil kependudukan dan potensi desa)",
  },
  {
    code: "1.3.03",
    name: "Pengelolaan administrasi dan kearsipan pemerintahan desa",
  },
  {
    code: "1.3.04",
    name: "Penyuluhan dan Penyadaran Masyarakat tentang Kependudukan dan Pencatatan Sipil",
  },
  {
    code: "1.3.05",
    name: "Pemetaan dan Analisis Kemiskinan Desa secara Partisipatif",
  },
  {
    code: "1.3.90-99",
    name: "lain-lain kegiatan sub bidang administrasi kependudukan, pencatatan sipil, statistik dan kearsipan",
  },
  {
    code: "1.4.01",
    name: "Penyelenggaraan Musyawarah Perencanaan Desa/Pembahasan APBDes (Musdes, Musrenbangdes/Pra-Musrenbangdes, dll., bersifat reguler)",
  },
  {
    code: "1.4.02",
    name: "Penyelenggaraan Musyawarah Desa lainnya (musdus, rembug warga, dll., yang bersifat non-reguler sesuai kebutuhan desa)",
  },
  {
    code: "1.4.03",
    name: "Penyusunan Dokumen Perencanaan Desa (RPJMDes/RKPDes,dll)",
  },
  {
    code: "1.4.04",
    name: "Penyusunan Dokumen Keuangan Desa (APBDes/ APBDes Perubahan/ LPJ APBDes, dan seluruh dokumen terkait)",
  },
  {
    code: "1.4.05",
    name: "Pengelolaan/Administrasi/Inventarisasi/Penilaian Aset Desa",
  },
  {
    code: "1.4.06",
    name: "Penyusunan Kebijakan Desa (Perdes/Perkades, dll - diluar dokumen Rencana Pembangunan/Keuangan)",
  },
  {
    code: "1.4.07",
    name: "Penyusunan Laporan Kepala Desa/Penyelenggaraan Pemerintahan Desa (laporan akhir tahun anggaran, laporan akhir masa jabatan, laporan keterangan akhir tahun anggaran, informasi kepada masyarakat)",
  },
  { code: "1.4.08", name: "Pengembangan Sistem Informasi Desa" },
  {
    code: "1.4.09",
    name: "Koordinasi/Kerjasama Penyelenggaraan Pemerintahan dan Pembangunan Desa (Antar Desa/Kecamatan/Kabupaten, Pihak Ketiga, dll)",
  },
  {
    code: "1.4.10",
    name: "Dukungan Pelaksanaan dan Sosialisasi Pilkades, Pemilihan Kepala Kewilayahan dan Pemilihan BPD (yang menjadi wewenang Desa)",
  },
  {
    code: "1.4.11",
    name: "Penyelenggaraan Lomba antar kewilayahan dan pengiriman kontingen dalam mengikuti Lomba Desa",
  },
  {
    code: "1.4.90-99",
    name: "lain-lain kegiatan sub bidang tata praja pemerintahan, perencanaan, keuangan dan pelaporan",
  },
  { code: "1.5.01", name: "Sertifikasi Tanah Kas Desa" },
  {
    code: "1.5.02",
    name: "Administrasi Pertanahan (Pendaftaran Tanah, dan Pemberian Registrasi Agenda Pertanahan)",
  },
  {
    code: "1.5.03",
    name: "Fasilitasi Sertifikasi Tanah untuk Masyarakat Miskin",
  },
  { code: "1.5.04", name: "Mediasi Konflik Pertanahan" },
  { code: "1.5.05", name: "Penyuluhan Pertanahan" },
  { code: "1.5.06", name: "Administrasi Pajak Bumi dan Bangunan (PBB)" },
  {
    code: "1.5.07",
    name: "Penentuan/Penegasan/Pembangunan Batas/Patok Tanah Desa",
  },
  { code: "1.5.90-99", name: "lain-lain kegiatan sub bidang pertanahan" },
  {
    code: "2.1.01",
    name: "Penyelenggaraan PAUD/TK/TPA/TKA/TPQ/Madrasah Non-Formal Milik Desa (Bantuan Honor Pengajar, Pakaian Seragam, Operasional, dst)",
  },
  {
    code: "2.1.02",
    name: "Dukungan Penyelenggaraan PAUD (APE, Sarana PAUD, dst)",
  },
  {
    code: "2.1.03",
    name: "Penyuluhan dan Pelatihan Pendidikan bagi Masyarakat",
  },
  {
    code: "2.1.04",
    name: "Pemeliharaan Sarana dan Prasarana Perpustakaan/Taman Bacaan Desa/ Sanggar Belajar Milik Desa",
  },
  {
    code: "2.1.05",
    name: "Pemeliharaan Sarana dan Prasarana PAUD/TK/TPA/TKA/TPQ/Madrasah Non- Formal Milik Desa",
  },
  {
    code: "2.1.06",
    name: "Pembangunan/Rehabilitasi/Peningkatan/Pengadaan Sarana/Prasarana/Alat Peraga Edukatif (APE) PAUD/ TK/TPA/TKA/TPQ/Madrasah Non-Formal Milik Desa",
  },
  {
    code: "2.1.07",
    name: "Pembangunan/Rehabilitasi/Peningkatan Sarana Prasarana Perpustakaan/Taman Bacaan Desa/ Sanggar Belajar Milik Desa",
  },
  {
    code: "2.1.08",
    name: "Pengelolaan Perpustakaan Milik Desa (Pengadaan Buku-buku Bacaan, Honor Penjaga untuk Perpustakaan/Taman Bacaan Desa)",
  },
  {
    code: "2.1.09",
    name: "Pengembangan dan Pembinaan Sanggar Seni dan Belajar",
  },
  { code: "2.1.10", name: "Dukungan Pendidikan bagi Siswa Miskin/Berprestasi" },
  { code: "2.1.90-99", name: "lain-lain kegiatan sub bidang pendidikan" },
  {
    code: "2.2.01",
    name: "Penyelenggaraan Pos Kesehatan Desa (PKD)/Polindes Milik Desa (Obat-obatan; Tambahan Insentif Bidan Desa/Perawat Desa; Penyediaan Pelayanan KB dan Alat Kontrasepsi bagi Keluarga Miskin, dst)",
  },
  {
    code: "2.2.02",
    name: "Penyelenggaraan Posyandu (Makanan Tambahan, Kelas Ibu Hamil, Kelas Lansia, Insentif Kader Posyandu)",
  },
  {
    code: "2.2.03",
    name: "Penyuluhan dan Pelatihan Bidang Kesehatan (untuk Masyarakat, Tenaga Kesehatan, Kader Kesehatan, dll)",
  },
  { code: "2.2.04", name: "Penyelenggaraan Desa Siaga Kesehatan" },
  { code: "2.2.05", name: "Pembinaan Palang Merah Remaja (PMR) tingkat desa" },
  {
    code: "2.2.06",
    name: "Pengasuhan Bersama atau Bina Keluarga Balita (BKB)",
  },
  {
    code: "2.2.07",
    name: "Pembinaan dan Pengawasan Upaya Kesehatan Tradisional",
  },
  {
    code: "2.2.08",
    name: "Pemeliharaan Sarana/Prasarana Posyandu/Polindes/PKD",
  },
  {
    code: "2.2.09",
    name: "Pembangunan/Rehabilitasi/Peningkatan/Pengadaan Sarana/Prasarana Posyandu/Polindes/PKD",
  },
  { code: "2.2.90-99", name: "lain-lain kegiatan sub bidang kesehatan" },
  { code: "2.3.01", name: "Pemeliharaan Jalan Desa" },
  { code: "2.3.02", name: "Pemeliharaan Jalan Lingkungan Permukiman/Gang" },
  { code: "2.3.03", name: "Pemeliharaan Jalan Usaha Tani" },
  { code: "2.3.04", name: "Pemeliharaan Jembatan Milik Desa" },
  {
    code: "2.3.05",
    name: "Pemeliharaan Prasarana Jalan Desa (Gorong-gorong, Selokan, Box/Slab Culvert, Drainase, Prasarana Jalan lain)",
  },
  {
    code: "2.3.06",
    name: "Pemeliharaan Gedung/Prasarana Balai Desa/Balai Kemasyarakatan",
  },
  {
    code: "2.3.07",
    name: "Pemeliharaan Pemakaman Milik Desa/Situs Bersejarah Milik Desa/Petilasan Milik Desa",
  },
  { code: "2.3.08", name: "Pemeliharaan Embung Milik Desa" },
  { code: "2.3.09", name: "Pemeliharaan Monumen/Gapura/Batas Desa" },
  {
    code: "2.3.10",
    name: "Pembangunan/Rehabilitasi/Peningkatan/Pengerasan Jalan Desa",
  },
  {
    code: "2.3.11",
    name: "Pembangunan/Rehabilitasi/Peningkatan/Pengerasan Jalan Lingkungan Permukiman/Gang",
  },
  {
    code: "2.3.12",
    name: "Pembangunan/Rehabilitasi/Peningkatan/Pengerasan Jalan Usaha Tani",
  },
  {
    code: "2.3.13",
    name: "Pembangunan/Rehabilitasi/Peningkatan/Pengerasan Jembatan Milik Desa",
  },
  {
    code: "2.3.14",
    name: "Pembangunan/Rehabilitasi/Peningkatan Prasarana Jalan Desa (Gorong-gorong, Selokan, Box/Slab Culvert, Drainase, Prasarana Jalan lain)",
  },
  {
    code: "2.3.15",
    name: "Pembangunan/Rehabilitasi/Peningkatan Balai Desa/Balai Kemasyarakatan",
  },
  {
    code: "2.3.16",
    name: "Pembangunan/Rehabilitasi/Peningkatan Pemakaman Milik Desa/Situs Bersejarah Milik Desa/Petilasan",
  },
  {
    code: "2.3.17",
    name: "Pembuatan/Pemutakhiran Peta Wilayah dan Sosial Desa",
  },
  { code: "2.3.18", name: "Penyusunan Dokumen Perencanaan Tata Ruang Desa" },
  { code: "2.3.19", name: "Pembangunan/Rehabilitasi/Peningkatan Embung Desa" },
  {
    code: "2.3.20",
    name: "Pembangunan/Rehabilitasi/Peningkatan Monumen/Gapura/Batas Desa",
  },
  {
    code: "2.3.90-99",
    name: "lain-lain kegiatan sub bidang pekerjaan umum dan penataan ruang",
  },
  {
    code: "2.4.01",
    name: "Dukungan pelaksanaan program Pembangunan/Rehab Rumah Tidak Layak Huni (RTLH) GAKIN (pemetaan, validasi, dll)",
  },
  { code: "2.4.02", name: "Pemeliharaan Sumur Resapan Milik Desa" },
  {
    code: "2.4.03",
    name: "Pemeliharaan Sumber Air Bersih Milik Desa (Mata Air/Tandon Penampungan Air Hujan/Sumur Bor, dll)",
  },
  {
    code: "2.4.04",
    name: "Pemeliharaan Sambungan Air Bersih ke Rumah Tangga (pipanisasi, dll)",
  },
  {
    code: "2.4.05",
    name: "Pemeliharaan Sanitasi Permukiman (Gorong-gorong, Selokan, Parit, dll., diluar prasarana jalan)",
  },
  { code: "2.4.06", name: "Pemeliharaan Fasilitas Jamban Umum/MCK umum, dll" },
  {
    code: "2.4.07",
    name: "Pemeliharaan Fasilitas Pengelolaan Sampah Desa/Permukiman (Penampungan, Bank Sampah, dll)",
  },
  {
    code: "2.4.08",
    name: "Pemeliharaan Sistem Pembuangan Air Limbah (Drainase, Air limbah Rumah Tangga)",
  },
  { code: "2.4.09", name: "Pemeliharaan Taman/Taman Bermain Anak Milik Desa" },
  {
    code: "2.4.10",
    name: "Pembangunan/Rehabilitasi/Peningkatan Sumur Resapan",
  },
  {
    code: "2.4.11",
    name: "Pembangunan/Rehabilitasi/Peningkatan Sumber Air Bersih Milik Desa (Mata Air/Tandon Penampungan Air Hujan/Sumur Bor, dll)",
  },
  {
    code: "2.4.12",
    name: "Pembangunan/Rehabilitasi/Peningkatan Sambungan Air Bersih ke Rumah Tangga (pipanisasi, dll)",
  },
  {
    code: "2.4.13",
    name: "Pembangunan/Rehabilitasi/Peningkatan Sanitasi Permukiman (Gorong-gorong, Selokan, Parit, dll., diluar prasarana jalan)",
  },
  {
    code: "2.4.14",
    name: "Pembangunan/Rehabilitas/Peningkatan Fasilitas Jamban Umum/MCK umum, dll",
  },
  {
    code: "2.4.15",
    name: "Pembangunan/Rehabilitasi/Peningkatan Fasilitas Pengelolaan Sampah Desa/Permukiman (Penampungan, Bank Sampah, dll)",
  },
  {
    code: "2.4.16",
    name: "Pembangunan/Rehabilitasi/Peningkatan Sistem Pembuangan Air Limbah (Drainase, Air limbah Rumah Tangga)",
  },
  {
    code: "2.4.17",
    name: "Pembangunan/Rehabilitasi/Peningkatan Taman/Taman Bermain Anak Milik Desa",
  },
  {
    code: "2.4.90-99",
    name: "lain-lain kegiatan sub bidang perumahan rakyat dan kawasan pemukiman",
  },
  { code: "2.5.01", name: "Pengelolaan Hutan Milik Desa" },
  { code: "2.5.02", name: "Pengelolaan Lingkungan Hidup Desa" },
  {
    code: "2.5.03",
    name: "Pelatihan/Sosialisasi/Penyuluhan/Penyadaran tentang Lingkungan Hidup dan Kehutanan",
  },
  {
    code: "2.5.90-99",
    name: "lain-lain kegiatan sub bidang Kehutanan dan Lingkungan Hidup",
  },
  { code: "2.6.01", name: "Pembuatan Rambu-rambu di Jalan Desa" },
  {
    code: "2.6.02",
    name: "Penyelenggaraan Informasi Publik Desa (Misal : Pembuatan Poster/Baliho Informasi penetapan/LPJ APBDes untuk Warga, dll)",
  },
  {
    code: "2.6.03",
    name: "Pengelolaan dan Pembuatan Jaringan/Instalasi Komunikasi dan Informasi Lokal Desa",
  },
  {
    code: "2.6.90-99",
    name: "lain-lain kegiatan sub bidang Perhubungan, Komunikasi, dan Informatika",
  },
  {
    code: "2.7.01",
    name: "Pemeliharaan Sarana dan Prasarana Energi Alternatif tingkat Desa",
  },
  {
    code: "2.7.02",
    name: "Pembangunan/Rehabilitasi/Peningkatan Sarana dan Prasarana Energi Alternatif tingkat Desa",
  },
  {
    code: "2.7.90-99",
    name: "lain-lain kegiatan sub bidang Energi dan Sumber Daya Mineral",
  },
  {
    code: "2.8.01",
    name: "Pemeliharaan Sarana dan Prasarana Pariwisata Milik Desa",
  },
  {
    code: "2.8.02",
    name: "Pembangunan/Rehabilitasi/Peningkatan Sarana dan Prasarana Pariwisata Milik",
  },
  { code: "2.8.03", name: "Pengembangan Pariwisata Tingkat Desa" },
  { code: "2.8.90-99", name: "lain-lain kegiatan sub bidang pariwisata" },
  {
    code: "3.1.01",
    name: "Pengadaan/Penyelenggaraan Pos Keamanan Desa (pembangunan pos, pengawasan pelaksanaan jadwal ronda/patroli dll)",
  },
  {
    code: "3.1.02",
    name: "Penguatan dan Peningkatan Kapasitas Tenaga Keamanan/Ketertiban oleh Pemerintah Desa (Satlinmas desa)",
  },
  {
    code: "3.1.03",
    name: "Koordinasi Pembinaan Ketentraman, Ketertiban, dan Pelindungan Masyarakat (dengan masyarakat/instansi pemerintah daerah, dll) Skala Lokal Desa",
  },
  {
    code: "3.1.04",
    name: "Pelatihan Kesiapsiagaan/Tanggap Bencana Skala Lokal Desa",
  },
  {
    code: "3.1.05",
    name: "Penyediaan Pos Kesiapsiagaan Bencana Skala Lokal Desa",
  },
  {
    code: "3.1.06",
    name: "Bantuan Hukum Untuk Aparatur Desa dan Masyarakat Miskin",
  },
  {
    code: "3.1.07",
    name: "Pelatihan/Penyuluhan/Sosialisasi kepada Masyarakat di Bidang Hukum dan Pelindungan Masyarakat",
  },
  {
    code: "3.1.90-99",
    name: "lain-lain kegiatan sub bidang Ketenteraman, Ketertiban Umum, dan Pelindungan Masyarakat",
  },
  {
    code: "3.2.01",
    name: "Pembinaan Group Kesenian dan Kebudayaan Tingkat Desa",
  },
  {
    code: "3.2.02",
    name: "Pengiriman Kontingen Group Kesenian dan Kebudayaan sebagai Wakil Desa di tingkat Kecamatan dan Kabupaten/Kota",
  },
  {
    code: "3.2.03",
    name: "Penyelenggaraan Festival Kesenian, Adat/Kebudayaan, dan Keagamaan (perayaan hari kemerdekaan, hari besar keagamaan, dll) tingkat Desa",
  },
  {
    code: "3.2.04",
    name: "Pemeliharaan Sarana dan Prasarana Kebudayaan/Rumah Adat/Keagamaan Milik Desa",
  },
  {
    code: "3.2.05",
    name: "Pembangunan/Rehabilitasi/Peningkatan Sarana dan Prasarana Kebudayaan/Rumah Adat/Keagamaan Milik Desa",
  },
  {
    code: "3.2.90-99",
    name: "lain-lain kegiatan sub bidang Kebudayaan dan Keagamaan",
  },
  {
    code: "3.3.01",
    name: "Pengiriman Kontingen Kepemudaan dan Olah Raga sebagai Wakil Desa di tingkat Kecamatan dan Kabupaten/Kota",
  },
  {
    code: "3.3.02",
    name: "Penyelenggaraan pelatihan kepemudaan (Kepemudaan, Penyadaraan Wawasan Kebangsaan, dll) tingkat Desa",
  },
  {
    code: "3.3.03",
    name: "Penyelenggaraan Festival/Lomba Kepemudaan dan Olahraga tingkat Desa",
  },
  {
    code: "3.3.04",
    name: "Pemeliharaan Sarana dan Prasarana Kepemudaan dan Olah Raga Milik Desa",
  },
  {
    code: "3.3.05",
    name: "Pembangunan/Rehabilitasi/Peningkatan Sarana dan Prasarana Kepemudaan dan Olah Raga Milik Desa",
  },
  {
    code: "3.3.06",
    name: "Pembinaan Karang Taruna/Klub Kepemudaan/Klub Olah raga",
  },
  {
    code: "3.3.90-99",
    name: "lain-lain kegiatan sub bidang Kepemudaan dan Olah Raga",
  },
  { code: "3.4.01", name: "Pembinaan Lembaga Adat" },
  { code: "3.4.02", name: "Pembinaan LKMD/LPM/LPMD" },
  { code: "3.4.03", name: "Pembinaan PKK" },
  { code: "3.4.04", name: "Pelatihan Pembinaan Lembaga Kemasyarakatan" },
  {
    code: "3.4.90-99",
    name: "lain-lain kegiatan sub bidang Kelembagaan Masyarakat",
  },
  {
    code: "4.1.01",
    name: "Pemeliharaan Karamba/Kolam Perikanan Darat Milik Desa",
  },
  {
    code: "4.1.02",
    name: "Pemeliharaan Pelabuhan Perikanan Sungai/Kecil Milik Desa",
  },
  {
    code: "4.1.03",
    name: "Pembangunan/Rehabilitasi/Peningkatan Karamba/Kolam Perikanan Darat Milik Desa",
  },
  {
    code: "4.1.04",
    name: "Pembangunan/Rehabilitasi/Peningkatan Pelabuhan Perikanan Sungai/Kecil Milik Desa",
  },
  { code: "4.1.05", name: "Bantuan Perikanan (Bibit/Pakan/dst)" },
  {
    code: "4.1.06",
    name: "Pelatihan/Bimtek/Pengenalan Tekonologi Tepat Guna untuk Perikanan Darat/Nelayan",
  },
  {
    code: "4.1.90-99",
    name: "lain-lain kegiatan sub bidang kelautan dan perikanan",
  },
  {
    code: "4.2.01",
    name: "Peningkatan Produksi Tanaman Pangan (Alat Produksi dan pengolahan pertanian, penggilingan Padi/jagung, dll)",
  },
  {
    code: "4.2.02",
    name: "Peningkatan Produksi Peternakan (Alat Produksi dan pengolahan peternakan, kandang, dll)",
  },
  {
    code: "4.2.03",
    name: "Penguatan Ketahanan Pangan Tingkat Desa (Lumbung Desa, dll)",
  },
  { code: "4.2.04", name: "Pemeliharan Saluran Irigasi Tersier/Sederhana" },
  {
    code: "4.2.05",
    name: "Pelatihan/Bimtek/Pengenalan Tekonologi Tepat Guna untuk Pertanian/Peternakan",
  },
  {
    code: "4.2.90-99",
    name: "lain-lain kegiatan sub bidang Pertanian dan Peternakan",
  },
  { code: "4.3.01", name: "Peningkatan kapasitas kepala Desa" },
  { code: "4.3.02", name: "Peningkatan kapasitas perangkat Desa" },
  { code: "4.3.03", name: "Peningkatan kapasitas BPD" },
  {
    code: "4.3.90-99",
    name: "lain-lain kegiatan sub bidang peningkatan kapasitas Aparatur Desa",
  },
  { code: "4.4.01", name: "Pelatihan/Penyuluhan Pemberdayaan Perempuan" },
  { code: "4.4.02", name: "Pelatihan/Penyuluhan Perlindungan Anak" },
  {
    code: "4.4.03",
    name: "Pelatihan dan Penguatan Penyandang Difabel (penyandang disabilitas)",
  },
  {
    code: "4.4.90-99",
    name: "lain-lain kegiatan sub bidang Pemberdayaan Perempuan dan Perlindungan Anak",
  },
  {
    code: "4.5.01",
    name: "Pelatihan Manajemen Pengelolaan Koperasi/ KUD/ UMKM",
  },
  {
    code: "4.5.02",
    name: "Pengembangan Sarana Prasarana Usaha Mikro, Kecil dan Menengah serta Koperasi",
  },
  {
    code: "4.5.03",
    name: "Pengadaan Teknologi Tepat Guna untuk Pengembangan Ekonomi Pedesaan Non- Pertanian",
  },
  {
    code: "4.5.90-99",
    name: "lain-lain kegiatan sub bidang Koperasi, Usaha Kecil dan Menengah",
  },
  {
    code: "4.6.01",
    name: "Pembentukan BUM Desa (Persiapan dan Pembentukan Awal BUM Desa)",
  },
  {
    code: "4.6.02",
    name: "Pelatihan Pengelolaan BUM Desa (Pelatihan yang dilaksanakan oleh Desa)",
  },
  { code: "4.6.90-99", name: "lain-lain kegiatan sub bidang Penanaman Modal" },
  { code: "4.7.01", name: "Pemeliharaan Pasar Desa/Kios milik Desa" },
  {
    code: "4.7.02",
    name: "Pembangunan/Rehabilitasi/Peningkatan Pasar Desa/Kios milik Desa",
  },
  { code: "4.7.03", name: "Pengembangan Industri kecil level Desa" },
  {
    code: "4.7.04",
    name: "Pembentukan/Fasilitasi/Pelatihan/Pendampingan kelompok usaha ekonomi produktif (pengrajin, pedagang, industri rumah tangga, dll)",
  },
  {
    code: "4.7.90-99",
    name: "lain-lain kegiatan sub bidang Perdagangan dan Perindustrian",
  },
  { code: "5.1.00", name: "Penanggulangan Bencana" },
  { code: "5.2.00", name: "Keadaan Darurat" },
  { code: "5.3.00", name: "Keadaan Mendesak" },
];

/** A.2: akun 4 pendapatan, 5 belanja, 6 pembiayaan; tingkat: 4.1 kelompok, 4.1.1 jenis, 4.1.1.01 objek/rincian. */
export const AKUN: readonly CodeEntry[] = [
  { code: "4", name: "PENDAPATAN" },
  { code: "4.1", name: "Pendapatan Asli Desa" },
  { code: "4.1.1", name: "Hasil Usaha" },
  { code: "4.1.1.01", name: "Bagi Hasil BUMDes" },
  { code: "4.1.1.90-99", name: "Lain-lain" },
  { code: "4.1.2", name: "Hasil Aset" },
  { code: "4.1.2.01", name: "Pengelolaan Tanah Kas Desa" },
  { code: "4.1.2.02", name: "Tambatan Perahu" },
  { code: "4.1.2.03", name: "Pasar Desa" },
  { code: "4.1.2.04", name: "Tempat Pemandian Umum" },
  { code: "4.1.2.05", name: "Jaringan Irigasi Desa" },
  { code: "4.1.2.06", name: "Pelelangan Ikan Milik Desa" },
  { code: "4.1.2.07", name: "Kios Milik Desa" },
  {
    code: "4.1.2.08",
    name: "Pemanfaatan Lapangan/Prasarana Olah raga Milik Desa",
  },
  { code: "4.1.2.90-99", name: "Lain-lain" },
  { code: "4.1.3", name: "Swadaya, Partisipasi dan Gotong Royong" },
  { code: "4.1.3.01", name: "Swadaya, partisipasi dan gotong royong" },
  {
    code: "4.1.3.90-99",
    name: "Lain-lain Swadaya, Partisipasi dan Gotong Royong",
  },
  { code: "4.1.4", name: "Lain-lain Pendapatan Asli Desa" },
  { code: "4.1.4.01", name: "Hasil Pungutan Desa" },
  { code: "4.1.4.90-99", name: "Lain-lain" },
  { code: "4.2", name: "Transfer" },
  { code: "4.2.1", name: "Dana Desa" },
  { code: "4.2.1.01", name: "Dana Desa" },
  {
    code: "4.2.2",
    name: "Bagian dari Hasil Pajak dan Retribusi Daerah Kabupaten/kota",
  },
  {
    code: "4.2.2.01",
    name: "Bagian dari Hasil Pajak dan Retribusi Daerah Kabupaten/kota",
  },
  { code: "4.2.3", name: "Alokasi Dana Desa" },
  { code: "4.2.3.01", name: "Alokasi Dana Desa" },
  { code: "4.2.4", name: "Bantuan Keuangan Provinsi" },
  { code: "4.2.4.01", name: "Bantuan Keuangan dari APBD Provinsi" },
  {
    code: "4.2.4.90-99",
    name: "Lain-lain Bantuan Keuangan dari APBD Provinsi",
  },
  { code: "4.2.5", name: "Bantuan Keuangan APBD Kabupaten/Kota" },
  { code: "4.2.5.01", name: "Bantuan Keuangan APBD Kabupaten/Kota" },
  {
    code: "4.2.5.90-99",
    name: "Lain-lain Bantuan Keuangan dari APBD Kabupaten/Kota",
  },
  { code: "4.3", name: "Pendapatan Lain-lain" },
  { code: "4.3.1", name: "Penerimaan dari Hasil Kerjasama antar Desa" },
  { code: "4.3.1.01", name: "Penerimaan dari Hasil Kerjasama antar Desa" },
  {
    code: "4.3.2",
    name: "Penerimaan dari Hasil Kerjasama Desa dengan Pihak Ketiga",
  },
  {
    code: "4.3.2.01",
    name: "Penerimaan dari Hasil Kerjasama Desa dengan Pihak Ketiga",
  },
  {
    code: "4.3.3",
    name: "Penerimaan dari Bantuan Perusahaan yang berlokasi di Desa",
  },
  {
    code: "4.3.3.01",
    name: "Penerimaan dari Bantuan Perusahaan yang berlokasi di Desa",
  },
  { code: "4.3.4", name: "Hibah dan sumbangan dari Pihak Ketiga" },
  { code: "4.3.4.01", name: "Hibah dan sumbangan dari Pihak Ketiga" },
  {
    code: "4.3.5",
    name: "Koreksi kesalahan belanja tahun-tahun anggaran sebelumnya yang mengakibatkan penerimaan di kas Desa pada tahun anggaran berjalan",
  },
  {
    code: "4.3.5.01",
    name: "Koreksi kesalahan belanja tahun-tahun anggaran sebelumnya yang mengakibatkan penerimaan di kas Desa pada tahun anggaran berjalan",
  },
  { code: "4.3.6", name: "Bunga Bank" },
  { code: "4.3.6.01", name: "Bunga Bank" },
  { code: "4.3.9", name: "Lain-lain pendapatan Desa yang sah" },
  { code: "4.3.9.90-99", name: "Lain-lain pendapatan Desa yang sah" },
  { code: "5", name: "BELANJA" },
  { code: "5.1", name: "Belanja Pegawai" },
  { code: "5.1.1", name: "Penghasilan Tetap dan Tunjangan Kepala Desa" },
  { code: "5.1.1.01", name: "Penghasilan Tetap Kepala Desa" },
  { code: "5.1.1.02", name: "Tunjangan Kepala Desa" },
  { code: "5.1.1.90-99", name: "Penerimaan Lain Kepala Desa yang Sah" },
  { code: "5.1.2", name: "Penghasilan Tetap dan Tunjangan Perangkat Desa" },
  { code: "5.1.2.01", name: "Penghasilan Tetap Perangkat Desa" },
  { code: "5.1.2.02", name: "Tunjangan Perangkat Desa" },
  { code: "5.1.2.90-99", name: "Penerimaan Lain Perangkat Desa yang Sah" },
  { code: "5.1.3", name: "Jaminan Sosial Kepala Desa dan Perangkat Desa" },
  { code: "5.1.3.01", name: "Jaminan Kesehatan Kepala Desa" },
  { code: "5.1.3.02", name: "Jaminan Kesehatan Perangkat Desa" },
  { code: "5.1.3.03", name: "Jaminan Ketenagakerjaan Kepala Desa" },
  { code: "5.1.3.04", name: "Jaminan Ketenagakerjaan Perangkat Desa" },
  { code: "5.1.4", name: "Tunjangan BPD" },
  { code: "5.1.4.01", name: "Tunjangan Kedudukan BPD" },
  { code: "5.1.4.02", name: "Tunjangan Kinerja BPD" },
  { code: "5.2", name: "Belanja Barang dan Jasa" },
  { code: "5.2.1", name: "Belanja Barang Perlengkapan" },
  {
    code: "5.2.1.01",
    name: "Belanja Perlengkapan Alat Tulis Kantor dan Benda Pos",
  },
  { code: "5.2.1.02", name: "Belanja Perlengkapan Alat-alat Listrik" },
  {
    code: "5.2.1.03",
    name: "Belanja Perlengkapan Alat-alat Rumah Tangga/Peralatan dan Bahan Kebersihan",
  },
  {
    code: "5.2.1.04",
    name: "Belanja Bahan Bakar Minyak/Gas/Isi Ulang Tabung Pemadam Kebakaran",
  },
  {
    code: "5.2.1.05",
    name: "Belanja Perlengkapan Cetak/Penggandaan - Belanja Barang Cetak dan Penggandaan",
  },
  {
    code: "5.2.1.06",
    name: "Belanja Perlengkapan Barang Konsumsi (Makan/minum) - Belanja Barang Konsumsi",
  },
  { code: "5.2.1.07", name: "Belanja Bahan/Material" },
  { code: "5.2.1.08", name: "Belanja Bendera/Umbul-umbul/Spanduk" },
  { code: "5.2.1.09", name: "Belanja Pakaian Dinas/Seragam/Atribut" },
  { code: "5.2.1.10", name: "Belanja Obat-obatan" },
  { code: "5.2.1.11", name: "Belanja Pakan Hewan/Ikan, Obat-obatan Hewan" },
  { code: "5.2.1.12", name: "Belanja Pupuk/Obat-obatan Pertanian" },
  { code: "5.2.1.90-99", name: "Belanja Barang Perlengkapan Lainnya" },
  { code: "5.2.2", name: "Belanja Jasa Honorarium" },
  {
    code: "5.2.2.01",
    name: "Belanja Jasa Honorarium Tim yang Melaksanakan Kegiatan",
  },
  {
    code: "5.2.2.02",
    name: "Belanja Jasa Honorarium Pembantu Tugas Umum Desa/Operator",
  },
  { code: "5.2.2.03", name: "Belanja Jasa Honorarium/Insentif Pelayanan Desa" },
  {
    code: "5.2.2.04",
    name: "Belanja Jasa Honorarium Ahli/Profesi/Konsultan/Narasumber",
  },
  { code: "5.2.2.05", name: "Belanja Jasa Honorarium Petugas" },
  { code: "5.2.2.90-99", name: "Belanja Jasa Honorarium Lainnya" },
  { code: "5.2.3", name: "Belanja Perjalanan Dinas" },
  { code: "5.2.3.01", name: "Belanja Perjalanan Dinas Dalam Kabupaten/Kota" },
  { code: "5.2.3.02", name: "Belanja Perjalanan Dinas Luar Kabupaten/Kota" },
  { code: "5.2.3.03", name: "Belanja Kursus/Pelatihan" },
  { code: "5.2.4", name: "Belanja Jasa Sewa" },
  { code: "5.2.4.01", name: "Belanja Jasa Sewa Bangunan/Gedung/Ruang" },
  { code: "5.2.4.02", name: "Belanja Jasa Sewa Peralatan/Perlengkapan" },
  { code: "5.2.4.03", name: "Belanja Jasa Sewa Sarana Mobilitas" },
  { code: "5.2.4.90-99", name: "Belanja Jasa Sewa Lainnya" },
  { code: "5.2.5", name: "Belanja Operasional Perkantoran" },
  { code: "5.2.5.01", name: "Belanja Jasa Langganan Listrik" },
  { code: "5.2.5.02", name: "Belanja Jasa Langganan Air Bersih" },
  { code: "5.2.5.03", name: "Belanja Jasa Langganan Majalah/Surat Kabar" },
  { code: "5.2.5.04", name: "Belanja Jasa Langganan Telepon" },
  { code: "5.2.5.05", name: "Belanja Jasa Langganan Internet" },
  { code: "5.2.5.06", name: "Belanja Jasa Kurir/Pos/Giro" },
  { code: "5.2.5.07", name: "Belanja Jasa Perpanjangan Ijin/Pajak" },
  { code: "5.2.5.90-99", name: "Belanja Operasional Perkantoran Lainnya" },
  { code: "5.2.6", name: "Belanja Pemeliharaan" },
  { code: "5.2.6.01", name: "Belanja Pemeliharaan Mesin dan Peralatan Berat" },
  { code: "5.2.6.02", name: "Belanja Pemeliharaan Kendaraan Bermotor" },
  { code: "5.2.6.03", name: "Belanja Pemeliharaan Peralatan" },
  { code: "5.2.6.04", name: "Belanja Pemeliharaan Bangunan" },
  { code: "5.2.6.05", name: "Belanja Pemeliharaan Jalan" },
  { code: "5.2.6.06", name: "Belanja Pemeliharaan Jembatan" },
  {
    code: "5.2.6.07",
    name: "Belanja Pemeliharaan Irigasi/Saluran Sungai/Embung/Air Bersih, jaringan Air Limbah, Persampahan, dll)",
  },
  {
    code: "5.2.6.08",
    name: "Belanja Pemeliharaan Jaringan dan Instalasi (Listrik, Telepon, Internet, Komunikasi, dll)",
  },
  { code: "5.2.6.90-99", name: "Belanja Pemeliharaan Lainnya" },
  {
    code: "5.2.7",
    name: "Belanja Barang dan Jasa yang Diserahkan kepada Masyarakat",
  },
  {
    code: "5.2.7.01",
    name: "Belanja Bahan Perlengkapan yang Diserahkan ke masyarakat",
  },
  {
    code: "5.2.7.02",
    name: "Belanja Bantuan Mesin/Kendaraaan bermotor/Peralatan yang diserahkan ke masyarakat",
  },
  {
    code: "5.2.7.03",
    name: "Belanja Bantuan Bangunan yang diserahkan ke masyarakat",
  },
  { code: "5.2.7.04", name: "Belanja Beasiswa Berprestasi/Masyarakat Miskin" },
  { code: "5.2.7.05", name: "Belanja Bantuan Bibit Tanaman/Hewan/Ikan" },
  {
    code: "5.2.7.90-99",
    name: "Belanja Barang dan Jasa yang Diserahkan kepada Masyarakat Lainnya",
  },
  { code: "5.3", name: "Belanja Modal" },
  { code: "5.3.1", name: "Belanja Modal Pengadaan Tanah" },
  { code: "5.3.1.01", name: "Belanja Modal Pembebasan/Pembelian Tanah" },
  { code: "5.3.1.02", name: "Belanja Modal Pembayaran Honorarium Tim Tanah" },
  {
    code: "5.3.1.03",
    name: "Belanja Modal Pengukuran dan Pembuatan Sertifikat Tanah",
  },
  { code: "5.3.1.04", name: "Belanja Modal Pengurukan dan Pematangan Tanah" },
  { code: "5.3.1.05", name: "Belanja Modal Perjalanan Pengadaan Tanah" },
  { code: "5.3.1.90-99", name: "Belanja Modal Pengadaan Tanah Lainnya" },
  { code: "5.3.2", name: "Belanja Modal Peralatan, Mesin, dan Alat Berat" },
  {
    code: "5.3.2.01",
    name: "Belanja Modal Honor Tim yang Melaksanakan Kegiatan",
  },
  {
    code: "5.3.2.02",
    name: "Belanja Modal Peralatan Elektronik dan Alat Studio",
  },
  { code: "5.3.2.03", name: "Belanja Modal Peralatan Komputer" },
  {
    code: "5.3.2.04",
    name: "Belanja Modal Peralatan Mebeulair dan Aksesori Ruangan",
  },
  { code: "5.3.2.05", name: "Belanja Modal Peralatan Dapur" },
  { code: "5.3.2.06", name: "Belanja Modal Peralatan Alat Ukur" },
  { code: "5.3.2.07", name: "Belanja Modal Peralatan Rambu-rambu/Patok Tanah" },
  { code: "5.3.2.08", name: "Belanja Modal Peralatan khusus Kesehatan" },
  {
    code: "5.3.2.09",
    name: "Belanja Modal Peralatan khusus Pertanian/Perikanan/Peternakan",
  },
  { code: "5.3.2.10", name: "Belanja Modal Mesin" },
  { code: "5.3.2.11", name: "Belanja Modal Pengadaan Alat-Alat Berat" },
  {
    code: "5.3.2.90-99",
    name: "Belanja Modal Peralatan, Mesin, dan Alat Berat Lainnya",
  },
  { code: "5.3.3", name: "Belanja Modal Kendaraan" },
  {
    code: "5.3.3.01",
    name: "Belanja Modal Honor Tim yang Melaksanakan Kegiatan",
  },
  { code: "5.3.3.02", name: "Belanja Modal Kendaraan Darat Bermotor" },
  { code: "5.3.3.03", name: "Belanja Modal Angkutan Darat Tidak Bermotor" },
  { code: "5.3.3.04", name: "Belanja Modal Kendaraan Air Bermotor" },
  { code: "5.3.3.05", name: "Belanja Modal Angkutan Air Tidak Bermotor" },
  { code: "5.3.3.90-99", name: "Belanja Modal Kendaraan Lainnya" },
  { code: "5.3.4", name: "Belanja Modal Gedung, Bangunan dan Taman" },
  {
    code: "5.3.4.01",
    name: "Belanja Modal Honor Tim yang Melaksanakan Kegiatan",
  },
  { code: "5.3.4.02", name: "Belanja Modal Upah Tenaga Kerja" },
  { code: "5.3.4.03", name: "Belanja Modal Bahan Baku" },
  { code: "5.3.4.04", name: "Belanja Modal Sewa Peralatan" },
  { code: "5.3.5", name: "Belanja Modal Jalan/Prasarana Jalan" },
  {
    code: "5.3.5.01",
    name: "Belanja Modal Honor Tim yang Melaksanakan Kegiatan",
  },
  { code: "5.3.5.02", name: "Belanja Modal Upah Tenaga Kerja" },
  { code: "5.3.5.03", name: "Belanja Modal Bahan Baku" },
  { code: "5.3.5.04", name: "Belanja Modal Sewa Peralatan" },
  { code: "5.3.6", name: "Belanja Modal Jembatan" },
  {
    code: "5.3.6.01",
    name: "Belanja Modal Honor Tim yang Melaksanakan Kegiatan",
  },
  { code: "5.3.6.02", name: "Belanja Modal Upah Tenaga Kerja" },
  { code: "5.3.6.03", name: "Belanja Modal Bahan Baku" },
  { code: "5.3.6.04", name: "Belanja Modal Sewa Peralatan" },
  {
    code: "5.3.7",
    name: "Belanja Modal Irigasi/Embung/Air Sungai/Drainase/Air Limbah/Persampahan",
  },
  {
    code: "5.3.7.01",
    name: "Belanja Modal Honor Tim yang Melaksanakan Kegiatan",
  },
  { code: "5.3.7.02", name: "Belanja Modal Upah Tenaga Kerja" },
  { code: "5.3.7.03", name: "Belanja Modal Bahan Baku" },
  { code: "5.3.7.04", name: "Belanja Modal Sewa Peralatan" },
  { code: "5.3.8", name: "Belanja Modal Jaringan/Instalasi" },
  {
    code: "5.3.8.01",
    name: "Belanja Modal Honor Tim yang Melaksanakan Kegiatan",
  },
  { code: "5.3.8.02", name: "Belanja Modal Upah Tenaga Kerja" },
  { code: "5.3.8.03", name: "Belanja Modal Bahan Baku" },
  { code: "5.3.8.04", name: "Belanja Modal Sewa Peralatan" },
  { code: "5.3.9", name: "Belanja Modal lainnya" },
  {
    code: "5.3.9.01",
    name: "Belanja Modal khusus Pendidikan dan Perpustakaan",
  },
  { code: "5.3.9.02", name: "Belanja Modal khusus Olahraga" },
  {
    code: "5.3.9.03",
    name: "Belanja Modal khusus Kesenian/Kebudayaan/keagamaan",
  },
  { code: "5.3.9.04", name: "Belanja Modal Tumbuhan/Tanaman" },
  { code: "5.3.9.05", name: "Belanja Modal Hewan" },
  { code: "5.3.9.90-99", name: "Belanja Modal Lainnya" },
  { code: "5.4", name: "Belanja Tak Terduga" },
  { code: "5.4.1", name: "Belanja Tak Terduga" },
  { code: "5.4.1.01", name: "Belanja Tak Terduga" },
  { code: "6", name: "PEMBIAYAAN" },
  { code: "6.1", name: "Penerimaan Pembiayaan" },
  { code: "6.1.1", name: "SILPA Tahun Sebelumya" },
  { code: "6.1.1.01", name: "SILPA Tahun Sebelumnya" },
  { code: "6.1.2", name: "Pencairan Dana Cadangan" },
  { code: "6.1.2.01", name: "Pencairan Dana Cadangan" },
  { code: "6.1.3", name: "Hasil Penjualan Kekayaan Desa yang Dipisahkan" },
  { code: "6.1.3.01", name: "Hasil Penjualan Kekayaan Desa yang Dipisahkan" },
  { code: "6.1.9", name: "Penerimaan Pembiayaan Lainnya" },
  { code: "6.1.9.90-99", name: "Penerimaan Pembiayaan Lainnya" },
  { code: "6.2", name: "Pengeluaran Pembiayaan" },
  { code: "6.2.1", name: "Pembentukan Dana Cadangan" },
  { code: "6.2.1.01", name: "Pembentukan Dana Cadangan" },
  { code: "6.2.2", name: "Penyertaan Modal Desa" },
  { code: "6.2.2.01", name: "Penyertaan Modal Desa" },
  { code: "6.2.9", name: "Pengeluaran Pembiayaan lainnya" },
  { code: "6.2.9.90-99", name: "Pengeluaran Pembiayaan lainnya" },
];
