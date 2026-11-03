/**
 * Panduan halaman Dana Desa (/dana-desa) dan BLT Desa (/blt). Murni (tanpa React) agar bisa diuji.
 *
 * Aturan isi: tidak ada angka besaran, persentase, tahap, tenggat, atau nomor pasal yang ditulis di sini. Semuanya berubah
 * tiap tahun (PMK/Permendesa) dan sudah ditampilkan halaman dari katalog berversi per tahun (lib/dana-desa/rules.ts).
 * Panduan hanya menjelaskan cara kerja, istilah, dan urutan; bila perlu angka, ia merujuk ke "angka yang tampil di halaman".
 * Istilah dan daftar (status, sumber data, kriteria cadangan) diambil dari lib/blt/catalog.ts agar tidak melenceng dari aplikasi.
 */
import { CRITERIA, PROGRAM_STATUS, SOURCES } from "@/lib/blt/catalog";
import type { FieldHelp, GuideEntry, PageGuide } from "./types";

// ---------------------------------------------------------------------------------------------------------------------
// Dana Desa
// ---------------------------------------------------------------------------------------------------------------------

export const DANA_DESA_GUIDE: PageGuide = {
  id: "dana-desa",
  title: "Panduan Dana Desa",
  description: "Halaman ini memeriksa APB Desa Anda terhadap aturan penggunaan Dana Desa. Bacaan singkat, tanpa istilah hukum yang rumit.",
  buttonLabel: "Panduan",
  bannerText: "Baca panduan singkat (sekitar 2 menit) tentang urutan kerja, arti istilah, dan cara membaca hasil pemeriksaan.",
  tabs: [
    {
      id: "langkah",
      label: "Langkah",
      blocks: [
        {
          type: "steps",
          items: [
            { title: "Pilih tahun anggaran dan dokumen APB Desa", body: "Di bagian atas halaman. Dokumen bisa APB Desa awal atau salah satu Perubahan APB Desa. Yang diperiksa adalah dokumen yang Anda pilih." },
            { title: "Isi pagu di tab Ringkasan", body: "Salin angka dari keputusan pagu Dana Desa yang berlaku untuk desa Anda. Tanpa pagu, batas anggaran dan batas operasional belum bisa diperiksa. Bila belum punya, tanyakan ke kecamatan atau dinas kabupaten/kota; jangan menebak." },
            { title: "Tandai fokus tiap kegiatan", body: "Di tab Fokus kegiatan. Setiap kegiatan yang dibiayai Dana Desa ditandai masuk fokus yang mana. Tombol \"Pakai saran\" hanya usulan dari kode kegiatan; Anda yang memutuskan." },
            { title: "Baca hasil pemeriksaan dan larangan", body: "Merah berarti perlu diperbaiki, kuning perlu diperiksa, biru hanya catatan. Perbaikan anggaran dilakukan di menu APBDes, bukan di halaman ini." },
            { title: "Catat bukti publikasi", body: "Di tab Publikasi. Catat di mana dan kapan fokus penggunaan Dana Desa diumumkan ke warga. Ada tombol untuk membuka daftar yang siap dicetak untuk papan atau baliho." },
            { title: "Pantau penyaluran dan laporan", body: "Di tab Penyaluran dan laporan. Tandai laporan yang sudah disampaikan lengkap dengan tanggalnya. Volume dan realisasi keluaran diisi di menu APBDes (DPA kegiatan), lalu capaiannya tampil di sini." },
          ],
        },
        {
          type: "split",
          left: {
            title: "Dihitung otomatis oleh aplikasi",
            items: [
              "Daftar kegiatan bersumber Dana Desa, diambil dari APB Desa",
              "Sebaran anggaran per fokus dan porsi operasional terhadap batasnya",
              "Indikasi larangan penggunaan dari kode rekening dan uraian",
              "Rincian tahap penyaluran dari pagu reguler",
              "Tenggat laporan penetapan fokus, dihitung dari tanggal Perdes RKP Desa",
              "Rata-rata capaian keluaran kegiatan",
            ],
          },
          right: {
            title: "Anda yang mengisi",
            items: [
              "Pagu reguler dan pagu KDMP",
              "Status desa mandiri",
              "Penandaan fokus tiap kegiatan",
              "Pengecualian larangan beserta alasannya (Kepala Desa atau admin)",
              "Bukti publikasi",
              "Tanggal laporan yang sudah disampaikan",
            ],
          },
        },
        { type: "note", text: "Halaman ini alat bantu periksa, bukan pengganti arahan kabupaten/kota. Besaran dan tenggat mengikuti aturan tahun anggaran yang dipilih dan ditampilkan di halaman; bila muncul peringatan aturan tahun itu belum tersedia, cek peraturan terbaru sebelum mengandalkan angkanya." },
      ],
    },
    {
      id: "istilah",
      label: "Istilah",
      blocks: [
        {
          type: "glossary",
          items: [
            { term: "Dana Desa", meaning: "Dana dari anggaran negara untuk desa. Di APB Desa, barisnya ditandai kode sumber dana \"DD\"." },
            { term: "Pagu reguler", meaning: "Jumlah Dana Desa reguler yang ditetapkan untuk desa Anda tahun ini. Batas operasional dan tahap penyaluran dihitung dari angka ini." },
            { term: "Pagu KDMP", meaning: "Jumlah yang dialokasikan terpisah untuk mendukung Koperasi Desa Merah Putih. Isi hanya bila ada di keputusan pagu desa Anda." },
            { term: "Fokus penggunaan", meaning: "Kelompok tujuan penggunaan Dana Desa yang ditetapkan pemerintah untuk tahun itu, ditambah satu kelompok \"Operasional Pemerintah Desa\". Daftarnya tampil di pilihan tab Fokus kegiatan." },
            { term: "Operasional Pemerintah Desa", meaning: "Biaya menjalankan pemerintahan desa yang dibiayai Dana Desa. Ada batas persentase dari pagu reguler; angkanya tampil di tab Ringkasan." },
            { term: "Tahap I dan Tahap II", meaning: "Dana Desa reguler disalurkan dua kali. Besar tiap tahap tampil di tab Penyaluran dan laporan." },
            { term: "Desa mandiri", meaning: "Status desa menurut Indeks Desa. Bila dicentang, pembagian tahap penyaluran memakai urutan yang berbeda." },
            { term: "Perdes APB Desa", meaning: "Peraturan Desa tentang APB Desa. Penetapannya menjadi salah satu syarat penyaluran." },
            { term: "Perdes RKP Desa", meaning: "Peraturan Desa tentang rencana kerja tahunan desa. Tanggalnya dipakai untuk menghitung tenggat laporan penetapan fokus." },
            { term: "DPA", meaning: "Dokumen Pelaksanaan Anggaran per kegiatan di menu APBDes. Volume keluaran dan realisasinya diisi di sana." },
            { term: "Capaian keluaran", meaning: "Seberapa banyak hasil kegiatan tercapai dibanding targetnya. Kegiatan yang belum diisi dihitung nol persen agar angka tidak tampak lebih baik dari kenyataan." },
            { term: "Berdasar rekening / berdasar uraian", meaning: "Berdasar rekening: dari kode rekening anggaran, jelas terkait larangan. Berdasar uraian: hanya perkiraan dari kata dalam uraian, perlu dicek oleh orangnya." },
            { term: "ADD", meaning: "Alokasi Dana Desa, bersumber dari kabupaten/kota. Berbeda dengan Dana Desa; biaya yang tidak boleh memakai Dana Desa kadang bisa dibebankan ke sumber lain." },
          ],
        },
      ],
    },
    {
      id: "tips",
      label: "Tips & akhir",
      blocks: [
        {
          type: "list",
          items: [
            "Penandaan fokus berlaku untuk semua dokumen APB Desa pada tahun yang sama, termasuk Perubahan.",
            "Temuan merah soal rekening: pindahkan ke sumber dana lain, atau Kepala Desa/admin mencatat pengecualian bila memang diperbolehkan.",
            "Temuan \"berdasar uraian\" hanya perkiraan. Baca uraian barisnya dulu sebelum memutuskan.",
            "Pengecualian wajib beralasan jelas (minimal 15 huruf). Alasan itu tercatat dan dapat diperiksa pengawas. Pengecualian bisa dicabut kembali.",
            "Tenggat laporan penetapan fokus baru muncul setelah Perdes RKP Desa dihubungkan pada dokumen RKP Desa tahun itu.",
            "Pagu yang diisi hanya angka dari keputusan resmi. Bila tidak yakin, kosongkan dan tanyakan dulu.",
            "Publikasi fokus penggunaan wajib dilakukan sejak APB Desa ditetapkan; akibat bila tidak dilakukan dijelaskan di tab Publikasi.",
            "Ragu soal aturan? Tanyakan ke pendamping desa atau dinas pemberdayaan masyarakat desa di kabupaten/kota Anda.",
          ],
        },
        { type: "note", text: "Dasar aturan tertulis di halaman dan di dalam temuan (kolom \"Dasar\"). Aturan berganti tiap tahun anggaran, jadi periksa tahun yang sedang Anda pilih." },
      ],
    },
  ],
};

