/**
 * Isi panduan "Cara mengisi" Laporan Kepala Desa: bahasa sehari-hari untuk petugas desa, bukan teks pasal.
 * Murni (tanpa React) agar bisa diuji. Rujukan pasal tetap ada di katalog (SectionDef.hint) dan tampil kecil di bawah kolom.
 * Contoh isian HANYA ditampilkan, tidak pernah disalin otomatis ke kolom, supaya laporan tidak berisi kalimat contoh.
 */
import { KINDS, SECTIONS, type ReportKind } from "./catalog";
import type { FieldHelp, GuideEntry, PageGuide } from "@/lib/guides/types";

export interface KindGuide {
  /** Satu kalimat: kapan memilih jenis ini */
  when: string;
  /** Untuk siapa laporan ini ditujukan, dalam bahasa awam */
  audience: string;
  /** Tenggat dalam bahasa awam */
  deadline: string;
}

export const KIND_GUIDE: Record<ReportKind, KindGuide> = {
  LPPD_TAHUN: {
    when: "Laporan tahunan utama. Dibuat setiap tahun setelah tahun anggaran berakhir.",
    audience: "Bupati/Wali Kota, lewat camat.",
    deadline: "Paling lambat 31 Maret tahun berikutnya.",
  },
  LKPPD: {
    when: "Laporan ringkas untuk BPD tentang pelaksanaan Peraturan Desa, terutama APB Desa. Dibuat setiap tahun.",
    audience: "Badan Permusyawaratan Desa (BPD).",
    deadline: "Paling lambat 31 Maret tahun berikutnya.",
  },
  LPPD_JABATAN: {
    when: "Dibuat sekali, menjelang masa jabatan Kepala Desa berakhir.",
    audience: "Bupati/Wali Kota, lewat camat.",
    deadline: "Paling lambat 5 bulan sebelum masa jabatan berakhir (dihitung otomatis setelah tanggal berakhir diisi).",
  },
};

/** Langkah kerja singkat, urut. */
export const STEPS: { title: string; body: string }[] = [
  { title: "Pilih jenis laporan dan tahun", body: "Di bagian atas halaman. Kebanyakan desa mulai dari LPPD Akhir Tahun Anggaran untuk tahun yang baru lewat." },
  { title: "Tulis uraiannya per bagian", body: "Kolom bertanda * wajib diisi. Tulis dengan kalimat sederhana dan apa adanya; tidak perlu bahasa hukum." },
  { title: "Simpan, lalu cek pratinjau", body: "Tekan \"Simpan perubahan\". Buka \"Pratinjau dan cetak\" untuk melihat laporan utuh beserta lampiran otomatis." },
  { title: "Cetak, tanda tangani, serahkan", body: "Cetak dan serahkan secara tertulis. Lalu klik \"Tandai diserahkan\" supaya isi laporan terkunci dan tercatat." },
];

/** Apa yang diisi aplikasi dan apa yang harus ditulis sendiri, per jenis. */
export const AUTO: Record<ReportKind, { auto: string[]; manual: string[] }> = {
  LPPD_TAHUN: {
    auto: [
      "Rincian pelaksanaan APB Desa (lampiran)",
      "Rekapitulasi jumlah penduduk (lampiran)",
      "Daftar kegiatan dan anggaran per bidang, di bawah bagian program kerja",
      "Nomor dan tanggal Peraturan Desa tentang APB Desa",
      "Visi dan misi, bila RPJMDes aktif sudah memuatnya (lewat tombol \"Isi dari RPJMDes\")",
    ],
    manual: ["Tujuan, strategi, dan kebijakan", "Uraian program kerja", "Keberhasilan, masalah, dan upaya tiap bidang", "Kesimpulan dan saran"],
  },
  LKPPD: {
    auto: ["Rincian pelaksanaan APB Desa (lampiran)"],
    manual: ["Langkah-langkah kebijakan pelaksanaan Peraturan Desa", "Keterangan tambahan (boleh dikosongkan)"],
  },
  LPPD_JABATAN: {
    auto: [],
    manual: ["Laporan selama masa jabatan", "Rencana kegiatan 5 bulan terakhir", "Tanggal berakhirnya masa jabatan (untuk menghitung tenggat)"],
  },
};

