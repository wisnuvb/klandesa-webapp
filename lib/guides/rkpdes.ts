/**
 * Isi panduan halaman RKP Desa (/rkpdes): bahasa sehari-hari untuk perangkat desa, bukan teks pasal.
 * Murni (tanpa React) agar bisa diuji. Semua klaim bersumber dari kode: tahapan dan tenggat (lib/rkpdes/steps.ts),
 * istilah (lib/rkpdes/catalog.ts), aturan layanan (lib/rkpdes/service.ts), dan pencocokan (lib/rkpdes/alignment.ts).
 * Contoh isian HANYA ditampilkan, tidak pernah disalin otomatis ke kolom.
 */
import { TEAM_LIMITS, LIMITS } from "@/lib/rkpdes/catalog";
import type { FieldHelp, GuideEntry, PageGuide } from "./types";

/** Tenggat dalam bahasa awam per kunci tahap; diuji terhadap buildSteps agar tidak melenceng dari kode. */
export const STEP_DEADLINE_TEXT: Record<string, string | null> = {
  musdes: "30 Juni",
  tim: "30 Juni",
  pagu: "31 Juli",
  rancangan: null,
  disetujui: null,
  musrenbang: null,
  perdes: "30 September",
  usulan: "31 Desember",
};

const STEPS = [
  {
    title: "Pastikan RPJM Desa sudah ada",
    body: "RKP Desa dijabarkan dari RPJM Desa yang mencakup tahunnya. Tanpa itu, kegiatan belum bisa ditambahkan. Buat dulu di menu RPJM Desa, lalu kembali ke sini.",
  },
  {
    title: "Buat dokumen RKP Desa",
    body: "Tekan \"Buat RKP Desa\" dan isi tahunnya. RKP Desa tahun berikutnya disusun pada tahun berjalan. Aplikasi lalu menghitung tenggat tiap tahap.",
  },
  {
    title: "Musyawarah Desa perencanaan (tenggat 30 Juni)",
    body: "Jadwalkan dan laksanakan di menu Musyawarah Desa, lalu hubungkan di tab Tahapan. Tahap dianggap selesai setelah musyawarahnya ditandai terlaksana.",
  },
  {
    title: "Bentuk tim penyusun (tenggat 30 Juni)",
    body: `Isi tanggal dan nomor keputusan Kepala Desa di tab Tahapan, lalu daftar anggotanya di tab Tim penyusun (${TEAM_LIMITS.min}–${TEAM_LIMITS.max} orang).`,
  },
  {
    title: "Cermati pagu dan program masuk (tenggat 31 Juli)",
    body: "Catat tanggal informasi pagu diterima dari kabupaten/kota. Rinciannya diisi di tab Pagu dan program masuk.",
  },
  {
    title: "Susun rancangan",
    body: "Isi tab Kegiatan dan tab Evaluasi dan usulan. Bila selesai, isi tanggal dan nomor berita acara tim penyusun. Tahap ini tidak punya tenggat sendiri.",
  },
  {
    title: "Kepala Desa menyetujui rancangan",
    body: "Tombol \"Setujui rancangan\" hanya bisa ditekan Kepala Desa atau admin, dan baru aktif setelah berita acara tim penyusun diisi.",
  },
  {
    title: "Musrenbangdes",
    body: "Sama seperti Musyawarah Desa: laksanakan di menu Musyawarah Desa, lalu hubungkan di tab Tahapan.",
  },
  {
    title: "Tetapkan dengan Perdes (tenggat 30 September)",
    body: "Catat Peraturan Desa di menu Produk Hukum lebih dulu, lalu pilih di tahap ini. Begitu dihubungkan, isi dokumen terkunci.",
  },
  {
    title: "Sampaikan daftar usulan (tenggat 31 Desember)",
    body: "Tandai kegiatan yang diusulkan, cetak daftarnya, lalu isi tanggal dan nomor surat pengantar ke bupati/wali kota melalui camat. Tahap ini masih bisa diisi setelah dokumen terkunci.",
  },
];

