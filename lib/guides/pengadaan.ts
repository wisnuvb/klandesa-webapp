/**
 * Isi panduan halaman Pengadaan Barang/Jasa dan Kalender Kepatuhan: bahasa sehari-hari untuk perangkat desa.
 * Murni (tanpa React) agar bisa diuji. Semua pernyataan bersumber dari kode (aturan layanan lib/pengadaan dan lib/kepatuhan)
 * atau katalog yang sudah ditandai "dibaca dari teks resmi" di repo. Ambang nilai, tenggat tanggal, dan persentase SENGAJA
 * tidak ditulis di sini: nilainya milik kabupaten/katalog dan tampil sendiri di halaman.
 * Contoh isian HANYA ditampilkan, tidak pernah disalin otomatis ke kolom.
 */
import { REFS, TPK_MIN } from "../pengadaan/catalog";
import type { FieldHelp, GuideEntry, PageGuide } from "./types";

// ---------------------------------------------------------------------------------------------
// Pengadaan

export const PENGADAAN_GUIDE: PageGuide = {
  id: "pengadaan",
  title: "Panduan Pengadaan Barang/Jasa",
  description: "Satu paket untuk tiap pembelian atau pekerjaan yang dibiayai APB Desa. Anda bisa menutup panduan ini kapan saja tanpa kehilangan isian.",
  bannerText: "Baca panduan singkat (sekitar 2 menit) tentang cara membuat paket, memilih swakelola atau penyedia, dan syarat tiap tahap.",
  tabs: [
    {
      id: "langkah",
      label: "Langkah",
      blocks: [
        {
          type: "steps",
          items: [
            { title: "Buat paket baru", body: "Tekan \"Paket baru\". Pilih kegiatan APB Desa yang membiayainya, tulis nama paket, pilih cara pengadaan, lalu isi perkiraan biayanya." },
            { title: "Bentuk TPK bila perlu", body: `Di halaman paket, tambahkan anggota Tim Pelaksana Kegiatan (TPK). Aplikasi meminta minimal ${TPK_MIN} orang, jumlahnya gasal, dengan satu ketua dan satu sekretaris.` },
            { title: "Untuk penyedia: catat penawaran", body: "Pindahkan paket ke \"Pemilihan penyedia\", lalu catat setiap penawaran yang masuk. Tandai yang lulus evaluasi." },
            { title: "Tetapkan penyedia, isi SPK, mulai pelaksanaan", body: "Kepala Desa atau admin menetapkan penyedia terpilih dan memulai pelaksanaan. Nomor dan tanggal SPK diisi sebelum itu." },
            { title: "Catat serah terima (BAST)", body: "Setelah pekerjaan selesai, isi Berita Acara Serah Terima, lalu tekan \"Tandai selesai (BAST)\". Isian paket terkunci setelah itu." },
            { title: "Bayar lewat APBDes", body: "Pembayaran tetap diajukan sebagai SPP di menu APBDes. Di halaman ini Anda hanya melihat tautan dan peringatannya." },
          ],
        },
        {
          type: "split",
          left: {
            title: "Dikerjakan otomatis oleh aplikasi",
            items: [
              "Membaca sisa anggaran kegiatan dari APB Desa yang sudah ditetapkan",
              "Memeriksa syarat sebelum paket pindah tahap, lengkap dengan daftar yang belum terpenuhi",
              "Menandai penyedia yang bentrok kepentingan dan mencari harga terendah di antara yang lulus",
              "Menampilkan peringatan \"perlu diperiksa\" pada daftar paket",
              "Menampilkan SPP yang terkait kegiatan itu (hanya baca)",
            ],
          },
          right: {
            title: "Anda yang mengisi",
            items: [
              "Anggota TPK dan nomor keputusan penetapannya",
              "Penawaran penyedia dan hasil evaluasinya",
              "Nomor dan tanggal berita acara negosiasi, SPK, dan BAST",
              "Tanggal pengumuman dan penyerahan hasil",
              "Dokumen pendukung (pindaian) di bagian lampiran",
            ],
          },
        },
      ],
    },
    {
      id: "cara",
      label: "Cara & metode",
      blocks: [
        {
          type: "cards",
          title: "Cara pengadaan",
          items: [
            { title: "Swakelola", body: "Dikerjakan sendiri oleh desa lewat TPK, misalnya dengan tenaga warga. Tidak ada penyedia dan tidak ada tahap pemilihan penyedia. Perkiraan biayanya disebut RAB." },
            { title: "Melalui penyedia", body: "Dibeli atau dikerjakan pihak luar, misalnya toko, CV, atau perorangan. Ada tahap pemilihan penyedia, dan perkiraan biayanya disebut HPS." },
          ],
        },
        {
          type: "cards",
          title: "Metode (hanya untuk penyedia)",
          items: [
            { title: "Pembelian langsung", body: "Catat penyedia dan harga yang dibayar. TPK tidak diwajibkan untuk memulai pelaksanaan." },
            { title: "Permintaan penawaran", body: "Meminta penawaran tertulis ke paling sedikit 2 penyedia. Bila di desa hanya ada satu penyedia, satu penawaran boleh dengan menuliskan alasannya." },
            { title: "Lelang", body: "Catat setiap penawaran yang masuk. Pemenang adalah penawaran yang lulus dan harganya terendah." },
          ],
        },
        {
          type: "list",
          title: "Memilih yang tepat",
          items: [
            "Pedoman mengutamakan swakelola; pakai penyedia bila kegiatan tidak dapat dikerjakan sendiri.",
            "Batas nilai antar-metode ditetapkan Peraturan Bupati/Wali Kota kabupaten Anda. Tanyakan ke Dinas PMD bila belum tahu.",
            "Tombol \"Ambang metode\" menyimpan batas itu. Bila terisi, aplikasi memberi saran dan peringatan, tetapi tidak pernah menghalangi.",
          ],
        },
        { type: "note", text: "Dasar: Peraturan LKPP 12/2019 (pedoman bagi bupati/wali kota). Tata cara yang mengikat desa adalah Peraturan Bupati/Wali Kota kabupaten masing-masing; cocokkan dengan itu." },
      ],
    },
    {
      id: "syarat",
      label: "Syarat tahap",
      blocks: [
        {
          type: "steps",
          title: "Tahap paket dan syarat pindahnya",
          items: [
            { title: "Persiapan → Pemilihan penyedia", body: "HPS terisi dan metode dipilih. Untuk permintaan penawaran dan lelang, TPK harus sah. Tidak berlaku untuk swakelola, yang langsung ke pelaksanaan." },
            { title: "Pemilihan → Pelaksanaan", body: "Nama dan jabatan Kasi/Kaur pelaksana terisi, penawaran cukup, penyedia terpilih lulus dan berharga terendah, SPK dan nilai kontrak terisi, serta, bila APB Desa sudah ditetapkan, anggaran kegiatan masih cukup." },
            { title: "Pelaksanaan → Selesai (BAST)", body: "Nomor dan tanggal BAST, nama penyerah, dan nama penerima terisi. Tanggal BAST tidak boleh sebelum tanggal SPK." },
          ],
        },
        {
          type: "list",
          title: "Hal yang sering membuat tombol tertahan",
          items: [
            "Kasi/Kaur pelaksana tidak boleh Kaur Keuangan, dan tidak boleh sekaligus anggota TPK.",
            "Penyedia terpilih tidak boleh sama dengan anggota TPK atau Kasi/Kaur pelaksana (bentrok kepentingan).",
            "Berita acara negosiasi wajib bila hanya satu penyedia lulus atau harga terendah kembar.",
            "Memulai pelaksanaan dan menetapkan penyedia terpilih hanya bisa dilakukan Kepala Desa atau admin.",
            "Bila nilai melebihi sisa anggaran, revisi APB Desa dulu atau laporkan ke Kepala Desa.",
            "Paket yang sudah berjalan tidak bisa dihapus; batalkan dengan menuliskan alasan.",
          ],
        },
        { type: "note", text: "Bagian \"Syarat yang belum terpenuhi\" di halaman paket selalu menyebut persis apa yang kurang, lengkap dengan dasar aturannya." },
      ],
    },
    {
      id: "istilah",
      label: "Istilah",
      blocks: [
        {
          type: "glossary",
          items: [
            { term: "Paket", meaning: "Satu pengadaan, dihubungkan ke satu kegiatan di APB Desa." },
            { term: "Swakelola", meaning: "Dikerjakan sendiri oleh desa." },
            { term: "Penyedia", meaning: "Pihak luar yang menjual barang atau mengerjakan pekerjaan." },
            { term: "HPS", meaning: "Harga Perkiraan Sendiri: perkiraan harga wajar dari desa, patokan membandingkan penawaran." },
            { term: "RAB", meaning: "Rencana Anggaran Biaya: perkiraan biaya untuk pekerjaan swakelola." },
            { term: "TPK", meaning: "Tim Pelaksana Kegiatan: tim yang menjalankan pengadaan, ditetapkan dengan keputusan Kepala Desa." },
            { term: "Kasi/Kaur pelaksana", meaning: "Perangkat desa yang mengelola kegiatan dan menerima hasil pekerjaan." },
            { term: "Unsur TPK", meaning: "Asal anggota: perangkat desa, lembaga kemasyarakatan desa, atau masyarakat." },
            { term: "Lulus evaluasi", meaning: "Penawaran memenuhi persyaratan dan harganya wajar." },
            { term: "Negosiasi", meaning: "Tawar-menawar resmi; hasilnya dicatat dalam berita acara dan menjadi harga akhir." },
            { term: "SPK", meaning: "Surat Perintah Kerja atau surat perjanjian. Untuk pembelian kecil boleh berupa nota atau kuitansi." },
            { term: "BAST", meaning: "Berita Acara Serah Terima: bukti pekerjaan atau barang sudah diterima." },
            { term: "SPP", meaning: "Surat Permintaan Pembayaran, diajukan di menu APBDes." },
            { term: "Perbup", meaning: "Peraturan Bupati/Wali Kota, termasuk yang mengatur pengadaan di desa." },
          ],
        },
      ],
    },
  ],
};