/** Kunci petunjuk kolom Dana Desa; sama dengan id kolom di halaman (hint = `${id}-hint`). */
export const DANA_DESA_FIELD_IDS = {
  regular: "dd-regular",
  kdmp: "dd-kdmp",
  location: "pb-loc",
} as const;
export type DanaDesaFieldKey = keyof typeof DANA_DESA_FIELD_IDS;

const DANA_DESA_FIELDS: Record<DanaDesaFieldKey, FieldHelp> = {
  regular: {
    tip: "Isi dengan angka dari keputusan pagu Dana Desa yang berlaku untuk desa Anda tahun ini. Batas operasional dan tahap penyaluran dihitung dari angka ini. Belum punya keputusannya? Kosongkan dulu, jangan memakai angka perkiraan.",
    example: "Keputusan pagu Dana Desa … tahun anggaran …, bagian Dana Desa reguler untuk Desa …: Rp …. Salin angka itu apa adanya.",
  },
  kdmp: {
    tip: "Isi hanya bila keputusan pagu desa memuat dukungan Koperasi Desa Merah Putih (KDMP) secara terpisah dari pagu reguler. Bila tidak ada, biarkan kosong.",
  },
  location: {
    tip: "Tulis tempat warga bisa melihat pengumumannya: letak papan atau baliho, atau alamat website atau akun media sosial desa.",
    example: "Papan informasi di depan …, Dusun …; atau alamat halaman pengumuman: https://… ",
  },
};

