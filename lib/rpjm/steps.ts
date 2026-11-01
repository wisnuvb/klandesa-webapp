import { FIELDS, FIELD_KEYS, RPJM_RULES, type FieldCode } from "./catalog";

/**
 * Tahapan, gerbang, bendera keselarasan, dan peringatan RPJM Desa. Murni (tanpa Prisma).
 * Gerbang KERAS (ditegakkan server) hanya yang sama di semua sumber: rancangan memuat visi-misi dan arah kebijakan
 * (PP 16/2026 Pasal 144 ayat 4), Perdes hanya setelah rancangan dibahas dan disepakati dalam musyawarah
 * (Permendagri 114/2014 Pasal 26-27; Permendesa 21/2020 Pasal 31-33; PP 16/2026 Pasal 144 ayat 3).
 * Selebihnya peringatan berlabel sumber yang tidak memblokir.
 */

export type StepState = "done" | "overdue" | "soon" | "upcoming" | "open";

export interface StepInput {
  headInauguratedOn: string | null;
  teamFormedAt: string | null;
  reviewDoneAt: string | null;
  musdesHeldOn: string | null;
  draftReadyAt: string | null;
  draftApprovedAt: string | null;
  draftMeetingHeldOn: string | null;
  perdesEnactedOn: string | null;
  enactedBeforeApp: boolean;
  /** Sudah pernah dibuka untuk perubahan: perubahan tidak punya tenggat 3 bulan sejak pelantikan (Pasal 28; PP 16/2026 Pasal 148). */
  amendment?: boolean;
}

export interface Step {
  key: "tim" | "pengkajian" | "musdes" | "rancangan" | "disetujui" | "pembahasan" | "perdes";
  label: string;
  basis: string;
  due: string | null;
  doneAt: string | null;
  doneLate: boolean;
  state: StepState;
}

const SOON_DAYS = 14;
const DAY = 86_400_000;
const dayStart = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Tambah bulan ke tanggal "YYYY-MM-DD"; hari melewati akhir bulan dipangkas ke hari terakhir bulan tujuan. */
export function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

function stateOf(due: string | null, doneAt: string | null, now: Date): StepState {
  if (doneAt) return "done";
  if (!due) return "open";
  const left = Math.round((Date.parse(`${due}T00:00:00.000Z`) - dayStart(now)) / DAY);
  if (left < 0) return "overdue";
  return left <= SOON_DAYS ? "soon" : "upcoming";
}

export function buildSteps(i: StepInput, now: Date): Step[] {
  const perdesDue = i.headInauguratedOn && !i.enactedBeforeApp && !i.amendment ? addMonthsIso(i.headInauguratedOn, RPJM_RULES.perdesMonthsAfterInauguration) : null;
  const mk = (key: Step["key"], label: string, basis: string, due: string | null, doneAt: string | null): Step => ({
    key,
    label,
    basis,
    due,
    doneAt,
    doneLate: Boolean(due && doneAt && doneAt > due),
    state: stateOf(due, doneAt, now),
  });
  return [
    mk("tim", "Tim penyusun RPJM Desa dibentuk dengan keputusan Kepala Desa", "Permendagri 114/2014 Pasal 8; Permendesa PDTT 21/2020 Pasal 27", null, i.teamFormedAt),
    mk("pengkajian", "Pengkajian keadaan Desa selesai dan dilaporkan kepada Kepala Desa (berita acara)", "Permendagri 114/2014 Pasal 12-19", null, i.reviewDoneAt),
    mk("musdes", "Musyawarah Desa (BPD) membahas hasil pengkajian, arah kebijakan, dan prioritas kegiatan", "Permendagri 114/2014 Pasal 20-22", null, i.musdesHeldOn),
    mk("rancangan", "Rancangan RPJM Desa selesai: visi-misi, arah kebijakan, program dan kegiatan (berita acara tim)", "Permendagri 114/2014 Pasal 23; PP 16/2026 Pasal 144 ayat 4 dan 145", null, i.draftReadyAt),
    mk("disetujui", "Kepala Desa memeriksa dan menyetujui rancangan", "Permendagri 114/2014 Pasal 24", null, i.draftApprovedAt),
    mk("pembahasan", "Musyawarah perencanaan pembangunan Desa membahas dan menyepakati rancangan", "Permendagri 114/2014 Pasal 25-26; PP 16/2026 Pasal 144 ayat 2-3", null, i.draftMeetingHeldOn),
    mk(
      "perdes",
      "Peraturan Desa tentang RPJM Desa ditetapkan",
      i.amendment
        ? "Permendagri 114/2014 Pasal 28 ayat 2; PP 16/2026 Pasal 148 ayat 2: perubahan ditetapkan dengan Peraturan Desa (tanpa tenggat 3 bulan, itu hanya untuk RPJM Desa awal)"
        : perdesDue
          ? "PP 16/2026 Pasal 145 ayat 4: paling lama 3 bulan sejak pelantikan Kepala Desa"
          : "PP 16/2026 Pasal 145 ayat 4: paling lama 3 bulan sejak pelantikan Kepala Desa (isi tanggal pelantikan untuk menghitung tenggat)",
      perdesDue,
      i.perdesEnactedOn,
    ),
  ];
}

