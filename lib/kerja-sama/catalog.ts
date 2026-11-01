/**
 * Kerja sama Desa (antar-Desa dan dengan pihak ketiga). Murni (tanpa Prisma), aman dipakai klien.
 * Sumber [V] (dibaca dari teks resmi): Permendagri 96/2017 (BN 2017/1444) Pasal 2-26, dan Permendagri 114/2014 Pasal 39, 41, 42.
 * Catatan: Pasal 39 dan 42 Permendagri 114/2014 hanya mengatur bahwa HASIL kesepakatan kerja sama menjadi pedoman RKP Desa dan
 * RAB kerja sama antar-Desa disepakati para kepala desa; tata cara kerja samanya sendiri ada di Permendagri 96/2017.
 */

export const KINDS = { ANTAR_DESA: "Kerja sama antar-Desa", PIHAK_KETIGA: "Kerja sama dengan pihak ketiga" } as const;
export type Kind = keyof typeof KINDS;
export const isKind = (v: unknown): v is Kind => typeof v === "string" && Object.hasOwn(KINDS, v);

export const INITIATIVES = { DESA: "Atas prakarsa Desa", PIHAK_KETIGA: "Atas prakarsa pihak ketiga" } as const;
export type Initiative = keyof typeof INITIATIVES;
export const isInitiative = (v: unknown): v is Initiative => typeof v === "string" && Object.hasOwn(INITIATIVES, v);

/** Bidang kerja sama: Pasal 9 ayat 1. */
export const FIELDS = { PEMERINTAHAN: "Pemerintahan Desa", PEMBANGUNAN: "Pembangunan Desa", PEMBINAAN: "Pembinaan kemasyarakatan Desa", PEMBERDAYAAN: "Pemberdayaan masyarakat Desa" } as const;
export type Field = keyof typeof FIELDS;
export const isField = (v: unknown): v is Field => typeof v === "string" && Object.hasOwn(FIELDS, v);

export const STATUS = {
  PERSIAPAN: "Persiapan",
  PENAWARAN: "Penawaran",
  PENYUSUNAN: "Penyusunan rancangan",
  DITANDATANGANI: "Ditandatangani",
  PELAKSANAAN: "Pelaksanaan",
  SELESAI: "Berakhir",
  BATAL: "Dibatalkan",
} as const;
export type Status = keyof typeof STATUS;
export const isStatus = (v: unknown): v is Status => typeof v === "string" && Object.hasOwn(STATUS, v);

export const PARTY_KINDS = { SELF: "Desa ini", DESA: "Desa lain", PIHAK_KETIGA: "Pihak ketiga" } as const;
export type PartyKind = keyof typeof PARTY_KINDS;
export const isPartyKind = (v: unknown): v is PartyKind => typeof v === "string" && Object.hasOwn(PARTY_KINDS, v);

/** Sebab berakhirnya kerja sama: Pasal 17 huruf a-i. */
export const END_REASONS = {
  KESEPAKATAN: "Kesepakatan para pihak melalui prosedur yang ditetapkan",
  TUJUAN_TERCAPAI: "Tujuan kesepakatan atau perjanjian telah tercapai",
  KEADAAN_LUAR_BIASA: "Keadaan luar biasa yang membuat kerja sama tidak dapat dilaksanakan",
  PELANGGARAN: "Salah satu pihak tidak melaksanakan atau melanggar ketentuan",
  DIGANTI: "Dibuat kesepakatan atau perjanjian baru yang menggantikan",
  BERTENTANGAN: "Bertentangan dengan peraturan perundang-undangan",
  OBJEK_HILANG: "Objek kesepakatan atau perjanjian hilang",
  MERUGIKAN: "Merugikan kepentingan masyarakat Desa, daerah, atau nasional",
  MASA_BERAKHIR: "Berakhirnya masa kesepakatan atau perjanjian",
} as const;
export type EndReason = keyof typeof END_REASONS;
export const isEndReason = (v: unknown): v is EndReason => typeof v === "string" && Object.hasOwn(END_REASONS, v);

export const LIMITS = { agreementsPerYear: 300, partiesPerAgreement: 10, budgetItemsPerAgreement: 200 } as const;

