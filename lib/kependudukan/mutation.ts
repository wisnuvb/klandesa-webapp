/**
 * Mutasi penduduk (lahir, meninggal, pindah keluar, datang, perubahan KK) sebagai peristiwa yang tercatat.
 * Murni: validasi + rencana efek ke baris warga. Penerapan ke DB (transaksi, audit, akun mobile) ada di layer API.
 *
 * Semantik kolom lama dipertahankan agar kode yang ada tetap benar:
 *   meninggal = isAlive=false + deathDate; pindah keluar = moveDate terisi; datang kembali = moveDate dikosongkan.
 */
import { parseNikInfo, toIsoDate } from "../residents-import/nik-date";
import { KK_HEAD_ROLE, normalizeKk } from "./household";

export type MutationType = "BIRTH" | "DEATH" | "MOVE_OUT" | "MOVE_IN" | "KK_CHANGE";
export type MutationStatus = "PENDING" | "APPLIED" | "REJECTED" | "CANCELLED";
export type MutationSource = "web" | "mobile" | "import" | "legacy_edit";

export const MUTATION_LABEL: Record<MutationType, string> = {
  BIRTH: "Kelahiran",
  DEATH: "Kematian",
  MOVE_OUT: "Pindah keluar",
  MOVE_IN: "Datang / pindah masuk",
  KK_CHANGE: "Perubahan KK",
};

export interface NewResidentData {
  name?: string;
  nik?: string;
  gender?: "Laki-laki" | "Perempuan";
  birthplace?: string;
  birthDate?: string;
  kk?: string;
  familyRole?: string;
  fatherNik?: string;
  fatherName?: string;
  motherNik?: string;
  motherName?: string;
  rt?: string;
  rw?: string;
  hamlet?: string;
  address?: string;
  religion?: string;
  maritalStatus?: string;
}

export interface MutationDetails {
  /** BIRTH / MOVE_IN (warga baru) */
  newResident?: NewResidentData;
  /** DEATH */
  cause?: string;
  certificateNumber?: string;
  /** MOVE_OUT */
  destination?: string;
  reason?: string;
  /** MOVE_IN */
  origin?: string;
  /** KK_CHANGE */
  toKk?: string;
  newFamilyRole?: string;
}

export interface MutationInput {
  type: MutationType;
  /** yyyy-mm-dd: tanggal lahir / meninggal / pindah / datang / efektif perubahan KK. */
  effectiveDate: string;
  residentId?: number | null;
  details: MutationDetails;
}

export interface MutationResidentRef {
  id: number;
  isAlive: boolean;
  moveDate: Date | null;
  birthDate: Date | null;
  kk: string | null;
  familyRole: string;
}

export interface ResidentPatch {
  isAlive?: boolean;
  deathDate?: Date | null;
  moveDate?: Date | null;
  kk?: string;
  familyRole?: string;
}

export interface MutationEffect {
  /** Baris warga baru (BIRTH / MOVE_IN baru). */
  create?: NewResidentData & { isAlive: true };
  /** Perubahan pada warga yang sudah ada. */
  update?: ResidentPatch;
  /** Akun mobile warga harus dinonaktifkan (meninggal/pindah). */
  suspendAccount: boolean;
  /** Warga yang berubah adalah kepala keluarga aktif: KK perlu kepala baru. */
  householdNeedsNewHead: boolean;
}

export type Validation = { ok: true } | { ok: false; errors: string[] };

const ymd = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  return m ? toIsoDate(Number(m[1]), Number(m[2]), Number(m[3])) : null;
};
const toDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const left = (r: MutationResidentRef) => !r.isAlive || r.moveDate != null;

/** Siapa boleh mengajukan dan memutuskan (peran `users.role`). Pemutus tidak boleh sekaligus hanya "staff". */
export const MUTATION_SUBMIT_ROLES: ReadonlySet<string> = new Set(["admin", "secretary", "staff"]);
export const MUTATION_DECIDE_ROLES: ReadonlySet<string> = new Set(["admin", "secretary", "village_head"]);

