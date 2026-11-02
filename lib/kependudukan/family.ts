/**
 * Wizard "Tambah Keluarga": satu KK dengan banyak anggota dimasukkan sekaligus. Murni (aman di klien dan server):
 * validasi tingkat-keluarga, penurunan data orang tua dari peran, dan pemetaan ke baris warga.
 * Semua-atau-tidak-sama-sekali: satu keluarga yang bermasalah tidak boleh tersimpan setengah.
 */
import { BLOOD_TYPE_OPTIONS, KK_RELATIONSHIP_STATUS, MARITAL_STATUS_OPTIONS, NATIONALITY_OPTIONS, RELIGION_OPTIONS } from "../../utils/constants/user";
import { parseNikInfo } from "../residents-import/nik-date";
import { normalizeEthnicity, ETHNICITY_MAX_LENGTH } from "../residents/ethnicity";
import { KTP_STATUS_LABEL, RESIDENCY_STATUS_LABEL, type KtpStatus, type ResidencyStatus } from "../residents/extra-fields";
import { normalizeGender, type Gender } from "../residents/gender";
import { KK_HEAD_ROLE, normalizeKk } from "./household";

export const FAMILY_LIMITS = { maxMembers: 25 } as const;

export type MemberEvent = "NONE" | "BIRTH" | "MOVE_IN";
export const MEMBER_EVENT_LABEL: Record<MemberEvent, string> = {
  NONE: "Data awal (sudah tinggal di desa)",
  BIRTH: "Kelahiran baru",
  MOVE_IN: "Datang dari luar desa",
};

export interface FamilyHeader {
  kk: string;
  address: string;
  rt: string;
  rw: string;
  hamlet: string;
  /** Keluarga yang baru datang dari luar desa (dasar kategori "Datang" pada laporan LAMPID). */
  arrival: { enabled: boolean; date: string; origin: string; residencyStatus: ResidencyStatus };
}

export interface FamilyMemberInput {
  familyRole: string;
  name: string;
  nik: string;
  gender: string;
  birthplace: string;
  /** yyyy-mm-dd */
  birthDate: string;
  religion: string;
  maritalStatus: string;
  education: string;
  occupation: string;
  bloodType: string;
  nationality: string;
  ethnicity: string;
  fatherName: string;
  fatherNik: string;
  motherName: string;
  motherNik: string;
  birthCertNo: string;
  ktpStatus: string;
  event: MemberEvent;
}

export interface FamilyInput {
  header: FamilyHeader;
  members: FamilyMemberInput[];
}

export const emptyHeader = (): FamilyHeader => ({
  kk: "", address: "", rt: "", rw: "", hamlet: "",
  arrival: { enabled: false, date: "", origin: "", residencyStatus: "TETAP" },
});

export const emptyMember = (over: Partial<FamilyMemberInput> = {}): FamilyMemberInput => ({
  familyRole: "", name: "", nik: "", gender: "", birthplace: "", birthDate: "", religion: "", maritalStatus: "",
  education: "", occupation: "", bloodType: "", nationality: "WNI", ethnicity: "", fatherName: "", fatherNik: "",
  motherName: "", motherNik: "", birthCertNo: "", ktpStatus: "", event: "NONE", ...over,
});

export interface FamilyIssues {
  header: Record<string, string>;
  members: Array<Record<string, string>>;
  /** Masalah tingkat keluarga yang tidak melekat pada satu kolom. */
  general: string[];
  /** Tidak memblokir; perlu dibaca operator sebelum menyimpan. */
  warnings: Array<{ index: number | null; message: string }>;
}

export const hasBlockingIssues = (i: FamilyIssues): boolean =>
  Object.keys(i.header).length > 0 || i.general.length > 0 || i.members.some((m) => Object.keys(m).length > 0);

