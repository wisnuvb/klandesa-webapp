/**
 * Panduan halaman RPJM Desa: "Tahapan RPJM Desa" (/rpjm) dan menu lama "RPJMDes" (/rpjmdes).
 * Murni (tanpa React) agar bisa diuji. Isi bersumber dari perilaku kode (tahapan, gerbang, peringatan, peran, API), bukan dari bunyi pasal.
 * Sengaja TIDAK memuat nomor pasal, tenggat, atau angka hukum: rujukan pasal yang sudah ada di kode tampil di kartu tahapan itu sendiri.
 * Contoh isian hanya ditampilkan, tidak pernah disalin otomatis ke kolom.
 */
import type { FieldHelp, GuideEntry, PageGuide } from "./types";

// --- /rpjm: Tahapan RPJM Desa ---------------------------------------------------------------

export const RPJM_GUIDE: PageGuide = {
  id: "rpjm",
  title: "Panduan Tahapan RPJM Desa",
  description: "Menyusun RPJM Desa selangkah demi selangkah, dari tim penyusun sampai Peraturan Desa.",
  bannerText: "Baca panduan singkat (sekitar 2 menit) sebelum menyusun RPJM Desa.",
  tabs: [
    {
      id: "langkah",
      label: "Langkah",
      blocks: [
        {
          type: "steps",
          title: "Urutan kerja",
          items: [
            { title: "Buat dokumen", body: "Di daftar, tekan \"Buat RPJM Desa\". Isi judul dan tahun awal-akhir (bawaan 8 tahun). Tanggal pelantikan Kepala Desa boleh dikosongkan; bila diisi, aplikasi menghitung tenggat penetapan Perdes." },
            { title: "Tahap 1: Bentuk tim penyusun", body: "Di tab \"Tim penyusun\", tambahkan anggota. Lalu isi tanggal dan nomor keputusan Kepala Desa di tahap 1. Aplikasi memberi peringatan bila komposisi tim belum sesuai." },
            { title: "Tahap 2: Pengkajian keadaan desa", body: "Tulis ringkasan hasilnya di tab \"Isi rancangan\". Catat tanggal dan nomor berita acara di tahap 2." },
            { title: "Tahap 3: Musyawarah Desa", body: "Jadwalkan dan laksanakan di menu Musyawarah Desa, tandai terlaksana, lalu pilih dan hubungkan di tahap 3." },
            { title: "Tahap 4: Susun rancangan", body: "Isi visi, misi, dan arah kebijakan di \"Isi rancangan\", lalu tambahkan program per bidang dan tahun di tab \"Program\". Setelah lengkap, tekan \"Tandai rancangan selesai\"." },
            { title: "Tahap 5: Persetujuan Kepala Desa", body: "Kepala Desa (atau admin) menekan \"Setujui rancangan\"." },
            { title: "Tahap 6: Pembahasan rancangan", body: "Hubungkan musyawarah yang sudah terlaksana dan membahas rancangan ini (Musrenbangdes atau Musyawarah Desa perencanaan)." },
            { title: "Tahap 7: Peraturan Desa", body: "Catat Perdes di menu Produk Hukum lebih dulu, lalu hubungkan di tahap 7 dengan \"Hubungkan dan kunci\". Setelah itu isi dokumen terkunci." },
          ],
        },
        {
          type: "list",
          title: "Yang dipaksa aplikasi",
          items: [
            "\"Tandai rancangan selesai\" baru bisa ditekan bila visi, misi, arah kebijakan sudah terisi dan ada paling sedikit satu program.",
            "Perdes baru bisa dihubungkan bila rancangan sudah ditandai selesai, disetujui Kepala Desa, dan dibahas dalam musyawarah yang sudah terlaksana.",
            "Selain itu urutan tahap tidak dipaksa. Yang kurang hanya diberi catatan atau peringatan.",
          ],
        },
      ],
    },
    {
      id: "otomatis",
      label: "Apa yang otomatis",
      blocks: [
        {
          type: "split",
          left: {
            title: "Terisi otomatis",
            items: [
              "Kemajuan tahap dan tahap berikutnya",
              "Tenggat penetapan Perdes, bila tanggal pelantikan diisi",
              "Catatan kelengkapan tiap program dan peringatan komposisi tim",
              "Tab Keselarasan: hal yang perlu disesuaikan dan tabel anggaran indikatif per bidang per tahun",
              "Jumlah program yang sudah dijabarkan ke RKP Desa",
              "Dokumen cetak: dokumen RPJM Desa, matriks program dan anggaran, lampiran tim penyusun",
            ],
          },
          right: {
            title: "Anda yang mengisi",
            items: [
              "Judul, periode, dan tanggal pelantikan",
              "Visi, misi, arah kebijakan, dan ringkasan pengkajian",
              "Program per bidang dan tahun, beserta anggaran indikatif",
              "Anggota tim penyusun dan nomor keputusan",
              "Tanggal dan nomor berita acara tiap tahap",
              "Tautan ke musyawarah (dari menu Musyawarah Desa) dan ke Perdes (dari menu Produk Hukum)",
            ],
          },
        },
        {
          type: "note",
          text: "Program di sini adalah rencana jangka menengah. Tahun demi tahun, program dijabarkan menjadi kegiatan di menu RKPDes; saat menyusun kegiatan RKP Desa, Anda bisa memilih program asalnya (tidak wajib).",
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
            { term: "RPJM Desa", meaning: "Rencana Pembangunan Jangka Menengah Desa. Aplikasi memakai jangka waktu 8 tahun; periode lain tetap bisa disimpan tetapi ditandai perlu penyesuaian." },
            { term: "RKP Desa", meaning: "Rencana Kerja Pemerintah Desa, rencana tahunan yang dijabarkan dari RPJM Desa. Disusun di menu RKPDes." },
            { term: "Visi dan misi", meaning: "Visi: keadaan desa yang ingin dicapai. Misi: langkah-langkah besar untuk mencapainya. Keduanya milik Kepala Desa terpilih." },
            { term: "Arah kebijakan", meaning: "Ke mana pembangunan desa diarahkan selama periode ini, diturunkan dari visi dan misi." },
            { term: "Pengkajian keadaan desa", meaning: "Pemeriksaan keadaan desa sebelum merencanakan: sumber daya, masalah, potensi, dan usulan dusun atau kelompok masyarakat." },
            { term: "Berita acara", meaning: "Catatan tertulis resmi hasil suatu kegiatan, misalnya hasil pengkajian atau selesainya rancangan." },
            { term: "Musyawarah Desa", meaning: "Pertemuan resmi desa untuk membahas hal penting. Dicatat di menu Musyawarah Desa, lalu dihubungkan ke tahap." },
            { term: "Musrenbangdes", meaning: "Musyawarah perencanaan pembangunan desa. Boleh dipakai untuk tahap pembahasan rancangan; aplikasi menerima Musrenbangdes maupun Musyawarah Desa perencanaan." },
            { term: "Perdes", meaning: "Peraturan Desa. Perdes tentang RPJM Desa dicatat di menu Produk Hukum, lalu dihubungkan ke dokumen ini." },
            { term: "Bidang 1-4", meaning: "Penyelenggaraan Pemerintahan Desa; Pelaksanaan Pembangunan Desa; Pembinaan Kemasyarakatan Desa; Pemberdayaan Masyarakat Desa." },
            { term: "Anggaran indikatif", meaning: "Perkiraan biaya untuk perencanaan, bukan angka final. Angka final ditetapkan dalam APB Desa." },
            { term: "Kode kegiatan", meaning: "Kode dari daftar kegiatan baku (Permendagri 20/2018) per bidang. Memudahkan penjabaran ke RKP Desa dan APB Desa." },
            { term: "Pola pelaksanaan", meaning: "Cara kegiatan dikerjakan: swakelola desa, kerja sama antar-desa, atau kerja sama dengan pihak ketiga." },
            { term: "Keselarasan", meaning: "Tab yang menampilkan hal yang perlu diperiksa, misalnya program di luar periode atau bidang yang belum punya program. Tidak memblokir." },
            { term: "Buka kunci", meaning: "Cara mengubah RPJM Desa yang sudah ditetapkan dengan Perdes. Butuh alasan yang dicatat." },
          ],
        },
      ],
    },
    {
      id: "tips",
      label: "Tips",
      blocks: [
        {
          type: "list",
          items: [
            "Kolom yang belum lengkap tetap bisa disimpan. Aplikasi memberi catatan, kecuali pada dua syarat di tab Langkah.",
            "Tahun program harus berada di dalam periode dokumen. Program di luar periode ditandai dan tidak masuk tabel anggaran.",
            "Mengubah visi, misi, arah kebijakan, atau program setelah Kepala Desa menyetujui akan mencabut persetujuan. Rancangan perlu disetujui ulang.",
            "Setelah Perdes dihubungkan, isi terkunci; hanya catatan Rencana Jangka Menengah SDGs Desa yang masih bisa diisi.",
            "Untuk mengubah dokumen yang terkunci, Kepala Desa atau admin memakai \"Buka kunci untuk perubahan\" dan memilih alasan. Penanda selesai, persetujuan, serta tautan musyawarah pembahasan dan Perdes dibatalkan, sehingga perlu dilakukan lagi.",
            "Perdes yang sudah ada sebelum desa memakai aplikasi: Kepala Desa atau admin dapat mencentang pilihan \"sudah ditetapkan sebelum desa memakai aplikasi\" dan menulis alasannya. Isi tetap dikunci.",
            "Dokumen RPJM Desa lama (dibuat di menu RPJMDes) tampil di daftar ini dan isinya tidak diubah. Mulai catat tahapan bila ingin mengunci setelah Perdes.",
            "Rencana Jangka Menengah SDGs Desa diisi di aplikasi SID. Aplikasi ini belum terhubung ke SID; cukup catat tanggal selesainya di tab \"Isi rancangan\".",
          ],
        },
      ],
    },
  ],
};