// --- Gerbang ---------------------------------------------------------------------

export interface GateInput {
  vision: string | null;
  mission: string | null;
  policyDirection: string | null;
  programCount: number;
  draftReadyAt: string | null;
  draftApprovedAt: string | null;
  draftMeetingHeld: boolean;
  enactedBeforeApp: boolean;
}

/** Hal yang menghalangi rancangan ditandai selesai. Kosong = boleh. */
export function draftReadyBlockers(g: Pick<GateInput, "vision" | "mission" | "policyDirection" | "programCount">): string[] {
  const out: string[] = [];
  if (!g.vision?.trim()) out.push("Visi Kepala Desa belum diisi.");
  if (!g.mission?.trim()) out.push("Misi Kepala Desa belum diisi.");
  if (!g.policyDirection?.trim()) out.push("Arah kebijakan pembangunan Desa belum diisi.");
  if (g.programCount < 1) out.push("Belum ada program atau kegiatan.");
  return out;
}

/** Hal yang menghalangi Peraturan Desa dihubungkan (dan isi dikunci). Kosong = boleh. */
export function perdesBlockers(g: Pick<GateInput, "draftReadyAt" | "draftApprovedAt" | "draftMeetingHeld" | "enactedBeforeApp">): string[] {
  if (g.enactedBeforeApp) return [];
  const out: string[] = [];
  if (!g.draftReadyAt) out.push("Rancangan belum ditandai selesai (berita acara tim penyusun).");
  if (!g.draftApprovedAt) out.push("Rancangan belum disetujui Kepala Desa (Permendagri 114/2014 Pasal 24).");
  if (!g.draftMeetingHeld) out.push("Rancangan belum dibahas dan disepakati dalam musyawarah yang sudah terlaksana.");
  return out;
}

// --- Tim penyusun ------------------------------------------------------------------

export interface TeamLite {
  role: string;
  gender: string | null;
}

/**
 * Peringatan komposisi tim; tidak pernah memblokir. Aturan yang sama di Permendagri 114/2014 dan Permendesa 21/2020 (paling sedikit 7,
 * ada perempuan, satu pembina/ketua/sekretaris) tampil biasa; yang hanya di satu sumber diberi label sumbernya.
 */
export function teamWarnings(members: readonly TeamLite[]): string[] {
  const out: string[] = [];
  const n = members.length;
  if (n < RPJM_RULES.teamMin) out.push(`Tim penyusun baru ${n} orang; paling sedikit ${RPJM_RULES.teamMin} orang (Permendagri 114/2014 Pasal 8 ayat 3; Permendesa PDTT 21/2020 Pasal 27 ayat 4).`);
  const women = members.filter((m) => m.gender === "P").length;
  if (women === 0) out.push("Belum ada perempuan dalam tim penyusun (Permendagri 114/2014 Pasal 8 ayat 4; Permendesa PDTT 21/2020 Pasal 27 ayat 5).");
  const cnt = (r: string) => members.filter((m) => m.role === r).length;
  if (cnt("PEMBINA") !== 1) out.push("Tim harus memiliki satu pembina (Kepala Desa).");
  if (cnt("KETUA") !== 1) out.push("Tim harus memiliki satu ketua.");
  if (cnt("SEKRETARIS") !== 1) out.push("Tim harus memiliki satu sekretaris.");
  // Aturan satu sumber: berlabel, belum dipastikan mana yang berlaku.
  if (n > RPJM_RULES.teamMaxSingleSource) out.push(`Catatan satu sumber: Permendagri 114/2014 Pasal 8 ayat 3 membatasi paling banyak ${RPJM_RULES.teamMaxSingleSource} orang (tim ini ${n}). Belum dipastikan masih berlaku; Permendesa PDTT 21/2020 tidak membatasi.`);
  if (n >= 1 && women > 0 && women / n < RPJM_RULES.womenShareSingleSource)
    out.push(`Catatan satu sumber: Permendesa PDTT 21/2020 Pasal 27 ayat 5 meminta perempuan paling sedikit 30% (tim ini ${women} dari ${n}). Status berlaku ketentuan ini belum dipastikan.`);
  if (n >= RPJM_RULES.teamMin && n % 2 === 0) out.push(`Catatan satu sumber: Permendesa PDTT 21/2020 Pasal 27 ayat 4 meminta jumlah anggota ganjil (tim ini ${n}). Status berlaku ketentuan ini belum dipastikan.`);
  return out;
}

