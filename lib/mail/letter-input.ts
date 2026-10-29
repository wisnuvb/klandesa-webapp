/** Validasi input pembuatan/penyuntingan surat (`MailService`) dari klien. */

export const LETTER_LIMITS = {
  requestBytes: 400_000,
  formKeys: 400,
  formKeyLength: 80,
  formValueLength: 5_000,
  formTotalChars: 200_000,
  letterNumberLength: 255,
  applicantNameLength: 255,
  applicantNikLength: 16,
  signerNameLength: 255,
} as const;

export const LETTER_STATUSES = ["draft", "completed", "archived"] as const;
export type LetterStatus = (typeof LETTER_STATUSES)[number];

export type InputResult<T> = { ok: true; value: T } | { ok: false; error: string };

const KEY_RE = /^[A-Za-z0-9_]{1,80}$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export function cleanLine(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.replace(CONTROL_RE, "").trim();
  return t.length > max ? null : t;
}

/** `formData`: objek datar string→string dengan kunci/ukuran berbatas. Angka/boolean dijadikan string. */
export function sanitizeFormData(input: unknown): InputResult<Record<string, string>> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "formData harus berupa objek" };
  }
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > LETTER_LIMITS.formKeys) {
    return { ok: false, error: "Terlalu banyak isian pada surat" };
  }
  const out: Record<string, string> = {};
  let total = 0;
  for (const [key, raw] of entries) {
    if (!KEY_RE.test(key) || FORBIDDEN_KEYS.has(key)) {
      return { ok: false, error: `Nama isian tidak valid: ${key.slice(0, 40)}` };
    }
    let value: string;
    if (raw == null) value = "";
    else if (typeof raw === "string") value = raw;
    else if (typeof raw === "number" || typeof raw === "boolean") value = String(raw);
    else return { ok: false, error: `Isian ${key} harus berupa teks` };
    value = value.replace(CONTROL_RE, "");
    if (value.length > LETTER_LIMITS.formValueLength) {
      return { ok: false, error: `Isian ${key} terlalu panjang` };
    }
    total += key.length + value.length;
    if (total > LETTER_LIMITS.formTotalChars) {
      return { ok: false, error: "Data surat terlalu besar" };
    }
    out[key] = value;
  }
  return { ok: true, value: out };
}

export function parseLetterStatus(raw: unknown): LetterStatus | null {
  return typeof raw === "string" && (LETTER_STATUSES as readonly string[]).includes(raw)
    ? (raw as LetterStatus)
    : null;
}

/** Tanggal surat: terima ISO/tanggal yang bisa di-parse; tolak `Invalid Date`. */
export function parseLetterDate(raw: unknown): Date | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseSignerRole(raw: unknown): string | null {
  return typeof raw === "string" && /^[a-z_]{1,50}$/.test(raw) ? raw : null;
}