export const WRITING_TIPS: string[] = [
  "Tulis yang benar-benar terjadi di desa Anda. Contoh isian hanya memperlihatkan bentuk dan tingkat kerincian, jangan disalin mentah.",
  "Sebut hal yang bisa dicek: nama kegiatan, lokasi (dusun/RT), jumlah, dan sumber dana.",
  "Satu bidang, satu pola: apa yang berhasil, apa yang menghambat, apa yang sudah dilakukan untuk mengatasinya.",
  "Kolom wajib yang kosong menghalangi penyerahan. Bila tidak ada yang dilaporkan, tulis alasannya, jangan dibiarkan kosong.",
  "Perubahan baru tersimpan setelah menekan \"Simpan perubahan\". Setelah ditandai diserahkan, isi terkunci; gunakan \"Buka kembali\" hanya untuk koreksi yang sah.",
];

export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "LPPD", meaning: "Laporan Penyelenggaraan Pemerintahan Desa: laporan Kepala Desa kepada Bupati/Wali Kota." },
  { term: "LKPPD", meaning: "Laporan Keterangan Penyelenggaraan Pemerintahan Desa: laporan Kepala Desa kepada BPD." },
  { term: "APB Desa", meaning: "Anggaran Pendapatan dan Belanja Desa. Rinciannya diambil dari menu APBDes." },
  { term: "RPJMDes", meaning: "Rencana Pembangunan Jangka Menengah Desa. Visi dan misi desa ada di sini." },
  { term: "RKPDes", meaning: "Rencana Kerja Pemerintah Desa (tahunan), turunan dari RPJMDes." },
  { term: "BPD", meaning: "Badan Permusyawaratan Desa." },
  { term: "Memori serah terima jabatan", meaning: "Dokumen pegangan pengganti Kepala Desa; disusun berdasarkan LPPD akhir masa jabatan." },
];

export interface SectionHelp {
  /** Apa yang perlu ditulis, dalam satu-dua kalimat awam */
  tip: string;
  /** Contoh bentuk isian (bukan untuk disalin) */
  example: string;
}

const BIDANG_LABEL: Record<string, string> = {
  pemerintahan: "penyelenggaraan pemerintahan",
  pembangunan: "pembangunan",
  kemasyarakatan: "pembinaan kemasyarakatan",
  pemberdayaan: "pemberdayaan masyarakat",
};

const BIDANG_EXAMPLE: Record<string, { berhasil: string; masalah: string; upaya: string }> = {
  pemerintahan: {
    berhasil: "Pelayanan surat menyurat kini selesai di hari yang sama. Arsip kependudukan sudah dirapikan per dusun, dan pelayanan dibuka juga pada hari Sabtu pagi.",
    masalah: "Perangkat desa belum seluruhnya terbiasa memakai aplikasi, sehingga pencatatan masih sering tertunda. Beberapa data warga belum diperbarui.",
    upaya: "Mengadakan pelatihan singkat tiap bulan untuk perangkat desa, menunjuk satu petugas pendamping, dan menjadwalkan pemutakhiran data per dusun.",
  },
  pembangunan: {
    berhasil: "Jalan lingkungan di Dusun … sepanjang … meter selesai dikerjakan sesuai rencana. Saluran air di … berfungsi dan genangan saat hujan berkurang.",
    masalah: "Pengerjaan jalan tertunda dua minggu karena cuaca dan keterlambatan material. Sebagian usulan warga belum bisa dibiayai tahun ini.",
    upaya: "Mengatur ulang jadwal kerja, membeli material dari pemasok terdekat, dan memasukkan usulan yang belum terbiayai ke RKPDes tahun berikutnya.",
  },
  kemasyarakatan: {
    berhasil: "Kegiatan posyandu, ronda, dan kerja bakti berjalan rutin di seluruh dusun. Tidak ada konflik besar sepanjang tahun.",
    masalah: "Kehadiran warga pada kegiatan tertentu masih rendah, terutama di dusun yang jauh dari balai desa.",
    upaya: "Menggelar kegiatan bergilir di tiap dusun dan mengumumkan jadwal lewat kelompok pesan warga serta papan informasi.",
  },
  pemberdayaan: {
    berhasil: "Pelatihan usaha bagi … kelompok warga terlaksana, dan … pelaku usaha kecil mulai memasarkan produknya lewat toko daring desa.",
    masalah: "Modal usaha terbatas dan belum semua kelompok punya pendamping yang tetap.",
    upaya: "Menggandeng BUMDes dan dinas terkait untuk pendampingan, serta menganggarkan bantuan modal usaha pada tahun berikutnya.",
  },
};