// --- /rpjmdes: menu RPJMDes (lama) -----------------------------------------------------------

export const RPJMDES_GUIDE: PageGuide = {
  id: "rpjmdes",
  title: "Panduan RPJMDes",
  description: "Mencatat rencana, usulan Musyawarah Desa, dan kegiatan berskor prioritas SDGs.",
  bannerText: "Baca panduan singkat (sekitar 2 menit) agar tidak tertukar dengan menu Tahapan RPJM Desa.",
  tabs: [
    {
      id: "langkah",
      label: "Langkah",
      blocks: [
        {
          type: "steps",
          items: [
            { title: "Pilih atau tambah rencana", body: "Pilih di \"Rencana aktif\", atau tekan \"Tambah Rencana\" dan isi judul serta tahun awal-akhir. Rencana baru dari sini langsung berstatus aktif." },
            { title: "Catat usulan", body: "Di tab \"Usulan Musdes\", tekan \"Usulan Warga / Musdes\". Isi pengusul, judul, deskripsi, dan tag SDGs. RT/RW boleh dikosongkan. Usulan masuk berstatus diajukan dan skor prioritasnya dihitung otomatis." },
            { title: "Setujui atau tolak", body: "Hanya Kepala Desa atau admin. \"Setujui\" mengubah usulan menjadi kegiatan RKP untuk tahun berjalan; \"Tolak\" menandainya ditolak." },
            { title: "Kelola kegiatan", body: "Di tab \"Kegiatan RKP\", tambahkan kegiatan langsung, tandai \"Selesai\" bila sudah tuntas. Tombol tempat sampah menghapus kegiatan langsung." },
            { title: "Susun dokumen resminya di menu lain", body: "RPJM Desa bertahap disusun di Tahapan RPJM Desa; dokumen RKP Desa tahunan disusun di menu RKPDes." },
          ],
        },
      ],
    },
    {
      id: "beda",
      label: "Beda dengan RPJM",
      blocks: [
        {
          type: "cards",
          title: "Dua menu, dua fungsi",
          items: [
            {
              title: "RPJMDes (halaman ini)",
              badge: "sedang dibuka",
              highlight: true,
              body: "Pencatatan cepat: daftar rencana, usulan Musyawarah Desa, dan kegiatan yang diurutkan menurut skor prioritas SDGs.",
              facts: [
                { label: "Ada", value: "Usulan Musdes, kegiatan RKP, skor prioritas SDGs." },
                { label: "Tidak ada", value: "Tahapan penyusunan, tim penyusun, program per bidang dengan anggaran, penguncian setelah Perdes." },
              ],
            },
            {
              title: "Tahapan RPJM Desa",
              badge: "menu /rpjm",
              body: "Penyusunan dokumen RPJM Desa secara bertahap sampai Peraturan Desa, lalu dikunci.",
              facts: [
                { label: "Ada", value: "Tahapan 1-7, tim penyusun, visi-misi, arah kebijakan, program per bidang dan tahun, cetak." },
                { label: "Tidak ada", value: "Usulan Musdes dan skor prioritas SDGs." },
              ],
            },
          ],
        },
        {
          type: "list",
          title: "Yang perlu diingat",
          items: [
            "Keduanya memakai daftar rencana yang sama. Rencana yang dibuat di sini juga tampil di Tahapan RPJM Desa; bila belum ada tahapan tercatat, tampil sebagai dokumen lama.",
            "Kegiatan RKP dan usulan di halaman ini terpisah dari \"Program\" di Tahapan RPJM Desa. Keduanya tidak saling menyalin otomatis.",
            "Kegiatan yang dicatat di sini tidak otomatis masuk ke dokumen RKP Desa bertahap di menu RKPDes.",
            "Isi rencana (judul, periode, visi, misi) yang sudah terkunci Perdes atau sudah disetujui Kepala Desa hanya diubah lewat Tahapan RPJM Desa.",
          ],
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
            { term: "Usulan Musdes", meaning: "Usulan warga atau peserta musyawarah yang dicatat di sini sebelum diputuskan." },
            { term: "Kegiatan RKP", meaning: "Kegiatan yang direncanakan pada tahun tertentu di bawah satu rencana. Asalnya dari usulan yang disetujui (\"musdes_proposal\") atau diisi langsung (\"internal\")." },
            { term: "Tag SDGs", meaning: "Tujuan Pembangunan Berkelanjutan (SDGs Desa) yang disasar sebuah usulan atau kegiatan. Boleh memilih sampai 5." },
            { term: "Skor prioritas", meaning: "Angka 0-100; makin tinggi makin diutamakan. Dihitung otomatis dari tag SDGs dan capaian SDGs desa: tujuan yang capaiannya rendah menghasilkan skor tinggi. Tanpa tag, skornya 50." },
            { term: "Prioritas SDGs (kartu atas)", meaning: "Jumlah kegiatan pada rencana yang dipilih dengan skor 60 ke atas." },
            { term: "Status usulan", meaning: "submitted = diajukan, menunggu keputusan; approved = disetujui dan sudah menjadi kegiatan; rejected = ditolak." },
            { term: "Status kegiatan", meaning: "planned = direncanakan; completed = selesai (setelah tombol \"Selesai\")." },
          ],
        },
      ],
    },
  ],
};

