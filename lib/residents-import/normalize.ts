/**
 * Normalisasi + validasi satu baris warga. Dipakai identik oleh client (preview/edit sel) dan server (otoritatif).
 * Idempoten: menjalankan ulang pada nilai yang sudah ternormalisasi menghasilkan nilai yang sama.
 */
import { FIELD_IDS, FIELD_BY_ID, type FieldId, type Values } from "./fields";
import {
  isPlaceholderDate,
  parseDateLoose,
  parseLongNumber,
  parseNikInfo,
  splitBirthPlaceDate,
} from "./nik-date";
import { cleanText, digitsOnly, isPlaceholder } from "./text";
import {
  resolveBlood,
  resolveEducation,
  resolveFamilyRole,
  resolveGender,
  resolveJob,
  resolveMarital,
  resolveNationality,
  resolveReligion,
  resolveYesNo,
  type Resolved,
} from "./vocab";

export type IssueLevel = "error" | "warning" | "fixed";

export interface Issue {
  field: FieldId | "row";
  level: IssueLevel;
  message: string;
}

export interface NormalizeResult {
  values: Values;
  issues: Issue[];
}

export interface NormalizeOptions {
  now?: Date;
}

const MAX_LEN: Partial<Record<FieldId, number>> = {
  name: 255,
  birthplace: 255,
  rt: 10,
  rw: 10,
  temp_rt: 10,
  hamlet: 100,
  phone_number: 20,
  email: 255,
  father_name: 255,
  mother_name: 255,
  other_disability: 255,
  contraception: 100,
  country_code: 10,
  temp_id_number: 20,
  house_ownership: 100,
  desil: 50,
  education_id: 100,
  job_id: 255,
  religion_id: 50,
  marital_status: 50,
  status_family_id: 50,
  nationality: 50,
};

const pad2 = (n: string) => (n.length === 1 ? `0${n}` : n);

/** Nilai mentah sel → teks bersih (angka murni utuh, bukan notasi ilmiah). */
function textOf(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Number.isInteger(raw) ? raw.toLocaleString("fullwide", { useGrouping: false }) : String(raw);
  }
  return cleanText(raw);
}

