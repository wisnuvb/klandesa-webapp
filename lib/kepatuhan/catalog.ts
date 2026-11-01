/**
 * Katalog laporan wajib desa beserta tenggatnya. Murni (tanpa Prisma), aman untuk klien.
 *
 * Aturan tenggat adalah DATA BERVERSI PER TAHUN ANGGARAN: tiap butir punya daftar versi (`fromYear`) dan setiap versi memuat
 * aturan, rujukan pasal, dan label verifikasi. Katalog bawaan di bawah ini hanya nilai awal; baris pada tabel
 * `compliance_catalog_entries` menimpanya, untuk semua desa (GLOBAL, admin platform) atau satu kabupaten (REGENCY, akun
 * regional kabupaten). Urutan prioritas: kabupaten, lalu global, lalu bawaan; di dalam satu lapis dipakai `fromYear`
 * terbesar yang tidak melewati tahun anggaran.
 *
 * Verifikasi: V = dibaca dari teks resmi (pasal disebut), R = belum diverifikasi / tafsiran, K = ketetapan kabupaten.
 * Hanya butir ber-V atau K yang dihitung sebagai kewajiban (rekap kabupaten, pengingat); butir R tampil sebagai
 * informasi dan tidak pernah dinyatakan "terlambat".
 */

export type Verification = "V" | "R" | "K";
export const VERIFICATION_LABEL: Record<Verification, string> = { V: "Dibaca dari teks resmi", R: "Belum diverifikasi", K: "Ketetapan kabupaten" };
export const isVerification = (v: unknown): v is Verification => v === "V" || v === "R" || v === "K";

export type EventKey = "RKPDES_ENACTED" | "APBDES_ENACTED";
export const EVENT_LABEL: Record<EventKey, string> = { RKPDES_ENACTED: "Perdes RKP Desa ditetapkan", APBDES_ENACTED: "Perdes APB Desa ditetapkan" };
export const isEventKey = (v: unknown): v is EventKey => v === "RKPDES_ENACTED" || v === "APBDES_ENACTED";

export type Rule =
  /** Tanggal tetap; `yearOffset` relatif terhadap tahun anggaran (-1 = tahun sebelumnya, 1 = tahun berikutnya). */
  | { kind: "FIXED"; yearOffset: -1 | 0 | 1; month: number; day: number }
  /** Sekian bulan / hari kerja sesudah suatu peristiwa yang tercatat di sistem. */
  | { kind: "AFTER_EVENT"; event: EventKey; amount: number; unit: "MONTH" | "WORKDAY" }
  /** Peraturan tidak menetapkan tanggal; butir tetap dilacak. */
  | { kind: "NONE" };

export type DeriveKey = "APBDES" | "RKPDES_PERDES" | "RKPDES_USULAN" | "LPPD_TAHUN" | "LKPPD" | "DD_FOKUS" | "DD_TAHAP1" | "DD_TAHAP2" | "DD_PUBLIKASI";

/** Cara selesai: dikirim ke pihak lain, ditetapkan (Perdes), atau dipublikasikan. Hanya mengubah label tampilan. */
export type DoneKind = "KIRIM" | "TETAP" | "PUBLIKASI";
export const DONE_LABEL: Record<DoneKind, string> = { KIRIM: "Terkirim", TETAP: "Ditetapkan", PUBLIKASI: "Dipublikasikan" };

export type GroupKey = "PERENCANAAN" | "APBDES" | "PERTANGGUNGJAWABAN" | "DANA_DESA" | "INFORMASI" | "BUMDES" | "KABUPATEN";
export const GROUP_LABEL: Record<GroupKey, string> = {
  PERENCANAAN: "Perencanaan",
  APBDES: "APB Desa",
  PERTANGGUNGJAWABAN: "Laporan dan pertanggungjawaban",
  DANA_DESA: "Dana Desa",
  INFORMASI: "Informasi kepada masyarakat",
  BUMDES: "BUM Desa",
  KABUPATEN: "Butir tambahan kabupaten",
};
export const GROUP_ORDER: GroupKey[] = ["PERENCANAAN", "APBDES", "PERTANGGUNGJAWABAN", "DANA_DESA", "INFORMASI", "BUMDES", "KABUPATEN"];