export const RPJM_GUIDE_ENTRIES: GuideEntry[] = [
  { guide: RPJM_GUIDE, href: "/rpjm", summary: "Menyusun RPJM Desa bertahap: tim, pengkajian, musyawarah, rancangan, persetujuan, dan Peraturan Desa." },
  { guide: RPJMDES_GUIDE, href: "/rpjmdes", summary: "Mencatat rencana, usulan Musdes, dan kegiatan berskor prioritas SDGs; beda dengan Tahapan RPJM Desa." },
];

// --- Petunjuk kolom -------------------------------------------------------------------------

/**
 * Kunci = nama kolom di kode (rpjm/_components/ContentTab.tsx dan ProgramsTab.tsx). Tes menjaga kunci tetap ada di berkas itu.
 * Tidak ada `ref`: nomor pasal tidak diverifikasi ulang untuk panduan ini.
 */
export const RPJM_FIELD_HELP = {
  vision: {
    tip: "Visi adalah gambaran keadaan desa yang ingin dicapai, cukup satu atau dua kalimat. Tulis visi Kepala Desa terpilih.",
    example: "Terwujudnya desa yang …, …, dan … .",
  },
  mission: {
    tip: "Misi adalah langkah-langkah besar untuk mencapai visi. Tulis satu misi per baris agar mudah dibaca di dokumen cetak.",
    example: "1. Meningkatkan … ; 2. Memperkuat … ; 3. Mengembangkan … .",
  },
  policyDirection: {
    tip: "Jelaskan ke mana pembangunan desa diarahkan selama periode ini, diturunkan dari visi dan misi. Pertimbangkan keadaan nyata desa, kearifan lokal, dan arah kebijakan kabupaten/kota.",
    example: "Pembangunan desa diarahkan pada …, dengan memperhatikan … dan potensi … di desa.",
  },
  reviewSummary: {
    tip: "Ringkas hasil pengkajian keadaan desa: sumber daya alam dan manusia, pembangunan, sosial budaya, masalah dan potensi, serta usulan dusun atau kelompok. Rincian lengkap tetap di berita acara.",
    example: "Pengkajian dilakukan pada … . Potensi desa: … . Masalah utama: … . Usulan dusun/kelompok: … .",
  },
  activityCode: {
    tip: "Pilih kegiatan baku yang paling mendekati program ini. Daftarnya mengikuti Bidang yang dipilih, jadi pilih Bidang lebih dulu. Kode memudahkan penjabaran ke RKP Desa dan APB Desa.",
    example: "Pilih Bidang …, lalu cari kegiatan yang paling mirip dengan program Anda, misalnya dengan kata kunci … .",
  },
  budget: {
    tip: "Isi perkiraan biaya hanya untuk Tahun pelaksanaan yang dipilih, bukan jumlah seluruh periode. Satu program mencatat satu tahun. Ini angka perkiraan, bukan angka final APB Desa.",
    example: "Program berlangsung di tahun …: isi perkiraan biaya tahun itu saja. Untuk tahun lain, tambahkan program untuk tahun tersebut.",
  },
  method: {
    tip: "Pilih siapa yang mengerjakan: desa sendiri (swakelola), bersama desa lain, atau bersama pihak ketiga.",
    example: "Pekerjaan … dikerjakan sendiri oleh perangkat dan warga desa: pilih Swakelola Desa.",
  },
  benefit: {
    tip: "Tulis siapa yang merasakan hasilnya dan kira-kira berapa banyak.",
    example: "… keluarga atau … orang di dusun … .",
  },
} as const satisfies Record<string, FieldHelp>;

