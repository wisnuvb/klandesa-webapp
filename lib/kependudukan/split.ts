/**
 * "Pecah KK": sebagian anggota aktif sebuah KK dipindahkan ke nomor KK BARU dalam satu langkah. Murni (aman di klien
 * dan server): pembacaan isian dan validasi aturan. Penulisan atomik (warga, Buku Mutasi, sinkronisasi rumah tangga)
 * ada di `split-service.ts`.
 *
 * Aturan inti:
 *  - KK baru harus belum dipakai warga mana pun di desa ini (memindahkan ke KK yang sudah ada = Mutasi › Perubahan KK).
 *  - Minimal satu anggota aktif tetap di KK lama (kalau semua pindah, itu pergantian nomor KK, bukan pecah).
 *  - KK baru punya tepat satu Kepala Keluarga; kalau kepala lama ikut pindah, KK lama wajib diberi kepala baru.
 */
import { toIsoDate } from "../residents-import/nik-date";
import { KK_HEAD_ROLE, normalizeKk } from "./household";
import { FAMILY_ROLES } from "./mutasi-labels";

export const SPLIT_LIMITS = { maxMoves: 25, addressMax: 500, rtRwMax: 10, hamletMax: 100 } as const;

export interface SplitMoveInput {
  residentId: number;
  /** Hubungan dalam KK yang baru. */
  familyRole: string;
}

export interface SplitAddressInput {
  /** `false` = anggota yang pindah tetap memakai alamat/RT/RW/dusun yang sekarang. */
  enabled: boolean;
  address: string;
  rt: string;
  rw: string;
  hamlet: string;
}

export interface SplitInput {
  /** Nomor KK baru (boleh berspasi; dinormalisasi saat divalidasi). */
  newKk: string;
  /** yyyy-mm-dd: tanggal efektif pecah KK. */
  effectiveDate: string;
  moves: SplitMoveInput[];
  /** Kepala Keluarga baru di KK lama; wajib hanya bila kepala lama ikut pindah. */
  newSourceHeadId: number | null;
  address: SplitAddressInput;
}

export interface SplitMember {
  id: number;
  name: string;
  familyRole: string;
  /** Hidup dan belum tercatat pindah keluar. */
  active: boolean;
}

export interface SplitContext {
  /** Nomor KK sekarang (16 digit). */
  sourceKk: string;
  members: readonly SplitMember[];
  /** Nama salah satu warga yang sudah memakai KK baru di desa ini, bila ada. */
  newKkTakenBy: string | null;
  now: Date;
}

export interface SplitIssues {
  newKk?: string;
  effectiveDate?: string;
  /** Galat tingkat daftar (mis. belum ada yang dipilih). */
  moves?: string;
  /** Galat kepala KK baru. */
  heads?: string;
  newSourceHead?: string;
  address?: string;
  /** Galat per anggota yang dipilih (kunci = residentId). */
  members: Record<number, string>;
}

export const emptySplitInput = (): SplitInput => ({
  newKk: "",
  effectiveDate: "",
  moves: [],
  newSourceHeadId: null,
  address: { enabled: false, address: "", rt: "", rw: "", hamlet: "" },
});

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Baca badan permintaan apa pun menjadi `SplitInput`; `null` bila bentuknya salah sama sekali. */
export function coerceSplitInput(body: unknown): SplitInput | null {
  if (!isObj(body) || !Array.isArray(body.moves)) return null;
  const moves: SplitMoveInput[] = [];
  for (const m of body.moves.slice(0, SPLIT_LIMITS.maxMoves + 1)) {
    if (!isObj(m)) return null;
    const residentId = Number(m.residentId);
    if (!Number.isInteger(residentId) || residentId <= 0) return null;
    moves.push({ residentId, familyRole: str(m.familyRole, 50).trim() });
  }
  const a = isObj(body.address) ? body.address : {};
  const head = body.newSourceHeadId == null || body.newSourceHeadId === "" ? null : Number(body.newSourceHeadId);
  return {
    newKk: str(body.newKk, 40),
    effectiveDate: str(body.effectiveDate, 10),
    moves,
    newSourceHeadId: head != null && Number.isInteger(head) && head > 0 ? head : null,
    address: {
      enabled: a.enabled === true,
      address: str(a.address, SPLIT_LIMITS.addressMax + 1).trim(),
      rt: str(a.rt, SPLIT_LIMITS.rtRwMax + 1).trim(),
      rw: str(a.rw, SPLIT_LIMITS.rtRwMax + 1).trim(),
      hamlet: str(a.hamlet, SPLIT_LIMITS.hamletMax + 1).trim(),
    },
  };
}

function parseIso(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const iso = toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null;
}

export const SPLIT_MESSAGES = {
  newKkFormat: "Nomor KK baru harus 16 angka.",
  newKkSame: "Nomor KK baru sama dengan KK sekarang.",
  newKkTaken: (name: string) =>
    `Nomor KK ini sudah dipakai di desa ini (atas nama ${name}). Untuk memindahkan warga ke KK yang sudah ada, pakai Mutasi › Perubahan KK.`,
  date: "Tanggal tidak valid.",
  dateFuture: "Tanggal tidak boleh di masa depan.",
  noMoves: "Pilih minimal satu anggota yang pindah ke KK baru.",
  tooMany: `Terlalu banyak anggota dipilih (maksimal ${SPLIT_LIMITS.maxMoves}).`,
  allMove: "Semua anggota aktif ikut pindah, jadi ini bukan pecah KK. Sisakan minimal satu orang di KK lama.",
  noNewHead: "KK baru butuh satu Kepala Keluarga. Pilih hubungan “Kepala Keluarga” untuk salah satu anggota.",
  manyNewHeads: "KK baru hanya boleh punya satu Kepala Keluarga.",
  sourceHeadLeaves: "Kepala Keluarga lama ikut pindah. Pilih Kepala Keluarga baru untuk KK lama dari anggota yang tinggal.",
  sourceHeadInvalid: "Kepala Keluarga baru untuk KK lama harus anggota aktif yang tinggal di KK lama.",
  role: "Pilih hubungan dalam KK baru.",
  addressRequired: "Alamat KK baru wajib diisi.",
} as const;