const GLOSSARY = [
  { term: "RKP Desa", meaning: "Rencana Kerja Pemerintah Desa: rencana kegiatan satu tahun, turunan dari RPJM Desa." },
  { term: "RPJM Desa", meaning: "Rencana Pembangunan Jangka Menengah Desa. Program di dalamnya bisa dipilih saat menambah kegiatan." },
  { term: "Musyawarah Desa", meaning: "Musyawarah perencanaan yang diadakan lebih dulu, dengan BPD, sebelum rancangan disusun." },
  { term: "Musrenbangdes", meaning: "Musyawarah perencanaan pembangunan Desa. Membahas rancangan RKP Desa yang sudah disetujui Kepala Desa." },
  { term: "Pagu indikatif", meaning: "Perkiraan jumlah dana desa per sumber, berdasarkan informasi dari kabupaten/kota. Aplikasi memberi peringatan bila anggaran kegiatan melebihi pagu sumber yang sama." },
  { term: "Program masuk Desa", meaning: "Program atau kegiatan Pemerintah, provinsi, atau kabupaten/kota yang akan dilaksanakan di desa Anda. Dicatat agar tidak tumpang tindih dengan kegiatan desa." },
  { term: "Tim penyusun", meaning: "Tim yang dibentuk dengan keputusan Kepala Desa untuk menyusun RKP Desa." },
  { term: "Berita acara", meaning: "Catatan resmi tim penyusun bahwa rancangan RKP Desa sudah selesai disusun." },
  { term: "Kode kegiatan", meaning: "Pilihan bidang dan kegiatan menurut Permendagri 20/2018. Kode yang sama dipakai di APB Desa, sehingga kegiatan bisa dicocokkan." },
  { term: "Keluaran dan volume", meaning: "Hasil nyata kegiatan dan jumlahnya, misalnya apa yang dihasilkan dan berapa satuannya." },
  { term: "RAB", meaning: "Rencana Anggaran Biaya. Rencana kegiatan dan RAB diverifikasi oleh tim verifikasi sebelum kegiatan dianggap lengkap." },
  { term: "Swakelola Desa", meaning: "Kegiatan dikerjakan sendiri oleh desa. Pilihan lain: kerja sama antar-Desa atau kerja sama dengan pihak ketiga." },
  { term: "Perdes", meaning: "Peraturan Desa. Penetapan RKP Desa dengan Perdes mengunci isi dokumen." },
  { term: "RKP Desa perubahan", meaning: "Dokumen susulan setelah RKP Desa ditetapkan, bila ada peristiwa khusus atau perubahan mendasar kebijakan." },
  { term: "DPA", meaning: "Dokumen pelaksanaan anggaran di menu APB Desa. Drafnya bisa disiapkan dari data pelaksana kegiatan RKP Desa." },
];

const TIPS = [
  "Aplikasi tidak memaksa urutan tahap. Hanya persetujuan rancangan yang menunggu berita acara tim penyusun diisi.",
  "Catatan kuning (misalnya \"3 catatan\" pada kegiatan) tidak menghalangi penyimpanan. Kegiatan tetap tersimpan; lengkapi saat data sudah ada.",
  "Beri setiap kegiatan kode kegiatan. Tanpa kode, kegiatan tidak bisa dicocokkan dengan APB Desa dan tidak bisa dipakai untuk menyiapkan DPA.",
  "Bila dua kegiatan memakai kode yang sama, draf DPA tidak disiapkan otomatis untuk kode itu; isi DPA-nya secara manual.",
  "Memilih program RPJM Desa saat menambah kegiatan mengisi nama, kode, lokasi, anggaran, sumber dana, cara, dan volume. Semuanya tetap bisa diubah.",
  "Periksa dulu seluruh isi sebelum menghubungkan Perdes. Setelah terhubung, dokumen terkunci dan hanya data daftar usulan yang bisa diisi. Perubahan lewat RKP Desa perubahan.",
  `RKP Desa perubahan baru bisa dibuat setelah yang awal ditetapkan, dengan alasan yang dipilih dari daftar. Maksimal ${LIMITS.revisions} perubahan untuk satu tahun.`,
  "Dokumen hanya bisa dihapus bila belum terkunci dan tidak berisi kegiatan.",
  "Tab APB Desa hanya memeriksa. Ia tidak mengubah APB Desa, dan yang dibandingkan hanya belanja.",
];

export const RKPDES_GUIDE: PageGuide = {
  id: "rkpdes",
  title: "Panduan Siklus RKP Desa",
  description: "Ringkas dan tanpa istilah hukum. Anda bisa menutup panduan ini kapan saja tanpa kehilangan isian.",
  bannerText: "Baca panduan singkat (sekitar 2 menit) tentang urutan tahap, tenggat, dan istilah RKP Desa sebelum mulai mengisi.",
  tabs: [
    {
      id: "langkah",
      label: "Langkah",
      blocks: [
        { type: "steps", title: "Urutan kerja satu RKP Desa", items: STEPS },
        {
          type: "split",
          left: {
            title: "Dihitung atau diisi otomatis",
            items: [
              "Tenggat dan status tiap tahap (selesai, terlambat, segera jatuh tempo)",
              "Tahap musyawarah selesai begitu musyawarah yang dihubungkan ditandai terlaksana",
              "Tahap Perdes selesai menurut tanggal Perdes yang dihubungkan",
              "Catatan kelengkapan kegiatan dan komposisi tim",
              "Peringatan anggaran melebihi pagu",
              "Pencocokan dengan APB Desa",
            ],
          },
          right: {
            title: "Anda yang mengisi",
            items: [
              "Tanggal dan nomor keputusan tim, serta anggota tim",
              "Tanggal informasi pagu, rincian pagu, dan program masuk Desa",
              "Kegiatan beserta pelaksananya, dan evaluasi tahun sebelumnya",
              "Tanggal dan nomor berita acara tim penyusun",
              "Persetujuan rancangan (Kepala Desa atau admin)",
              "Tanggal dan nomor surat daftar usulan",
            ],
          },
        },
        { type: "note", text: "Dasar hukum: Permendagri 114/2014. Tenggat di aplikasi mengikuti aturan itu; cocokkan dengan edaran kabupaten/kota Anda." },
      ],
    },
    { id: "istilah", label: "Istilah", blocks: [{ type: "glossary", items: GLOSSARY }] },
    { id: "tips", label: "Tips", blocks: [{ type: "list", title: "Agar tidak tersangkut", items: TIPS }] },
  ],
};