export type RpjmFieldKey = keyof typeof RPJM_FIELD_HELP;

/** Petunjuk kolom Tahapan RPJM Desa; undefined bila kolom tidak diberi petunjuk. */
export function rpjmFieldHelp(key: string): FieldHelp | undefined {
  return Object.hasOwn(RPJM_FIELD_HELP, key) ? RPJM_FIELD_HELP[key as RpjmFieldKey] : undefined;
}

/** Kunci = nama kolom di app/(app)/rpjmdes/page.tsx. */
export const RPJMDES_FIELD_HELP = {
  periodEnd: {
    tip: "Isian awal sudah tahun awal + 7, karena RPJM Desa kini berjangka 8 tahun (tahun awal ikut dihitung). Bila periode dokumen Anda lain, ubah di sini; rencana tetap tersimpan dan diberi catatan jangka waktu.",
  },
  sdgTags: {
    tip: "Pilih tujuan SDGs yang paling berkaitan langsung. Tag dipakai menghitung skor prioritas: makin rendah capaian desa pada tujuan itu, makin tinggi skornya. Tanpa tag, skornya 50.",
    example: "Kegiatan … untuk … : pilih tujuan yang paling berkaitan, tidak perlu semuanya.",
  },
} as const satisfies Record<string, FieldHelp>;

export type RpjmdesFieldKey = keyof typeof RPJMDES_FIELD_HELP;

export function rpjmdesFieldHelp(key: RpjmdesFieldKey): FieldHelp {
  return RPJMDES_FIELD_HELP[key];
}
