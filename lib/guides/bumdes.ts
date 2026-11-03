/**
 * Isi panduan halaman BUMDes: bahasa sehari-hari untuk perangkat desa, bukan teks pasal.
 * Murni (tanpa React) agar bisa diuji. Angka batas waktu diambil dari katalog (lib/bumdes/catalog.ts) supaya tidak berselisih
 * dengan yang dihitung aplikasi. Rujukan pasal diverifikasi ke teks resmi PP 11/2021 dan Permendesa PDTT 3/2021 (peraturan.go.id,
 * peraturan.bpk.go.id). Contoh isian HANYA ditampilkan, tidak pernah disalin otomatis ke kolom.
 */
import { ANNUAL_MUSDES_MONTHS, CAPITAL_DISBURSE_MONTHS, REGISTRATION_WORKDAYS, TERM_YEARS, APBDES_CAPITAL_ACCOUNT, APBDES_PROFIT_SHARE_ACCOUNT, EQUITY_VILLAGE_CAPITAL, EQUITY_VILLAGE_PROFIT_SHARE, RK_PUSAT_ACCOUNT, RK_UNIT_ACCOUNT } from "@/lib/bumdes/catalog";
import type { FieldHelp, GuideEntry, PageGuide } from "@/lib/guides/types";

/** Masa berlaku persetujuan nama (Permendesa PDTT 3/2021 Pasal 7); angka yang sama dipakai peringatan di tab Legalitas. */
export const NAME_APPROVAL_WORKDAYS = 40;