/** Jenis Musyawarah Desa yang dapat dikaitkan (bukan musyawarah BLT). */
export const MUSDES_KINDS = ["MUSDES_PERENCANAAN", "MUSDES_PERUBAHAN", "MUSDES_LAINNYA", "MUSRENBANGDES"] as const;

/** Muatan minimal Peraturan Bersama/Perjanjian Bersama (Pasal 6 huruf a-h) dan kolom yang menampungnya. */
export const CONTENTS = [
  { key: "scope", label: "Ruang lingkup kerja sama", ref: "Pasal 6 huruf a" },
  { key: "field", label: "Bidang kerja sama", ref: "Pasal 6 huruf b" },
  { key: "procedures", label: "Tata cara dan ketentuan pelaksanaan", ref: "Pasal 6 huruf c" },
  { key: "term", label: "Jangka waktu", ref: "Pasal 6 huruf d" },
  { key: "rights", label: "Hak dan kewajiban", ref: "Pasal 6 huruf e" },
  { key: "funding", label: "Pendanaan", ref: "Pasal 6 huruf f" },
  { key: "amendment", label: "Tata cara perubahan, penundaan, dan pembatalan", ref: "Pasal 6 huruf g" },
  { key: "dispute", label: "Penyelesaian perselisihan", ref: "Pasal 6 huruf h" },
] as const;

/** Batas hari kerja penandatanganan sejak disepakati: Pasal 13 ayat 5 huruf a dan 14 ayat 5 huruf a. */
export const SIGN_WITHIN_WORKDAYS = 7;

export const SOURCES = [
  { ref: "Permendagri 96/2017 Pasal 2-5, 9-10", note: "Jenis kerja sama, bidang, dan keharusan kesepakatan lewat Musyawarah Desa; tercantum dalam RPJM Desa dan RKP Desa", status: "V" },
  { ref: "Permendagri 96/2017 Pasal 6", note: "Muatan minimal Peraturan Bersama/Perjanjian Bersama (8 butir)", status: "V" },
  { ref: "Permendagri 96/2017 Pasal 13-15", note: "Tahapan: persiapan, penawaran, penyusunan rancangan, penandatanganan (paling lama 7 hari kerja, disaksikan camat), pelaksanaan, pelaporan; konsultasi ke bupati/wali kota melalui camat bila menyangkut tata ruang, pungutan, organisasi, atau pembebanan APB Desa", status: "V" },
  { ref: "Permendagri 96/2017 Pasal 17, 20-26", note: "Berakhirnya kerja sama, hasil (uang menjadi pendapatan Desa di rekening kas desa; barang menjadi aset Desa), pelaporan, biaya antar-Desa dibebankan pada APB Desa", status: "V" },
  { ref: "Permendagri 114/2014 Pasal 39, 41, 42", note: "Hasil kesepakatan kerja sama menjadi pedoman rancangan RKP Desa; RAB kerja sama antar-Desa disusun dan disepakati bersama para kepala desa", status: "V" },
  { ref: "Peraturan daerah/bupati tentang kerja sama desa (kabupaten Anda)", note: "Belum dibaca; dapat menambah syarat", status: "R" },
] as const;

export const REFS = {
  musdes: "Permendagri 96/2017 Pasal 13 ayat 2 dan Pasal 14 ayat 2",
  plan: "Permendagri 96/2017 Pasal 10",
  offer: "Permendagri 96/2017 Pasal 13 ayat 3 dan Pasal 15",
  contents: "Permendagri 96/2017 Pasal 6",
  consult: "Permendagri 96/2017 Pasal 13 ayat 4 huruf b-c dan Pasal 14 ayat 4",
  sign: "Permendagri 96/2017 Pasal 13 ayat 5 dan Pasal 14 ayat 5",
  rab: "Permendagri 114/2014 Pasal 42 ayat 2",
  report: "Permendagri 96/2017 Pasal 13 ayat 7, Pasal 14 ayat 7, dan Pasal 22-23",
  funds: "Permendagri 96/2017 Pasal 20 dan 26",
  end: "Permendagri 96/2017 Pasal 17",
} as const;