export type PengadaanFieldId = "pg-act" | "pg-mode" | "pg-method" | "pg-hps" | "pg-exec" | "of-neg" | "tm-role" | "tm-el" | "st-direct" | "st-offer";

const PENGADAAN_HELP: Record<PengadaanFieldId, FieldHelp> = {
  "pg-act": {
    tip: "Pilih kegiatan di APB Desa yang membiayai pengadaan ini. Dari kegiatan inilah aplikasi membaca sisa anggaran. Ketik sebagian kode atau nama untuk mencari.",
    example: "Untuk membeli … pilih kegiatan … yang memang membiayai pekerjaan itu di APB Desa tahun ini.",
    ref: REFS.pagu,
  },
  "pg-mode": {
    tip: "Swakelola berarti desa mengerjakan sendiri lewat TPK. Melalui penyedia berarti membeli atau memborongkan ke pihak luar. Pedoman mengutamakan swakelola.",
    example: "Swakelola: pekerjaan … oleh tenaga warga di bawah TPK. Penyedia: pembelian … dari toko atau CV ….",
    ref: REFS.swakelola,
  },
  "pg-method": {
    tip: "Pilih sesuai nilai dan keadaan di desa. Batas nilai antar-metode ditetapkan Perbup kabupaten Anda; tanyakan ke Dinas PMD bila belum yakin.",
    example: "Pembelian langsung untuk kebutuhan kecil dari satu penjual; permintaan penawaran bila meminta harga ke beberapa penyedia ….",
  },
  "pg-hps": {
    tip: "Perkiraan biaya yang wajar menurut desa sebelum meminta penawaran. Untuk swakelola, isi RAB. Harus lebih dari nol.",
    example: "HPS disusun dari harga pasar setempat atau hasil tanya ke … penyedia, dikalikan jumlah atau volume ….",
  },
  "pg-exec": {
    tip: "Kasi atau Kaur yang mengelola pengadaan ini. Bukan Kaur Keuangan dan bukan anggota TPK; kalau tidak, pelaksanaan tidak bisa dimulai. Boleh diisi nanti, tetapi wajib sebelum pelaksanaan.",
    example: "Nama: … ; Jabatan: Kasi … atau Kaur … (selain Kaur Keuangan).",
    ref: REFS.kaurKeuangan,
  },
  "of-neg": {
    tip: "Isi hanya bila ada tawar-menawar resmi. Harga ini menjadi harga akhir dan tidak boleh lebih tinggi dari harga penawaran. Kosongkan bila tidak ada negosiasi.",
    ref: REFS.negotiation,
  },
  "tm-role": {
    tip: "Setiap TPK harus punya tepat satu ketua dan satu sekretaris. Anggota lainnya dipilih sebagai Anggota.",
    ref: REFS.tpk,
  },
  "tm-el": {
    tip: "Asal anggota: perangkat desa, lembaga kemasyarakatan desa, atau masyarakat. Pedoman meminta ketiganya ada; bila belum lengkap aplikasi hanya memberi peringatan.",
    example: "Perangkat desa: … ; lembaga kemasyarakatan: pengurus … ; masyarakat: warga … yang dipercaya.",
    ref: REFS.tpk,
  },
  "st-direct": {
    tip: "Batas nilai tertinggi untuk pembelian langsung menurut Perbup kabupaten Anda. Kosongkan bila belum tahu; aplikasi lalu tidak memberi saran metode. Tidak pernah memblokir.",
  },
  "st-offer": {
    tip: "Batas nilai tertinggi untuk permintaan penawaran; di atasnya dianggap lelang. Isi sesuai Perbup kabupaten Anda. Aplikasi hanya memberi peringatan.",
  },
};