function validateNewResident(n: NewResidentData | undefined, requireNik: boolean, errors: string[]) {
  if (!n) {
    errors.push("Data warga baru wajib diisi.");
    return;
  }
  if (!n.name?.trim()) errors.push("Nama wajib diisi.");
  if (n.gender !== "Laki-laki" && n.gender !== "Perempuan") errors.push("Jenis kelamin wajib diisi.");
  if (!n.birthplace?.trim()) errors.push("Tempat lahir wajib diisi.");
  if (!n.birthDate || !ymd(n.birthDate)) errors.push("Tanggal lahir tidak valid.");
  if (requireNik) {
    if (!/^\d{16}$/.test(n.nik ?? "")) errors.push("NIK wajib 16 digit.");
    else if (n.birthDate && ymd(n.birthDate)) {
      const info = parseNikInfo(n.nik!);
      if (info.birthDate && info.birthDate !== n.birthDate) errors.push("Tanggal lahir tidak cocok dengan NIK.");
      if (info.gender && n.gender && info.gender !== n.gender) errors.push("Jenis kelamin tidak cocok dengan NIK.");
    }
  } else if (n.nik && !/^\d{16}$/.test(n.nik)) {
    errors.push("NIK harus 16 digit bila diisi.");
  }
  if (n.kk && !normalizeKk(n.kk)) errors.push("Nomor KK harus 16 digit.");
}

/**
 * Validasi sebelum diajukan (`stage: "submit"`) atau diterapkan (`stage: "apply"`).
 * Kelahiran boleh diajukan tanpa NIK (menunggu akta/Dukcapil) tetapi tidak boleh diterapkan tanpa NIK.
 */