export function danaDesaFieldHelp(key: DanaDesaFieldKey): FieldHelp {
  return DANA_DESA_FIELDS[key];
}

// ---------------------------------------------------------------------------------------------------------------------
// BLT Desa
// ---------------------------------------------------------------------------------------------------------------------

const STATUS_BODY: Record<keyof typeof PROGRAM_STATUS, string> = {
  DRAFT: "Daftar penerima dan isian program masih bisa diubah. Pembayaran belum bisa dicatat. Program draf boleh dihapus selama belum ada pembayaran atau SPP.",
  DITETAPKAN: "Daftar penerima terkunci. Pembayaran dapat dicatat. Penerima hanya bisa diganti lewat Musyawarah Desa khusus. Yang masih bisa diubah: tanggal pelaporan kepada bupati dan catatan.",
  SELESAI: "Pembayaran baru tidak dapat dicatat. Program dapat dibuka kembali bila ada koreksi.",
};

export const BLT_GUIDE: PageGuide = {
  id: "blt",
  title: "Panduan BLT Desa",
  description: "Urutan menetapkan penerima dan mencatat pembayaran BLT Desa. Berlaku untuk daftar program maupun halaman satu program.",
  buttonLabel: "Panduan",
  bannerText: "Baca panduan singkat (sekitar 2 menit) tentang urutan penetapan penerima, pembayaran, dan cara mengganti penerima.",
  tabs: [
    {
      id: "alur",
      label: "Alur",
      blocks: [
        {
          type: "steps",
          items: [
            { title: "Buat program BLT tahun ini", body: "Tombol \"Program BLT baru\". Satu program per tahun. Isi judul, nilai per keluarga per bulan, dan jumlah bulan. Aplikasi menolak nilai yang melebihi batas aturan tahun itu; batas tampil di samping kolomnya." },
            { title: "Data calon penerima", body: "Di tab Penerima, cari warga lewat nama, awalan NIK, atau awalan KK. Satu keluarga (KK) satu penerima, diwakili satu warga. Pilih sumber datanya dan kategorinya." },
            { title: "Musyawarah Desa", body: "Daftar penerima harus diputuskan lewat Musyawarah Desa. Jadwalkan di menu Musyawarah Desa dengan jenis penetapan penerima BLT Desa, tandai terlaksana, lalu susun berita acaranya." },
            { title: "Keputusan Kepala Desa", body: "Di tab Program dan SK: pilih musyawarah tadi, isi nomor dan tanggal Keputusan Kepala Desa. Lampiran daftar penerima untuk SK bisa dicetak dari bagian Cetak." },
            { title: "Tetapkan program", body: "Hanya Kepala Desa atau admin. Aplikasi memeriksa: musyawarah sudah terhubung dan terlaksana, nomor serta tanggal keputusan terisi, ada minimal satu penerima, dan nilai tidak melebihi batas. Setelah ditetapkan, daftar terkunci." },
            { title: "Laporkan ke bupati lewat camat", body: "Catat tanggal keputusan diserahkan kepada bupati/wali kota melalui camat. Selama belum dicatat, aplikasi menampilkan pengingat." },
            { title: "Catat pembayaran", body: "Di tab Pembayaran, per keluarga. Cetak daftar tanda terima, simpan tanda terima yang sudah ditandatangani, lalu unggah ke dokumen program." },
          ],
        },
        {
          type: "split",
          left: {
            title: "Dijaga otomatis oleh aplikasi",
            items: [
              "Batas nilai per bulan dan batas jumlah bulan yang boleh dibayar sekaligus",
              "Jumlah yang dibayar = nilai per bulan × jumlah bulan",
              "Bulan yang sudah dibayar tidak bisa dibayar dua kali",
              "Tanggal bayar tidak boleh di masa depan atau sebelum tanggal keputusan",
              "Daftar terkunci setelah program ditetapkan",
              "NIK disamarkan di layar; pencetakan tercatat di log audit",
            ],
          },
          right: {
            title: "Anda yang mengerjakan",
            items: [
              "Mendata dan memilih penerima",
              "Menjadwalkan dan menandai terlaksana Musyawarah Desa",
              "Mengisi nomor dan tanggal Keputusan Kepala Desa",
              "Mencatat pelaporan ke bupati",
              "Mencatat setiap pembayaran dan siapa yang menerima",
              "Mengunggah SK, berita acara, dan tanda terima",
            ],
          },
        },
        { type: "note", text: "Dasar aturan: Permendesa PDT 16/2025. Batas nilai dan jumlah bulan mengikuti aturan tahun program dan ditampilkan di layar; bila tahunnya belum tercatat di aplikasi, muncul peringatan agar Anda memeriksa peraturan tahun itu." },
      ],
    },
    {
      id: "penerima",
      label: "Penerima",
      blocks: [
        {
          type: "cards",
          title: "Dua sumber data penerima",
          items: [
            { title: SOURCES.PEMERINTAH, body: "Pilih bila warga tercantum pada data keluarga miskin dari Pemerintah yang menjadi acuan desa. Tidak perlu memilih kriteria." },
            { title: SOURCES.DESA, body: "Pilih hanya bila desa tidak memiliki data dari Pemerintah. Anda wajib mencentang minimal satu kriteria di bawah ini." },
          ],
        },
        { type: "list", title: "Kriteria cadangan yang dapat dipilih", items: Object.values(CRITERIA) },
        {
          type: "list",
          title: "Yang diperiksa aplikasi saat memilih warga",
          items: [
            "Keluarga yang sudah terdaftar di program ini tidak bisa dipilih lagi.",
            "Warga yang tercatat meninggal atau pindah tidak bisa dipilih. Bila ini terjadi setelah penetapan, muncul peringatan di baris penerima.",
            "Peringatan NIK belum 16 digit: terbitkan surat keterangan domisili dan bantu warga mengurus administrasi kependudukannya.",
            "Bila kriteria \"tidak menerima PKH\" dipilih tetapi warga tercatat di program PKH, muncul peringatan.",
            "Calon penerima baru sah setelah Musyawarah Desa dan Keputusan Kepala Desa. Jangan menyebut nama kepada warga sebelum itu.",
          ],
        },
        {
          type: "steps",
          title: "Mengganti atau mengakhiri penerima (setelah program ditetapkan)",
          items: [
            { title: "Jadwalkan Musyawarah Desa khusus", body: "Jenis penggantian penerima BLT Desa, di menu Musyawarah Desa. Harus sudah terlaksana." },
            { title: "Klik \"Ganti atau akhiri\" pada penerima", body: "Tulis alasannya, mis. meninggal dunia atau tidak lagi memenuhi kriteria, dan nomor Keputusan Kepala Desa tentang perubahan." },
            { title: "Pilih keluarga pengganti, atau akhiri tanpa pengganti", body: "Pengganti harus keluarga lain (KK berbeda). Ia berhak mulai dari bulan setelah pembayaran terakhir penerima lama. Tanpa pengganti, alasannya tetap harus ada di berita acara musyawarah khusus." },
          ],
        },
      ],
    },
    {
      id: "pembayaran",
      label: "Pembayaran",
      blocks: [
        {
          type: "list",
          title: "Cara mencatat pembayaran",
          items: [
            "\"Bulan ke-1\" berarti bulan pertama program, bukan Januari. Jumlah bulan sesuai isian program.",
            "Klik \"Catat pembayaran\" pada keluarga yang bersangkutan, pilih bulan mulai dan berapa bulan sekaligus. Jumlah rupiah terhitung otomatis.",
            "Tunai atau nontunai: pilih sesuai yang terjadi. Kolom \"Diterima oleh\" terisi nama penerima; bila diwakilkan, tulis nama dan hubungannya.",
            "Pembayaran memakai dana yang sudah diajukan lewat SPP. Panel pengajuan SPP ada di atas tab; jumlah dana siap dipakai tampil di formulir pembayaran.",
            "Salah catat? Batalkan pembayaran selama program belum selesai, lalu catat ulang. Program selesai harus dibuka kembali dulu.",
            "Cetak daftar tanda terima dan rekap dari bagian Cetak. Dokumen cetak memuat NIK lengkap, jadi simpan dan bagikan seperlunya.",
          ],
        },
        {
          type: "cards",
          title: "Arti status program",
          items: (Object.keys(PROGRAM_STATUS) as (keyof typeof PROGRAM_STATUS)[]).map((k) => ({ title: PROGRAM_STATUS[k], body: STATUS_BODY[k] })),
        },
      ],
    },
    {
      id: "istilah",
      label: "Istilah",
      blocks: [
        {
          type: "glossary",
          items: [
            { term: "BLT Desa", meaning: "Bantuan Langsung Tunai yang bersumber dari Dana Desa untuk keluarga yang memenuhi kriteria." },
            { term: "Keluarga penerima manfaat", meaning: "Satu keluarga (satu KK) yang masuk daftar penerima, diwakili satu warga." },
            { term: "Musyawarah Desa", meaning: "Forum desa yang menyepakati daftar penerima. Ada jenis biasa (penetapan) dan jenis khusus (penggantian)." },
            { term: "Keputusan Kepala Desa (SK)", meaning: "Surat yang menetapkan daftar penerima. Nomor dan tanggalnya dicatat di aplikasi." },
            { term: "Data Pemerintah", meaning: "Data keluarga miskin dari Pemerintah yang menjadi acuan desa." },
            { term: "Kriteria cadangan", meaning: "Kriteria yang dipakai Kepala Desa bila desa tidak punya data dari Pemerintah." },
            { term: "Kategori penerima", meaning: "Golongan penerima menurut hasil Musyawarah Desa. Isian bawaan aplikasi adalah \"Miskin ekstrem\"." },
            { term: "PKH", meaning: "Program Keluarga Harapan, bantuan sosial dari Pemerintah." },
            { term: "SPP", meaning: "Surat Permintaan Pembayaran: pengajuan dana dari kas desa untuk membayar BLT." },
            { term: "KK dan NIK", meaning: "Nomor Kartu Keluarga dan Nomor Induk Kependudukan, diambil dari data warga." },
          ],
        },
      ],
    },
  ],
};