const BASE: Record<string, SectionHelp> = {
  tujuan: {
    tip: "Jelaskan untuk apa laporan ini dibuat dan kepada siapa. Dua sampai tiga kalimat sudah cukup.",
    example: "Laporan ini disusun sebagai pertanggungjawaban Kepala Desa atas penyelenggaraan pemerintahan desa selama tahun anggaran … dan sebagai bahan evaluasi bagi Bupati.",
  },
  visi_misi: {
    tip: "Salin visi dan misi desa seperti yang tertulis di RPJMDes. Jika RPJMDes sudah diisi di aplikasi, klik \"Isi dari RPJMDes\".",
    example: "Visi: Desa … yang mandiri, sejahtera, dan berdaya saing. Misi: 1) meningkatkan pelayanan publik; 2) membangun infrastruktur dasar; 3) memberdayakan ekonomi warga.",
  },
  strategi: {
    tip: "Ceritakan cara dan arah kebijakan yang dipakai untuk mencapai visi dan misi tahun ini.",
    example: "Pemerintah desa memprioritaskan pelayanan dasar dan infrastruktur yang paling dirasakan warga, dengan melibatkan BPD dan musyawarah dusun dalam menentukan kegiatan.",
  },
  program_pemerintahan: {
    tip: "Uraikan program bidang pemerintahan yang direncanakan dan yang benar-benar dijalankan tahun ini. Daftar kegiatan dan anggaran terlampir otomatis; di sini cukup narasinya.",
    example: "Tahun ini direncanakan … kegiatan, antara lain penyelenggaraan pelayanan administrasi, pembayaran penghasilan tetap perangkat, dan peningkatan kapasitas aparatur. Seluruh kegiatan terlaksana, kecuali … yang dialihkan ke tahun berikutnya.",
  },
  program_pembangunan: {
    tip: "Uraikan pembangunan fisik dan sarana yang direncanakan dan yang terlaksana. Sebut lokasi dan hasilnya.",
    example: "Pembangunan yang terlaksana: rabat beton jalan Dusun … (… m), perbaikan saluran air di RT …, dan renovasi balai dusun. Satu kegiatan, yaitu …, belum terlaksana karena …",
  },
  program_kemasyarakatan: {
    tip: "Uraikan kegiatan pembinaan masyarakat: keamanan, ketertiban, kesehatan, budaya, olahraga, dan sejenisnya.",
    example: "Kegiatan yang dilaksanakan meliputi dukungan posyandu tiap bulan, pembinaan karang taruna, peringatan hari besar, dan penguatan ronda lingkungan di seluruh dusun.",
  },
  program_pemberdayaan: {
    tip: "Uraikan kegiatan yang meningkatkan kemampuan dan penghasilan warga: pelatihan, bantuan usaha, kelompok tani, dan sejenisnya.",
    example: "Pemerintah desa mengadakan pelatihan … untuk … peserta, memberi bantuan alat kepada kelompok tani …, dan mendorong pelaku usaha kecil memasarkan produk lewat BUMDes.",
  },
  perdes_lpj: {
    tip: "Isi nomor dan tanggal Peraturan Desa tentang pertanggungjawaban pelaksanaan APB Desa. Boleh dikosongkan bila belum ada. Perdes APB Desa dan rinciannya sudah terisi otomatis.",
    example: "Peraturan Desa … Nomor … Tahun … tanggal … tentang Pertanggungjawaban Pelaksanaan APB Desa Tahun Anggaran ….",
  },
  kesimpulan: {
    tip: "Rangkum hasil tahun ini dalam beberapa kalimat: apa yang tercapai dan apa yang masih harus dikejar.",
    example: "Secara umum penyelenggaraan pemerintahan desa tahun … berjalan baik dan sebagian besar program terlaksana. Beberapa kegiatan perlu dilanjutkan pada tahun berikutnya.",
  },
  terima_kasih: {
    tip: "Opsional. Ucapan singkat kepada BPD, lembaga desa, dan warga.",
    example: "Kami menyampaikan terima kasih kepada BPD, lembaga kemasyarakatan, dan seluruh warga atas dukungan dan kerja samanya.",
  },
  saran: {
    tip: "Tulis hal yang Anda minta dari Bupati/camat: bantuan, petunjuk, atau arahan. Bila tidak ada, tulis permohonan arahan secara umum.",
    example: "Kami mohon petunjuk dan arahan lebih lanjut, khususnya terkait … serta dukungan pendampingan untuk …",
  },
  langkah_kebijakan: {
    tip: "Ceritakan langkah-langkah yang Anda ambil dalam melaksanakan Peraturan Desa, terutama APB Desa. Rinciannya terlampir otomatis; di sini cukup narasinya.",
    example: "Dalam melaksanakan Perdes APB Desa, pemerintah desa menetapkan skala prioritas kegiatan bersama BPD, menertibkan pencatatan keuangan bulanan, dan melaporkan realisasi secara berkala.",
  },
  catatan_lain: {
    tip: "Opsional. Isi hanya bila ada hal lain yang perlu BPD ketahui.",
    example: "Perlu dicatat bahwa kegiatan … dialihkan ke tahun berikutnya karena …",
  },
  laporan_masa_jabatan: {
    tip: "Ceritakan perjalanan masa jabatan Anda, bidang demi bidang: pemerintahan, pembangunan, pembinaan kemasyarakatan, pemberdayaan, dan pelaksanaan APB Desa. Pakai sub-judul agar mudah dibaca.",
    example: "A. Pemerintahan: … B. Pembangunan: selama masa jabatan terbangun … C. Pembinaan kemasyarakatan: … D. Pemberdayaan: … E. Pelaksanaan APB Desa: …",
  },
  rencana_lima_bulan: {
    tip: "Tulis kegiatan yang akan dikerjakan pada 5 bulan terakhir masa jabatan. Ini akan menjadi dasar memori serah terima jabatan.",
    example: "Dalam lima bulan terakhir direncanakan: menuntaskan …, menyelesaikan administrasi …, dan menyiapkan dokumen serah terima kepada Kepala Desa berikutnya.",
  },
};