export type BundleKey = "RINCIAN_APBDES" | "SEMESTER1" | "LPJ" | "LPPD" | "LKPPD" | "INFORMASI" | "DD_KELUARAN" | "DD_FOKUS" | "DD_PUBLIKASI" | "RKPDES" | "BUMDES";

export interface RuleVersion {
  fromYear: number;
  rule: Rule;
  basis: string;
  verification: Verification;
  note?: string;
  /** Aturan diterbitkan per tahun anggaran: dipakai ulang untuk tahun berikutnya hanya sebagai SEMENTARA sampai diperbarui. */
  perYear?: boolean;
}

export interface ItemDef {
  key: string;
  title: string;
  recipient: string;
  group: GroupKey;
  done: DoneKind;
  derive: DeriveKey | null;
  /** Hanya berlaku bila desa memiliki BUM Desa terdaftar. */
  appliesTo?: "BUMDES";
  /** Bahan cetak gabungan untuk butir ini (lihat lib/kepatuhan/bundle.ts). */
  bundle: BundleKey | null;
  hint: string;
  versions: RuleVersion[];
}

const P20 = "Permendagri 20/2018 tentang Pengelolaan Keuangan Desa";
const P46 = "Permendagri 46/2016 tentang Laporan Kepala Desa";
const P114 = "Permendagri 114/2014 tentang Pedoman Pembangunan Desa";
const PMD16 = "Permendesa PDT 16/2025";
const PMK7 = "PMK 7/2026";
const PP11 = "PP 11/2021 tentang BUM Desa";

