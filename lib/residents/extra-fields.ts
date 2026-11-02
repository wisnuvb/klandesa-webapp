/**
 * Field warga tambahan (suku, status penduduk, akta, KTP-el, perkawinan, dokumen WNA).
 * Murni: dipakai bersama POST/PUT/PATCH `/api/residents` supaya aturan validasinya satu.
 * Semantik parsial: kunci yang tidak ada di body tidak disentuh; string kosong/null mengosongkan kolom.
 */
import { cleanText, isRecord } from "../form-input";
import { ETHNICITY_MAX_LENGTH, normalizeEthnicity } from "./ethnicity";

export const RESIDENCY_STATUS_LABEL = {
  TETAP: "Penduduk tetap",
  TIDAK_TETAP: "Penduduk tidak tetap (sementara)",
} as const;
export type ResidencyStatus = keyof typeof RESIDENCY_STATUS_LABEL;

export const KTP_STATUS_LABEL = {
  BELUM_WAJIB: "Belum wajib (di bawah 17 tahun)",
  BELUM_REKAM: "Belum rekam",
  SUDAH_REKAM: "Sudah rekam",
  SUDAH_CETAK: "KTP-el sudah dicetak",
} as const;
export type KtpStatus = keyof typeof KTP_STATUS_LABEL;

export interface ExtraFieldsData {
  ethnicity?: string | null;
  residencyStatus?: ResidencyStatus | null;
  arrivalDate?: Date | null;
  originAddress?: string | null;
  birthCertNo?: string | null;
  ktpStatus?: KtpStatus | null;
  marriageDate?: Date | null;
  marriageCertNo?: string | null;
  passportNo?: string | null;
  kitasNo?: string | null;
}

export const EXTRA_FIELD_KEYS = [
  "ethnicity", "residencyStatus", "arrivalDate", "originAddress", "birthCertNo",
  "ktpStatus", "marriageDate", "marriageCertNo", "passportNo", "kitasNo",
] as const satisfies ReadonlyArray<keyof ExtraFieldsData>;

const TEXT_LIMITS = { originAddress: 500, birthCertNo: 50, marriageCertNo: 50, passportNo: 30, kitasNo: 30 } as const;
const TEXT_LABEL: Record<keyof typeof TEXT_LIMITS, string> = {
  originAddress: "Alamat asal",
  birthCertNo: "Nomor akta kelahiran",
  marriageCertNo: "Nomor akta perkawinan",
  passportNo: "Nomor paspor",
  kitasNo: "Nomor KITAS/KITAP",
};

/** "YYYY-MM-DD" (atau ISO penuh dari klien) yang benar-benar ada di kalender → tengah malam UTC. */
function parseDay(raw: unknown): Date | null | "invalid" {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return "invalid";
  const m = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(raw.trim());
  if (!m) return "invalid";
  const d = new Date(`${m[1]}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== m[1] ? "invalid" : d;
}

export type ExtraFieldsResult = { ok: true; data: ExtraFieldsData } | { ok: false; error: string };

export function parseExtraFields(body: unknown, now: Date = new Date()): ExtraFieldsResult {
  if (!isRecord(body)) return { ok: true, data: {} };
  const data: ExtraFieldsData = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined;

  if (has("ethnicity")) {
    const raw = body.ethnicity;
    if (raw !== null && typeof raw !== "string") return { ok: false, error: "Suku tidak valid." };
    const v = normalizeEthnicity(raw);
    if (v && v.length > ETHNICITY_MAX_LENGTH) return { ok: false, error: `Suku maksimal ${ETHNICITY_MAX_LENGTH} karakter.` };
    data.ethnicity = v;
  }

  if (has("residencyStatus")) {
    const v = body.residencyStatus;
    if (v === null || v === "") data.residencyStatus = null;
    else if (typeof v === "string" && Object.prototype.hasOwnProperty.call(RESIDENCY_STATUS_LABEL, v)) data.residencyStatus = v as ResidencyStatus;
    else return { ok: false, error: "Status penduduk tidak valid." };
  }

  if (has("ktpStatus")) {
    const v = body.ktpStatus;
    if (v === null || v === "") data.ktpStatus = null;
    else if (typeof v === "string" && Object.prototype.hasOwnProperty.call(KTP_STATUS_LABEL, v)) data.ktpStatus = v as KtpStatus;
    else return { ok: false, error: "Status KTP-el tidak valid." };
  }

  for (const k of ["arrivalDate", "marriageDate"] as const) {
    if (!has(k)) continue;
    const d = parseDay(body[k]);
    const label = k === "arrivalDate" ? "Tanggal datang" : "Tanggal perkawinan";
    if (d === "invalid") return { ok: false, error: `${label} tidak valid.` };
    if (d && d.getTime() > now.getTime() + 86_400_000) return { ok: false, error: `${label} tidak boleh di masa depan.` };
    data[k] = d;
  }

  for (const k of Object.keys(TEXT_LIMITS) as Array<keyof typeof TEXT_LIMITS>) {
    if (!has(k)) continue;
    const t = cleanText(body[k], TEXT_LIMITS[k]);
    if (t.bad) return { ok: false, error: `${TEXT_LABEL[k]} tidak valid.` };
    if (t.tooLong) return { ok: false, error: `${TEXT_LABEL[k]} maksimal ${TEXT_LIMITS[k]} karakter.` };
    data[k] = t.value;
  }

  return { ok: true, data };
}

const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[_\-./]+/g, " ").replace(/\s+/g, " ").trim();

/** Teks bebas dari Excel ("Tetap", "Sementara", "Pendatang") → kode; tidak dikenali → null. Idempoten pada kode. */
export function resolveResidencyStatus(raw: unknown): ResidencyStatus | null {
  const t = norm(raw);
  if (!t) return null;
  if (/(tidak tetap|sementara|musiman|pendatang|kontrak|kos|kost|non permanen)/.test(t)) return "TIDAK_TETAP";
  if (/(tetap|permanen|asli|warga desa)/.test(t)) return "TETAP";
  return null;
}

/** Teks bebas status perekaman KTP-el → kode; tidak dikenali → null. Idempoten pada kode. */
export function resolveKtpStatus(raw: unknown): KtpStatus | null {
  const t = norm(raw);
  if (!t) return null;
  if (/(belum wajib|di bawah 17|dibawah 17|\b17 tahun)/.test(t) || t === "belum wajib") return "BELUM_WAJIB";
  if (/belum (di ?)?cetak|suket|surat keterangan/.test(t)) return "SUDAH_REKAM";
  if (/belum.*(rekam|merekam)|blm.*rekam/.test(t)) return "BELUM_REKAM";
  if (/cetak|terbit|jadi/.test(t)) return "SUDAH_CETAK";
  if (/rekam/.test(t)) return "SUDAH_REKAM";
  return null;
}