/** Petunjuk bahasa awam + contoh untuk satu bagian; undefined bila tidak ada (diuji agar tidak terjadi). */
export function sectionHelp(id: string): SectionHelp | undefined {
  const m = /^(berhasil|masalah|upaya)_(\w+)$/.exec(id);
  if (m) {
    const kind = m[1] as "berhasil" | "masalah" | "upaya";
    const bidang = m[2] as string;
    const label = BIDANG_LABEL[bidang];
    const ex = BIDANG_EXAMPLE[bidang]?.[kind];
    if (!label || !ex) return undefined;
    const tip = {
      berhasil: `Tulis hasil nyata di bidang ${label} yang patut dicatat tahun ini.`,
      masalah: `Tulis hambatan yang benar-benar dihadapi di bidang ${label}. Jujur lebih berguna daripada kosong.`,
      upaya: `Tulis langkah yang sudah atau akan ditempuh untuk mengatasi hambatan di bidang ${label}.`,
    }[kind];
    return { tip, example: ex };
  }
  return BASE[id];
}

/** Id bagian yang belum punya panduan; dipakai tes agar katalog baru tidak lupa diberi panduan. */
export function sectionsWithoutHelp(): string[] {
  return (Object.keys(SECTIONS) as ReportKind[]).flatMap((k) => SECTIONS[k].filter((s) => !sectionHelp(s.id)).map((s) => `${k}:${s.id}`));
}