export const DEFAULT_ITEMS: ItemDef[] = [
  {
    key: "RKPDES_PERDES",
    title: "Peraturan Desa tentang RKP Desa ditetapkan",
    recipient: "Ditetapkan Kepala Desa bersama BPD",
    group: "PERENCANAAN",
    done: "TETAP",
    derive: "RKPDES_PERDES",
    bundle: "RKPDES",
    hint: "Status dibaca dari modul Perencanaan: Perdes RKP Desa yang ditautkan pada dokumen RKP Desa tahun anggaran ini.",
    versions: [{ fromYear: 2000, rule: { kind: "FIXED", yearOffset: -1, month: 9, day: 30 }, basis: `${P114} Pasal 29 ayat (4): paling lambat akhir bulan September tahun berjalan.`, verification: "V" }],
  },
  {
    key: "RKPDES_USULAN",
    title: "Daftar usulan RKP Desa disampaikan ke bupati/wali kota melalui camat",
    recipient: "Bupati/Wali Kota melalui camat",
    group: "PERENCANAAN",
    done: "KIRIM",
    derive: "RKPDES_USULAN",
    bundle: "RKPDES",
    hint: "Status dibaca dari tanggal penyampaian daftar usulan pada dokumen RKP Desa.",
    versions: [{ fromYear: 2000, rule: { kind: "FIXED", yearOffset: -1, month: 12, day: 31 }, basis: `${P114} Pasal 51 ayat (1)-(2): paling lambat 31 Desember tahun berjalan.`, verification: "V" }],
  },
  {
    key: "APBDES_PERDES",
    title: "Peraturan Desa tentang APB Desa ditetapkan",
    recipient: "Ditetapkan Kepala Desa bersama BPD",
    group: "APBDES",
    done: "TETAP",
    derive: "APBDES",
    bundle: "RINCIAN_APBDES",
    hint: "Status dibaca dari modul APBDes: APB Desa awal (versi 0) berstatus ditetapkan beserta tanggal Perdes.",
    versions: [{ fromYear: 2000, rule: { kind: "FIXED", yearOffset: -1, month: 12, day: 31 }, basis: `${P20} Pasal 38 ayat (2): paling lambat 31 Desember tahun anggaran sebelumnya.`, verification: "V" }],
  },
  {
    key: "APBDES_KE_BUPATI",
    title: "Perdes APB Desa dan Perkades penjabaran disampaikan ke bupati/wali kota",
    recipient: "Bupati/Wali Kota",
    group: "APBDES",
    done: "KIRIM",
    derive: null,
    bundle: "RINCIAN_APBDES",
    hint: "Dicatat petugas. Tenggat dihitung 7 hari kerja (Senin-Jumat; hari libur nasional tidak dikurangi) sejak tanggal Perdes APB Desa.",
    versions: [{ fromYear: 2000, rule: { kind: "AFTER_EVENT", event: "APBDES_ENACTED", amount: 7, unit: "WORKDAY" }, basis: `${P20} Pasal 38 ayat (4): paling lama 7 hari kerja setelah ditetapkan.`, verification: "V" }],
  },
  {
    key: "LAPORAN_SEMESTER1",
    title: "Laporan pelaksanaan APB Desa semester pertama",
    recipient: "Bupati/Wali Kota melalui camat",
    group: "PERTANGGUNGJAWABAN",
    done: "KIRIM",
    derive: null,
    bundle: "SEMESTER1",
    hint: "Terdiri dari laporan pelaksanaan APB Desa dan laporan realisasi kegiatan (Pasal 68 ayat 2). Cetak gabungan menyiapkan keduanya dari data APBDes.",
    versions: [
      {
        fromYear: 2000,
        rule: { kind: "FIXED", yearOffset: 0, month: 7, day: 14 },
        basis: `${P20} Pasal 68 ayat (1)-(3): disusun paling lambat minggu kedua bulan Juli tahun berjalan.`,
        verification: "V",
        note: "Teks menulis \"minggu kedua bulan Juli\" tanpa tanggal; 14 Juli dipakai sebagai akhir minggu kedua (penafsiran). Kabupaten dapat menetapkan tanggal lain lewat katalog.",
      },
    ],
  },
  {
    key: "LPJ_APBDES",
    title: "Laporan pertanggungjawaban realisasi APB Desa (Perdes)",
    recipient: "Bupati/Wali Kota melalui camat",
    group: "PERTANGGUNGJAWABAN",
    done: "KIRIM",
    derive: null,
    bundle: "LPJ",
    hint: "Ditetapkan dengan Peraturan Desa, disertai laporan keuangan (laporan realisasi dan CaLK), laporan realisasi kegiatan, dan daftar program sektoral/daerah (Pasal 70 ayat 3).",
    versions: [{ fromYear: 2000, rule: { kind: "FIXED", yearOffset: 1, month: 3, day: 31 }, basis: `${P20} Pasal 70 ayat (1)-(2): paling lambat 3 bulan setelah akhir tahun anggaran.`, verification: "V" }],
  },
  {
    key: "LPPD_TAHUN",
    title: "Laporan Penyelenggaraan Pemerintahan Desa (LPPD) akhir tahun anggaran",
    recipient: "Bupati/Wali Kota melalui camat",
    group: "PERTANGGUNGJAWABAN",
    done: "KIRIM",
    derive: "LPPD_TAHUN",
    bundle: "LPPD",
    hint: "Status dibaca dari menu Laporan Kepala Desa: tersimpan = draf, ditandai diserahkan = terkirim.",
    versions: [{ fromYear: 2000, rule: { kind: "FIXED", yearOffset: 1, month: 3, day: 31 }, basis: `${P46} Pasal 3 ayat (1): tertulis, paling lambat 3 bulan setelah berakhirnya tahun anggaran. UU 6/2014 Pasal 27 huruf a.`, verification: "V" }],
  },
  {
    key: "LKPPD",
    title: "Laporan Keterangan Penyelenggaraan Pemerintahan Desa (LKPPD) kepada BPD",
    recipient: "Badan Permusyawaratan Desa",
    group: "PERTANGGUNGJAWABAN",
    done: "KIRIM",
    derive: "LKPPD",
    bundle: "LKPPD",
    hint: "Status dibaca dari menu Laporan Kepala Desa (jenis LKPPD).",
    versions: [{ fromYear: 2000, rule: { kind: "FIXED", yearOffset: 1, month: 3, day: 31 }, basis: `${P46} Pasal 8 ayat (1): tertulis, paling lambat 3 bulan setelah berakhir tahun anggaran. UU 6/2014 Pasal 27 huruf c.`, verification: "V" }],
  },
  {
    key: "INFO_MASYARAKAT",
    title: "Informasi penyelenggaraan pemerintahan desa dan realisasi APB Desa kepada masyarakat",
    recipient: "Masyarakat Desa (papan pengumuman, radio komunikasi, atau media lain yang mudah diakses)",
    group: "INFORMASI",
    done: "PUBLIKASI",
    derive: null,
    bundle: "INFORMASI",
    hint: "Dicatat petugas (tanggal dan tempat/media pengumuman). Memuat realisasi APB Desa, realisasi kegiatan, kegiatan yang belum selesai, sisa anggaran, dan alamat pengaduan (Permendagri 20/2018 Pasal 72 ayat 2).",
    versions: [{ fromYear: 2000, rule: { kind: "FIXED", yearOffset: 1, month: 3, day: 31 }, basis: `${P46} Pasal 10 ayat (3): tertulis, paling lambat 3 bulan setelah berakhir tahun anggaran. UU 6/2014 Pasal 27 huruf d; ${P20} Pasal 72.`, verification: "V" }],
  },
  {
    key: "INFO_SEMESTER1",
    title: "Informasi laporan semester pertama kepada masyarakat",
    recipient: "Masyarakat Desa",
    group: "INFORMASI",
    done: "PUBLIKASI",
    derive: null,
    bundle: "INFORMASI",
    hint: "Pasal 72 mewajibkan laporan semester dan laporan pertanggungjawaban diinformasikan, tetapi tidak menyebut tenggat sendiri.",
    versions: [
      {
        fromYear: 2000,
        rule: { kind: "FIXED", yearOffset: 0, month: 7, day: 14 },
        basis: `${P20} Pasal 72 ayat (1): laporan Pasal 68 dan Pasal 70 diinformasikan kepada masyarakat melalui media informasi.`,
        verification: "R",
        note: "Tenggat mengikuti laporan semester pertama sebagai tafsiran; teks Pasal 72 tidak memuat tanggal. Tidak dihitung sebagai kewajiban sampai kabupaten menetapkannya.",
      },
    ],
  },
  {
    key: "KIP_BERKALA_1",
    title: "Pengumuman informasi publik berkala (semester I)",
    recipient: "Masyarakat",
    group: "INFORMASI",
    done: "PUBLIKASI",
    derive: null,
    bundle: "INFORMASI",
    hint: "UU 14/2008 Pasal 9 ayat (3): kewajiban mengumumkan informasi berkala dilakukan paling singkat 6 bulan sekali.",
    versions: [
      {
        fromYear: 2000,
        rule: { kind: "FIXED", yearOffset: 0, month: 6, day: 30 },
        basis: "UU 14/2008 Pasal 9 ayat (1)-(3): informasi publik wajib diumumkan secara berkala, paling singkat 6 bulan sekali.",
        verification: "R",
        note: "Selang 6 bulan dibaca dari teks UU; penerapannya pada pemerintah desa sebagai badan publik dan tanggal 30 Juni/31 Desember adalah penjadwalan wajar, bukan teks. Peraturan Komisi Informasi belum dibaca.",
      },
    ],
  },
  {
    key: "KIP_BERKALA_2",
    title: "Pengumuman informasi publik berkala (semester II)",
    recipient: "Masyarakat",
    group: "INFORMASI",
    done: "PUBLIKASI",
    derive: null,
    bundle: "INFORMASI",
    hint: "Lihat butir semester I.",
    versions: [
      {
        fromYear: 2000,
        rule: { kind: "FIXED", yearOffset: 0, month: 12, day: 31 },
        basis: "UU 14/2008 Pasal 9 ayat (1)-(3): informasi publik wajib diumumkan secara berkala, paling singkat 6 bulan sekali.",
        verification: "R",
        note: "Lihat catatan butir semester I.",
      },
    ],
  },
  {
    key: "DD_FOKUS",
    title: "Laporan penetapan fokus penggunaan Dana Desa kepada Menteri",
    recipient: "Menteri Desa dan Pembangunan Daerah Tertinggal (dokumen digital)",
    group: "DANA_DESA",
    done: "KIRIM",
    derive: "DD_FOKUS",
    bundle: "DD_FOKUS",
    hint: "Dilengkapi Perdes RKP Desa dan Perdes APB Desa. Status dibaca dari halaman Dana Desa. Tenggat dihitung dari tanggal Perdes RKP Desa.",
    versions: [{ fromYear: 2026, perYear: true, rule: { kind: "AFTER_EVENT", event: "RKPDES_ENACTED", amount: 1, unit: "MONTH" }, basis: `${PMD16} Pasal 12 ayat (1)-(5): paling lambat 1 bulan terhitung sejak RKP Desa ditetapkan.`, verification: "V" }],
  },
  {
    key: "DD_PUBLIKASI",
    title: "Publikasi fokus penggunaan Dana Desa (nama kegiatan, lokasi, anggaran)",
    recipient: "Masyarakat Desa (sistem informasi desa, baliho, papan informasi, website, dan sebagainya)",
    group: "DANA_DESA",
    done: "PUBLIKASI",
    derive: "DD_PUBLIKASI",
    bundle: "DD_PUBLIKASI",
    hint: "Wajib sejak APB Desa ditetapkan; tanpa publikasi, desa kehilangan wewenang menganggarkan operasional 3% tahun berikutnya (Pasal 11). Status dibaca dari bukti publikasi di halaman Dana Desa.",
    versions: [{ fromYear: 2026, perYear: true, rule: { kind: "NONE" }, basis: `${PMD16} Pasal 10-11: wajib dipublikasikan terhitung sejak APB Desa ditetapkan.`, verification: "V", note: "Peraturan tidak menyebut tanggal batas; tersedia agar kabupaten dapat menetapkannya." }],
  },
  {
    key: "DD_TAHAP1",
    title: "Laporan realisasi penyerapan dan capaian keluaran Dana Desa tahun sebelumnya (syarat tahap I)",
    recipient: "Bupati/Wali Kota (diteruskan ke KPA BUN Penyaluran)",
    group: "DANA_DESA",
    done: "KIRIM",
    derive: "DD_TAHAP1",
    bundle: "DD_KELUARAN",
    hint: "Capaian keluaran = rata-rata persen capaian seluruh kegiatan (Pasal 25 ayat 5). Status dibaca dari halaman Dana Desa.",
    versions: [
      {
        fromYear: 2026,
        perYear: true,
        rule: { kind: "FIXED", yearOffset: 0, month: 6, day: 15 },
        basis: `${PMK7} Pasal 24 ayat (2) huruf a angka 3 dan ayat (4) huruf a: dokumen persyaratan tahap I diterima paling lambat 15 Juni 2026.`,
        verification: "V",
        note: "15 Juni adalah batas penerimaan oleh pemerintah pusat dari bupati/wali kota. Batas dari desa ke kabupaten umumnya lebih awal; kabupaten dapat menimpa tanggal ini.",
      },
    ],
  },
  {
    key: "DD_TAHAP2",
    title: "Laporan realisasi penyerapan dan capaian keluaran Dana Desa tahap I (syarat tahap II)",
    recipient: "Bupati/Wali Kota (diteruskan ke KPA BUN Penyaluran)",
    group: "DANA_DESA",
    done: "KIRIM",
    derive: "DD_TAHAP2",
    bundle: "DD_KELUARAN",
    hint: "Status dibaca dari halaman Dana Desa.",
    versions: [
      {
        fromYear: 2026,
        perYear: true,
        rule: { kind: "NONE" },
        basis: `${PMK7} Pasal 24 ayat (2) huruf b dan ayat (4) huruf b: paling lambat sesuai ketentuan mengenai langkah-langkah akhir tahun.`,
        verification: "V",
        note: "Teks merujuk ketentuan lain tanpa tanggal; isi tanggalnya lewat katalog kabupaten bila ada.",
      },
    ],
  },
  {
    key: "BUMDES_SEMESTER_1",
    title: "Laporan semesteran BUM Desa, semester I (kepada penasihat)",
    recipient: "Penasihat BUM Desa",
    group: "BUMDES",
    done: "KIRIM",
    derive: null,
    appliesTo: "BUMDES",
    bundle: "BUMDES",
    hint: "Memuat laporan posisi keuangan, laba rugi semesteran beserta penjelasan, dan rincian masalah semester itu (Pasal 58 ayat 4).",
    versions: [{ fromYear: 2000, rule: { kind: "NONE" }, basis: `${PP11} Pasal 58 ayat (2)-(4): laporan semesteran disampaikan kepada penasihat.`, verification: "V", note: "PP tidak menetapkan tanggal. Isi tenggat lewat katalog kabupaten atau sesuai AD/ART." }],
  },
  {
    key: "BUMDES_SEMESTER_2",
    title: "Laporan semesteran BUM Desa, semester II (kepada penasihat)",
    recipient: "Penasihat BUM Desa",
    group: "BUMDES",
    done: "KIRIM",
    derive: null,
    appliesTo: "BUMDES",
    bundle: "BUMDES",
    hint: "Lihat butir semester I.",
    versions: [{ fromYear: 2000, rule: { kind: "NONE" }, basis: `${PP11} Pasal 58 ayat (2)-(4): laporan semesteran disampaikan kepada penasihat.`, verification: "V", note: "PP tidak menetapkan tanggal." }],
  },
  {
    key: "BUMDES_TAHUNAN",
    title: "Laporan tahunan BUM Desa kepada Musyawarah Desa",
    recipient: "Musyawarah Desa (setelah ditelaah penasihat dan pengawas)",
    group: "BUMDES",
    done: "KIRIM",
    derive: null,
    appliesTo: "BUMDES",
    bundle: "BUMDES",
    hint: "Penerimaan laporan tahunan diputuskan Musyawarah Desa, yang juga memutuskan penggunaan bagian hasil usaha untuk desa (Pasal 59).",
    versions: [{ fromYear: 2000, rule: { kind: "NONE" }, basis: `${PP11} Pasal 58 ayat (5)-(6) dan Pasal 59: laporan tahunan disampaikan kepada Musyawarah Desa setelah ditelaah penasihat dan pengawas.`, verification: "V", note: "PP tidak menetapkan tanggal." }],
  },
];