export const PENGADAAN_FIELD_IDS = Object.keys(PENGADAAN_HELP) as PengadaanFieldId[];
export const pengadaanFieldHelp = (id: PengadaanFieldId): FieldHelp => PENGADAAN_HELP[id];

// ---------------------------------------------------------------------------------------------
// Kepatuhan

export const KEPATUHAN_GUIDE: PageGuide = {
  id: "kepatuhan",
  title: "Panduan Kalender Kepatuhan",
  description: "Daftar laporan wajib desa per tahun anggaran, lengkap dengan tenggat dan bukti kirim. Anda bisa menutup panduan ini kapan saja.",
  bannerText: "Baca panduan singkat (sekitar 2 menit) tentang arti status, cara tenggat dihitung, dan cara mencatat bukti kirim.",
  tabs: [
    {
      id: "langkah",
      label: "Langkah",
      blocks: [
        {
          type: "steps",
          items: [
            { title: "Pilih tahun anggaran", body: "Daftar laporan, tenggat, dan statusnya mengikuti tahun yang dipilih." },
            { title: "Lihat \"Tenggat terdekat\"", body: "Di bagian atas ada laporan yang paling dekat jatuh tempo. Mulailah dari yang berstatus Terlambat atau segera jatuh tempo." },
            { title: "Siapkan bahan lewat \"Bahan cetak\"", body: "Pada butir yang punya tombol ini, aplikasi menggabungkan data dari modul lain menjadi bahan cetak. Lampiran yang harus Anda siapkan sendiri tercantum di halaman itu." },
            { title: "Kirim laporan di luar aplikasi", body: "Aplikasi ini mencatat, bukan mengirimkan ke pihak lain. Serahkan laporan sesuai tujuannya." },
            { title: "Catat bukti kirim", body: "Tekan \"Catat pengiriman\", isi tanggal dan nomor surat pengantar, lalu pilih berkas bukti dari Arsip Digital bila ada." },
          ],
        },
        {
          type: "split",
          left: {
            title: "Dibaca otomatis dari modul lain",
            items: [
              "Perdes APB Desa (dari APBDes)",
              "Perdes RKP Desa dan daftar usulan (dari Perencanaan)",
              "LPPD dan LKPPD (dari Laporan Kepala Desa)",
              "Laporan dan publikasi Dana Desa (dari Dana Desa)",
            ],
          },
          right: {
            title: "Anda yang mencatat",
            items: [
              "Laporan yang dikirim di luar aplikasi, seperti ke bupati atau camat",
              "Pengumuman ke masyarakat dan informasi publik berkala",
              "Laporan BUM Desa (hanya muncul bila desa punya BUM Desa terdaftar)",
              "Bukti tambahan pada butir yang sudah otomatis",
            ],
          },
        },
        { type: "note", text: "Aplikasi juga dapat mengirim pengingat tenggat kepada admin dan Kepala Desa. Pengingat itu hanya pesan; status tetap Anda catat sendiri." },
      ],
    },
    {
      id: "status",
      label: "Status & tenggat",
      blocks: [
        {
          type: "cards",
          title: "Arti status",
          items: [
            { title: "Belum", body: "Belum ada bukti terkirim atau draf. Bila tenggat tinggal 14 hari atau kurang, tertulis \"segera jatuh tempo\"." },
            { title: "Draf", body: "Sudah mulai disiapkan atau dicatat sebagai draf, tetapi belum dikirim." },
            { title: "Terkirim / Ditetapkan / Dipublikasikan", body: "Sudah selesai. Kata yang dipakai menyesuaikan jenis butir. Bila tanggalnya melewati tenggat, tertulis \"lewat tenggat\"." },
            { title: "Terlambat", body: "Tenggat sudah lewat dan belum ada bukti terkirim." },
          ],
        },
        {
          type: "list",
          title: "Cara membaca tenggat",
          items: [
            "Sebagian tenggat berupa tanggal tetap yang sudah dihitung untuk tahun anggaran itu.",
            "Sebagian dihitung dari peristiwa lain, misalnya sekian hari setelah Perdes ditetapkan. Sebelum peristiwa itu tercatat, tenggatnya belum muncul.",
            "Sebagian peraturan tidak menyebut tanggal. Butir itu tetap dilacak, tetapi tidak pernah dinyatakan Terlambat.",
            "Kabupaten atau platform dapat mengubah tenggat atau mematikan satu butir. Bila begitu, kartu butir memberi tahu beserta dasarnya.",
          ],
        },
        {
          type: "cards",
          title: "Tanda di \"Dasar hukum dan keterangan\"",
          items: [
            { title: "V: dibaca dari teks resmi", body: "Dihitung sebagai kewajiban." },
            { title: "K: ketetapan kabupaten", body: "Dihitung sebagai kewajiban." },
            { title: "R: belum diverifikasi", body: "Hanya informasi. Tidak dihitung sebagai kewajiban dan tidak pernah Terlambat. Cocokkan dengan aturan kabupaten Anda." },
          ],
        },
        { type: "note", text: "Butir Dana Desa yang aturan tahunnya belum dimasukkan bertanda SEMENTARA: memakai aturan tahun sebelumnya. Periksa peraturan terbaru." },
      ],
    },
    {
      id: "istilah",
      label: "Istilah",
      blocks: [
        {
          type: "glossary",
          items: [
            { term: "Tahun anggaran", meaning: "Tahun pelaksanaan APB Desa. Laporan tahunan biasanya jatuh tempo setelah tahun itu berakhir." },
            { term: "Perdes", meaning: "Peraturan Desa, ditetapkan Kepala Desa bersama BPD." },
            { term: "RKP Desa", meaning: "Rencana Kerja Pemerintah Desa, rencana tahunan." },
            { term: "LPPD", meaning: "Laporan Penyelenggaraan Pemerintahan Desa, kepada bupati/wali kota." },
            { term: "LKPPD", meaning: "Laporan Keterangan Penyelenggaraan Pemerintahan Desa, kepada BPD." },
            { term: "Bahan cetak", meaning: "Kumpulan tabel dan dokumen dari data aplikasi untuk satu laporan." },
            { term: "Bukti kirim", meaning: "Tanggal, nomor surat pengantar, atau berkas tanda terima yang menunjukkan laporan sudah diserahkan." },
            { term: "Arsip Digital", meaning: "Menu penyimpanan berkas desa. Unggah bukti di sana dulu, lalu pilih di sini." },
          ],
        },
      ],
    },
  ],
};