export function validateMutation(
  input: MutationInput,
  resident: MutationResidentRef | null,
  now: Date,
  stage: "submit" | "apply" = "apply",
): Validation {
  const errors: string[] = [];
  const iso = ymd(input.effectiveDate);
  if (!iso) errors.push("Tanggal kejadian tidak valid.");
  else if (toDate(iso).getTime() > now.getTime()) errors.push("Tanggal kejadian tidak boleh di masa depan.");

  const d = input.details ?? {};

  switch (input.type) {
    case "BIRTH": {
      if (input.residentId != null) errors.push("Kelahiran membuat warga baru, bukan menunjuk warga yang ada.");
      validateNewResident({ ...d.newResident, birthDate: d.newResident?.birthDate ?? input.effectiveDate }, stage === "apply", errors);
      const nr = d.newResident;
      if (nr?.birthDate && iso && nr.birthDate !== iso) errors.push("Tanggal lahir harus sama dengan tanggal kejadian.");
      if (!nr?.kk && !nr?.motherNik) errors.push("Tautkan ke KK atau NIK ibu.");
      break;
    }
    case "DEATH": {
      if (!resident) errors.push("Warga tidak ditemukan.");
      else {
        if (!resident.isAlive) errors.push("Warga sudah tercatat meninggal.");
        else if (resident.moveDate) errors.push("Warga sudah tercatat pindah keluar.");
        if (iso && resident.birthDate && toDate(iso).getTime() < resident.birthDate.getTime()) errors.push("Tanggal meninggal sebelum tanggal lahir.");
      }
      break;
    }
    case "MOVE_OUT": {
      if (!resident) errors.push("Warga tidak ditemukan.");
      else {
        if (!resident.isAlive) errors.push("Warga sudah tercatat meninggal.");
        else if (resident.moveDate) errors.push("Warga sudah tercatat pindah keluar.");
        if (iso && resident.birthDate && toDate(iso).getTime() < resident.birthDate.getTime()) errors.push("Tanggal pindah sebelum tanggal lahir.");
      }
      if (!d.destination?.trim()) errors.push("Tujuan pindah wajib diisi.");
      break;
    }
    case "MOVE_IN": {
      if (input.residentId != null) {
        if (!resident) errors.push("Warga tidak ditemukan.");
        else if (!resident.isAlive) errors.push("Warga tercatat meninggal, tidak bisa datang kembali.");
        else if (!resident.moveDate) errors.push("Warga ini tidak tercatat pindah keluar.");
      } else {
        validateNewResident(d.newResident, true, errors);
        if (!d.newResident?.kk) errors.push("Tentukan KK tujuan.");
      }
      if (!d.origin?.trim()) errors.push("Asal daerah wajib diisi.");
      break;
    }
    case "KK_CHANGE": {
      if (!resident) errors.push("Warga tidak ditemukan.");
      else {
        if (left(resident)) errors.push("Warga sudah meninggal/pindah.");
        const to = normalizeKk(d.toKk);
        if (!to) errors.push("Nomor KK tujuan harus 16 digit.");
        else if (to === resident.kk) errors.push("KK tujuan sama dengan KK sekarang.");
      }
      if (!d.newFamilyRole?.trim()) errors.push("Status hubungan dalam KK wajib diisi.");
      break;
    }
    default:
      errors.push("Jenis mutasi tidak dikenal.");
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

/** Efek ke data warga bila mutasi diterapkan. Mengasumsikan `validateMutation(..., "apply")` sudah lolos. */
export function planMutationEffect(input: MutationInput, resident: MutationResidentRef | null): MutationEffect {
  const when = toDate(ymd(input.effectiveDate) ?? input.effectiveDate);
  const d = input.details ?? {};
  const wasActiveHead = Boolean(resident && resident.familyRole === KK_HEAD_ROLE && !left(resident));

  switch (input.type) {
    case "BIRTH":
      return {
        create: { ...d.newResident, birthDate: input.effectiveDate, kk: normalizeKk(d.newResident?.kk) ?? undefined, familyRole: d.newResident?.familyRole || "Anak", isAlive: true },
        suspendAccount: false,
        householdNeedsNewHead: false,
      };
    case "DEATH":
      return { update: { isAlive: false, deathDate: when }, suspendAccount: true, householdNeedsNewHead: wasActiveHead };
    case "MOVE_OUT":
      return { update: { moveDate: when }, suspendAccount: true, householdNeedsNewHead: wasActiveHead };
    case "MOVE_IN":
      if (input.residentId != null) return { update: { moveDate: null }, suspendAccount: false, householdNeedsNewHead: false };
      return {
        create: { ...d.newResident, kk: normalizeKk(d.newResident?.kk) ?? undefined, familyRole: d.newResident?.familyRole || "Anak", isAlive: true },
        suspendAccount: false,
        householdNeedsNewHead: false,
      };
    case "KK_CHANGE":
      return {
        update: { kk: normalizeKk(d.toKk) ?? undefined, familyRole: d.newFamilyRole?.trim() },
        suspendAccount: false,
        // Kepala yang pindah ke KK lain meninggalkan KK lama tanpa kepala.
        householdNeedsNewHead: wasActiveHead,
      };
  }
}

export interface LegacyEditMutation {
  type: MutationType;
  effectiveDate: string;
  details: MutationDetails;
}

const isoOf = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

/**
 * Deteksi mutasi dari penyuntingan langsung kolom warga (PUT/PATCH lama), supaya laporan mutasi tetap utuh
 * walaupun operator belum memakai alur mutasi. Dicatat sebagai APPLIED dengan sumber `legacy_edit`.
 */
export function detectLegacyEditMutations(
  before: { isAlive: boolean; deathDate: Date | null; moveDate: Date | null; kk: string | null; familyRole: string },
  after: { isAlive: boolean; deathDate: Date | null; moveDate: Date | null; kk: string | null; familyRole: string },
  today: Date,
): LegacyEditMutation[] {
  const out: LegacyEditMutation[] = [];
  const fallback = today.toISOString().slice(0, 10);

  if (before.isAlive && !after.isAlive) {
    out.push({ type: "DEATH", effectiveDate: isoOf(after.deathDate) ?? fallback, details: {} });
  }
  if (!before.moveDate && after.moveDate) {
    out.push({ type: "MOVE_OUT", effectiveDate: isoOf(after.moveDate) ?? fallback, details: {} });
  }
  if (before.moveDate && !after.moveDate && after.isAlive) {
    out.push({ type: "MOVE_IN", effectiveDate: fallback, details: {} });
  }
  const bk = normalizeKk(before.kk);
  const ak = normalizeKk(after.kk);
  if (bk && ak && bk !== ak) {
    out.push({ type: "KK_CHANGE", effectiveDate: fallback, details: { toKk: ak, newFamilyRole: after.familyRole } });
  }
  return out;
}
