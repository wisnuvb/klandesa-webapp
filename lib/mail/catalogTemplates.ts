/**
 * Template surat desa untuk seed katalog global (`MailTemplate`:
 * villageId=null, isGlobal=true, catalogKey terisi).
 * Struktur selaras pemetaan dokumen administrasi umum —
 * blok isi menggunakan variabel konsisten dengan `letterFormSnapshot` / builder.
 */

import type { Prisma } from "@prisma/client";
import type { ContentBlock, TableRow } from "@/components/template-builder/types";
import {
  DEFAULT_HEADER_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_LETTER_NUMBER_CONFIG,
} from "@/components/template-builder/types";

const textStyle = {
  align: "justify" as const,
  size: "medium" as const,
  bold: false,
  italic: false,
  font: "Literata" as const,
};

/** Block style for table (label/value column like administrative letter). */
const tableStyle = {
  ...textStyle,
  border: true,
};

function txt(id: string, content: string): ContentBlock {
  return { id, type: "text", content, style: textStyle };
}

function tbl(id: string, rows: TableRow[]): ContentBlock {
  return {
    id,
    type: "table",
    content: rows,
    style: tableStyle,
  };
}

/** Data pemohon for SK lengkap (including marital status). */
function pemohonRowsSkLengkap(): TableRow[] {
  return [
    { label: "Nama", value: "{NAMA}" },
    { label: "NIK", value: "{NIK}" },
    { label: "Tempat, tanggal lahir", value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}" },
    { label: "Jenis kelamin", value: "{JENIS_KELAMIN}" },
    { label: "Pekerjaan", value: "{PEKERJAAN}" },
    { label: "Alamat", value: "{ALAMAT}" },
    { label: "Status perkawinan", value: "{STATUS_PERKAWINAN}" },
  ];
}

/** Data pemohon for SK narasi pendek (without marital status). */
function pemohonRowsSkNarasi(): TableRow[] {
  return [
    { label: "Nama", value: "{NAMA}" },
    { label: "NIK", value: "{NIK}" },
    { label: "Tempat, tanggal lahir", value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}" },
    { label: "Jenis kelamin", value: "{JENIS_KELAMIN}" },
    { label: "Pekerjaan", value: "{PEKERJAAN}" },
    { label: "Alamat", value: "{ALAMAT}" },
  ];
}

/** Identitas block introduction (KK/KTP/SKCK): name to address without JK/job separated. */
function pemohonRowsPgIdent(): TableRow[] {
  return [
    { label: "Nama", value: "{NAMA}" },
    { label: "NIK", value: "{NIK}" },
    { label: "Tempat, tanggal lahir", value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}" },
    { label: "Alamat", value: "{ALAMAT}" },
  ];
}

function pemohonRowsRingkas(): TableRow[] {
  return [
    { label: "Nama", value: "{NAMA}" },
    { label: "NIK", value: "{NIK}" },
    { label: "Alamat", value: "{ALAMAT}" },
  ];
}

function hdr(title: string) {
  return {
    enabled: true,
    heading: {
      ...DEFAULT_LETTER_NUMBER_CONFIG.heading,
      text: title,
      font: "Inter" as const,
      size: 16,
      bold: true,
      underline: true,
      align: "center" as const,
    },
    number: DEFAULT_LETTER_NUMBER_CONFIG.number
      ? { ...DEFAULT_LETTER_NUMBER_CONFIG.number }
      : undefined,
    auto_numbering: DEFAULT_LETTER_NUMBER_CONFIG.auto_numbering
      ? { ...DEFAULT_LETTER_NUMBER_CONFIG.auto_numbering }
      : undefined,
  };
}

export type CatalogSeedDef = {
  catalogKey: string;
  name: string;
  description: string;
  category: "Keterangan" | "Pengantar" | "Kependudukan";
  /** Letter number block title (uppercase) */
  letterTitle: string;
  variables: string[];
  blocks: ContentBlock[];
};

function buildStructure(def: CatalogSeedDef): Prisma.InputJsonValue {
  return {
    variables: def.variables,
    blocks: def.blocks,
    header: DEFAULT_HEADER_CONFIG,
    footer: DEFAULT_FOOTER_CONFIG,
    letterNumber: hdr(def.letterTitle),
    show_header: true,
    show_footer: true,
    is_multi_page: false,
    pages: [],
    variable_groups: [],
  } as unknown as Prisma.InputJsonValue;
}