export type KepatuhanFieldId = "kp-sent" | "kp-ref" | "kp-q";

const KEPATUHAN_HELP: Record<KepatuhanFieldId, FieldHelp> = {
  "kp-sent": {
    tip: "Isi tanggal laporan benar-benar dikirim, ditetapkan, atau diumumkan; bukan tanggal Anda mencatat. Tanggal tidak boleh di masa depan. Bila lewat tenggat, tercatat \"lewat tenggat\".",
  },
  "kp-ref": {
    tip: "Nomor surat pengantar atau tanda terima dari penerima laporan. Boleh dikosongkan.",
    example: "Nomor surat pengantar desa: …/…/…/… ; nomor tanda terima kecamatan atau kabupaten: ….",
  },
  "kp-q": {
    tip: "Pilih berkas bukti yang sudah diunggah ke Arsip Digital, misalnya surat bertanda terima atau foto pengumuman. Ketik judul atau nama berkas untuk mencari.",
  },
};

export const KEPATUHAN_FIELD_IDS = Object.keys(KEPATUHAN_HELP) as KepatuhanFieldId[];
export const kepatuhanFieldHelp = (id: KepatuhanFieldId): FieldHelp => KEPATUHAN_HELP[id];

// ---------------------------------------------------------------------------------------------

/** Entri katalog /bantuan. */
export const PENGADAAN_GUIDE_ENTRIES: GuideEntry[] = [
  { guide: PENGADAAN_GUIDE, href: "/pengadaan", summary: "Membuat paket pengadaan, memilih swakelola atau penyedia, dan syarat tiap tahap sampai serah terima (BAST)." },
  { guide: KEPATUHAN_GUIDE, href: "/kepatuhan", summary: "Membaca status dan tenggat laporan wajib desa, menyiapkan bahan cetak, dan mencatat bukti kirim." },
];