// --- Program ------------------------------------------------------------------------

export interface ProgramLite {
  title: string;
  activityCode: string | null;
  location: string | null;
  outputVolume: string | null;
  benefit: string | null;
  budget: string | null;
  fundSource: string | null;
  method: string | null;
}

/** Kelengkapan program (unsur rancangan menurut Permendesa PDTT 21/2020 Pasal 30 ayat 3 huruf d-i); tidak memblokir. */
export function programWarnings(p: ProgramLite): string[] {
  const out: string[] = [];
  if (!p.activityCode) out.push("Belum dikaitkan ke kode kegiatan (Permendagri 20/2018), sehingga belum rapi saat dijabarkan ke RKP Desa dan APB Desa.");
  if (!p.budget) out.push("Anggaran indikatif belum diisi.");
  if (!p.fundSource) out.push("Sumber pembiayaan belum dipilih.");
  if (!p.method) out.push("Pola pelaksanaan belum dipilih.");
  if (!p.location) out.push("Lokasi belum diisi.");
  if (!p.outputVolume) out.push("Perkiraan volume belum diisi.");
  if (!p.benefit) out.push("Sasaran/manfaat belum diisi.");
  return out;
}

// --- Bendera keselarasan -------------------------------------------------------------

export interface Flag {
  code: string;
  /** "perlu" = perlu penyesuaian (ditampilkan menonjol); "info" = catatan. Tidak ada yang memblokir. */
  level: "perlu" | "info";
  message: string;
}

export interface FlagInput {
  periodStart: number;
  periodEnd: number;
  vision: string | null;
  mission: string | null;
  policyDirection: string | null;
  headInauguratedOn: string | null;
  perdesEnactedOn: string | null;
  locked: boolean;
  programs: { year: number; fieldCode: string }[];
  sdgsPlanRecordedAt: string | null;
  /** Tenggat Perdes yang sudah lewat tanpa Perdes (dari langkah "perdes"); satu sumber dengan status Terlambat di tahapan. */
  perdesOverdueDue?: string | null;
  /** Dokumen belum memakai alur tahapan sama sekali (RPJM Desa lama): hanya bendera jangka waktu dan isi pokok yang dinilai. */
  untouched: boolean;
}