/** Petunjuk kolom BLT. Kunci → id kolom di halaman (hint = `${id}-hint`; untuk pemilih penerima, awalan `add`/`rep` di depannya). */
export const BLT_FIELD_IDS = {
  meeting: "pr-meeting",
  decreeNumber: "pr-no",
  reported: "pr-rep",
  source: "-src",
  category: "-cat",
  replaceReason: "rp-reason",
} as const;
export type BltFieldKey = keyof typeof BLT_FIELD_IDS;

const BLT_FIELDS: Record<BltFieldKey, FieldHelp> = {
  meeting: {
    tip: "Pilih Musyawarah Desa yang benar-benar menyepakati daftar penerima. Hanya musyawarah berjenis penetapan penerima BLT Desa yang muncul. Program baru bisa ditetapkan bila musyawarah ini sudah ditandai terlaksana.",
  },
  decreeNumber: {
    tip: "Tulis nomor Keputusan Kepala Desa yang menetapkan daftar penerima, persis seperti di surat. Nomor dan tanggal keputusan wajib terisi sebelum program ditetapkan.",
    example: "Keputusan Kepala Desa … Nomor … Tahun … tentang Penetapan Keluarga Penerima Manfaat BLT Desa Tahun ….",
  },
  reported: {
    tip: "Isi tanggal Keputusan Kepala Desa diserahkan kepada bupati/wali kota melalui camat. Bila kosong, aplikasi terus mengingatkan. Simpan tanda terima penyerahan di dokumen program.",
    example: "Keputusan diserahkan ke kantor camat … pada tanggal …, tanda terimanya sudah diarsipkan.",
  },
  source: {
    tip: "Pilih \"Data Pemerintah\" bila warga ada pada data keluarga miskin dari Pemerintah. Pilih \"Kriteria cadangan\" hanya bila desa tidak punya data itu, lalu centang kriteria yang benar-benar berlaku bagi keluarga ini.",
  },
  category: {
    tip: "Isi sesuai hasil Musyawarah Desa. Isian bawaan \"Miskin ekstrem\" biarkan bila musyawarah tidak menetapkan kategori lain.",
  },
  replaceReason: {
    tip: "Tulis sebab penerima diganti atau diakhiri, misalnya meninggal dunia atau tidak lagi memenuhi kriteria. Alasan yang sama harus tercantum dalam berita acara Musyawarah Desa khusus.",
    example: "Penerima … meninggal dunia pada …; pengganti disepakati dalam Musyawarah Desa khusus tanggal ….",
  },
};

export function bltFieldHelp(key: BltFieldKey): FieldHelp {
  return BLT_FIELDS[key];
}

// ---------------------------------------------------------------------------------------------------------------------

export const DANA_DESA_GUIDE_ENTRIES: GuideEntry[] = [
  {
    guide: DANA_DESA_GUIDE,
    href: "/dana-desa",
    summary: "Memeriksa penggunaan Dana Desa di APB Desa: pagu, fokus kegiatan, larangan, publikasi, dan kesiapan laporan penyaluran.",
  },
  {
    guide: BLT_GUIDE,
    href: "/blt",
    summary: "Urutan menetapkan penerima BLT Desa lewat Musyawarah Desa dan SK Kepala Desa, mencatat pembayaran, dan mengganti penerima.",
  },
];