/**
 * Petunjuk kolom yang benar-benar membingungkan. Kunci = id kolom di halaman (mis. "ac-method"); untuk tahap,
 * "st-<kunci tahap>-date". Diuji: setiap kunci harus dipakai di berkas halaman, dan sebaliknya.
 */
export const RKPDES_FIELD_HELP: Record<string, FieldHelp> = {
  "rk-year": {
    tip: "Tahun pelaksanaan RKP Desa. Dokumennya disusun pada tahun sebelumnya, jadi isian awal adalah tahun depan.",
  },
  "st-pagu-date": {
    tip: "Tanggal desa menerima informasi pagu dari kabupaten/kota. Mengisinya menandai tahap ini selesai.",
    example: "Informasi pagu diterima desa pada tanggal …, disampaikan oleh … (kabupaten/kota).",
    ref: "Pasal 35 ayat 2",
  },
  "st-rancangan-date": {
    tip: "Tanggal berita acara tim penyusun yang menyatakan rancangan sudah selesai. Tanpa tanggal ini, rancangan belum bisa disetujui Kepala Desa.",
    example: "Berita acara tim penyusun Nomor … tanggal …, menyatakan rancangan RKP Desa Tahun … selesai disusun.",
    ref: "Pasal 44",
  },
  "pg-src": {
    tip: "Satu sumber dana satu baris. Menyimpan sumber yang sama lagi memperbarui angkanya, bukan menambah baris.",
  },
  "tm-role": {
    tip: `Pembina: Kepala Desa. Ketua: Sekretaris Desa. Sekretaris: ketua lembaga pemberdayaan masyarakat. Masing-masing satu orang; yang lain Anggota. Tim ${TEAM_LIMITS.min}–${TEAM_LIMITS.max} orang dan mengikutsertakan perempuan.`,
    ref: "Pasal 33 ayat 2-4",
  },
  "ev-text": {
    tip: "Bagian wajib rancangan RKP Desa: kegiatan tahun sebelumnya yang selesai, yang tertunda, dan pelajarannya.",
    example: "Dari … kegiatan tahun …, … selesai sesuai rencana. Kegiatan … tertunda karena …. Pelajarannya: …",
    ref: "Pasal 41 ayat 1 huruf a",
  },
  "ac-activityCode": {
    tip: "Pilih bidang dan kegiatannya. Kode ini dipakai untuk mencocokkan dengan APB Desa dan menyiapkan DPA, jadi sebaiknya selalu diisi.",
  },
  "ac-fundSource": {
    tip: "Dari mana dananya. Jumlah anggaran kegiatan per sumber dibandingkan dengan pagu sumber yang sama di tab Pagu.",
  },
  "ac-method": {
    tip: "Siapa yang mengerjakan: desa sendiri (swakelola), kerja sama dengan desa lain, atau dengan pihak ketiga.",
    ref: "Pasal 52 ayat 3",
  },
  "ac-outputName": {
    tip: "Hasil nyata yang bisa dihitung, bukan nama kegiatan. Volume dan satuannya di kolom sebelah.",
    example: "Keluaran: … (hasil kegiatan). Volume: … Satuan: … (misalnya meter, unit, orang).",
  },
  "ac-executorMembers": {
    tip: "Pelaksana paling sedikit ketua, sekretaris, dan bendahara (kolom di atas), dan harus mengikutsertakan perempuan. Di sini tulis anggota lainnya.",
    example: "Anggota: … (nama), … (nama), … (nama).",
    ref: "Pasal 40 ayat 2-3",
  },
  "ac-rabVerifiedAt": {
    tip: "Isi bila tim verifikasi sudah memeriksa rencana kegiatan dan RAB. Kosong akan muncul sebagai catatan kelengkapan.",
    ref: "Pasal 42 ayat 3",
  },
};

export function rkpdesFieldHelp(key: string): FieldHelp | undefined {
  return RKPDES_FIELD_HELP[key];
}

export const RKPDES_GUIDE_ENTRY: GuideEntry = {
  guide: RKPDES_GUIDE,
  href: "/rkpdes",
  summary: "Urutan tahap penyusunan RKP Desa, tenggat, tim, pagu, kegiatan, dan pencocokan dengan APB Desa.",
};