/** Konteks yang hanya diketahui server (KK sudah ada di desa?). */
export interface FamilyContext {
  existing?: { hasHead: boolean } | null;
  now?: Date;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
export function parseIsoDay(raw: string): Date | null {
  const m = ISO.exec(raw);
  if (!m) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw ? null : d;
}
const DAY = 86_400_000;
const isFuture = (d: Date, now: Date) => d.getTime() > now.getTime() + DAY;
const clean = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");
const digits = (s: unknown) => (typeof s === "string" ? s.replace(/\D/g, "") : "");

/** Jenis kelamin baku dari isian bebas (null bila belum diisi/tak dikenal). */
export const normalizeGenderOf = (v: string): Gender | null => normalizeGender(v);

export const inKeys = (rec: Record<string, string>, v: string) => Object.prototype.hasOwnProperty.call(rec, v);

/** Tanggal lahir dan jenis kelamin yang tersirat dari NIK, atau null bila NIK belum 16 digit sah. */
export function inferFromNik(nik: string, now: Date = new Date()): { birthDate: string; gender: Gender } | null {
  const info = parseNikInfo(digits(nik), now);
  return info.birthDate && info.gender ? { birthDate: info.birthDate, gender: info.gender } : null;
}

/**
 * Isi ayah/ibu anggota "Anak" dari peran yang ada di keluarga yang sama (hanya bila kosong).
 * Ayah = Suami, atau Kepala Keluarga laki-laki; Ibu = Istri, atau Kepala Keluarga perempuan.
 */
export function deriveParents(members: readonly FamilyMemberInput[]): { members: FamilyMemberInput[]; filled: number[] } {
  const head = members.find((m) => m.familyRole === KK_HEAD_ROLE);
  const husband = members.find((m) => m.familyRole === "Suami");
  const wife = members.find((m) => m.familyRole === "Istri");
  const father = husband ?? (head && normalizeGender(head.gender) === "Laki-laki" ? head : undefined);
  const mother = wife ?? (head && normalizeGender(head.gender) === "Perempuan" ? head : undefined);
  const filled: number[] = [];
  const out = members.map((m, i) => {
    if (m.familyRole !== "Anak") return m;
    const next = { ...m };
    let changed = false;
    if (father && !clean(m.fatherName) && !digits(m.fatherNik) && clean(father.name)) {
      next.fatherName = clean(father.name);
      next.fatherNik = digits(father.nik);
      changed = true;
    }
    if (mother && !clean(m.motherName) && !digits(m.motherNik) && clean(mother.name)) {
      next.motherName = clean(mother.name);
      next.motherNik = digits(mother.nik);
      changed = true;
    }
    if (changed) filled.push(i);
    return next;
  });
  return { members: out, filled };
}

export function validateFamily(input: FamilyInput, ctx: FamilyContext = {}): FamilyIssues {
  const now = ctx.now ?? new Date();
  const issues: FamilyIssues = { header: {}, members: input.members.map(() => ({})), general: [], warnings: [] };
  const h = input.header;
  const warn = (index: number | null, message: string) => issues.warnings.push({ index, message });

  if (!normalizeKk(h.kk)) issues.header.kk = "No. KK harus 16 digit angka.";
  const address = clean(h.address);
  if (!address) issues.header.address = "Alamat wajib diisi.";
  else if (address.length > 500) issues.header.address = "Alamat maksimal 500 karakter.";
  if (clean(h.rt).length > 10) issues.header.rt = "RT maksimal 10 karakter.";
  if (clean(h.rw).length > 10) issues.header.rw = "RW maksimal 10 karakter.";
  if (clean(h.hamlet).length > 100) issues.header.hamlet = "Dusun maksimal 100 karakter.";

  let arrivalDate: Date | null = null;
  if (h.arrival.enabled) {
    arrivalDate = parseIsoDay(h.arrival.date);
    if (!arrivalDate) issues.header.arrivalDate = "Isi tanggal datang.";
    else if (isFuture(arrivalDate, now)) issues.header.arrivalDate = "Tanggal datang tidak boleh di masa depan.";
    if (clean(h.arrival.origin).length > 500) issues.header.arrivalOrigin = "Alamat asal maksimal 500 karakter.";
    if (!inKeys(RESIDENCY_STATUS_LABEL as Record<string, string>, h.arrival.residencyStatus)) issues.header.arrivalStatus = "Pilih status kependudukan.";
  }

  if (input.members.length === 0) issues.general.push("Tambahkan minimal satu anggota keluarga.");
  if (input.members.length > FAMILY_LIMITS.maxMembers) issues.general.push(`Maksimal ${FAMILY_LIMITS.maxMembers} anggota per keluarga.`);

  const seenNik = new Map<string, number>();
  input.members.forEach((m, i) => {
    const e = issues.members[i];
    if (!inKeys(KK_RELATIONSHIP_STATUS, m.familyRole)) e.familyRole = "Pilih hubungan dalam KK.";
    const name = clean(m.name);
    if (!name) e.name = "Nama wajib diisi.";
    else if (name.length > 255) e.name = "Nama maksimal 255 karakter.";

    const nik = digits(m.nik);
    if (nik.length !== 16) e.nik = "NIK harus 16 digit angka.";
    else if (seenNik.has(nik)) e.nik = `NIK sama dengan anggota nomor ${(seenNik.get(nik) ?? 0) + 1}.`;
    else seenNik.set(nik, i);

    const gender = normalizeGender(m.gender);
    if (!gender) e.gender = "Pilih jenis kelamin.";
    if (!clean(m.birthplace)) e.birthplace = "Tempat lahir wajib diisi.";
    else if (clean(m.birthplace).length > 255) e.birthplace = "Tempat lahir maksimal 255 karakter.";

    const birth = parseIsoDay(m.birthDate);
    if (!birth) e.birthDate = "Isi tanggal lahir yang benar.";
    else if (isFuture(birth, now)) e.birthDate = "Tanggal lahir tidak boleh di masa depan.";
    else if (birth.getUTCFullYear() < 1880) e.birthDate = "Tanggal lahir terlalu lama.";

    if (!inKeys(RELIGION_OPTIONS, m.religion)) e.religion = "Pilih agama.";
    if (!inKeys(MARITAL_STATUS_OPTIONS, m.maritalStatus)) e.maritalStatus = "Pilih status perkawinan.";
    if (m.bloodType && !inKeys(BLOOD_TYPE_OPTIONS, m.bloodType)) e.bloodType = "Golongan darah tidak dikenal.";
    if (m.nationality && !inKeys(NATIONALITY_OPTIONS, m.nationality)) e.nationality = "Pilih WNI atau WNA.";
    if (clean(m.education).length > 100) e.education = "Pendidikan maksimal 100 karakter.";
    if (clean(m.occupation).length > 255) e.occupation = "Pekerjaan maksimal 255 karakter.";
    const eth = normalizeEthnicity(m.ethnicity);
    if (eth && eth.length > ETHNICITY_MAX_LENGTH) e.ethnicity = `Suku maksimal ${ETHNICITY_MAX_LENGTH} karakter.`;
    for (const k of ["fatherNik", "motherNik"] as const) {
      const v = digits(m[k]);
      if (v && v.length !== 16) e[k] = "NIK orang tua harus 16 digit angka.";
    }
    for (const k of ["fatherName", "motherName"] as const) if (clean(m[k]).length > 255) e[k] = "Nama maksimal 255 karakter.";
    if (clean(m.birthCertNo).length > 50) e.birthCertNo = "Nomor akta maksimal 50 karakter.";
    if (m.ktpStatus && !inKeys(KTP_STATUS_LABEL as Record<string, string>, m.ktpStatus)) e.ktpStatus = "Status KTP-el tidak dikenal.";
    if (m.event !== "NONE" && m.event !== "BIRTH" && m.event !== "MOVE_IN") e.event = "Kejadian tidak dikenal.";
    if (m.event === "MOVE_IN" && !h.arrival.enabled) e.event = "Isi data kedatangan keluarga (langkah 1) untuk mencatat sebagai datang.";

    // Peringatan: tidak memblokir.
    const info = nik.length === 16 ? inferFromNik(nik, now) : null;
    if (info && birth && info.birthDate !== m.birthDate) warn(i, `Tanggal lahir (${m.birthDate}) berbeda dengan yang tersirat dari NIK (${info.birthDate}).`);
    if (info && gender && info.gender !== gender) warn(i, `Jenis kelamin (${gender}) berbeda dengan yang tersirat dari NIK (${info.gender}).`);
    if (m.familyRole === "Suami" && gender === "Perempuan") warn(i, "Hubungan 'Suami' tetapi jenis kelamin perempuan.");
    if (m.familyRole === "Istri" && gender === "Laki-laki") warn(i, "Hubungan 'Istri' tetapi jenis kelamin laki-laki.");
    if ((m.familyRole === "Suami" || m.familyRole === "Istri") && m.maritalStatus === "Belum Menikah") warn(i, `Hubungan '${m.familyRole}' tetapi status perkawinan 'Belum Menikah'.`);
    if (m.event === "BIRTH" && birth && now.getTime() - birth.getTime() > 366 * DAY) warn(i, "Dicatat sebagai kelahiran baru, tetapi lahir lebih dari setahun lalu.");
    if (m.event === "NONE" && birth && now.getTime() - birth.getTime() < 30 * DAY && !ctx.existing) warn(i, "Lahir kurang dari 30 hari lalu. Pilih 'Kelahiran baru' bila ingin tercatat pada laporan Lahir.");
  });

  // Kepala keluarga.
  const heads = input.members.map((m, i) => (m.familyRole === KK_HEAD_ROLE ? i : -1)).filter((i) => i >= 0);
  if (ctx.existing?.hasHead) {
    for (const i of heads) issues.members[i].familyRole = "KK ini sudah punya Kepala Keluarga. Pilih hubungan lain.";
  } else if (heads.length > 1) {
    for (const i of heads.slice(1)) issues.members[i].familyRole = "Satu KK hanya punya satu Kepala Keluarga.";
  } else if (heads.length === 0 && input.members.length > 0 && !ctx.existing) {
    issues.general.push("Pilih satu anggota sebagai Kepala Keluarga.");
  } else if (heads.length === 0 && ctx.existing && !ctx.existing.hasHead) {
    warn(null, "KK ini belum punya Kepala Keluarga. Pertimbangkan menetapkan salah satu anggota sebagai kepala.");
  }

  // Usia anak terhadap orang tua.
  const headBirth = heads.length ? parseIsoDay(input.members[heads[0]].birthDate) : null;
  if (headBirth) {
    if (now.getUTCFullYear() - headBirth.getUTCFullYear() < 17) warn(heads[0], "Kepala Keluarga berusia di bawah 17 tahun.");
    input.members.forEach((m, i) => {
      const b = parseIsoDay(m.birthDate);
      if (m.familyRole === "Anak" && b && b.getTime() - headBirth.getTime() < 12 * 365 * DAY) warn(i, "Anak lebih tua atau hanya terpaut kurang dari 12 tahun dari Kepala Keluarga.");
    });
  }
  return issues;
}

/** Data satu baris warga siap tulis (tanpa villageId). Memakai nilai yang sudah lolos `validateFamily`. */
export function toResidentData(header: FamilyHeader, m: FamilyMemberInput) {
  const arrival = header.arrival.enabled ? parseIsoDay(header.arrival.date) : null;
  const moveIn = m.event === "MOVE_IN" && arrival;
  const nz = (s: string) => clean(s) || null;
  return {
    nik: digits(m.nik),
    kk: normalizeKk(header.kk) as string,
    name: clean(m.name),
    birthplace: clean(m.birthplace),
    birthDate: parseIsoDay(m.birthDate) as Date,
    gender: normalizeGender(m.gender) as Gender,
    bloodType: nz(m.bloodType),
    religion: m.religion,
    maritalStatus: m.maritalStatus,
    familyRole: m.familyRole,
    address: clean(header.address),
    rt: nz(header.rt),
    rw: nz(header.rw),
    hamlet: nz(header.hamlet),
    occupation: nz(m.occupation),
    education: nz(m.education),
    nationality: m.nationality || "WNI",
    fatherNik: digits(m.fatherNik) || null,
    fatherName: nz(m.fatherName),
    motherNik: digits(m.motherNik) || null,
    motherName: nz(m.motherName),
    isAlive: true,
    ethnicity: normalizeEthnicity(m.ethnicity),
    residencyStatus: header.arrival.enabled ? (header.arrival.residencyStatus as ResidencyStatus) : null,
    arrivalDate: moveIn ? arrival : null,
    originAddress: header.arrival.enabled ? nz(header.arrival.origin) : null,
    birthCertNo: nz(m.birthCertNo),
    ktpStatus: (m.ktpStatus || null) as KtpStatus | null,
  };
}

const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : "");