export function planFlags(i: FlagInput, now: Date): Flag[] {
  const out: Flag[] = [];
  const years = i.periodEnd - i.periodStart + 1;
  if (years === RPJM_RULES.legacyTermYears)
    out.push({
      code: "TERM_LEGACY",
      level: "perlu",
      message: `RPJM Desa berjangka ${years} tahun (aturan lama, Permendagri 114/2014 Pasal 4). RPJM Desa kini berjangka ${RPJM_RULES.termYears} tahun (UU 3/2024 Pasal 79 ayat 2 huruf a; PP 16/2026 Pasal 143 ayat 2 huruf a). Belum ditemukan ketentuan peralihan terverifikasi yang mewajibkan dokumen lama diubah; sumber sekunder menyarankan perubahan RPJM Desa (menambah tahun ke-7 dan ke-8) lewat musyawarah dan Peraturan Desa. Tanyakan ke dinas PMD kabupaten.`,
    });
  else if (years !== RPJM_RULES.termYears)
    out.push({ code: "TERM_OTHER", level: "perlu", message: `RPJM Desa berjangka ${years} tahun; jangka waktu yang berlaku sekarang ${RPJM_RULES.termYears} tahun (UU 3/2024 Pasal 79 ayat 2 huruf a).` });

  if (i.headInauguratedOn) {
    const y = Number(i.headInauguratedOn.slice(0, 4));
    const termEnd = addMonthsIso(i.headInauguratedOn, RPJM_RULES.headTermYears * 12);
    if (i.periodStart !== y || i.periodEnd !== y + RPJM_RULES.headTermYears - 1)
      out.push({
        code: "TENURE_MISMATCH",
        level: "info",
        message: `Periode ${i.periodStart}-${i.periodEnd} tidak sama dengan masa jabatan Kepala Desa ${RPJM_RULES.headTermYears} tahun sejak pelantikan ${i.headInauguratedOn} (UU 3/2024 Pasal 39 ayat 1; berakhir sekitar ${termEnd}). Peraturan tidak menyatakan keduanya harus identik; ini hanya indikasi untuk diperiksa.`,
      });
    if (i.perdesEnactedOn && i.perdesEnactedOn > addMonthsIso(i.headInauguratedOn, RPJM_RULES.perdesMonthsAfterInauguration))
      out.push({ code: "ENACTED_LATE", level: "info", message: `Peraturan Desa ditetapkan ${i.perdesEnactedOn}, lebih dari ${RPJM_RULES.perdesMonthsAfterInauguration} bulan setelah pelantikan (PP 16/2026 Pasal 145 ayat 4).` });
  }

  if (i.perdesOverdueDue)
    out.push({ code: "PERDES_OVERDUE", level: "perlu", message: `Tenggat penetapan Peraturan Desa RPJM Desa (${i.perdesOverdueDue}, 3 bulan sejak pelantikan, PP 16/2026 Pasal 145 ayat 4) sudah lewat dan Perdes belum dihubungkan.` });

  if (!i.untouched) {
    if (!i.vision?.trim() || !i.mission?.trim()) out.push({ code: "NO_VISION_MISSION", level: "perlu", message: "Visi dan misi Kepala Desa belum lengkap (PP 16/2026 Pasal 144 ayat 4 dan 145 ayat 1)." });
    if (!i.policyDirection?.trim()) out.push({ code: "NO_POLICY", level: "perlu", message: "Arah kebijakan pembangunan Desa belum diisi (PP 16/2026 Pasal 144 ayat 4)." });
    const outside = i.programs.filter((p) => p.year < i.periodStart || p.year > i.periodEnd).length;
    if (outside > 0) out.push({ code: "PROGRAM_OUT_OF_PERIOD", level: "perlu", message: `${outside} program berada di luar periode ${i.periodStart}-${i.periodEnd}.` });
    const empty = FIELD_KEYS.filter((f) => !i.programs.some((p) => p.fieldCode === f));
    if (i.programs.length > 0 && empty.length > 0)
      out.push({ code: "EMPTY_FIELD", level: "info", message: `Bidang belum memiliki program: ${empty.map((f: FieldCode) => FIELDS[f]).join("; ")} (RPJM Desa memuat keempat bidang, PP 16/2026 Pasal 145 ayat 1).` });
    const years8 = Array.from({ length: Math.max(0, Math.min(years, 12)) }, (_, k) => i.periodStart + k);
    const bare = years8.filter((y) => !i.programs.some((p) => p.year === y));
    if (i.programs.length > 0 && bare.length > 0) out.push({ code: "YEAR_WITHOUT_PROGRAM", level: "info", message: `Tahun tanpa program: ${bare.join(", ")}.` });
  }

  if (!i.sdgsPlanRecordedAt) {
    const deadline = RPJM_RULES.sdgsAdaptationDeadline;
    const late = now.toISOString().slice(0, 10) > deadline;
    out.push({
      code: "SDGS_NOT_RECORDED",
      level: "info",
      message: `Rencana Jangka Menengah SDGs Desa (5 tahun, diisi di aplikasi SID) belum dicatat. Permendesa PDT 13/2025 Pasal 126 ayat 4: RPJM Desa yang sudah memuatnya menjadi pedoman RKP Desa; Pasal 183 huruf c: perencanaan menyesuaikan paling lama 1 tahun sejak diundangkan (4 Desember 2025, sekitar ${deadline})${late ? " — tenggat itu sudah lewat" : ""}. Aplikasi ini belum terhubung ke SID; catat tanggal pengisiannya di tab Isi rancangan.`,
    });
  }
  return out;
}

// --- Rute lama (menu RPJMDes) ---------------------------------------------------------

export interface LegacyPlanFields {
  title: string;
  periodStart: number;
  periodEnd: number;
  vision: string | null;
  mission: string | null;
}

/**
 * Alasan menolak penyuntingan isi dari rute lama (`PATCH /api/rpjmdes/plans/[id]`), atau null bila boleh.
 * Terkunci (Perdes terhubung) atau sudah disetujui Kepala Desa: isi hanya diubah lewat Tahapan RPJM Desa, yang mencabut persetujuan dan mencatatnya.
 */
export function legacyPlanEditBlock(existing: LegacyPlanFields & { legalDocumentId: number | null; draftApprovedAt: unknown }, input: LegacyPlanFields): string | null {
  const changed =
    input.title !== existing.title ||
    input.periodStart !== existing.periodStart ||
    input.periodEnd !== existing.periodEnd ||
    (input.vision ?? null) !== (existing.vision ?? null) ||
    (input.mission ?? null) !== (existing.mission ?? null);
  if (!changed) return null;
  if (existing.legalDocumentId !== null) return "RPJM Desa ini sudah ditetapkan dengan Peraturan Desa dan terkunci. Buka kuncinya dari menu Tahapan RPJM Desa bila perlu diubah.";
  if (existing.draftApprovedAt !== null && existing.draftApprovedAt !== undefined) return "Rancangan RPJM Desa ini sudah disetujui Kepala Desa. Ubah isinya dari menu Tahapan RPJM Desa; persetujuan akan dicabut dan perlu diberikan ulang.";
  return null;
}