export const ITEM_KEYS: string[] = DEFAULT_ITEMS.map((i) => i.key);
export const isBuiltinKey = (k: string): boolean => ITEM_KEYS.includes(k);
export const isCustomKey = (k: string): boolean => /^KAB-[A-Z0-9_]{1,30}$/.test(k);

// ---------------------------------------------------------------------------------------------
// Penimpaan dari tabel (data)

export interface EntryRow {
  scope: "GLOBAL" | "REGENCY";
  regencyKey: string;
  provinceKey: string;
  itemKey: string;
  fromYear: number;
  disabled: boolean;
  title: string | null;
  recipient: string | null;
  ruleKind: string | null;
  yearOffset: number | null;
  month: number | null;
  day: number | null;
  event: string | null;
  amount: number | null;
  unit: string | null;
  verification: string;
  basis: string | null;
  note: string | null;
}

/** Kunci wilayah: teks desa dirapikan dan dijadikan huruf kecil (sama dengan cara akun regional mencocokkan desa). */
export const normKey = (s: string | null | undefined): string => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/** Tanggal kalender yang nyata (menolak 31 Februari). */
export function validMonthDay(month: number, day: number, year = 2024): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Mengubah kolom baris tabel menjadi Rule; null bila tidak sah. */
export function ruleFromRow(r: Pick<EntryRow, "ruleKind" | "yearOffset" | "month" | "day" | "event" | "amount" | "unit">): Rule | null {
  if (r.ruleKind === "NONE") return { kind: "NONE" };
  if (r.ruleKind === "FIXED") {
    if (r.yearOffset !== -1 && r.yearOffset !== 0 && r.yearOffset !== 1) return null;
    if (r.month === null || r.day === null || !validMonthDay(r.month, r.day)) return null;
    return { kind: "FIXED", yearOffset: r.yearOffset, month: r.month, day: r.day };
  }
  if (r.ruleKind === "AFTER_EVENT") {
    if (!isEventKey(r.event) || r.amount === null || !Number.isInteger(r.amount) || r.amount < 0 || r.amount > 366) return null;
    if (r.unit !== "MONTH" && r.unit !== "WORKDAY") return null;
    return { kind: "AFTER_EVENT", event: r.event, amount: r.amount, unit: r.unit };
  }
  return null;
}