export const BUMDES_GUIDE: PageGuide = {
  id: "bumdes",
  title: "Panduan BUMDes",
  description: "Dari pendaftaran badan hukum, penyertaan modal Desa, sampai pembukuan dan laporan. Baca bagian yang Anda perlukan saja.",
  bannerText: "Halaman ini memuat pembukuan, legalitas, dan hubungan dengan APB Desa. Baca panduan singkat sebelum mulai mengisi.",
  tabs: [
    {
      id: "alur",
      label: "Alur pembukuan",
      blocks: [
        {
          type: "steps",
          title: "Urutan kerja sehari-hari",
          items: [
            { title: "Aktifkan BUMDes (sekali saja)", body: "Bila halaman menampilkan \"Belum ada BUMDes\", admin atau Kepala Desa menekan \"Aktifkan BUMDes untuk desa\". Setelah itu enam tab di bawah terbuka." },
            { title: "Tambah unit usaha", body: "Di tab Kas dan unit, tekan \"Unit baru\". Tiap unit punya pembukuan sendiri (neraca dan laba rugi per unit). Transaksi kas tidak bisa dicatat sebelum ada minimal satu unit." },
            { title: "Catat saldo awal bila sudah punya uang atau aset", body: "Bila BUM Desa sudah memegang uang atau aset sebelum memakai aplikasi, catat sekali lewat tab Jurnal > \"Jurnal manual\" dengan kotak \"Jurnal pembukaan (saldo awal)\" dicentang. Jurnal ini dicatat di Kantor Pusat." },
            { title: "Catat transaksi kas", body: "Di tab Kas dan unit, tekan \"Catat transaksi\": pilih unit, pemasukan atau pengeluaran, jumlah, akun lawan, dan akun kas atau bank. Jurnal berpasangannya dibuat otomatis." },
            { title: "Periksa laporan", body: "Tab Laporan menampilkan neraca dan laba rugi per semester atau per tahun, untuk Kantor Pusat, tiap unit, atau gabungan. Bisa dicetak atau diunduh sebagai CSV." },
            { title: "Tutup periode", body: "Setelah semester berakhir dan semua transaksi tercatat, tutup di tab Periode. Periode yang ditutup tidak bisa diubah lagi kecuali dibuka kembali dengan alasan." },
          ],
        },
        {
          type: "split",
          left: {
            title: "Dikerjakan aplikasi",
            items: [
              "Jurnal berpasangan dari tiap transaksi kas",
              "Catatan Buku Kas Umum APB Desa dan jurnal BUM Desa dari tab Dana Desa",
              "Neraca dan laba rugi, dihitung dari jurnal yang masih aktif",
              "Penggabungan Kantor Pusat dan unit, termasuk meniadakan akun RK",
              "Pengingat batas waktu pendaftaran, masa jabatan pengurus, dan laporan tahunan",
            ],
          },
          right: {
            title: "Anda yang mengisi",
            items: [
              "Unit usaha dan transaksi kas",
              "Pilihan akun untuk tiap transaksi",
              "Saldo awal dan jurnal manual (piutang, penyusutan, pindahan antar unit)",
              "Data legalitas dan pengurus",
              "Keputusan Musyawarah Desa untuk penyertaan modal dan bagi hasil",
              "Perintah menutup periode",
            ],
          },
        },
        { type: "note", text: "Pembukuan di sini sederhana: mengikuti bagan akun Kepmendes PDTT 136/2022, tetapi belum memuat laporan perubahan ekuitas, laporan arus kas, dan catatan atas laporan keuangan. Pembukuan BUM Desa dipisah dari APB Desa; hanya penyertaan modal dan bagi hasil yang bersinggungan, lewat tab Dana Desa." },
      ],
    },
    {
      id: "legalitas",
      label: "Legalitas",
      blocks: [
        {
          type: "steps",
          title: "Dari pendirian sampai berbadan hukum",
          items: [
            { title: "Siapkan dasar pendirian", body: "Musyawarah Desa pendirian dengan berita acara final (dibuat di menu Musyawarah Desa), lalu Peraturan Desa pendirian yang memuat Anggaran Dasar. Anggaran Rumah Tangga ditetapkan terpisah dengan Peraturan Kepala Desa." },
            { title: "Urus persetujuan nama", body: `Persetujuan nama dari Sistem Informasi Desa berlaku paling lama ${NAME_APPROVAL_WORKDAYS} hari kerja. Catat nomor dan tanggalnya di sini; aplikasi mengingatkan bila sudah lewat.` },
            { title: "Daftarkan ke Kementerian", body: `Pendaftaran paling lama ${REGISTRATION_WORKDAYS} hari kerja sejak Peraturan Desa pendirian ditetapkan. Bila terlewat, proses diulang dari pendaftaran nama. Aplikasi menghitung batasnya dari tanggal Peraturan Desa yang Anda isi.` },
            { title: "Catat sertifikat dan ubah status", body: "Setelah sertifikat pendaftaran elektronik terbit, isi nomor dan tanggalnya, lalu ubah \"Status badan hukum\". Status tidak berubah sendiri." },
            { title: "Catat pengurus", body: `Tambahkan pelaksana operasional, sekretaris, bendahara, dan pengawas beserta SK-nya. Masa jabatan kosong dihitung ${TERM_YEARS} tahun sejak tanggal mulai.` },
          ],
        },
        {
          type: "list",
          title: "Yang perlu diingat",
          items: [
            "Aplikasi ini tidak mengirim data ke Kementerian. Anda mendaftar sendiri lewat Sistem Informasi Desa; aplikasi mencatat dan mencetak \"Lembar pendaftaran\" untuk membantu mengisi formulir.",
            "Daftar \"Kelengkapan dokumen pendaftaran\" di bagian atas tab menunjukkan apa yang masih kurang. Tanda lengkap muncul sendiri setelah kolom terkait terisi.",
            "Penasihat dijabat rangkap oleh Kepala Desa. Pelaksana operasional dan pengawas diangkat lewat Musyawarah Desa.",
            "Unggah salinan Perdes, AD/ART, sertifikat, NIB, dan NPWP di kotak \"Berkas legalitas\" supaya mudah dicari saat dibutuhkan.",
            "Hanya admin dan Kepala Desa yang dapat mengubah data legalitas.",
          ],
        },
      ],
    },
    {
      id: "dana-desa",
      label: "Dana Desa",
      blocks: [
        {
          type: "cards",
          title: "Dua arus yang dicatat di tab ini",
          items: [
            { title: "Penyertaan modal Desa", body: "Uang dari APB Desa yang disetorkan menjadi modal BUM Desa.", badge: "Uang keluar dari Desa", facts: [{ label: "Di APB Desa", value: `Pengeluaran pembiayaan ${APBDES_CAPITAL_ACCOUNT}` }, { label: "Di BUM Desa", value: `Menambah Penyertaan Modal Desa (${EQUITY_VILLAGE_CAPITAL})` }] },
            { title: "Bagi hasil usaha ke Desa", body: "Bagian laba BUM Desa yang diserahkan kepada Desa.", badge: "Uang masuk ke Desa", facts: [{ label: "Di APB Desa", value: `Pendapatan ${APBDES_PROFIT_SHARE_ACCOUNT} Bagi Hasil BUMDes` }, { label: "Di BUM Desa", value: `Pengambilan oleh pemilik (${EQUITY_VILLAGE_PROFIT_SHARE})` }] },
          ],
        },
        {
          type: "steps",
          title: "Urutan mencatat",
          items: [
            { title: "Putuskan di Musyawarah Desa", body: "Buat Musyawarah Desa berjenis \"tentang BUM Desa\" di menu Musyawarah Desa, catat keputusannya sebagai butir, lalu finalkan berita acaranya." },
            { title: "Catat keputusan di tab ini", body: "Tekan \"Catat keputusan\": pilih jenis, Musyawarah Desa, butir keputusan, dan jumlah yang diputuskan. Jumlah itu menjadi batas total untuk semua catatan arus yang bersandar padanya." },
            { title: "Catat arus uangnya", body: "Tekan \"Catat penyertaan modal\" atau \"Catat bagi hasil ke Desa\", pilih keputusan, tanggal, jumlah, akun kas BUM Desa, dan kas Desa di Buku Kas Umum." },
            { title: "Periksa hasilnya", body: "Satu catatan menghasilkan dua pembukuan sekaligus: baris di Buku Kas Umum APB Desa dan jurnal BUM Desa. Kolom Status menandai bila keduanya tidak lagi cocok." },
          ],
        },
        {
          type: "list",
          title: "Aplikasi akan menolak bila",
          items: [
            "Jumlah kumulatif melebihi jumlah yang diputuskan Musyawarah Desa.",
            "Berita acara Musyawarah Desa belum final, atau jenisnya bukan \"tentang BUM Desa\".",
            "Tanggal catatan lebih awal dari tanggal Musyawarah Desa.",
            "Penyertaan modal belum ada di anggaran APB Desa, atau bulan Buku Kas Umum sudah ditutup (periksa di menu APB Desa).",
            "Bagi hasil melebihi laba bersih tahun buku itu menurut pembukuan, atau melebihi saldo kas Kantor Pusat.",
            "Tanggalnya jatuh di periode BUM Desa yang sudah ditutup.",
          ],
        },
        {
          type: "list",
          title: "Salah catat atau ada peringatan",
          items: [
            "Gunakan tombol Batalkan pada barisnya. Catatan Buku Kas Umum ikut dihapus dan jurnal BUM Desa dibatalkan, kecuali bulan Buku Kas Umum itu sudah ditutup.",
            "Keputusan hanya bisa dibatalkan setelah semua catatan yang bersandar padanya dibatalkan.",
            `Peringatan \"Disalurkan lebih dari ${CAPITAL_DISBURSE_MONTHS} bulan\" muncul bila penyertaan modal dicatat lebih dari ${CAPITAL_DISBURSE_MONTHS} bulan setelah keputusan Musyawarah Desa (PP 11/2021 Pasal 43 ayat 1). Itu peringatan, bukan penolakan.`,
            "Mencatat arus ini butuh izin kelola BUM Desa dan izin mencatat di Buku Kas Umum APB Desa. Bila tombolnya tidak ada, minta admin desa.",
          ],
        },
      ],
    },
    {
      id: "istilah",
      label: "Istilah dan tips",
      blocks: [
        {
          type: "glossary",
          title: "Istilah yang sering muncul",
          items: [
            { term: "Jurnal", meaning: "Catatan satu kejadian keuangan dalam dua sisi: debit dan kredit. Jumlah debit harus sama dengan jumlah kredit." },
            { term: "Debit dan kredit", meaning: "Dua sisi pencatatan. Pada transaksi kas: pemasukan = debit kas, kredit akun lawan; pengeluaran sebaliknya." },
            { term: "Akun", meaning: "Nama pos pencatatan beserta kodenya, misalnya Kas Tunai atau Beban Listrik. Daftarnya mengikuti bagan akun resmi dan bisa dicari dengan mengetik kode atau nama." },
            { term: "Akun lawan", meaning: "Akun pasangan kas dalam sebuah transaksi: jenis pendapatan bila uang masuk, jenis beban bila uang keluar." },
            { term: "Kantor Pusat dan unit", meaning: "Kantor Pusat adalah pengelola BUM Desa; unit adalah usaha di bawahnya. Keduanya dibukukan sendiri-sendiri lalu digabung di laporan." },
            { term: "Akun RK", meaning: `Akun penghubung (resiprokal) antara Kantor Pusat (${RK_UNIT_ACCOUNT}) dan unit (${RK_PUSAT_ACCOUNT}). Dipakai saat dana berpindah antara keduanya; saling meniadakan di laporan gabungan.` },
            { term: "Ekuitas", meaning: "Modal pemilik: modal dari Desa atau masyarakat ditambah laba yang ditahan." },
            { term: "Neraca", meaning: "Laporan posisi keuangan: apa yang dimiliki (aset), apa yang dihutang (kewajiban), dan modal (ekuitas) pada satu tanggal." },
            { term: "Laba rugi", meaning: "Laporan pendapatan dikurangi biaya selama satu periode." },
            { term: "Jurnal pembukaan", meaning: "Jurnal saldo awal untuk uang dan aset yang sudah ada sebelum pembukuan di aplikasi dimulai." },
            { term: "Tutup periode", meaning: "Mengunci semester agar angkanya tidak berubah lagi. Bisa dibuka kembali dengan alasan." },
            { term: "BKU", meaning: "Buku Kas Umum APB Desa, dikelola di menu APB Desa." },
            { term: "NIB dan NPWP", meaning: "Nomor Induk Berusaha (13 angka) dan nomor pokok wajib pajak (15 atau 16 angka); titik dan strip boleh." },
            { term: "AD dan ART", meaning: "Anggaran Dasar (bagian dari Peraturan Desa pendirian) dan Anggaran Rumah Tangga (Peraturan Kepala Desa)." },
          ],
        },
        {
          type: "list",
          title: "Tips agar pembukuan rapi",
          items: [
            "Koreksi tidak menghapus. Isi lama tetap tersimpan di riwayat, jadi tulis alasan koreksi dengan jelas.",
            "Jurnal dari transaksi kas dan dari tab Dana Desa dikoreksi lewat sumbernya, bukan di tab Jurnal.",
            "Akun Penyertaan Modal Desa dan Bagi Hasil hanya digerakkan oleh tab Dana Desa; tidak muncul di pilihan akun transaksi kas dan jurnal manual.",
            "Bila ada pesan \"transaksi kas belum berjurnal\", tekan \"Susun jurnal untuk transaksi lama\" di tab Kas dan unit. Periode tidak bisa ditutup sebelum itu.",
            `Laporan tahunan disampaikan kepada Musyawarah Desa tahunan paling lama ${ANNUAL_MUSDES_MONTHS} bulan setelah tahun buku berakhir (PP 11/2021 Pasal 19 ayat 3). Tab Periode mengingatkan.`,
            "Angka ringkasan di tab Kas dan unit hanya menjumlah transaksi kas. Neraca dan laba rugi resmi ada di tab Laporan.",
          ],
        },
      ],
    },
  ],
};