function joinContent(blocks: ContentBlock[]): string {
  return blocks
    .map((b) =>
      typeof b.content === "string"
        ? b.content
        : JSON.stringify(b.content),
    )
    .join("\n\n");
}

export function buildCatalogInserts(def: CatalogSeedDef): {
  catalogKey: string;
  name: string;
  description: string;
  category: string;
  templateStructure: Prisma.InputJsonValue;
  contentTemplate: string;
} {
  return {
    catalogKey: def.catalogKey,
    name: def.name,
    description: def.description,
    category: def.category,
    templateStructure: buildStructure(def),
    contentTemplate: joinContent(def.blocks),
  };
}

/** Full list for seed/migration. */
export function getAllCatalogDefinitions(): CatalogSeedDef[] {
  const pemohonDasar = [
    "NAMA",
    "NIK",
    "TEMPAT_LAHIR",
    "TANGGAL_LAHIR",
    "JENIS_KELAMIN",
    "PEKERJAAN",
    "ALAMAT",
    "STATUS_PERKAWINAN",
  ];

  const keteranganPembukaSk = txt(
    "p1-sk",
    "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, dengan ini menerangkan dengan sebenarnya bahwa :",
  );

  const keteranganPenutupSk = txt(
    "p2-sk",
    "Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.",
  );

  /** Letter of recommendation */
  const skDom: CatalogSeedDef = {
    catalogKey: "cat_sk_domisili",
    name: "Surat Keterangan Domisili",
    description:
      "Menerangkan tempat tinggal sah warga untuk keperluan administrasi.",
    category: "Keterangan",
    letterTitle: "SURAT KETERANGAN DOMISILI",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("lm", "Lampiran : (-) berkas"),
      txt("pr", "Perihal : SURAT KETERANGAN DOMISILI"),
      keteranganPembukaSk,
      tbl("isi-dom", pemohonRowsSkLengkap()),
      txt(
        "isi-dom-naratif",
        "Berdasarkan data dan catatan di desa kami, yang bersangkutan adalah benar bertempat tinggal di alamat tersebut di atas.\n\nKeperluan : {KEPERLUAN}.",
      ),
      keteranganPenutupSk,
    ],
  };

  const sktm: CatalogSeedDef = {
    catalogKey: "cat_sk_sktm",
    name: "Surat Keterangan Tidak Mampu (SKTM)",
    description: "Keterangan ekonomi untuk bantuan sosial atau sekolah.",
    category: "Keterangan",
    letterTitle: "SURAT KETERANGAN TIDAK MAMPU",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("lm", "Lampiran : (-) berkas"),
      txt("pr", "Perihal : SURAT KETERANGAN TIDAK MAMPU"),
      keteranganPembukaSk,
      tbl("isi-sktm", pemohonRowsSkNarasi()),
      txt(
        "isi-sktm-naratif",
        "Berdasarkan pengamatan/pengakuan setempat, yang bersangkutan tergolong keluarga tidak mampu.\n\nKeperluan : {KEPERLUAN}.",
      ),
      keteranganPenutupSk,
    ],
  };

  const skPenghasilan: CatalogSeedDef = {
    catalogKey: "cat_sk_penghasilan",
    name: "Surat Keterangan Penghasilan",
    description: "Penghasilan rata-rata untuk beasiswa, bantuan, atau bank.",
    category: "Keterangan",
    letterTitle: "SURAT KETERANGAN PENGHASILAN",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("lm", "Lampiran : (-) berkas"),
      txt("pr", "Perihal : SURAT KETERANGAN PENGHASILAN"),
      keteranganPembukaSk,
      tbl("isi-ph", pemohonRowsSkNarasi()),
      txt(
        "isi-ph-naratif",
        "Besaran penghasilan rata-rata / keterangan keuangan atas nama tersebut di atas sebagaimana diperlukan.\n\nKeperluan : {KEPERLUAN}.",
      ),
      keteranganPenutupSk,
    ],
  };

  const skUsaha: CatalogSeedDef = {
    catalogKey: "cat_sk_usaha",
    name: "Surat Keterangan Usaha",
    description: "Menerangkan nama/jenis lokasi usaha warga.",
    category: "Keterangan",
    letterTitle: "SURAT KETERANGAN USAHA",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("lm", "Lampiran : (-) berkas"),
      txt("pr", "Perihal : SURAT KETERANGAN USAHA"),
      keteranganPembukaSk,
      tbl("isu", [
        { label: "Nama pemilik", value: "{NAMA}" },
        { label: "NIK", value: "{NIK}" },
        { label: "Alamat", value: "{ALAMAT}" },
      ]),
      txt(
        "isu-naratif",
        "Bahwa nama tersebut mempunyai usaha seperti diuraikan berikut :\n\n{KEPERLUAN}\n\nKeterangan ini diberikan untuk keperluan administrasi atau perizinan sepanjang tidak bertentangan dengan ketentuan perundang-undangan.",
      ),
      keteranganPenutupSk,
    ],
  };

  const skBaik: CatalogSeedDef = {
    catalogKey: "cat_sk_berkelakuan_baik",
    name: "Surat Keterangan Kelakuan Baik",
    description:
      "Tidak kedapatan tilang/catatan bermasalah tertentu tingkat desa.",
    category: "Keterangan",
    letterTitle: "SURAT KETERANGAN KELAKUAN BAIK",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("lm", "Lampiran : (-) berkas"),
      txt("pr", "Perihal : SURAT KETERANGAN KELAKUAN BAIK"),
      keteranganPembukaSk,
      tbl("skt", pemohonRowsSkNarasi()),
      txt(
        "skt-naratif",
        "Bahwa nama tersebut dikenal berkelakuan baik dalam lingkungan masyarakat desa sesuai data yang ada.\n\nKeperluan : {KEPERLUAN}.",
      ),
      keteranganPenutupSk,
    ],
  };

  const skWarisan: CatalogSeedDef = {
    catalogKey: "cat_sk_ahli_waris",
    name: "Surat Keterangan Ahli Waris",
    description: "Mengurai hubungan pewaris untuk administrasi pusara/harta.",
    category: "Keterangan",
    letterTitle: "SURAT KETERANGAN AHLI WARIS",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("lm", "Lampiran : (-) berkas"),
      txt("pr", "Perihal : SURAT KETERANGAN AHLI WARIS"),
      keteranganPembukaSk,
      tbl("war", pemohonRowsRingkas()),
      txt(
        "war-naratif",
        "Untuk urusan ahli waris / pengurusan harta warisan, terhadap data yang diberikan:\n\n{KEPERLUAN}\n\nData di atas disampaikan atas dasar dokumen/pernyataan dan catatan kematian/kekeluargaan dalam batas tugas kepala desa.",
      ),
      keteranganPenutupSk,
    ],
  };

  const skHilang: CatalogSeedDef = {
    catalogKey: "cat_sk_kehilangan",
    name: "Surat Keterangan Kehilangan",
    description:
      "Keterangan kehilangan barang atau dokumen (tingkat pengantaran ke kapolsek/disduk).",
    category: "Keterangan",
    letterTitle: "SURAT KETERANGAN KEHILANGAN",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("lm", "Lampiran : (-) berkas"),
      txt("pr", "Perihal : SURAT KETERANGAN KEHILANGAN"),
      keteranganPembukaSk,
      tbl("hil", [
        { label: "Nama", value: "{NAMA}" },
        { label: "NIK", value: "{NIK}" },
        { label: "Tempat tinggal", value: "{ALAMAT}" },
      ]),
      txt(
        "hil-naratif",
        "Menuangkan kehilangan berupa :\n{KEPERLUAN}\n\nKeterangan diberikan sesuai pengakuan/pemeriksaan seperlunya.",
      ),
      keteranganPenutupSk,
    ],
  };

  const skTanah: CatalogSeedDef = {
    catalogKey: "cat_sk_pertanahan_ringkas",
    name: "Surat Keterangan Pertanahan (ringkas)",
    description:
      "Mengurai kepemilikan/penguasaan atas tanah (sesuaikan ketentuan setempat).",
    category: "Keterangan",
    letterTitle: "SURAT KETERANGAN PERTANAHAN",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("lm", "Lampiran : (-) berkas"),
      txt("pr", "Perihal : SURAT KETERANGAN PERTANAHAN"),
      keteranganPembukaSk,
      tbl("tnh", pemohonRowsRingkas()),
      txt(
        "tnh-naratif",
        "Tentang penguasaan / kepemilikan bidang tanah sebagaimana diuraikan:\n\n{KEPERLUAN}\n\nSesuai pengakuan/pemeriksaan seperlunya tingkat desa.",
      ),
      keteranganPenutupSk,
    ],
  };

  /** Pengantar */
  const pembukaPg = txt(
    "pg1",
    "Dengan ini kami mohon kepada yang berwenang atas permohonan warga dapat dipergunakan seperlunya.",
  );

  const pgKk: CatalogSeedDef = {
    catalogKey: "cat_pg_kk",
    name: "Surat Pengantar Permohonan KK",
    description: "Pengantar ke dinas kependudukan untuk pembaruan/penggantian KK.",
    category: "Pengantar",
    letterTitle: "SURAT PENGANTAR",
    variables: pemohonDasar.concat([
      "KEPERLUAN",
      "TANGGAL_SURAT",
    ]),
    blocks: [
      txt("lm", "Lampiran : (-) berkas"),
      txt("pr", "Perihal : PENGANTAR PERMOHONAN KARTU KELUARGA"),
      txt(
        "kepada",
        "Kepada Yth.\nKepala Dinas Kependudukan dan Pencatatan Sipil\nDi {KABUPATEN}\n\nDi tempat",
      ),
      txt(
        "pg2",
        "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa :",
      ),
      tbl("ident", pemohonRowsPgIdent()),
      txt(
        "ident-naratif",
        "Adalah benar warga desa kami dan mengajukan permohonan sehubungan dengan : {KEPERLUAN}.",
      ),
      pembukaPg,
      keteranganPenutupSk,
    ],
  };

  const pgKtp: CatalogSeedDef = {
    catalogKey: "cat_pg_ktp",
    name: "Surat Pengantar Permohonan KTP / KTP-el",
    description: "Pengantar ke dukcapil untuk penerbitan/penggantian KTP.",
    category: "Pengantar",
    letterTitle: "SURAT PENGANTAR",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("pr", "Perihal : PENGANTAR PERMOHONAN KTP"),
      txt(
        "kepada",
        "Kepada Yth.\nKepala Dinas Kependudukan dan Pencatatan Sipil\nDi {KABUPATEN}\n\nDi tempat",
      ),
      txt(
        "pg2",
        "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa :",
      ),
      tbl("ident", pemohonRowsPgIdent()),
      txt(
        "ident-naratif",
        "Adalah benar warga desa kami dan mengajukan permohonan KTP/KTP-el sehubungan dengan : {KEPERLUAN}.",
      ),
      pembukaPg,
      keteranganPenutupSk,
    ],
  };

  const pgNikah: CatalogSeedDef = {
    catalogKey: "cat_pg_nikah",
    name: "Surat Pengantar Nikah (pengantar umum)",
    description:
      "Pengantar ke KUA/instansi nikah — sesuaikan formulir N1–N7 setempat.",
    category: "Pengantar",
    letterTitle: "SURAT PENGANTAR NIKAH",
    variables: pemohonDasar.concat([
      "SUAMI_NAMA",
      "ISTRI_NAMA",
      "KEPERLUAN",
    ]),
    blocks: [
      txt("pr", "Perihal : PENGANTAR NIKAH"),
      txt(
        "kepada",
        "Kepada Yth.\nKepala KUA Kecamatan {KECAMATAN}\nDi tempat",
      ),
      txt(
        "pg2",
        "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa :",
      ),
      tbl("calon", [
        { label: "Calon suami", value: "{SUAMI_NAMA}" },
        { label: "Calon istri", value: "{ISTRI_NAMA}" },
      ]),
      txt(
        "calon-naratif",
        "Adalah benar warga desa kami dan mengajukan surat pengantar nikah dengan keterangan : {KEPERLUAN}.",
      ),
      pembukaPg,
      keteranganPenutupSk,
    ],
  };

  const pgSkck: CatalogSeedDef = {
    catalogKey: "cat_pg_skck",
    name: "Surat Pengantar SKCK",
    description:
      "Pengantar ke kepolisian untuk SKCK (bukan SKCK kepolisian itu sendiri).",
    category: "Pengantar",
    letterTitle: "SURAT PENGANTAR SKCK",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("pr", "Perihal : PENGANTAR SKCK"),
      txt(
        "kepada",
        "Kepada Yth.\nKepala Kepolisian Sektor / Polres\nDi tempat",
      ),
      txt(
        "pg2",
        "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa :",
      ),
      tbl("ident", pemohonRowsPgIdent()),
      txt(
        "ident-naratif",
        "Adalah benar warga desa kami dan mengajukan SKCK untuk keperluan : {KEPERLUAN}.",
      ),
      pembukaPg,
      keteranganPenutupSk,
    ],
  };

  const pgKeramaian: CatalogSeedDef = {
    catalogKey: "cat_pg_izin_keramaian",
    name: "Surat Pengantar Izin Keramaian",
    description: "Pengantar ke polisi untuk hajatan/pertunjukan (sesuai aturan setempat).",
    category: "Pengantar",
    letterTitle: "SURAT PENGANTAR IZIN KERAMAIAN",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("pr", "Perihal : PENGANTAR IZIN KERAMAIAN"),
      txt(
        "kepada",
        "Kepada Yth.\nKepala Kepolisian Sektor\nDi tempat",
      ),
      txt(
        "pg2",
        "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa :",
      ),
      tbl("izin", pemohonRowsRingkas()),
      txt(
        "izin-naratif",
        "Akan mengadakan kegiatan/keramaian dengan rincian :\n{KEPERLUAN}\n\nDemikian pengantar ini kami sampaikan.",
      ),
      keteranganPenutupSk,
    ],
  };

  const prnBelumNikah: CatalogSeedDef = {
    catalogKey: "cat_prn_belum_menikah",
    name: "Surat Pernyataan Belum / Tidak Menikah (kerangka)",
    description:
      "Kerangka pernyataan — gunakan paraf & materai sesuai ketentuan setempat.",
    category: "Pengantar",
    letterTitle: "SURAT PERNYATAAN",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("pr", "Perihal : PERNYATAAN STATUS PERKAWINAN"),
      txt("prn", "Saya yang bertanda tangan di bawah ini :"),
      tbl("prn-ident", pemohonRowsRingkas()),
      txt(
        "prn-naratif",
        "Dengan ini menyatakan dengan sebenarnya bahwa saya belum pernah/tidak menikah (sesuai fakta) untuk keperluan : {KEPERLUAN}.\n\nApabila pernyataan ini tidak benar, saya bersedia mempertanggungjawabkannya secara hukum.\n\nDemikian pernyataan ini dibuat tanpa ada paksaan.",
      ),
      keteranganPenutupSk,
    ],
  };

  /** Kependudukan */
  const pembukaKd = txt(
    "kd1",
    "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, dengan ini menerangkan bahwa :",
  );

  const skPindah: CatalogSeedDef = {
    catalogKey: "cat_kep_sk_pindah",
    name: "Surat Keterangan Pindah",
    description: "Keterangan pindah antar wilayah (sesuaikan formulir dukcapil).",
    category: "Kependudukan",
    letterTitle: "SURAT KETERANGAN PINDAH",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("lm", "Lampiran : (-) berkas"),
      txt("pr", "Perihal : SURAT KETERANGAN PINDAH"),
      pembukaKd,
      tbl("pind", [
        { label: "Nama", value: "{NAMA}" },
        { label: "NIK", value: "{NIK}" },
        { label: "Tempat, tanggal lahir", value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}" },
        { label: "Alamat asal di desa", value: "{ALAMAT}" },
        { label: "Pindah ke", value: "{KEPERLUAN}" },
      ]),
      txt(
        "pind-footer",
        "Keterangan ini diberikan untuk melengkapi administrasi kependudukan.",
      ),
      keteranganPenutupSk,
    ],
  };

  const skDatang: CatalogSeedDef = {
    catalogKey: "cat_kep_sk_datang",
    name: "Surat Keterangan Datang",
    description: "Warga yang datang dari luar desa (penduduk sementara/pindah masuk).",
    category: "Kependudukan",
    letterTitle: "SURAT KETERANGAN DATANG",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("pr", "Perihal : SURAT KETERANGAN DATANG"),
      pembukaKd,
      tbl("dtg", [
        { label: "Nama", value: "{NAMA}" },
        { label: "NIK", value: "{NIK}" },
        { label: "Alamat asal", value: "{KEPERLUAN}" },
        { label: "Alamat tinggal di desa", value: "{ALAMAT}" },
      ]),
      txt(
        "dtg-footer",
        "Keterangan diberikan untuk keperluan administrasi kependudukan.",
      ),
      keteranganPenutupSk,
    ],
  };

  const skLahir: CatalogSeedDef = {
    catalogKey: "cat_kep_sk_lahir",
    name: "Surat Keterangan Kelahiran (tingkat desa)",
    description:
      "Ringkasan data kelahiran — proses resmi tetap di catatan sipil/kabupaten.",
    category: "Kependudukan",
    letterTitle: "SURAT KETERANGAN KELAHIRAN",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("pr", "Perihal : SURAT KETERANGAN KELAHIRAN"),
      pembukaKd,
      tbl("lah", [
        { label: "Nama anak", value: "{NAMA}" },
        { label: "Tempat, tanggal lahir", value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}" },
        { label: "Nama orang tua / data pendukung", value: "{KEPERLUAN}" },
        { label: "Alamat", value: "{ALAMAT}" },
      ]),
      txt(
        "lah-footer",
        "Keterangan ini sebagai pengantar/pendukung administrasi.",
      ),
      keteranganPenutupSk,
    ],
  };

  const skMati: CatalogSeedDef = {
    catalogKey: "cat_kep_sk_mati",
    name: "Surat Keterangan Kematian (tingkat desa)",
    description: "Rangkuman administrasi kematian — menyesuaikan format dinas setempat.",
    category: "Kependudukan",
    letterTitle: "SURAT KETERANGAN KEMATIAN",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("pr", "Perihal : SURAT KETERANGAN KEMATIAN"),
      pembukaKd,
      tbl("mat", [
        { label: "Nama almarhum/almarhumah", value: "{NAMA}" },
        { label: "NIK", value: "{NIK}" },
        { label: "Alamat terakhir", value: "{ALAMAT}" },
      ]),
      txt(
        "mat-naratif",
        "Tanggal/waktu kejadian dan keterangan :\n{KEPERLUAN}\n\nKeterangan ini diberikan untuk keperluan administrasi keluarga/ahli waris.",
      ),
      keteranganPenutupSk,
    ],
  };

  const skPwni: CatalogSeedDef = {
    catalogKey: "cat_kep_skpwni",
    name: "Surat Keterangan Baru Pindah dari Luar (kerangka SKPWNI)",
    description:
      "Kerangka surat pindah datang WNI — sesuaikan nomor dan format resmi daerah.",
    category: "Kependudukan",
    letterTitle: "SURAT KETERANGAN PINDAH WNI",
    variables: pemohonDasar.concat(["KEPERLUAN"]),
    blocks: [
      txt("pr", "Perihal : SURAT KETERANGAN PINDAH DATANG WNI"),
      pembukaKd,
      tbl("pwni", [
        { label: "Nama", value: "{NAMA}" },
        { label: "NIK", value: "{NIK}" },
        { label: "Asal daerah / data pindah", value: "{KEPERLUAN}" },
        { label: "Alamat tujuan tinggal di desa", value: "{ALAMAT}" },
      ]),
      txt(
        "pwni-footer",
        "Keterangan ini diberikan untuk administrasi pencatatan sipil kependudukan.",
      ),
      keteranganPenutupSk,
    ],
  };

  return [
    skDom,
    sktm,
    skPenghasilan,
    skUsaha,
    skBaik,
    skWarisan,
    skHilang,
    skTanah,
    pgKk,
    pgKtp,
    pgNikah,
    pgSkck,
    pgKeramaian,
    prnBelumNikah,
    skPindah,
    skDatang,
    skLahir,
    skMati,
    skPwni,
  ];
}

/** Baris INSERT untuk seed Prisma — upsert berdasarkan `catalogKey`. */
export function catalogRowsForSeed(): Array<ReturnType<typeof buildCatalogInserts>> {
  return getAllCatalogDefinitions().map((def) => buildCatalogInserts(def));
}