export type Source = "BAWAAN" | "GLOBAL" | "KABUPATEN";
export const SOURCE_LABEL: Record<Source, string> = { BAWAAN: "Katalog bawaan", GLOBAL: "Katalog platform", KABUPATEN: "Ketetapan kabupaten" };

export interface ResolvedItem {
  key: string;
  title: string;
  recipient: string;
  group: GroupKey;
  done: DoneKind;
  derive: DeriveKey | null;
  bundle: BundleKey | null;
  hint: string;
  rule: Rule;
  basis: string;
  verification: Verification;
  note: string | null;
  source: Source;
  /** Tahun mulai berlaku versi yang dipakai */
  versionFrom: number;
  /** true: aturan tahun sebelumnya dipakai sementara (aturan per tahun belum diperbarui) */
  provisional: boolean;
  /** true: dihitung sebagai kewajiban (rekap, pengingat, status terlambat) */
  binding: boolean;
  custom: boolean;
  /** Dimatikan oleh penimpaan (kabupaten/platform); tetap ditampilkan dengan dasarnya */
  disabled: boolean;
  /** Bukan null bila tenggat/status butir ini berasal dari penimpaan, bukan katalog bawaan */
  override: { source: "KABUPATEN" | "GLOBAL"; basis: string | null; fromYear: number } | null;
}