/**
 * Bentuk masukan mentah dari API menjadi `FamilyInput` yang semua kolomnya string (tidak pernah melempar).
 * Jumlah anggota dipotong di batas + 1 supaya validasi tetap bisa melaporkan "terlalu banyak".
 */
export function coerceFamilyInput(body: unknown): FamilyInput | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const h = (typeof b.header === "object" && b.header !== null ? b.header : {}) as Record<string, unknown>;
  const a = (typeof h.arrival === "object" && h.arrival !== null ? h.arrival : {}) as Record<string, unknown>;
  if (!Array.isArray(b.members)) return null;
  const base = emptyMember();
  const members = b.members.slice(0, FAMILY_LIMITS.maxMembers + 1).map((raw): FamilyMemberInput => {
    const m = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const out = { ...base } as FamilyMemberInput;
    for (const k of Object.keys(base) as Array<keyof FamilyMemberInput>) {
      if (k === "event") continue;
      (out[k] as string) = str(m[k]);
    }
    if (!out.nationality) out.nationality = "WNI";
    out.event = m.event === "BIRTH" || m.event === "MOVE_IN" ? m.event : "NONE";
    return out;
  });
  return {
    header: {
      kk: str(h.kk), address: str(h.address), rt: str(h.rt), rw: str(h.rw), hamlet: str(h.hamlet),
      arrival: { enabled: a.enabled === true, date: str(a.date), origin: str(a.origin), residencyStatus: a.residencyStatus === "TIDAK_TETAP" ? "TIDAK_TETAP" : "TETAP" },
    },
    members,
  };
}
