import { createHash, randomInt } from "crypto";

/** Helper murni untuk akun warga (tanpa DB) agar mudah dites. Spesifikasi: docs/MOBILE_V2_PRODUCT_SPEC.md §4.1. */

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "klandesa", "desa", "support", "root", "system", "official", "resmi", "pemdes",
]);

export type Validation<T> = { ok: true; value: T } | { ok: false; message: string };

export function validateUsername(raw: unknown): Validation<string> {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v.length < 4 || v.length > 30) return { ok: false, message: "Username 4–30 karakter." };
  if (!/^[a-z0-9._]+$/.test(v)) return { ok: false, message: "Username hanya boleh huruf kecil, angka, titik, dan garis bawah." };
  if (/^[._]|[._]$/.test(v) || /[._]{2}/.test(v)) return { ok: false, message: "Username tidak boleh diawali/diakhiri atau berisi tanda baca berurutan." };
  if (RESERVED_USERNAMES.has(v)) return { ok: false, message: "Username ini tidak tersedia." };
  return { ok: true, value: v };
}

const COMMON_PASSWORDS = new Set([
  "password", "password1", "12345678", "123456789", "1234567890", "qwertyui", "qwerty123", "11111111",
  "00000000", "abcd1234", "iloveyou", "sayang123", "indonesia", "passw0rd", "kataSandi".toLowerCase(),
]);

/** Min 8, maks 72 byte (batas bcrypt), bukan password umum, bukan sama dengan username/NIK. */
export function validatePassword(raw: unknown, ctx: { username?: string; nik?: string } = {}): Validation<string> {
  const v = typeof raw === "string" ? raw : "";
  if (v.length < 8) return { ok: false, message: "Password minimal 8 karakter." };
  if (Buffer.byteLength(v, "utf8") > 72) return { ok: false, message: "Password terlalu panjang (maks 72 karakter)." };
  const lower = v.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || /^(.)\1+$/.test(v) || /^\d+$/.test(v) && new Set(v).size <= 2) {
    return { ok: false, message: "Password terlalu mudah ditebak. Coba kombinasi lain." };
  }
  if (ctx.username && lower === ctx.username.toLowerCase()) return { ok: false, message: "Password tidak boleh sama dengan username." };
  if (ctx.nik && v.includes(ctx.nik)) return { ok: false, message: "Password tidak boleh memuat NIK Anda." };
  return { ok: true, value: v };
}

export function normalizeNik(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, "").trim() : "";
}

export function isValidNik(nik: string): boolean {
  return /^[0-9]{16}$/.test(nik);
}

export { normalizePersonName, namesMatch } from "./person-name";

export function parseYmd(raw: unknown): { y: number; m: number; d: number } | null {
  if (typeof raw !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

/** Tanggal lahir di DB bisa tersimpan 00:00 UTC atau 00:00 WIB; cocokkan di kedua tafsiran. */
export function sameCalendarDay(dbDate: Date, ymd: { y: number; m: number; d: number }): boolean {
  const target = Date.UTC(ymd.y, ymd.m - 1, ymd.d);
  const asUtc = Date.UTC(dbDate.getUTCFullYear(), dbDate.getUTCMonth(), dbDate.getUTCDate());
  const wib = new Date(dbDate.getTime() + 7 * 3600 * 1000);
  const asWib = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
  return target === asUtc || target === asWib;
}

// Tanpa huruf/angka yang mudah tertukar: I, L, O, 0, 1.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateActivationCode(): string {
  let s = "";
  for (let i = 0; i < 8; i += 1) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Huruf besar, buang spasi/tanda hubung; karakter yang mudah tertukar dipetakan ke padanan di alfabet (0→O tak ada, jadi biarkan gagal). */
export function normalizeActivationCode(raw: unknown): string {
  return (typeof raw === "string" ? raw : "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashActivationCode(normalized: string): string {
  return createHash("sha256").update(`klandesa-activation:${normalized}`).digest("hex");
}

export const MAX_FAILED_LOGINS = 5;

/** 5 salah → kunci 5 menit, lalu berlipat, maksimum 1 jam. */
export function lockoutMs(failedAttempts: number): number {
  if (failedAttempts < MAX_FAILED_LOGINS) return 0;
  const steps = failedAttempts - MAX_FAILED_LOGINS;
  return Math.min(5 * 60_000 * 2 ** steps, 60 * 60_000);
}

export type CitizenSignupMode = "auto" | "approval" | "closed";

/** Pengaturan per desa di Village.settings.mobile.citizenSignup (default: auto). */
export function readCitizenSignupMode(settings: unknown): CitizenSignupMode {
  const root = settings && typeof settings === "object" && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  const mobile = root.mobile && typeof root.mobile === "object" ? (root.mobile as Record<string, unknown>) : {};
  const v = mobile.citizenSignup;
  return v === "approval" || v === "closed" ? v : "auto";
}