export interface VillageScope {
  regencyKey: string;
  provinceKey: string;
  /** Kode kab/kota (BPS/Kemendagri) dari pengaturan wilayah desa; "" bila belum diisi */
  regencyCode?: string;
  hasBumdes: boolean;
}

/** Awalan kunci penimpaan yang berbasis kode wilayah (bukan teks). */
export const CODE_KEY_PREFIX = "kode:";
export const codeKey = (code: string): string => `${CODE_KEY_PREFIX}${code.trim()}`;

/**
 * Baris REGENCY berkunci kode hanya berlaku bagi desa yang kodenya sama (teks wilayah yang bisa diubah admin desa tidak
 * berpengaruh); baris berkunci teks dicocokkan lewat teks kabupaten dan provinsi.
 */
const rowMatches = (r: EntryRow, v: VillageScope): boolean => {
  if (r.scope === "GLOBAL") return true;
  if (r.regencyKey.startsWith(CODE_KEY_PREFIX)) return Boolean(v.regencyCode) && r.regencyKey === codeKey(v.regencyCode ?? "");
  return r.regencyKey === v.regencyKey && (r.provinceKey === "" || r.provinceKey === v.provinceKey);
};

/** Baris terbaik untuk satu butir pada satu lapis: fromYear terbesar ≤ tahun; bila sama, baris yang menyebut provinsi menang. */
function pickRow(rows: EntryRow[], scope: "GLOBAL" | "REGENCY", itemKey: string, year: number, v: VillageScope): EntryRow | null {
  let best: EntryRow | null = null;
  for (const r of rows) {
    if (r.scope !== scope || r.itemKey !== itemKey || r.fromYear > year || !rowMatches(r, v)) continue;
    if (!best || r.fromYear > best.fromYear || (r.fromYear === best.fromYear && r.provinceKey.length > best.provinceKey.length)) best = r;
  }
  return best;
}

