/**
 * Acuan penerimaan: pola surat di lapangan (Perbup tata naskah desa, contoh Lumajang,
 * jual beli tanah, dll.) yang harus bisa disusun murni dari dokumen v2, tanpa kode khusus.
 */
import type { LetterDocumentInput } from "../lib/letters/document/schema.ts";

type Inl = NonNullable<Extract<LetterDocumentInput["body"][number], { type: "paragraph" }>["content"]>;
type InlineIn = Inl[number];

export const t = (text: string, marks?: Array<"b" | "i" | "u">): InlineIn => ({ type: "text", text, ...(marks ? { marks } : {}) });
export const f = (ref: string, format?: string): InlineIn =>
  ({ type: "field", ref, ...(format ? { format } : {}) }) as InlineIn;
export const para = (id: string, ...content: InlineIn[]) => ({ id, type: "paragraph" as const, content });

const kadesSign = (id = "ttd") => ({
  id,
  type: "signature" as const,
  dateline: [f("desa.nama"), t(", "), f("surat.tanggal", "tanggal")],
  slots: [{ id: "kades", who: { kind: "pejabat" as const, official: "kades" as const }, showName: true, stamp: true }],
});

const pemohonData = (id = "data") => ({
  id,
  type: "personData" as const,
  role: "pemohon",
  fields: ["nama", "ttl", "jenis_kelamin", "pekerjaan", "nik", "alamat_lengkap"],
});