/** Panduan modal untuk jenis laporan yang sedang dibuka (jenis itu ditandai di tab "Jenis laporan"). */
export function laporanGuide(kind: ReportKind): PageGuide {
  const a = AUTO[kind];
  return {
    id: "laporan-kepala-desa",
    title: "Panduan mengisi Laporan Kepala Desa",
    description: "Ringkas dan tanpa istilah hukum. Anda bisa menutup panduan ini kapan saja tanpa kehilangan isian.",
    buttonLabel: "Panduan mengisi",
    bannerText: "Baca panduan singkat (sekitar 2 menit) tentang jenis laporan, apa yang diisi otomatis, dan cara menulis tiap bagian.",
    tabs: [
      {
        id: "langkah",
        label: "Langkah",
        blocks: [
          { type: "steps", items: STEPS },
          { type: "split", left: { title: "Terisi otomatis oleh aplikasi", items: a.auto, empty: "Tidak ada; seluruhnya Anda tulis." }, right: { title: "Anda yang menulis", items: a.manual } },
        ],
      },
      {
        id: "jenis",
        label: "Jenis laporan",
        blocks: [
          {
            type: "cards",
            title: "Tidak yakin harus memilih yang mana? Bandingkan di bawah.",
            items: (Object.keys(KINDS) as ReportKind[]).map((k) => ({
              title: KINDS[k],
              body: KIND_GUIDE[k].when,
              badge: k === kind ? "sedang dibuka" : undefined,
              highlight: k === kind,
              facts: [{ label: "Untuk", value: KIND_GUIDE[k].audience }, { label: "Tenggat", value: KIND_GUIDE[k].deadline }],
            })),
          },
          { type: "note", text: "Dasar hukum: Permendagri 46/2016. Rujukan pasal tampil kecil di dalam contoh isian tiap kolom." },
        ],
      },
      { id: "tips", label: "Tips & istilah", blocks: [{ type: "list", items: WRITING_TIPS }, { type: "glossary", items: GLOSSARY }] },
    ],
  };
}

/** Bentuk FieldHelp untuk satu bagian; rujukan pasal diambil dari petunjuk katalog bila ada. */
export function laporanFieldHelp(id: string, catalogHint: string): FieldHelp | undefined {
  const h = sectionHelp(id);
  if (!h) return undefined;
  return { tip: h.tip, example: h.example, ref: /Pasal [\d-]+(?: ayat \d+)?(?: huruf \w)?/.exec(catalogHint)?.[0] };
}

/** Entri katalog /bantuan. Jenis laporan bawaan hanya menentukan kartu yang disorot di tab "Jenis laporan". */
export const LAPORAN_GUIDE_ENTRY: GuideEntry = {
  guide: laporanGuide("LPPD_TAHUN"),
  href: "/laporan-kepala-desa",
  summary: "Memilih jenis laporan (LPPD, LKPPD, atau akhir masa jabatan), apa yang terisi otomatis, dan cara menulis tiap bagian.",
};