/** Menyusun butir untuk satu desa dan tahun anggaran: bawaan + penimpaan global + penimpaan kabupaten + butir tambahan kabupaten. */
export function resolveItems(args: { year: number; village: VillageScope; entries: EntryRow[] }): ResolvedItem[] {
  const { year, village, entries } = args;
  const out: ResolvedItem[] = [];
  for (const def of DEFAULT_ITEMS) {
    if (def.appliesTo === "BUMDES" && !village.hasBumdes) continue;
    const reg = pickRow(entries, "REGENCY", def.key, year, village);
    const glob = reg ? null : pickRow(entries, "GLOBAL", def.key, year, village);
    const row = reg ?? glob;
    if (row) {
      if (row.disabled) {
        // Tetap ditampilkan (tidak dihapus diam-diam) dengan penanda dan dasarnya; tidak dihitung sebagai kewajiban.
        out.push({
          key: def.key,
          title: def.title,
          recipient: def.recipient,
          group: def.group,
          done: def.done,
          derive: def.derive,
          bundle: def.bundle,
          hint: def.hint,
          rule: { kind: "NONE" },
          basis: row.basis ?? "",
          verification: isVerification(row.verification) ? row.verification : "K",
          note: row.note,
          source: reg ? "KABUPATEN" : "GLOBAL",
          versionFrom: row.fromYear,
          provisional: false,
          binding: false,
          custom: false,
          disabled: true,
          override: { source: reg ? "KABUPATEN" : "GLOBAL", basis: row.basis, fromYear: row.fromYear },
        });
        continue;
      }
      const rule = ruleFromRow(row);
      if (rule) {
        const verification = isVerification(row.verification) ? row.verification : "K";
        out.push({
          key: def.key,
          title: row.title ?? def.title,
          recipient: row.recipient ?? def.recipient,
          group: def.group,
          done: def.done,
          derive: def.derive,
          bundle: def.bundle,
          hint: def.hint,
          rule,
          basis: row.basis ?? def.versions[0]?.basis ?? "",
          verification,
          note: row.note,
          source: reg ? "KABUPATEN" : "GLOBAL",
          versionFrom: row.fromYear,
          provisional: false,
          binding: verification !== "R",
          custom: false,
          disabled: false,
          override: { source: reg ? "KABUPATEN" : "GLOBAL", basis: row.basis, fromYear: row.fromYear },
        });
        continue;
      }
    }
    let ver: RuleVersion | null = null;
    for (const x of def.versions) if (x.fromYear <= year && (!ver || x.fromYear > ver.fromYear)) ver = x;
    if (!ver) continue;
    out.push({
      key: def.key,
      title: def.title,
      recipient: def.recipient,
      group: def.group,
      done: def.done,
      derive: def.derive,
      bundle: def.bundle,
      hint: def.hint,
      rule: ver.rule,
      basis: ver.basis,
      verification: ver.verification,
      note: ver.note ?? null,
      source: "BAWAAN",
      versionFrom: ver.fromYear,
      provisional: Boolean(ver.perYear) && ver.fromYear < year,
      binding: ver.verification !== "R",
      custom: false,
      disabled: false,
      override: null,
    });
  }
  // Butir tambahan kabupaten (KAB-xxx): hanya dari penimpaan REGENCY; wajib bernama.
  const customKeys = new Set(entries.filter((e) => e.scope === "REGENCY" && isCustomKey(e.itemKey) && rowMatches(e, village)).map((e) => e.itemKey));
  for (const key of [...customKeys].sort()) {
    const row = pickRow(entries, "REGENCY", key, year, village);
    if (!row || row.disabled || !row.title) continue;
    const rule = ruleFromRow(row);
    if (!rule) continue;
    const verification = isVerification(row.verification) ? row.verification : "K";
    out.push({
      key,
      title: row.title,
      recipient: row.recipient ?? "Sesuai ketentuan kabupaten",
      group: "KABUPATEN",
      done: "KIRIM",
      derive: null,
      bundle: null,
      hint: "Butir tambahan yang ditetapkan kabupaten. Dicatat petugas.",
      rule,
      basis: row.basis ?? "Ketetapan kabupaten",
      verification,
      note: row.note,
      source: "KABUPATEN",
      versionFrom: row.fromYear,
      provisional: false,
      binding: verification !== "R",
      custom: true,
      disabled: false,
      override: null,
    });
  }
  return out;
}

export function describeRule(rule: Rule): string {
  if (rule.kind === "NONE") return "Tidak ada tanggal tertulis";
  if (rule.kind === "FIXED") {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const rel = rule.yearOffset === -1 ? "tahun sebelum tahun anggaran" : rule.yearOffset === 1 ? "tahun setelah tahun anggaran" : "tahun anggaran";
    return `${rule.day} ${months[rule.month - 1]}, ${rel}`;
  }
  return `${rule.amount} ${rule.unit === "MONTH" ? "bulan" : "hari kerja"} setelah ${EVENT_LABEL[rule.event].toLowerCase()}`;
}