export const FIXTURES: Record<string, LetterDocumentInput> = {
  /** Surat keterangan umum: "Yang bertanda tangan… menerangkan bahwa…". */
  keteranganDomisili: {
    schemaVersion: 2,
    kind: "keterangan",
    audience: "warga",
    people: [{ id: "pemohon", label: "Pemohon" }],
    fields: [{ id: "keperluan", label: "Keperluan", type: "longtext" }],
    body: [
      { id: "judul", type: "title", title: [t("SURAT KETERANGAN DOMISILI", ["b", "u"])] },
      para("p1", t("Yang bertanda tangan di bawah ini Kepala Desa "), f("desa.nama"), t(", Kecamatan "), f("desa.kecamatan"), t(", menerangkan bahwa:")),
      pemohonData(),
      para("p2", t("Adalah benar berdomisili di desa kami. Surat ini dibuat untuk "), f("isian.keperluan"), t(".")),
      kadesSign(),
    ],
  },

  /** Ahli waris: N orang, tiap orang 5 isian; saksi; mengetahui Camat (contoh Lumajang). */
  ahliWaris: {
    schemaVersion: 2,
    kind: "keterangan",
    audience: "warga",
    people: [
      { id: "pemohon", label: "Pengurus surat" },
      { id: "almarhum", label: "Almarhum/ah", allowManual: true },
    ],
    fields: [{ id: "keperluan", label: "Keperluan", type: "longtext" }],
    groups: [
      {
        id: "ahli_waris", label: "Ahli waris", min: 1, max: 15, personRows: true,
        fields: [
          { id: "nama", label: "Nama", type: "text" },
          { id: "ttl", label: "Tempat/Tgl Lahir", type: "text" },
          { id: "nik", label: "NIK", type: "text" },
          { id: "pekerjaan", label: "Pekerjaan", type: "text" },
          { id: "alamat", label: "Alamat", type: "longtext" },
        ],
      },
      { id: "saksi", label: "Saksi", min: 2, max: 5, personRows: true, fields: [{ id: "nama", label: "Nama", type: "text" }, { id: "nik", label: "NIK", type: "text" }] },
    ],
    body: [
      { id: "judul", type: "title", title: [t("SURAT KETERANGAN AHLI WARIS", ["b", "u"])] },
      para("p1", t("Dengan ini menerangkan bahwa orang-orang berikut adalah ahli waris dari almarhum/ah "), f("almarhum.nama", "upper"), t(", yang meninggal pada "), f("almarhum.tanggal_meninggal", "tanggal"), t(".")),
      {
        id: "tabel", type: "repeatTable", group: "ahli_waris",
        columns: [{ label: "Nama", field: "nama" }, { label: "TTL", field: "ttl" }, { label: "NIK", field: "nik" }, { label: "Pekerjaan", field: "pekerjaan" }],
      },
      para("p2", t("Surat ini dipergunakan untuk "), f("isian.keperluan"), t(".")),
      {
        id: "ttd", type: "signature", layout: "row",
        dateline: [f("desa.nama"), t(", "), f("surat.tanggal", "tanggal")],
        slots: [
          { id: "saksi", who: { kind: "grup", group: "saksi" }, caption: [t("Saksi,")] },
          { id: "kades", who: { kind: "pejabat", official: "kades" }, caption: [t("Mengetahui,")], stamp: true },
          { id: "camat", who: { kind: "pejabat", official: "camat" }, caption: [t("Camat,")], stamp: true },
        ],
      },
    ],
  },

  /** Kematian: almarhum, pelapor + hubungan, penyebab (sensitif), makam. */
  kematian: {
    schemaVersion: 2,
    kind: "keterangan",
    audience: "warga",
    people: [
      { id: "pemohon", label: "Pelapor" },
      { id: "almarhum", label: "Almarhum/ah" },
    ],
    fields: [
      { id: "hubungan_pelapor", label: "Hubungan pelapor", type: "choice", options: ["Anak", "Istri/Suami", "Saudara", "Lainnya"] },
      { id: "sebab", label: "Sebab kematian", type: "text", sensitive: true },
      { id: "makam", label: "Tempat dimakamkan", type: "text" },
    ],
    body: [
      { id: "judul", type: "title", title: [t("SURAT KETERANGAN KEMATIAN", ["b", "u"])] },
      { id: "d1", type: "personData", role: "almarhum", fields: ["nama", "nik", "ttl", "alamat_lengkap", "tanggal_meninggal"] },
      para("p1", t("Penyebab kematian: "), f("isian.sebab"), t(". Dimakamkan di "), f("isian.makam"), t(".")),
      para("p2", t("Dilaporkan oleh "), f("pemohon.nama"), t(" ("), f("isian.hubungan_pelapor"), t(").")),
      kadesSign(),
    ],
  },

  /** Penghasilan orang tua untuk beasiswa anak: nominal + terbilang, subjek kedua (anak). */
  penghasilan: {
    schemaVersion: 2,
    kind: "keterangan",
    audience: "warga",
    people: [
      { id: "pemohon", label: "Orang tua/wali" },
      { id: "anak", label: "Anak (penerima beasiswa)" },
    ],
    fields: [{ id: "lembaga", label: "Lembaga tujuan", type: "text", required: false }],
    body: [
      { id: "judul", type: "title", title: [t("SURAT KETERANGAN PENGHASILAN", ["b", "u"])] },
      pemohonData(),
      para("p1", t("Berpenghasilan "), f("pemohon.penghasilan", "rupiah"), t(" per bulan (terbilang: "), f("pemohon.penghasilan", "terbilang_rupiah"), t(").")),
      para("p2", t("Surat ini untuk pengajuan beasiswa atas nama "), f("anak.nama"), t(".")),
      kadesSign(),
    ],
  },

  /** Jual beli tanah: dua pihak, batas empat arah, saksi sampai 5, mengetahui Kades & Camat. */
  jualBeliTanah: {
    schemaVersion: 2,
    kind: "keterangan",
    audience: "warga",
    people: [
      { id: "pemohon", label: "Pemohon" },
      { id: "pihak1", label: "Pihak pertama (penjual)" },
      { id: "pihak2", label: "Pihak kedua (pembeli)" },
    ],
    fields: [
      { id: "luas", label: "Luas tanah (m²)", type: "number" },
      { id: "lokasi", label: "Lokasi", type: "longtext" },
      { id: "batas_utara", label: "Batas utara", type: "text" },
      { id: "batas_timur", label: "Batas timur", type: "text" },
      { id: "batas_selatan", label: "Batas selatan", type: "text" },
      { id: "batas_barat", label: "Batas barat", type: "text" },
      { id: "harga", label: "Harga", type: "money" },
    ],
    groups: [{ id: "saksi", label: "Saksi", min: 2, max: 5, personRows: true, fields: [{ id: "nama", label: "Nama", type: "text" }, { id: "nik", label: "NIK", type: "text" }] }],
    body: [
      { id: "judul", type: "title", title: [t("SURAT KETERANGAN JUAL BELI TANAH", ["b", "u"])] },
      { id: "d1", type: "personData", role: "pihak1", fields: ["nama", "nik", "alamat_lengkap"] },
      { id: "d2", type: "personData", role: "pihak2", fields: ["nama", "nik", "alamat_lengkap"] },
      para("p1", t("Tanah seluas "), f("isian.luas"), t(" m² di "), f("isian.lokasi"), t(" dengan harga "), f("isian.harga", "rupiah"), t(" (terbilang: "), f("isian.harga", "terbilang_rupiah"), t(").")),
      {
        id: "batas", type: "table", bordered: true,
        columns: [{ label: "Arah" }, { label: "Berbatasan dengan" }],
        rows: [[[t("Utara")], [f("isian.batas_utara")]], [[t("Timur")], [f("isian.batas_timur")]], [[t("Selatan")], [f("isian.batas_selatan")]], [[t("Barat")], [f("isian.batas_barat")]]],
      },
      {
        id: "ttd", type: "signature", layout: "row",
        slots: [
          { id: "p1", who: { kind: "peran", role: "pihak1" }, caption: [t("Pihak Pertama,")], materai: true },
          { id: "p2", who: { kind: "peran", role: "pihak2" }, caption: [t("Pihak Kedua,")] },
          { id: "saksi", who: { kind: "grup", group: "saksi" }, caption: [t("Saksi,")] },
          { id: "kades", who: { kind: "pejabat", official: "kades" }, caption: [t("Mengetahui,")], stamp: true },
          { id: "camat", who: { kind: "pejabat", official: "camat" }, caption: [t("Camat,")], stamp: true },
        ],
      },
    ],
  },

  /** Pengantar nikah dengan bagian bersyarat (izin orang tua bila belum 21 tahun, tipe N5). */
  pengantarNikah: {
    schemaVersion: 2,
    kind: "keterangan",
    audience: "warga",
    people: [{ id: "pemohon", label: "Calon pengantin" }, { id: "ortu", label: "Orang tua/wali", required: false }],
    fields: [{ id: "di_bawah_21", label: "Calon pengantin di bawah 21 tahun?", type: "choice", options: ["Ya", "Tidak"] }],
    body: [
      { id: "judul", type: "title", title: [t("SURAT PENGANTAR NIKAH", ["b", "u"])] },
      pemohonData(),
      { id: "izin", type: "conditional", when: { ref: "isian.di_bawah_21", op: "eq", value: "Ya" }, children: [para("izin_p", t("Dengan izin orang tua/wali: "), f("ortu.nama"), t("."))] },
      kadesSign(),
    ],
  },

  /** Surat biasa/undangan (naskah dinas internal): Nomor/Sifat/Lampiran/Perihal, Kepada Yth, tembusan, a.n. Kades. */
  undangan: {
    schemaVersion: 2,
    kind: "surat_biasa",
    audience: "internal",
    fields: [
      { id: "perihal", label: "Perihal", type: "text" },
      { id: "acara", label: "Acara", type: "text" },
      { id: "tujuan", label: "Ditujukan kepada", type: "text" },
    ],
    body: [
      {
        id: "kepala", type: "memo",
        rows: [
          { label: "Nomor", value: [f("surat.nomor")] },
          { label: "Sifat", value: [t("Penting")] },
          { label: "Lampiran", value: [t("-")] },
          { label: "Perihal", value: [f("isian.perihal")] },
        ],
        dateline: [f("desa.nama"), t(", "), f("surat.tanggal", "tanggal")],
        addressee: [t("Yth. "), f("isian.tujuan"), t(" di tempat")],
      },
      para("p1", t("Mengundang Bapak/Ibu pada acara "), f("isian.acara"), t(".")),
      {
        id: "ttd", type: "signature",
        slots: [{ id: "sekdes", who: { kind: "pejabat", official: "sekdes" }, prefix: "an", caption: [t("Kepala Desa")], stamp: true }],
      },
      { id: "cc", type: "cc", items: [[t("Camat")], [t("Arsip")]] },
    ],
  },

  /** Keputusan Kepala Desa: kop garuda, NOMOR…TAHUN…, Menimbang/Mengingat/Menetapkan, diktum, "Ditetapkan di". */
  keputusanKades: {
    schemaVersion: 2,
    kind: "keputusan",
    audience: "internal",
    letterhead: "garuda",
    numbering: { mode: "auto", pattern: "{URUT} TAHUN {TAHUN}", reset: "yearly", padding: 0, counterKey: "keputusan" },
    fields: [{ id: "tentang", label: "Tentang", type: "text" }],
    body: [
      { id: "judul", type: "title", title: [t("KEPUTUSAN KEPALA DESA ", ["b"]), f("desa.nama", "upper")], numberPrefix: "NOMOR " },
      { id: "tentang", type: "heading", level: 3, content: [t("TENTANG "), f("isian.tentang", "upper")] },
      { id: "menimbang", type: "dictum", kind: "menimbang", items: [[t("bahwa …")], [t("bahwa …")]] },
      { id: "mengingat", type: "dictum", kind: "mengingat", items: [[t("Undang-Undang Nomor 6 Tahun 2014 tentang Desa;")]] },
      { id: "menetapkan", type: "dictum", kind: "menetapkan", items: [[t("KEPUTUSAN KEPALA DESA TENTANG "), f("isian.tentang", "upper")]] },
      { id: "diktum", type: "dictum", kind: "diktum", items: [[t("…")], [t("…")], [t("Keputusan ini mulai berlaku pada tanggal ditetapkan.")]] },
      {
        id: "ttd", type: "signature",
        dateline: [t("Ditetapkan di "), f("desa.nama"), t(", pada tanggal "), f("surat.tanggal", "tanggal")],
        slots: [{ id: "kades", who: { kind: "pejabat", official: "kades" }, stamp: true }],
      },
    ],
  },

  /** Berita acara musyawarah desa + daftar hadir terlampir (Ketua BPD & Kades menandatangani). */
  beritaAcara: {
    schemaVersion: 2,
    kind: "berita_acara",
    audience: "internal",
    fields: [{ id: "agenda", label: "Agenda", type: "text" }, { id: "kesepakatan", label: "Kesepakatan", type: "longtext" }],
    groups: [{ id: "peserta", label: "Peserta", min: 1, max: 50, personRows: true, fields: [{ id: "nama", label: "Nama", type: "text" }, { id: "alamat", label: "Alamat", type: "text" }] }],
    body: [
      { id: "judul", type: "title", title: [t("BERITA ACARA MUSYAWARAH DESA", ["b", "u"])] },
      para("p1", t("Agenda: "), f("isian.agenda"), t(". Kesepakatan: "), f("isian.kesepakatan")),
      {
        id: "ttd", type: "signature",
        slots: [
          { id: "bpd", who: { kind: "teks", text: "Ketua BPD" }, caption: [t("Ketua BPD,")] },
          { id: "kades", who: { kind: "pejabat", official: "kades" }, caption: [t("Kepala Desa,")], stamp: true },
        ],
      },
      { id: "pb", type: "pageBreak" },
      { id: "lamp", type: "heading", level: 2, content: [t("DAFTAR HADIR")] },
      { id: "hadir", type: "repeatTable", group: "peserta", columns: [{ label: "Nama", field: "nama" }, { label: "Alamat", field: "alamat" }] },
    ],
  },
};