/** Periksa isian terhadap keadaan KK sekarang. Tidak menulis apa pun. */
export function validateSplit(input: SplitInput, ctx: SplitContext): SplitIssues {
  const issues: SplitIssues = { members: {} };

  const kk = normalizeKk(input.newKk);
  if (!kk) issues.newKk = SPLIT_MESSAGES.newKkFormat;
  else if (kk === ctx.sourceKk) issues.newKk = SPLIT_MESSAGES.newKkSame;
  else if (ctx.newKkTakenBy) issues.newKk = SPLIT_MESSAGES.newKkTaken(ctx.newKkTakenBy);

  const when = parseIso(input.effectiveDate);
  if (!when) issues.effectiveDate = SPLIT_MESSAGES.date;
  else if (when.getTime() > ctx.now.getTime()) issues.effectiveDate = SPLIT_MESSAGES.dateFuture;

  const byId = new Map(ctx.members.map((m) => [m.id, m]));
  if (input.moves.length === 0) issues.moves = SPLIT_MESSAGES.noMoves;
  else if (input.moves.length > SPLIT_LIMITS.maxMoves) issues.moves = SPLIT_MESSAGES.tooMany;

  const seen = new Set<number>();
  for (const mv of input.moves) {
    const m = byId.get(mv.residentId);
    if (!m) issues.members[mv.residentId] = "Bukan anggota KK ini.";
    else if (!m.active) issues.members[mv.residentId] = `${m.name} sudah meninggal atau pindah, tidak bisa dipindahkan.`;
    else if (seen.has(mv.residentId)) issues.members[mv.residentId] = `${m.name} dipilih lebih dari sekali.`;
    else if (!(FAMILY_ROLES as readonly string[]).includes(mv.familyRole)) issues.members[mv.residentId] = SPLIT_MESSAGES.role;
    seen.add(mv.residentId);
  }

  const moving = new Set(input.moves.map((m) => m.residentId));
  const activeAll = ctx.members.filter((m) => m.active);
  const remaining = activeAll.filter((m) => !moving.has(m.id));
  if (input.moves.length > 0 && activeAll.length > 0 && remaining.length === 0) issues.moves = SPLIT_MESSAGES.allMove;

  const heads = input.moves.filter((m) => m.familyRole === KK_HEAD_ROLE).length;
  if (input.moves.length > 0) {
    if (heads === 0) issues.heads = SPLIT_MESSAGES.noNewHead;
    else if (heads > 1) issues.heads = SPLIT_MESSAGES.manyNewHeads;
  }

  // KK lama kehilangan kepala hanya karena pindahan ini (bukan karena memang sudah tanpa kepala sebelumnya).
  const hadHead = activeAll.some((m) => m.familyRole === KK_HEAD_ROLE);
  const keepsHead = remaining.some((m) => m.familyRole === KK_HEAD_ROLE);
  if (hadHead && !keepsHead && remaining.length > 0) {
    if (input.newSourceHeadId == null) issues.newSourceHead = SPLIT_MESSAGES.sourceHeadLeaves;
    else if (!remaining.some((m) => m.id === input.newSourceHeadId)) issues.newSourceHead = SPLIT_MESSAGES.sourceHeadInvalid;
  }

  if (input.address.enabled) {
    const a = input.address;
    if (!a.address) issues.address = SPLIT_MESSAGES.addressRequired;
    else if (a.address.length > SPLIT_LIMITS.addressMax) issues.address = `Alamat terlalu panjang (maksimal ${SPLIT_LIMITS.addressMax} karakter).`;
    else if (a.rt.length > SPLIT_LIMITS.rtRwMax || a.rw.length > SPLIT_LIMITS.rtRwMax) issues.address = "RT/RW terlalu panjang.";
    else if (a.hamlet.length > SPLIT_LIMITS.hamletMax) issues.address = "Nama dusun terlalu panjang.";
  }

  return issues;
}

export function hasSplitIssues(i: SplitIssues): boolean {
  return Boolean(i.newKk || i.effectiveDate || i.moves || i.heads || i.newSourceHead || i.address || Object.keys(i.members).length);
}

/** `true` bila kepala lama ikut pindah sehingga KK lama harus diberi kepala baru. Dipakai UI untuk memunculkan pilihannya. */
export function sourceNeedsNewHead(members: readonly SplitMember[], movingIds: ReadonlySet<number>): boolean {
  const active = members.filter((m) => m.active);
  const remaining = active.filter((m) => !movingIds.has(m.id));
  return (
    remaining.length > 0 &&
    active.some((m) => m.familyRole === KK_HEAD_ROLE) &&
    !remaining.some((m) => m.familyRole === KK_HEAD_ROLE)
  );
}

/** Pesan galat pertama yang paling berguna untuk ditampilkan di atas formulir. */
export function firstIssue(i: SplitIssues): string {
  return i.newKk ?? i.effectiveDate ?? i.moves ?? i.heads ?? i.newSourceHead ?? i.address ?? Object.values(i.members)[0] ?? "Data pecah KK belum lengkap.";
}
