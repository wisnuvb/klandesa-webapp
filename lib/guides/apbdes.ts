/**
 * Isi panduan halaman APBDes & Buku Kas: bahasa sehari-hari untuk perangkat desa, bukan teks pasal.
 * Murni (tanpa React) agar bisa diuji. Alur, status, dan aturan di sini mengikuti kode di lib/apbdes/** dan app/(app)/apbdes/**.
 * Pasal yang dirujuk sudah dicocokkan dengan teks resmi Permendagri 20/2018 (Berita Negara 2018 No. 611, peraturan.go.id).
 * Contoh isian HANYA ditampilkan, tidak pernah disalin otomatis ke kolom.
 *
 * Kunci petunjuk kolom = `id` elemen kolom di app/(app)/apbdes/_components (tes menjaga kuncinya tetap ada di kode).
 */
import type { FieldHelp, GuideEntry, PageGuide } from "./types";

const REF_PERUBAHAN = "Permendagri 20/2018 Pasal 40 ayat (2) dan (3)";
const REF_DPA = "Permendagri 20/2018 Pasal 52 ayat (1)";
const REF_SWAKELOLA = "Permendagri 20/2018 Pasal 52 ayat (2) dan (3)";
const REF_SPP = "Permendagri 20/2018 Pasal 53 ayat (1)";
const REF_PANJAR = "Permendagri 20/2018 Pasal 54";

