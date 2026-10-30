/**
 * Katalog surat dinas desa (kategori "Administrasi Desa"). Naskah internal tanpa pemohon:
 * undangan, tugas, edaran, pemberitahuan, keputusan, berita acara, daftar hadir, nota dinas.
 * Format tata naskah berbeda antar kabupaten; semuanya kerangka yang bisa diubah di kanvas.
 */
import {
  br, datelineSurat, f, field, internalLetter, judul, kadesSignature, memo, para, penutup, rincian, t,
  type CatalogEntry, type LeafIn,
} from "./helpers";

const TEMBUSAN_ARSIP: LeafIn = { id: "cc", type: "cc", items: [[t("Arsip")]] };

/** Spasi tak terputus + baris kedua: memberi tinggi sel kosong agar bisa diisi tulisan tangan. */
const SEL_KOSONG = [t(" "), br, t(" ")];

export const ADMINISTRASI: CatalogEntry[] = [
  {
    catalogKey: "cat_adm_undangan",
    name: "Surat Undangan Rapat / Musyawarah",
    description: "Mengundang warga, BPD, atau perangkat desa untuk rapat atau musyawarah.",
    category: "Administrasi Desa",
    document: internalLetter({
      kind: "surat_biasa",
      fields: [
        field("tujuan", "Diundang", "text", { placeholder: "mis. Bapak/Ibu Anggota BPD dan Tokoh Masyarakat" }),
        field("perihal", "Perihal", "text", { placeholder: "mis. Undangan musyawarah desa" }),
        field("acara", "Nama acara", "text", { placeholder: "mis. musyawarah perencanaan pembangunan desa" }),
        field("hari_tanggal", "Tanggal acara", "date"),
        field("waktu", "Waktu", "text", { placeholder: "mis. 09.00 WIB sampai selesai" }),
        field("tempat", "Tempat", "text", { placeholder: "mis. Balai Desa" }),
        field("agenda", "Agenda", "longtext", { placeholder: "mis. pembahasan rencana kerja tahun depan" }),
      ],
      body: [
        memo([f("isian.perihal")], [f("isian.tujuan")]),
        para("pembuka", t("Dengan hormat, sehubungan dengan "), f("isian.acara"), t(", kami mengundang Bapak/Ibu untuk hadir pada:")),
        rincian(
          "rincian",
          t("Hari, tanggal : "), f("isian.hari_tanggal", "hari"), t(", "), f("isian.hari_tanggal", "tanggal"), br,
          t("Waktu : "), f("isian.waktu"), br,
          t("Tempat : "), f("isian.tempat"), br,
          t("Agenda : "), f("isian.agenda"),
        ),
        penutup("undangan"),
        kadesSignature(),
        TEMBUSAN_ARSIP,
      ],
    }),
  },
  {
    catalogKey: "cat_adm_tugas",
    name: "Surat Tugas",
    description: "Memberi tugas kepada satu atau beberapa perangkat atau warga untuk suatu kegiatan.",
    category: "Administrasi Desa",
    document: internalLetter({
      kind: "perintah",
      fields: [
        field("tugas", "Tugas yang diberikan", "longtext", { placeholder: "mis. mengikuti pelatihan pengelolaan keuangan desa" }),
        field("tanggal_tugas", "Tanggal tugas", "date"),
        field("lokasi_tugas", "Lokasi", "text", { placeholder: "mis. Kantor Kecamatan" }),
      ],
      groups: [
        {
          id: "petugas", label: "Petugas", min: 1, max: 10, personRows: true,
          fields: [field("nama", "Nama", "text"), field("jabatan", "Jabatan", "text", { required: false })],
        },
      ],
      body: [
        judul("SURAT TUGAS"),
        para(
          "pembuka",
          t("Yang bertanda tangan di bawah ini Kepala Desa "), f("desa.nama"), t(", Kecamatan "), f("desa.kecamatan"),
          t(", Kabupaten "), f("desa.kabupaten"), t(", memberi tugas kepada:"),
        ),
        { id: "tabel_petugas", type: "repeatTable", group: "petugas", columns: [{ label: "Nama", field: "nama" }, { label: "Jabatan", field: "jabatan" }] },
        para("isi", t("Untuk "), f("isian.tugas"), t(" pada tanggal "), f("isian.tanggal_tugas", "tanggal"), t(" bertempat di "), f("isian.lokasi_tugas"), t(".")),
        penutup("tugas"),
        kadesSignature(),
      ],
    }),
  },
  {
    catalogKey: "cat_adm_edaran",
    name: "Surat Edaran",
    description: "Pemberitahuan atau imbauan resmi kepada banyak pihak sekaligus.",
    category: "Administrasi Desa",
    document: internalLetter({
      kind: "surat_biasa",
      fields: [
        field("tentang", "Tentang", "text", { placeholder: "mis. kerja bakti dan kebersihan lingkungan" }),
        field("tujuan", "Ditujukan kepada", "text", { placeholder: "mis. Seluruh warga dan Ketua RT/RW" }),
        field("isi_edaran", "Isi edaran", "longtext", { placeholder: "Tulis hal yang perlu diketahui dan dilaksanakan" }),
      ],
      body: [
        judul("SURAT EDARAN"),
        { id: "tentang", type: "heading", level: 3, content: [t("TENTANG "), f("isian.tentang", "upper")] },
        para("tujuan", t("Yth. "), f("isian.tujuan")),
        para("isi", f("isian.isi_edaran")),
        penutup("edaran"),
        kadesSignature(),
        TEMBUSAN_ARSIP,
      ],
    }),
  },
  {
    catalogKey: "cat_adm_pemberitahuan",
    name: "Surat Pemberitahuan",
    description: "Memberitahukan suatu hal kepada pihak tertentu (satu surat, bukan edaran umum).",
    category: "Administrasi Desa",
    document: internalLetter({
      kind: "surat_biasa",
      fields: [
        field("tujuan", "Ditujukan kepada", "text", { placeholder: "mis. Ketua RT 02" }),
        field("perihal", "Perihal", "text", { placeholder: "mis. Pemberitahuan jadwal pelayanan" }),
        field("isi_pemberitahuan", "Isi pemberitahuan", "longtext"),
      ],
      body: [
        memo([f("isian.perihal")], [f("isian.tujuan")]),
        para("isi", t("Dengan hormat, bersama ini kami beritahukan bahwa "), f("isian.isi_pemberitahuan"), t(".")),
        penutup("dinas"),
        kadesSignature(),
        TEMBUSAN_ARSIP,
      ],
    }),
  },
  {
    // Pola Perbup tata naskah desa: kop garuda, "NOMOR … TAHUN …", Menimbang/Mengingat/Menetapkan, diktum, "Ditetapkan di".
    // Dasar hukum diisi operator karena berbeda antar daerah; hanya UU Desa yang dicantumkan tetap.
    catalogKey: "cat_adm_sk_kades",
    name: "Surat Keputusan Kepala Desa (kerangka)",
    description: "Kerangka keputusan Kepala Desa berkop garuda; isi dasar hukum sesuai aturan daerah Anda.",
    category: "Administrasi Desa",
    document: internalLetter({
      kind: "keputusan",
      letterhead: "garuda",
      numbering: { mode: "auto", pattern: "{URUT} TAHUN {TAHUN}", reset: "yearly", padding: 0, counterKey: "keputusan" },
      fields: [
        field("tentang", "Tentang", "text", { placeholder: "mis. pembentukan panitia peringatan hari kemerdekaan" }),
        field("pertimbangan", "Pertimbangan (bahwa …)", "longtext", { placeholder: "mis. perlu dibentuk panitia agar kegiatan berjalan tertib" }),
        field("dasar_hukum", "Dasar hukum lain", "longtext", { placeholder: "mis. Peraturan Daerah … dan Peraturan Desa …;" }),
        field("isi_keputusan", "Isi keputusan (KESATU)", "longtext"),
      ],
      body: [
        {
          id: "judul", type: "title", numberPrefix: "NOMOR ",
          title: [t("KEPUTUSAN KEPALA DESA ", ["b"]), f("desa.nama", "upper")],
        },
        { id: "tentang", type: "heading", level: 3, content: [t("TENTANG "), f("isian.tentang", "upper")] },
        { id: "menimbang", type: "dictum", kind: "menimbang", items: [[t("bahwa "), f("isian.pertimbangan"), t(";")]] },
        {
          id: "mengingat", type: "dictum", kind: "mengingat",
          items: [[t("Undang-Undang Nomor 6 Tahun 2014 tentang Desa;")], [f("isian.dasar_hukum")]],
        },
        {
          id: "menetapkan", type: "dictum", kind: "menetapkan",
          items: [[t("KEPUTUSAN KEPALA DESA "), f("desa.nama", "upper"), t(" TENTANG "), f("isian.tentang", "upper")]],
        },
        {
          id: "diktum", type: "dictum", kind: "diktum",
          items: [[f("isian.isi_keputusan")], [t("Keputusan ini mulai berlaku pada tanggal ditetapkan.")]],
        },
        {
          id: "ttd", type: "signature",
          dateline: [t("Ditetapkan di "), f("desa.nama"), t(", pada tanggal "), f("surat.tanggal", "tanggal")],
          slots: [{ id: "kades", who: { kind: "pejabat", official: "kades" }, stamp: true }],
        },
      ],
    }),
  },
  {
    catalogKey: "cat_adm_berita_acara",
    name: "Berita Acara Kegiatan (kerangka)",
    description: "Mencatat jalannya rapat atau kegiatan (mis. musyawarah, serah terima) beserta hasilnya.",
    category: "Administrasi Desa",
    document: internalLetter({
      kind: "berita_acara",
      fields: [
        field("kegiatan", "Kegiatan", "text", { placeholder: "mis. musyawarah desa tentang rencana pembangunan" }),
        field("hari_tanggal", "Tanggal kegiatan", "date"),
        field("tempat", "Tempat", "text", { placeholder: "mis. Balai Desa" }),
        field("uraian", "Jalannya kegiatan", "longtext"),
        field("hasil", "Hasil / kesepakatan", "longtext"),
      ],
      body: [
        judul("BERITA ACARA"),
        para(
          "pembuka",
          t("Pada hari "), f("isian.hari_tanggal", "hari"), t(", tanggal "), f("isian.hari_tanggal", "tanggal"),
          t(", bertempat di "), f("isian.tempat"), t(", telah dilaksanakan "), f("isian.kegiatan"), t(" dengan uraian sebagai berikut:"),
        ),
        para("uraian", f("isian.uraian")),
        para("hasil", t("Hasil/kesepakatan: "), f("isian.hasil")),
        penutup("berita_acara"),
        {
          id: "ttd", type: "signature",
          dateline: datelineSurat,
          slots: [
            { id: "sekdes", who: { kind: "pejabat", official: "sekdes" }, caption: [t("Sekretaris,")] },
            { id: "kades", who: { kind: "pejabat", official: "kades" }, caption: [t("Kepala Desa,")], stamp: true },
          ],
        },
      ],
    }),
  },
  {
    // Lembar kosong untuk dicetak: peserta mengisi nama dan tanda tangan langsung di kertas.
    catalogKey: "cat_adm_daftar_hadir",
    name: "Daftar Hadir Rapat / Kegiatan",
    description: "Lembar daftar hadir untuk dicetak; peserta menulis nama dan tanda tangan di kertas.",
    category: "Administrasi Desa",
    document: internalLetter({
      kind: "daftar",
      numbering: { mode: "none" },
      fields: [
        field("kegiatan", "Kegiatan", "text", { placeholder: "mis. rapat koordinasi perangkat desa" }),
        field("hari_tanggal", "Tanggal", "date"),
        field("tempat", "Tempat", "text", { placeholder: "mis. Balai Desa" }),
      ],
      body: [
        { id: "judul", type: "title", title: [t("DAFTAR HADIR", ["b", "u"])], showNumber: false },
        rincian(
          "rincian",
          t("Kegiatan : "), f("isian.kegiatan"), br,
          t("Hari, tanggal : "), f("isian.hari_tanggal", "hari"), t(", "), f("isian.hari_tanggal", "tanggal"), br,
          t("Tempat : "), f("isian.tempat"),
        ),
        {
          id: "tabel", type: "table", bordered: true,
          columns: [
            { label: "No", widthPct: 8 },
            { label: "Nama", widthPct: 34 },
            { label: "Jabatan / Alamat", widthPct: 28 },
            { label: "Tanda tangan", widthPct: 30 },
          ],
          rows: Array.from({ length: 15 }, (_, i) => [[t(String(i + 1))], SEL_KOSONG, SEL_KOSONG, SEL_KOSONG]),
        },
        kadesSignature("ttd", [t("Mengetahui,")]),
      ],
    }),
  },
  {
    catalogKey: "cat_adm_nota_dinas",
    name: "Nota Dinas / Memo Internal (kerangka)",
    description: "Surat singkat antar perangkat desa, mis. dari Sekretaris Desa kepada Kepala Desa.",
    category: "Administrasi Desa",
    document: internalLetter({
      kind: "surat_biasa",
      fields: [
        field("tujuan", "Kepada", "text", { placeholder: "mis. Kepala Desa" }),
        field("perihal", "Perihal", "text", { placeholder: "mis. Usulan jadwal rapat" }),
        field("isi", "Isi nota", "longtext"),
      ],
      body: [
        memo([f("isian.perihal")], [f("isian.tujuan")], "kepala", {
          sisipan: [{ label: "Dari", value: [f("pejabat.sekdes.jabatan")] }],
          diTempat: false,
        }),
        para("isi", f("isian.isi")),
        penutup("dinas"),
        {
          id: "ttd", type: "signature",
          dateline: datelineSurat,
          slots: [{ id: "sekdes", who: { kind: "pejabat", official: "sekdes" } }],
        },
      ],
    }),
  },
];
