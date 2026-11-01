import { TEAM_LIMITS, type PaguSource, type TeamRole } from "./catalog";

/**
 * Langkah dan tenggat siklus RKP Desa. Murni; semua tenggat bersumber teks resmi Permendagri 114/2014 [V].
 * RKP Desa tahun Y disusun pada tahun berjalan Y-1.
 */

export type StepState = "done" | "overdue" | "soon" | "upcoming" | "open";

export interface StepInput {
  year: number;
  revision: number;
  musdesHeldOn: string | null;
  teamFormedAt: string | null;
  paguReceivedAt: string | null;
  draftReadyAt: string | null;
  draftApprovedAt: string | null;
  musrenbangHeldOn: string | null;
  perdesEnactedOn: string | null;
  usulanSubmittedAt: string | null;
}

export interface Step {
  key: "musdes" | "tim" | "pagu" | "rancangan" | "disetujui" | "musrenbang" | "perdes" | "usulan";
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

function state(due: string | null, doneAt: string | null, now: Date): StepState {
  if (doneAt) return "done";
  if (!due) return "open";
  const left = Math.round((Date.parse(`${due}T00:00:00.000Z`) - dayStart(now)) / DAY);
  if (left < 0) return "overdue";
  return left <= SOON_DAYS ? "soon" : "upcoming";
}

export function buildSteps(i: StepInput, now: Date): Step[] {
  const cur = i.year - 1; // tahun berjalan penyusunan
  const mk = (key: Step["key"], label: string, basis: string, due: string | null, doneAt: string | null): Step => ({
    key,
    label,
    basis,
    due,
    doneAt,
    doneLate: Boolean(due && doneAt && doneAt > due),
    state: state(due, doneAt, now),
  });

  if (i.revision > 0) {
    // RKP Desa perubahan: tak ada tenggat baku; ikuti Pasal 49-50.
    return [
      mk("rancangan", "Rancangan RKP Desa perubahan (kajian ulang kegiatan terdampak, rencana kegiatan dan RAB)", "Pasal 49 ayat 2-3", null, i.draftReadyAt),
      mk("musrenbang", "Musyawarah perencanaan pembangunan Desa khusus perubahan", "Pasal 50 ayat 1-2", null, i.musrenbangHeldOn),
      mk("perdes", "Peraturan Desa tentang RKP Desa perubahan ditetapkan", "Pasal 50 ayat 3-4", null, i.perdesEnactedOn),
    ];
  }

  return [
    mk("musdes", "Musyawarah Desa perencanaan terlaksana (BPD)", "Pasal 31 ayat 3: paling lambat Juni tahun berjalan", `${cur}-06-30`, i.musdesHeldOn),
    mk("tim", "Tim penyusun RKP Desa dibentuk dengan keputusan Kepala Desa", "Pasal 33 ayat 5-6: paling lambat Juni tahun berjalan", `${cur}-06-30`, i.teamFormedAt),
    mk("pagu", "Pagu indikatif Desa dan program yang masuk Desa dicermati", "Pasal 35 ayat 2: informasi diterima dari kabupaten/kota paling lambat Juli", `${cur}-07-31`, i.paguReceivedAt),
    mk("rancangan", "Rancangan RKP Desa, daftar usulan, dan berita acara tim penyusun selesai", "Pasal 41-44; RKP Desa mulai disusun Juli (Pasal 29 ayat 3)", null, i.draftReadyAt),
    mk("disetujui", "Kepala Desa memeriksa dan menyetujui rancangan", "Pasal 45", null, i.draftApprovedAt),
    mk("musrenbang", "Musyawarah perencanaan pembangunan Desa (Musrenbangdes) terlaksana", "Pasal 46-48", null, i.musrenbangHeldOn),
    mk("perdes", "Peraturan Desa tentang RKP Desa ditetapkan", "Pasal 29 ayat 4: paling lambat akhir September tahun berjalan", `${cur}-09-30`, i.perdesEnactedOn),
    mk("usulan", "Daftar usulan RKP Desa disampaikan ke bupati/wali kota melalui camat", "Pasal 51 ayat 2: paling lambat 31 Desember tahun berjalan", `${cur}-12-31`, i.usulanSubmittedAt),
  ];
}

export interface TeamLite {
  role: string;
  gender: string | null;
}

/** Peringatan komposisi tim (Pasal 33): tidak memblokir. */
export function teamWarnings(members: readonly TeamLite[]): string[] {
  const out: string[] = [];
  const n = members.length;
  if (n < TEAM_LIMITS.min) out.push(`Tim penyusun baru ${n} orang; Pasal 33 ayat 3 mengatur paling sedikit ${TEAM_LIMITS.min} dan paling banyak ${TEAM_LIMITS.max} orang.`);
  if (n > TEAM_LIMITS.max) out.push(`Tim penyusun ${n} orang melebihi batas ${TEAM_LIMITS.max} orang (Pasal 33 ayat 3).`);
  if (!members.some((m) => m.gender === "P")) out.push("Belum ada perempuan dalam tim penyusun (Pasal 33 ayat 4).");
  const roleCount = (r: TeamRole) => members.filter((m) => m.role === r).length;
  if (roleCount("PEMBINA") !== 1) out.push("Tim penyusun harus memiliki satu pembina (Kepala Desa).");
  if (roleCount("KETUA") !== 1) out.push("Tim penyusun harus memiliki satu ketua (Sekretaris Desa).");
  if (roleCount("SEKRETARIS") !== 1) out.push("Tim penyusun harus memiliki satu sekretaris (ketua lembaga pemberdayaan masyarakat).");
  return out;
}

export interface ActivityLite {
  title: string;
  activityCode: string | null;
  fundSource: string | null;
  method: string | null;
  outputName: string | null;
  outputVolume: string | null;
  executorChair: string | null;
  executorSecretary: string | null;
  executorTreasurer: string | null;
  executorHasWoman: boolean | null;
  rabVerifiedAt: string | null;
  estimatedBudget: string | null;
}

/** Kelengkapan satu kegiatan (Pasal 40-42): tidak memblokir, tetapi tampil agar operator tahu apa yang belum siap. */
export function activityWarnings(a: ActivityLite): string[] {
  const out: string[] = [];
  if (!a.activityCode) out.push("Belum dikaitkan ke bidang/kegiatan (kode) sehingga belum bisa dipindah ke APB Desa.");
  if (!a.estimatedBudget) out.push("Anggaran belum diisi.");
  if (!a.fundSource) out.push("Sumber dana belum dipilih.");
  if (!a.method) out.push("Cara pelaksanaan belum dipilih (swakelola, kerja sama antar-Desa, atau pihak ketiga).");
  if (!a.outputName || !a.outputVolume) out.push("Keluaran dan volume belum diisi.");
  if (!a.executorChair || !a.executorSecretary || !a.executorTreasurer) out.push("Pelaksana kegiatan minimal ketua, sekretaris, dan bendahara (Pasal 40 ayat 2).");
  else if (a.executorHasWoman !== true) out.push("Pelaksana kegiatan harus mengikutsertakan perempuan (Pasal 40 ayat 3).");
  if (!a.rabVerifiedAt) out.push("Rencana kegiatan dan RAB belum diverifikasi tim verifikasi (Pasal 42 ayat 3).");
  return out;
}

/** Anggaran kegiatan per sumber dana melebihi pagu indikatif sumber itu (Pasal 47 ayat 2). Sen untuk menghindari float. */
export function paguWarnings(pagu: ReadonlyMap<PaguSource, bigint>, spendBySource: ReadonlyMap<string, bigint>, label: (s: string) => string): string[] {
  const out: string[] = [];
  for (const [src, spent] of spendBySource) {
    const cap = pagu.get(src as PaguSource) ?? 0n;
    if (spent > cap) out.push(`Anggaran kegiatan bersumber ${label(src)} melebihi pagu indikatif yang tercatat.`);
  }
  return out;
}