export const APBDES_GUIDE: PageGuide = {
  id: "apbdes",
  title: "Panduan APBDes & Buku Kas",
  description: "Urutan kerja dari anggaran sampai laporan, siapa mengerjakan apa, dan arti istilahnya. Menutup panduan tidak menghilangkan isian apa pun.",
  buttonLabel: "Panduan",
  bannerText: "Baca panduan singkat (sekitar 3 menit) tentang urutan kerja anggaran, SPP, dan buku kas sebelum mulai mengisi.",
  tabs: [
    {
      id: "alur",
      label: "Alur kerja",
      blocks: [
        {
          type: "steps",
          title: "Urutan kerja dalam satu tahun anggaran",
          items: [
            { title: "Pilih tahun anggaran", body: "Di kanan atas. Semua tab mengikuti tahun yang dipilih. Lewat tombol Pengaturan, isi rekening kas desa dan nama penandatangan yang dicetak pada laporan." },
            { title: "Tab Anggaran: susun APB Desa", body: "Tekan \"Buat APB Desa\", lalu \"Tambah baris\" untuk tiap pendapatan, belanja, dan pembiayaan. Draf boleh diubah dan dihapus. Setelah Peraturan Desa tentang APB Desa disahkan, tekan \"Tetapkan\" dan isi nomor serta tanggalnya. Sesudah itu baris terkunci." },
            { title: "Tab Pelaksanaan (DPA): rencanakan tiap kegiatan", body: "Untuk setiap kegiatan belanja, isi Rencana Kerja (pelaksana wajib), bagi anggaran ke 12 bulan (RAK), dan rinci biaya (RAB). Sekretaris Desa memverifikasi, Kepala Desa menyetujui." },
            { title: "Tab SPP & Panjar: minta dan cairkan dana", body: "Kaur/Kasi pelaksana menekan \"Ajukan SPP\". Lalu Sekretaris Desa memverifikasi, Kepala Desa menyetujui, dan Kaur Keuangan mencatat pembayaran. Untuk swakelola, uang yang dicairkan menjadi panjar yang harus dipertanggungjawabkan." },
            { title: "Tab Buku Kas: catat uang masuk dan keluar", body: "Catat penerimaan, belanja di luar SPP, setoran pajak, serta tarik dan setor tunai ke bank. Pembayaran SPP masuk sendiri. Akhir bulan: Tutup bulan, diverifikasi Sekretaris Desa, disetujui Kepala Desa." },
            { title: "Tab Laporan: cetak", body: "Buku kas, buku bank, buku pajak, laporan semester pertama, laporan akhir tahun, dan lainnya diambil dari data di atas. Tidak ada yang diketik ulang." },
            { title: "Anggaran perlu diubah di tengah tahun", body: "Di tab Anggaran tekan \"Buat perubahan\". Isinya salinan APB Desa terakhir yang ditetapkan. Ubah, lalu tetapkan dengan Peraturan Desa perubahan. Kegiatan yang anggarannya berubah perlu DPA disusun ulang (DPPA)." },
          ],
        },
        {
          type: "split",
          left: {
            title: "Terisi atau dijalankan otomatis",
            items: [
              "Nomor SPP (berurutan per tahun)",
              "Catatan buku kas saat SPP dibayar, dengan nomor bukti SPP-…",
              "Panjar saat SPP swakelola dibayar, lengkap dengan batas 10 hari kerja",
              "Catatan pengembalian sisa panjar di buku kas",
              "Pemeriksaan: saldo kas atau bank tidak boleh minus, belanja tidak boleh melebihi anggaran",
              "Peringatan bila anggaran belum seimbang",
              "Semua laporan cetak",
            ],
          },
          right: {
            title: "Anda yang mengisi",
            items: [
              "Baris anggaran dan nomor serta tanggal Peraturan Desa",
              "Rencana kerja, rencana penarikan bulanan, dan RAB tiap kegiatan",
              "Pengajuan SPP dan bukti pertanggungjawaban panjar",
              "Penerimaan, setoran pajak, serta tarik dan setor bank di buku kas",
              "Tutup bulan di akhir bulan",
              "Daftar program sektoral/daerah di tab Laporan",
            ],
          },
        },
      ],
    },
    {
      id: "status",
      label: "Siapa & status",
      blocks: [
        {
          type: "cards",
          title: "Arti status dan siapa yang melanjutkan",
          items: [
            {
              title: "APB Desa",
              body: "Belanja baru bisa dicatat dan DPA baru bisa disusun setelah APB Desa ditetapkan.",
              facts: [
                { label: "Draf", value: "Belum berlaku. Baris masih bisa diubah, ditambah, dan dihapus." },
                { label: "Ditetapkan", value: "Berlaku dan terkunci. Mengubahnya lewat \"Buat perubahan\"." },
              ],
            },
            {
              title: "DPA / DPPA tiap kegiatan",
              body: "DPA yang disetujui adalah syarat mengajukan SPP.",
              facts: [
                { label: "Draf", value: "Disusun Kaur/Kasi pelaksana. Syarat verifikasi: pelaksana terisi dan rencana penarikan 12 bulan sama dengan anggaran tiap rekening." },
                { label: "Diverifikasi Sekretaris Desa", value: "Menunggu persetujuan Kepala Desa." },
                { label: "Disetujui Kepala Desa", value: "Terkunci. SPP boleh diajukan." },
                { label: "DPPA", value: "DPA yang disusun ulang setelah Perubahan APB Desa mengubah anggaran kegiatan. SPP lama tetap utuh; SPP baru tertahan sampai DPPA disetujui." },
              ],
            },
            {
              title: "SPP",
              body: "Setiap tahap dilakukan orang yang berbeda. Tombol hanya muncul bagi yang berwenang.",
              facts: [
                { label: "Diajukan", value: "Menunggu verifikasi Sekretaris Desa." },
                { label: "Diverifikasi", value: "Menunggu persetujuan Kepala Desa." },
                { label: "Disetujui", value: "Menunggu Kaur Keuangan mencatat pembayaran." },
                { label: "Sudah dibayar", value: "Sudah masuk Buku Kas Umum." },
                { label: "Ditolak", value: "Tidak diproses lagi. Alasan penolakan wajib ditulis." },
              ],
            },
            {
              title: "Bulan di Buku Kas",
              body: "Dipilih lewat kolom Bulan di tab Buku Kas.",
              facts: [
                { label: "Terbuka", value: "Catatan bulan itu masih bisa ditambah, diubah, dan dihapus." },
                { label: "Ditutup", value: "Terkunci. Bulan hanya bisa ditutup setelah bulannya berakhir dan setelah bulan-bulan sebelumnya ditutup." },
                { label: "Diverifikasi Sekretaris Desa", value: "Sudah diperiksa Sekretaris Desa." },
                { label: "Disetujui Kepala Desa", value: "Selesai. Membuka kembali bulan yang sudah disetujui memerlukan wewenang persetujuan." },
              ],
            },
            {
              title: "Panjar",
              body: "Ada saldo yang harus dipertanggungjawabkan atau dikembalikan.",
              facts: [
                { label: "Terbuka", value: "Masih ada saldo dan batas waktu belum lewat." },
                { label: "Lewat 10 hari kerja", value: "Batas lewat. Aplikasi tidak menghitung hari libur nasional, jadi batas bisa tampak lebih awal." },
                { label: "Lunas", value: "Saldo nol: sudah dipertanggungjawabkan atau dikembalikan." },
              ],
            },
          ],
        },
        { type: "note", text: "Dasar hukum: Permendagri 20/2018 tentang Pengelolaan Keuangan Desa (Pasal 40, 45-48, 52-55, 63, 67-68, 70). Peraturan Bupati/Wali Kota setempat dapat mengatur lebih rinci." },
      ],
    },
    {
      id: "istilah",
      label: "Istilah",
      blocks: [
        {
          type: "glossary",
          items: [
            { term: "APB Desa", meaning: "Anggaran Pendapatan dan Belanja Desa: rencana uang masuk dan keluar desa setahun, ditetapkan dengan Peraturan Desa." },
            { term: "Pendapatan, belanja, pembiayaan", meaning: "Uang masuk (kode 4), uang keluar untuk kegiatan (kode 5), dan penerimaan atau pengeluaran yang bukan keduanya, seperti sisa dana tahun lalu (kode 6)." },
            { term: "SiLPA", meaning: "Sisa Lebih Perhitungan Anggaran: selisih lebih penerimaan dan pengeluaran selama satu tahun anggaran. SiLPA tahun lalu menjadi penerimaan tahun ini; saldo kas awal tahun dicatat pada rekening 6.1.1.01." },
            { term: "Kode bidang, kegiatan, rekening", meaning: "Kode baku dari lampiran peraturan. Kegiatan menjawab \"untuk apa\" (mis. 1.1.01), rekening menjawab \"jenis uangnya apa\" (mis. 5.2.1.01)." },
            { term: "Pagu", meaning: "Batas anggaran satu rekening. Belanja yang dicatat tidak boleh melebihinya." },
            { term: "Sumber dana", meaning: "Asal uang: Dana Desa, Alokasi Dana Desa, Pendapatan Asli Desa, bagi hasil pajak dan retribusi daerah, bantuan keuangan provinsi atau kabupaten/kota, atau lain-lain. Pilihan ini istilah ringkas aplikasi." },
            { term: "Kaur / Kasi", meaning: "Kepala Urusan / Kepala Seksi, perangkat desa. Yang melaksanakan kegiatan ialah Kaur/Kasi pelaksana." },
            { term: "Kaur Keuangan", meaning: "Pemegang kas desa: mencatat buku kas dan mencairkan pembayaran." },
            { term: "DPA", meaning: "Dokumen Pelaksanaan Anggaran: rencana pelaksanaan satu kegiatan (rencana kerja, rencana penarikan, dan RAB). Kegiatan dilaksanakan berdasarkan DPA yang disetujui Kepala Desa." },
            { term: "DPPA", meaning: "Dokumen Pelaksanaan Perubahan Anggaran: DPA yang disusun ulang setelah Perubahan APB Desa. Dinomori DPPA ke-1, ke-2, dan seterusnya." },
            { term: "RAK Desa", meaning: "Rencana Anggaran Kas: berapa uang yang direncanakan ditarik tiap bulan. Total 12 bulan harus sama dengan anggaran rekening." },
            { term: "RAB", meaning: "Rencana Anggaran Biaya: rincian volume x harga satuan dari kegiatan." },
            { term: "SPP", meaning: "Surat Permintaan Pembayaran: permintaan Kaur/Kasi agar dana kegiatan dicairkan. Tidak boleh melebihi sisa anggaran dan rencana penarikan sampai bulan berjalan." },
            { term: "Swakelola", meaning: "Dikerjakan sendiri oleh desa, dengan warga dan bahan setempat. Dana yang dicairkan menjadi panjar." },
            { term: "Penyedia barang/jasa", meaning: "Dikerjakan pihak luar. SPP diajukan setelah barang/jasa diterima, dengan pernyataan tanggung jawab belanja dan bukti penerimaan." },
            { term: "Panjar", meaning: "Uang muka yang dipegang Kaur/Kasi pelaksana swakelola. Harus dipertanggungjawabkan dengan bukti, atau sisanya dikembalikan ke kas desa." },
            { term: "Buku Kas Umum (BKU)", meaning: "Catatan semua uang masuk dan keluar, dengan saldo berjalan. Ditutup tiap akhir bulan." },
            { term: "Buku pembantu", meaning: "Catatan rinci pendamping BKU: buku bank, buku pajak, dan buku panjar." },
            { term: "Bruto dan pajak dipotong", meaning: "Jumlah belanja dicatat penuh (bruto). Pajak yang dipotong tertahan di kas sebagai titipan sampai dicatat sebagai setoran pajak." },
            { term: "Program sektoral", meaning: "Program kementerian, provinsi, kabupaten/kota, atau pihak lain yang masuk ke desa di luar APB Desa. Didaftar sebagai lampiran laporan akhir tahun." },
          ],
        },
      ],
    },
    {
      id: "tips",
      label: "Tips & tenggat",
      blocks: [
        {
          type: "list",
          title: "Supaya tidak tersangkut",
          items: [
            "Kolom bertanda * wajib diisi. Pesan merah di bawah kolom menjelaskan apa yang perlu diperbaiki.",
            "Belanja tidak bisa dicatat sebelum APB Desa ditetapkan. Tetapkan dulu di tab Anggaran.",
            "SPP tidak bisa diajukan sebelum DPA kegiatannya disetujui Kepala Desa. Bila daftar kegiatan di formulir SPP kosong, periksa tab Pelaksanaan.",
            "Rencana penarikan tiap rekening harus berjumlah sama dengan anggarannya. Aplikasi menampilkan selisihnya langsung di bawah kolom bulan.",
            "Catatan hasil SPP atau panjar tidak diubah di Buku Kas. Ubahlah lewat SPP atau panjar yang bersangkutan.",
            "Saldo kas dan bank tidak boleh minus. Bila ditolak, catat dulu penerimaan atau tarik tunai dari bank.",
            "Catatan di bulan yang sudah ditutup terkunci. Gunakan \"Buka kembali\" hanya untuk koreksi yang sah.",
            "Anggaran yang belum seimbang tetap bisa ditetapkan, tetapi aplikasi memberi peringatan. Periksa dengan Peraturan Desa yang disahkan.",
            "Nomor bukti sebaiknya mengikuti penomoran bukti yang sudah dipakai desa, supaya mudah dicocokkan dengan kuitansi.",
          ],
        },
        {
          type: "list",
          title: "Tenggat menurut Permendagri 20/2018",
          items: [
            "Buku kas ditutup tiap akhir bulan, dan dilaporkan Kaur Keuangan kepada Sekretaris Desa paling lambat tanggal 10 bulan berikutnya (Pasal 63 dan 67).",
            "Panjar swakelola: dipertanggungjawabkan, atau sisanya dikembalikan ke kas desa, paling lama 10 hari kerja (Pasal 54).",
            "Laporan semester pertama kepada Bupati/Wali Kota lewat camat: paling lambat minggu kedua bulan Juli (Pasal 68).",
            "Laporan pertanggungjawaban realisasi APB Desa: paling lambat 3 bulan setelah akhir tahun anggaran (Pasal 70).",
            "Perubahan APB Desa hanya sekali dalam setahun anggaran, kecuali keadaan luar biasa. Kriterianya diatur Peraturan Bupati/Wali Kota (Pasal 40).",
          ],
        },
        { type: "note", text: "Aplikasi tidak menghitung tarif pajak maupun hari libur nasional. Isi jumlah pajak sesuai ketentuan perpajakan yang berlaku." },
      ],
    },
  ],
};

