/**
 * Istilah primitif "kejadian & respons" yang dipakai bersama P4 Bencana dan P5 Keamanan. Murni (tanpa Prisma), aman untuk klien.
 *
 * Katalog di sini adalah kosakata aplikasi (daftar pilihan), BUKAN klasifikasi resmi. Satu-satunya istilah resmi yang dipakai:
 * "bencana alam / bencana nonalam / bencana sosial" (PMK 7/2026 Pasal 60 ayat 4 [V]; maknanya mengikuti peraturan tentang bencana).
 * Aturan Dana Desa untuk bencana ada di docs/PHASE3_BENCANA.md (tabel sumber [V]/[R]).
 */

/** Kunci milik objek sendiri: `in` meloloskan kunci prototipe ("constructor", "toString", "__proto__"). */
export const own = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

export const DOMAINS = ["BENCANA", "KEAMANAN"] as const;
export type Domain = (typeof DOMAINS)[number];
export const isDomain = (v: unknown): v is Domain => typeof v === "string" && (DOMAINS as readonly string[]).includes(v);

/**
 * Resource izin tiap domain. BENCANA = "bencana" (terdaftar di matriks). KEAMANAN = "keamanan": P5 WAJIB mendaftarkannya di
 * lib/permissions/{resources,matrix}.ts sebelum rutenya dipakai (sampai itu, `incidentActions` mengembalikan [] = semua ditolak).
 * Aksi "export" dipakai sebagai "baca rinci" (nama penerima per KK, kontak): tanpa itu daftar hanya menampilkan data tersamar.
 */
export const DOMAIN_RESOURCE: Record<Domain, string> = { BENCANA: "bencana", KEAMANAN: "keamanan" };

export interface KindDef {
  label: string;
  /**
   * Hanya BENCANA: ALAM | NONALAM | SOSIAL. Istilah tiga kategori ada di PMK 7/2026 Pasal 60(4) [V]; pemetaan jenis ke kategori
   * mengikuti pemahaman umum UU 24/2007 [R, teks UU belum dibaca]. Jenis yang kategorinya meragukan (mis. kebakaran) dikosongkan.
   */
  category?: "ALAM" | "NONALAM" | "SOSIAL";
}

export interface DomainDef {
  label: string;
  kinds: Record<string, KindDef>;
  /** Jenis tindakan pada log respons */
  responses: Record<string, string>;
  /** Apakah distribusi bantuan ke KK berlaku untuk domain ini */
  logistics: boolean;
}

export const DOMAIN_DEFS: Record<Domain, DomainDef> = {
  BENCANA: {
    label: "Bencana",
    logistics: true,
    kinds: {
      BANJIR: { label: "Banjir", category: "ALAM" },
      TANAH_LONGSOR: { label: "Tanah longsor", category: "ALAM" },
      GEMPA_BUMI: { label: "Gempa bumi", category: "ALAM" },
      ANGIN_KENCANG: { label: "Angin kencang / puting beliung", category: "ALAM" },
      KEKERINGAN: { label: "Kekeringan", category: "ALAM" },
      KEBAKARAN_PERMUKIMAN: { label: "Kebakaran permukiman" },
      KEBAKARAN_LAHAN: { label: "Kebakaran hutan/lahan" },
      ERUPSI: { label: "Letusan gunung api", category: "ALAM" },
      TSUNAMI_ABRASI: { label: "Tsunami / abrasi / gelombang tinggi", category: "ALAM" },
      WABAH: { label: "Wabah penyakit", category: "NONALAM" },
      KONFLIK_SOSIAL: { label: "Konflik sosial", category: "SOSIAL" },
      LAINNYA: { label: "Lainnya" },
    },
    responses: {
      ASESMEN: "Penilaian kejadian/dampak",
      PERINGATAN: "Peringatan ke warga",
      EVAKUASI: "Evakuasi / pengungsian",
      PERTOLONGAN: "Pencarian dan pertolongan",
      MEDIS: "Layanan kesehatan",
      LOGISTIK: "Logistik / dapur umum",
      KOORDINASI: "Koordinasi dengan pihak luar",
      LAPORAN: "Pelaporan ke supra-desa",
      PEMULIHAN: "Pemulihan / pembersihan",
      LAINNYA: "Lainnya",
    },
  },
  KEAMANAN: {
    label: "Keamanan dan ketertiban",
    logistics: false,
    // Daftar awal untuk P5; kekerasan terhadap perempuan/anak sengaja TIDAK dimodelkan (hanya rujukan layanan, bukan basis data kasus).
    kinds: {
      PENCURIAN: { label: "Pencurian" },
      PERKELAHIAN: { label: "Perkelahian / keributan" },
      KONFLIK_WARGA: { label: "Perselisihan antarwarga" },
      GANGGUAN_KETERTIBAN: { label: "Gangguan ketertiban umum" },
      KECELAKAAN: { label: "Kecelakaan" },
      ORANG_MENCURIGAKAN: { label: "Orang/kegiatan mencurigakan" },
      LAINNYA: { label: "Lainnya" },
    },
    responses: {
      PATROLI: "Patroli / pengamanan",
      MEDIASI: "Mediasi",
      KOORDINASI: "Koordinasi dengan pihak luar",
      LAPORAN: "Pelaporan ke supra-desa / aparat",
      TINDAK_LANJUT: "Tindak lanjut",
      LAINNYA: "Lainnya",
    },
  },
};

export const kindLabel = (domain: Domain, kind: string): string => (own(DOMAIN_DEFS[domain].kinds, kind) ? DOMAIN_DEFS[domain].kinds[kind]!.label : kind);
export const isKind = (domain: Domain, v: unknown): v is string => typeof v === "string" && own(DOMAIN_DEFS[domain].kinds, v);
export const isResponseKind = (domain: Domain, v: unknown): v is string => typeof v === "string" && own(DOMAIN_DEFS[domain].responses, v);

export const SEVERITIES = { LOW: "Ringan", MEDIUM: "Sedang", HIGH: "Berat", CRITICAL: "Sangat berat" } as const;
export type Severity = keyof typeof SEVERITIES;
export const isSeverity = (v: unknown): v is Severity => typeof v === "string" && own(SEVERITIES, v);

export const STATUSES = {
  OPEN: "Dilaporkan",
  RESPONDING: "Ditangani",
  RESOLVED: "Selesai ditangani",
  CLOSED: "Ditutup",
  CANCELLED: "Dibatalkan",
} as const;
export type EventStatus = keyof typeof STATUSES;
export const isStatus = (v: unknown): v is EventStatus => typeof v === "string" && own(STATUSES, v);

/** Sumber dana distribusi bantuan. Hanya label; tidak ada otomatisasi pembukuan (lihat docs/PHASE3_BENCANA.md). */
export const FUNDING_SOURCES = {
  DD_OPERASIONAL: "Dana Desa: operasional pemerintah desa (bantuan logistik korban bencana)",
  DD_BENCANA: "Dana Desa: penanggulangan bencana (pengecualian)",
  APBDES_BTT: "APB Desa: belanja tak terduga",
  BPBD: "Bantuan BPBD / pemerintah",
  DONASI: "Donasi / swadaya warga",
  LAINNYA: "Lainnya",
} as const;
export type FundingSource = keyof typeof FUNDING_SOURCES;
export const isFundingSource = (v: unknown): v is FundingSource => typeof v === "string" && own(FUNDING_SOURCES, v);

export const LIMITS = {
  responsesPerEvent: 2000,
  logisticsPerEvent: 5000,
  listPageSize: 50,
  maxCount: 1_000_000,
} as const;