export type BumdesFieldKey = "legalStatus" | "perdesNumber" | "artNumber" | "nameApprovalNo" | "certificateNo" | "initialCapital" | "txAccount" | "journalLines" | "resolutionAmount" | "resolutionFiscalYear" | "villageChannel";

/** Petunjuk kolom yang paling sering membingungkan. Kunci = nama kolom di kode (tab Legalitas memakai k yang sama dengan state formulir). */
export const BUMDES_FIELD_HELP: Record<BumdesFieldKey, FieldHelp> = {
  legalStatus: {
    tip: "Pilih sesuai keadaan sekarang. \"Berbadan hukum\" baru dipilih setelah sertifikat pendaftaran elektronik terbit. Status tidak berubah sendiri saat nomor sertifikat diisi.",
    example: "Sudah mendaftar tetapi sertifikat belum terbit: pilih \"Dalam proses pendaftaran\". Sertifikat sudah di tangan: pilih \"Berbadan hukum\" dan isi nomor sertifikat di bawah.",
    ref: "PP 11/2021 Pasal 8 ayat 1",
  },
  perdesNumber: {
    tip: "Nomor Peraturan Desa tentang pendirian BUM Desa, seperti tertulis di salinan Perdes. Perdes ini memuat Anggaran Dasar. Tanggalnya diisi di kolom sebelah dan dipakai aplikasi untuk menghitung batas waktu pendaftaran.",
    example: "Nomor … Tahun … tentang Pendirian Badan Usaha Milik Desa …",
    ref: "PP 11/2021 Pasal 7 ayat 6; Permendesa PDTT 3/2021 Pasal 9 ayat 4",
  },
  artNumber: {
    tip: "Nomor Peraturan Kepala Desa yang menetapkan Anggaran Rumah Tangga (aturan rinci pengelolaan BUM Desa). Ini dokumen terpisah dari Peraturan Desa pendirian.",
    example: "Nomor … Tahun … tentang Anggaran Rumah Tangga Badan Usaha Milik Desa …",
    ref: "PP 11/2021 Pasal 13 ayat 3",
  },
  nameApprovalNo: {
    tip: `Nomor pendaftaran nama yang tertera di surat persetujuan penggunaan nama dari Sistem Informasi Desa. Ini bukan nomor sertifikat. Persetujuan nama berlaku paling lama ${NAME_APPROVAL_WORKDAYS} hari kerja.`,
    example: "Nomor pendaftaran nama seperti tertulis di surat persetujuan: …",
    ref: "Permendesa PDTT 3/2021 Pasal 5 ayat 3 dan Pasal 7",
  },
  certificateNo: {
    tip: "Nomor pada sertifikat pendaftaran badan hukum elektronik. Isi hanya bila sertifikat sudah terbit; dibiarkan kosong berarti belum ada.",
    example: "Nomor sertifikat seperti tertera pada dokumen sertifikat: …",
    ref: "PP 11/2021 Pasal 8 ayat 1",
  },
  initialCapital: {
    tip: "Besar modal saat BUM Desa didirikan, sesuai penetapan di Peraturan Desa pendirian. Formulir pendaftaran juga memintanya. Tambahan modal sesudahnya dicatat di tab Dana Desa, bukan di sini.",
    example: "Rp … sesuai besar penyertaan modal Desa dan/atau masyarakat yang ditetapkan di Peraturan Desa pendirian.",
    ref: "PP 11/2021 Pasal 7 ayat 6; Permendesa PDTT 3/2021 Pasal 9 ayat 2",
  },
  txAccount: {
    tip: "Akun lawan dari kas: untuk pemasukan, pilih jenis pendapatannya; untuk pengeluaran, pilih jenis bebannya. Akun kas atau bank dipilih di kolom berikutnya. Ketik sebagian nama atau kode untuk mencari.",
    example: "Uang masuk dari sewa gedung: Pendapatan Sewa Gedung (4.1.04.03). Bayar tagihan listrik: Beban Listrik (6.1.04.01).",
  },
  journalLines: {
    tip: `Tiap baris berisi satu akun dan satu jumlah, di kolom Debit atau Kredit (tidak keduanya). Total debit harus sama dengan total kredit; selama belum seimbang tombol Simpan tidak aktif. Pindahan dana antara Kantor Pusat dan unit dijurnal di kedua sisi memakai akun RK (${RK_UNIT_ACCOUNT} di Kantor Pusat, ${RK_PUSAT_ACCOUNT} di unit).`,
    example: `Kantor Pusat memberi dana ke unit. Jurnal di Kantor Pusat: debit RK Unit Usaha (${RK_UNIT_ACCOUNT}), kredit akun kas. Jurnal di unit: debit akun kas, kredit RK Pusat (${RK_PUSAT_ACCOUNT}). Jumlahnya sama.`,
  },
  resolutionAmount: {
    tip: "Isi jumlah yang diputuskan Musyawarah Desa untuk butir ini, bukan jumlah yang sudah dibayar. Angka ini menjadi batas total semua catatan arus yang bersandar pada keputusan ini. Pembayarannya dicatat terpisah.",
    example: "Butir keputusan menetapkan penyertaan modal sebesar Rp …; isi dengan angka yang sama.",
    ref: "PP 11/2021 Pasal 41 ayat 4",
  },
  resolutionFiscalYear: {
    tip: "Tahun buku saat laba itu dihasilkan, bukan tahun pembagiannya. Aplikasi memeriksa bagi hasil terhadap laba bersih tahun buku ini menurut pembukuan.",
    example: "Laba tahun buku sebelumnya dibagikan tahun ini: isi tahun buku sebelumnya.",
    ref: "PP 11/2021 Pasal 59 ayat 2",
  },
  villageChannel: {
    tip: "Pilih dari kas Desa mana uang keluar (penyertaan modal) atau ke mana uang masuk (bagi hasil) pada Buku Kas Umum APB Desa: rekening bank desa atau kas tunai. Akun kas BUM Desa dipilih di kolom di atasnya.",
  },
};

export function bumdesFieldHelp(key: BumdesFieldKey): FieldHelp {
  return BUMDES_FIELD_HELP[key];
}

export const BUMDES_GUIDE_ENTRY: GuideEntry = {
  guide: BUMDES_GUIDE,
  href: "/bumdes",
  summary: "Alur pembukuan BUM Desa, legalitas dan pendaftaran, penyertaan modal serta bagi hasil dengan APB Desa, dan istilah akuntansi dalam bahasa sehari-hari.",
};