const HELP: Record<string, FieldHelp> = {
  // Tambah/ubah baris anggaran (LineDialog)
  "ln-activity": {
    tip: "Kegiatan menjawab pertanyaan \"uang ini dipakai untuk apa\". Pilih yang paling cocok dengan Peraturan Desa tentang APB Desa. Hanya belanja yang memakai kegiatan.",
    example: "Awal kode menunjukkan bidangnya: 1.x.xx Penyelenggaraan Pemerintahan Desa, 2.x.xx Pelaksanaan Pembangunan Desa, 3.x.xx Pembinaan Kemasyarakatan, 4.x.xx Pemberdayaan Masyarakat. Pilih kegiatan: …",
  },
  "ln-account": {
    tip: "Rekening menjawab \"jenis uangnya apa\". Pilih yang tingkatnya paling rinci (empat bagian kode). Ketik sebagian nama untuk mencari.",
    example: "Pendapatan: pilih rekening 4.x.x.xx yang sesuai asalnya, mis. \"…\". Belanja: pilih rekening 5.x.x.xx, mis. belanja barang/jasa atau modal.",
  },
  "ln-desc": {
    tip: "Tulis nama baris sesuai Peraturan Desa agar mudah dicocokkan. Dikosongkan, aplikasi memakai nama rekening.",
    example: "Pembangunan … di Dusun … (sebut jenis pekerjaan dan lokasinya).",
  },
  "ln-fund": {
    tip: "Pilih asal uangnya. Boleh dikosongkan, tetapi laporan realisasi kegiatan akhir tahun menampilkan sumber dana tiap kegiatan.",
  },
  // Penetapan dan perubahan (AdoptDialog)
  "ad-num": {
    tip: "Isi nomor Peraturan Desa tentang APB Desa persis seperti yang tertulis pada Perdes yang sudah disahkan. Setelah ditetapkan, baris anggaran terkunci.",
    example: "… Tahun … (nomor dan tahun, sesuai Peraturan Desa).",
  },
  "am-reason": {
    tip: "Hanya perlu diisi bila ini perubahan kedua atau lebih dalam tahun yang sama. Tulis keadaan luar biasanya (minimal 10 huruf). Kriterianya diatur Peraturan Bupati/Wali Kota.",
    example: "Terjadi … yang mengharuskan penyesuaian anggaran, sesuai … dari Bupati/Wali Kota.",
    ref: REF_PERUBAHAN,
  },
  // Rencana Kerja Kegiatan (DpaDialog)
  "rkk-executorName": {
    tip: "Nama Kaur atau Kasi yang melaksanakan kegiatan ini. Wajib terisi sebelum DPA bisa diverifikasi, dan ikut terisi di formulir SPP.",
    example: "Nama Kaur/Kasi yang bertanggung jawab atas kegiatan ini: …",
    ref: REF_DPA,
  },
  "rkk-outputName": {
    tip: "Hasil nyata yang akan dicapai kegiatan, bukan nama kegiatannya. Dipakai pada laporan realisasi kegiatan (volume, satuan, capaian).",
    example: "Jalan lingkungan terbangun, saluran air berfungsi, atau pelatihan terlaksana: … (hasil yang bisa dihitung).",
  },
  "rkk-target": {
    tip: "Siapa atau apa yang diuntungkan oleh kegiatan ini, dan seberapa banyak. Satu-dua kalimat cukup.",
    example: "Warga Dusun … yang memakai jalan itu, sekitar … keluarga.",
  },
  // RAB
  "rab-desc": {
    tip: "Satu baris RAB = satu jenis kebutuhan. Rincikan sampai bisa dihitung: volume dikali harga satuan.",
    example: "Pasir pasang, semen, upah tukang: … (satu jenis per baris).",
  },
  "rab-unit": {
    tip: "Satuan hitung untuk volume pada baris ini, mis. m, m2, m3, sak, orang-hari, unit, paket.",
  },
  // Ajukan SPP (SppFormDialog)
  "sp-mode": {
    tip: "Swakelola: dikerjakan sendiri oleh desa; dana yang cair menjadi panjar. Penyedia barang/jasa: dikerjakan pihak luar; SPP diajukan setelah barang/jasa diterima. Swakelola diutamakan.",
    ref: REF_SWAKELOLA,
  },
  "sp-exec": {
    tip: "Kaur/Kasi pelaksana yang meminta dana. Pada swakelola, dialah penerima panjar dan yang wajib mempertanggungjawabkannya. Terisi otomatis dari DPA; ubah bila perlu.",
    ref: REF_SPP,
  },
  "sp-period": {
    tip: "Kapan pekerjaan dilakukan. Boleh berupa bulan atau rentang bulan.",
    example: "… sampai … (bulan dan tahun pelaksanaan).",
  },
  // Catat transaksi kas (EntryDialog)
  "en-type": {
    tip: "Penerimaan: uang masuk. Pengeluaran: belanja. Setoran pajak: menyetor pajak yang sebelumnya dipotong. Tarik tunai dan Setor tunai hanya memindahkan uang antara bank dan kas tunai. Pembayaran SPP tidak dicatat di sini karena masuk sendiri.",
  },
  "en-voucher": {
    tip: "Nomor bukti transaksi (kuitansi, slip bank, atau nomor internal desa). Wajib diisi.",
    example: "Nomor pada kuitansi atau slip bank: … (ikuti penomoran yang dipakai desa).",
  },
  "en-spend": {
    tip: "Pilih mata anggaran yang dibelanjakan. Bila yang dicari tidak ada, anggarannya belum masuk APB Desa; tambahkan lewat Perubahan APB Desa.",
  },
  "en-amount": {
    tip: "Untuk belanja, isi jumlah penuh sebelum pajak dipotong (bruto). Uang yang benar-benar keluar dari kas dihitung otomatis: jumlah dikurangi pajak.",
  },
  // Panjar (PanjarDialog)
  "pj-no": {
    tip: "Pada pertanggungjawaban: nomor kuitansi atau nota pembayaran barang/jasa. Pada pengembalian sisa: nomor bukti setor ke kas desa.",
    ref: REF_PANJAR,
  },
  "pj-acc": {
    tip: "Rekening belanja yang realisasinya berkurang karena sisa panjar dikembalikan. Angka \"bisa dikembalikan\" di pilihan adalah batas yang diizinkan.",
  },
  // Program sektoral (SektoralSection)
  "sk-programName": {
    tip: "Program yang masuk ke desa di luar APB Desa dan dilaporkan sebagai lampiran laporan akhir tahun, misalnya program dari kementerian, provinsi, kabupaten/kota, atau pihak lain.",
    example: "Program … dari … untuk desa kami.",
  },
};

/** Petunjuk satu kolom; kuncinya = `id` kolom di app/(app)/apbdes/_components. undefined bila kolom itu tidak diberi petunjuk. */
export function apbdesFieldHelp(key: string): FieldHelp | undefined {
  return HELP[key];
}

/** Semua kunci petunjuk; dipakai tes agar kunci tidak menggantung ketika kolom diganti namanya. */
export const APBDES_HELP_KEYS: string[] = Object.keys(HELP);

export const APBDES_GUIDE_ENTRY: GuideEntry = {
  guide: APBDES_GUIDE,
  href: "/apbdes",
  summary: "Urutan kerja anggaran desa: APB Desa, DPA, SPP dan panjar, buku kas bulanan, sampai laporan. Siapa mengerjakan apa dan arti statusnya.",
};

export const APBDES_GUIDE_ENTRIES: GuideEntry[] = [APBDES_GUIDE_ENTRY];