function parseIntLoose(raw: unknown): number | null {
  const s = textOf(raw).replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function emptyValues(): Values {
  const v: Values = {};
  for (const id of FIELD_IDS) if (!FIELD_BY_ID[id].virtual) v[id] = "";
  return v;
}

export function normalizeRow(raw: Partial<Record<FieldId, unknown>>, opts: NormalizeOptions = {}): NormalizeResult {
  const now = opts.now ?? new Date();
  const out = emptyValues();
  const issues: Issue[] = [];
  const add = (field: Issue["field"], level: IssueLevel, message: string) => issues.push({ field, level, message });

  const src: Partial<Record<FieldId, unknown>> = { ...raw };

  // ── Kolom gabungan ──
  if (!isPlaceholder(src.birth_place_date)) {
    const sp = splitBirthPlaceDate(src.birth_place_date, now);
    if (isPlaceholder(src.birthplace) && sp.place) src.birthplace = sp.place;
    if (isPlaceholder(src.date_of_birth) && sp.date) src.date_of_birth = sp.date;
  }
  if (!isPlaceholder(src.rt_rw)) {
    const s = String(src.rt_rw);
    const m = s.match(/rt\D*(\d+)\D+rw\D*(\d+)/i) ?? s.match(/(\d+)\s*[/\\\-.\s]\s*(\d+)/);
    if (m) {
      if (isPlaceholder(src.rt)) src.rt = m[1];
      if (isPlaceholder(src.rw)) src.rw = m[2];
    }
  }

  // ── Nama ──
  const name = textOf(src.name);
  out.name = name;
  if (!name) add("name", "error", "Nama wajib diisi");
  else if (name.length > MAX_LEN.name!) add("name", "error", "Nama maksimal 255 karakter");

  // ── NIK ──
  const nikRaw = src.id_number;
  const pn = parseLongNumber(nikRaw);
  out.id_number = pn.nik;
  if (!pn.nik) {
    add("id_number", "error", "NIK wajib diisi");
  } else {
    if (pn.truncatedSuspect) {
      add("id_number", "warning", "NIK kemungkinan terpotong Excel (angka 16 digit berakhiran 0). Isi ulang sebagai teks.");
    }
    if (pn.nik.length !== 16) add("id_number", "error", `NIK harus 16 digit (terbaca ${pn.nik.length} digit)`);
  }
  const nikInfo = parseNikInfo(pn.nik, now);
  if (pn.nik.length === 16 && !nikInfo.birthDate) {
    add("id_number", "warning", "Bagian tanggal lahir pada NIK tidak valid");
  }

  // ── Jenis kelamin ──
  const genderRaw = textOf(src.gender);
  let gender = "";
  if (genderRaw) {
    const r = resolveGender(genderRaw);
    if (r) gender = r.value;
    else add("gender", "warning", `Jenis kelamin "${genderRaw}" tidak dikenali`);
  }
  if (!gender && nikInfo.gender) {
    gender = nikInfo.gender;
    add("gender", "fixed", `Jenis kelamin diisi dari NIK: ${gender}`);
  } else if (gender && nikInfo.gender && gender !== nikInfo.gender) {
    add("gender", "warning", `Jenis kelamin (${gender}) berbeda dengan NIK (${nikInfo.gender})`);
  }
  out.gender = gender;
  if (!gender) add("gender", "error", "Jenis kelamin wajib diisi (Laki-laki/Perempuan)");

  // ── Tanggal lahir ──
  const dobRaw = src.date_of_birth;
  const dobGiven = !isPlaceholder(dobRaw);
  let dob = dobGiven ? parseDateLoose(dobRaw, now) : null;
  let dobProblem = "";
  if (dobGiven && !dob) dobProblem = `Tanggal lahir "${textOf(dobRaw)}" tidak bisa dibaca`;
  else if (dob && isPlaceholderDate(dob)) {
    dobProblem = `Tanggal lahir ${dob} tampak placeholder`;
    dob = null;
  } else if (dob && new Date(`${dob}T00:00:00Z`).getTime() > now.getTime() + 86_400_000) {
    dobProblem = `Tanggal lahir ${dob} berada di masa depan`;
    dob = null;
  }
  if (!dob && nikInfo.birthDate) {
    dob = nikInfo.birthDate;
    add("date_of_birth", "fixed", `${dobProblem || "Tanggal lahir kosong"}; diisi dari NIK: ${dob}`);
  } else if (dob && nikInfo.birthDate && dob !== nikInfo.birthDate) {
    add("date_of_birth", "warning", `Tanggal lahir (${dob}) berbeda dengan NIK (${nikInfo.birthDate})`);
  }
  out.date_of_birth = dob ?? "";
  if (!dob) add("date_of_birth", "error", dobProblem || "Tanggal lahir wajib diisi");
  else if (now.getFullYear() - Number(dob.slice(0, 4)) > 120) add("date_of_birth", "warning", "Usia lebih dari 120 tahun");

  // ── Tempat lahir ──
  const place = textOf(src.birthplace);
  out.birthplace = place;
  if (!place) add("birthplace", "warning", "Tempat lahir kosong");
  else if (place.length > MAX_LEN.birthplace!) add("birthplace", "error", "Tempat lahir maksimal 255 karakter");

  // ── KK ──
  const kk = parseLongNumber(src.family_card_number).nik;
  out.family_card_number = kk;
  if (kk && kk.length > 16) add("family_card_number", "error", `No. KK maksimal 16 digit (terbaca ${kk.length})`);
  else if (kk && kk.length !== 16) add("family_card_number", "warning", `No. KK tidak 16 digit (terbaca ${kk.length})`);

  // ── Enumerasi baku ──
  const enumField = (
    id: FieldId,
    resolve: (v: unknown) => Resolved | null,
    label: string,
    keepRaw = true,
  ) => {
    const text = textOf(src[id]);
    if (!text) return;
    const r = resolve(text);
    if (r) {
      out[id] = r.value;
      if (r.how === "fuzzy") add(id, "fixed", `${label} "${text}" dibaca sebagai "${r.value}"`);
    } else {
      out[id] = keepRaw ? text : "";
      add(id, "warning", `${label} "${text}" tidak ada di daftar baku${keepRaw ? "" : "; dikosongkan"}`);
    }
  };
  enumField("religion_id", resolveReligion, "Agama");
  enumField("marital_status", resolveMarital, "Status perkawinan");
  enumField("status_family_id", resolveFamilyRole, "Status hubungan KK");
  enumField("education_id", resolveEducation, "Pendidikan");
  enumField("job_id", resolveJob, "Pekerjaan");

  // Golongan darah: kolom DB hanya 5 karakter, "Tidak Tahu" disimpan sebagai kosong.
  const bloodText = textOf(src.blood_type_id);
  if (bloodText) {
    const r = resolveBlood(bloodText);
    if (!r) add("blood_type_id", "warning", `Golongan darah "${bloodText}" tidak dikenali; dikosongkan`);
    else out.blood_type_id = r.value === "Tidak Tahu" ? "" : r.value;
  }

  const nat = textOf(src.nationality);
  if (nat) {
    const r = resolveNationality(nat);
    out.nationality = r ? r.value : nat;
  }

  // ── Alamat ──
  const hamlet = textOf(src.hamlet);
  const padRt = (raw: unknown): string => {
    if (typeof raw === "number" && Number.isFinite(raw)) return pad2(String(Math.trunc(raw)));
    const t = textOf(raw).replace(/^(rt|rw)\s*[.:]?\s*/i, "");
    return t;
  };
  const rt = padRt(src.rt);
  const rw = padRt(src.rw);
  out.hamlet = hamlet;
  out.rt = rt;
  out.rw = rw;
  out.temp_rt = padRt(src.temp_rt);
  for (const id of ["rt", "rw", "temp_rt"] as const) {
    if ((out[id] ?? "").length > MAX_LEN[id]!) add(id, "error", `${FIELD_BY_ID[id].label} maksimal 10 karakter`);
  }
  if (hamlet.length > MAX_LEN.hamlet!) add("hamlet", "error", "Dusun maksimal 100 karakter");

  let address = textOf(src.address);
  if (!address) {
    const parts: string[] = [];
    if (hamlet) parts.push(/^(dusun|dsn|dukuh)\b/i.test(hamlet) ? hamlet : `Dusun ${hamlet}`);
    if (rt) parts.push(`RT ${rt}`);
    if (rw) parts.push(`RW ${rw}`);
    if (parts.length) {
      address = parts.join(" ");
      add("address", "fixed", `Alamat disusun otomatis dari dusun/RT/RW: ${address}`);
    } else {
      add("address", "warning", "Alamat kosong");
    }
  }
  out.address = address;

  // ── Kontak ──
  let phone = digitsOnly(textOf(src.phone_number).replace(/^\+/, ""));
  if (phone) {
    if (phone.startsWith("62")) phone = `0${phone.slice(2)}`;
    else if (phone.startsWith("8")) phone = `0${phone}`;
    out.phone_number = phone;
    if (phone.length > MAX_LEN.phone_number!) add("phone_number", "error", "No. telepon maksimal 20 digit");
    else if (phone.length < 9) add("phone_number", "warning", "No. telepon terlalu pendek");
  }
  const email = textOf(src.email).toLowerCase();
  if (email) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255) out.email = email;
    else add("email", "warning", `Email "${email}" tidak valid; dikosongkan`);
  }

  // ── Keluarga ──
  for (const id of ["father_nik", "mother_nik"] as const) {
    const d = parseLongNumber(src[id]).nik;
    if (!d) continue;
    if (d.length === 16) out[id] = d;
    else add(id, "warning", `${FIELD_BY_ID[id].label} tidak 16 digit; dikosongkan`);
  }
  out.father_name = textOf(src.father_name);
  out.mother_name = textOf(src.mother_name);

  // ── Status hidup & tanggal ──
  const aliveText = textOf(src.is_alive);
  if (aliveText) {
    const n = aliveText.toLowerCase();
    if (/^(hidup|ada|aktif)$/.test(n)) out.is_alive = "Y";
    else if (/(meninggal|mati|wafat|almarhum)/.test(n)) out.is_alive = "N";
    else {
      const yn = resolveYesNo(aliveText);
      if (yn === null) add("is_alive", "warning", `Status hidup "${aliveText}" tidak dikenali`);
      else out.is_alive = yn ? "Y" : "N";
    }
  }
  for (const id of ["death_date", "move_date", "date_pregnant"] as const) {
    if (isPlaceholder(src[id])) continue;
    const iso = parseDateLoose(src[id], now);
    if (iso) out[id] = iso;
    else add(id, "warning", `${FIELD_BY_ID[id].label} "${textOf(src[id])}" tidak bisa dibaca; dikosongkan`);
  }

  // ── Ya/Tidak ──
  for (const id of ["is_illiterate", "is_disability", "is_pregnant", "is_breastfeeding", "is_stunting", "is_bpjs_kis"] as const) {
    const t = textOf(src[id]);
    if (!t && typeof src[id] !== "boolean") continue;
    const yn = resolveYesNo(src[id]);
    if (yn === null) add(id, "warning", `${FIELD_BY_ID[id].label}: "${t}" bukan Y/N; dikosongkan`);
    else out[id] = yn ? "Y" : "N";
  }

  // ── Angka ──
  for (const id of ["height", "weight", "income", "disability_id"] as const) {
    if (isPlaceholder(src[id])) continue;
    const n = parseIntLoose(src[id]);
    if (n === null) add(id, "warning", `${FIELD_BY_ID[id].label} "${textOf(src[id])}" bukan angka; dikosongkan`);
    else out[id] = String(n);
  }

  // ── Teks bebas ──
  for (const id of ["other_disability", "contraception", "cover", "cover_thumb", "photo", "photo_thumb", "country_code", "temp_id_number", "house_ownership", "desil"] as const) {
    const t = textOf(src[id]);
    out[id] = t;
    const max = MAX_LEN[id];
    if (max && t.length > max) add(id, "error", `${FIELD_BY_ID[id].label} maksimal ${max} karakter`);
  }
  for (const id of ["education_id", "job_id", "religion_id", "marital_status", "status_family_id", "nationality"] as const) {
    const max = MAX_LEN[id];
    if (max && (out[id] ?? "").length > max) add(id, "error", `${FIELD_BY_ID[id].label} maksimal ${max} karakter`);
  }

  return { values: out, issues };
}

export const rowHasError = (issues: Issue[]) => issues.some((i) => i.level === "error");

// ───────────────────────────── ke bentuk DB ─────────────────────────────

const yn = (v: string | undefined): boolean => v === "Y";
const nul = (v: string | undefined): string | null => (v ? v : null);
const int = (v: string | undefined): number | null => (v ? Number(v) : null);
const day = (v: string | undefined): Date | null => (v ? new Date(`${v}T00:00:00.000Z`) : null);

/** Nilai ternormalisasi → data Prisma `Resident` (tanpa villageId). */
export function toDbRecord(v: Values) {
  return {
    nik: v.id_number ?? "",
    kk: nul(v.family_card_number),
    name: v.name ?? "",
    birthplace: v.birthplace ?? "",
    birthDate: day(v.date_of_birth) ?? new Date(NaN),
    gender: v.gender ?? "",
    bloodType: nul(v.blood_type_id),
    religion: v.religion_id ?? "",
    maritalStatus: v.marital_status ?? "",
    familyRole: v.status_family_id ?? "",
    address: v.address ?? "",
    rt: nul(v.rt),
    rw: nul(v.rw),
    hamlet: nul(v.hamlet),
    occupation: nul(v.job_id),
    education: nul(v.education_id),
    nationality: v.nationality || "Indonesia",
    phone: nul(v.phone_number),
    email: nul(v.email),
    isAlive: v.is_alive ? v.is_alive === "Y" : true,
    moveDate: day(v.move_date),
    deathDate: day(v.death_date),
    fatherNik: nul(v.father_nik),
    fatherName: nul(v.father_name),
    motherNik: nul(v.mother_nik),
    motherName: nul(v.mother_name),
    isIlliterate: yn(v.is_illiterate),
    isDisability: yn(v.is_disability),
    disabilityId: int(v.disability_id),
    otherDisability: nul(v.other_disability),
    isPregnant: yn(v.is_pregnant),
    datePregnant: day(v.date_pregnant),
    isBreastfeeding: yn(v.is_breastfeeding),
    isStunting: yn(v.is_stunting),
    isBpjsKis: yn(v.is_bpjs_kis),
    contraception: nul(v.contraception),
    height: int(v.height),
    weight: int(v.weight),
    income: int(v.income),
    cover: nul(v.cover),
    coverThumb: nul(v.cover_thumb),
    photo: nul(v.photo),
    photoThumb: nul(v.photo_thumb),
    countryCode: nul(v.country_code),
    tempIdNumber: nul(v.temp_id_number),
    tempRt: nul(v.temp_rt),
    houseOwnership: nul(v.house_ownership),
    desil: nul(v.desil),
  };
}

export type DbRecord = ReturnType<typeof toDbRecord>;
