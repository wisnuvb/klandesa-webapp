import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/**
 * TOTP (RFC 6238) murni dengan node:crypto: SHA-1, 6 digit, langkah 30 detik, toleransi ±1 langkah.
 * Berkas ini TIDAK menyentuh DB. Pencegahan pemakaian ulang kode (replay) dan batas laju ada di
 * lib/platform/admins/two-factor.ts.
 */

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SEC = 30;
export const TOTP_WINDOW = 1;
export const TOTP_ISSUER = "Klandesa";

// ---------- base32 (RFC 4648, tanpa padding) ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("Karakter base32 tidak valid");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Rahasia acak 160 bit (ukuran yang dianjurkan RFC 4226) sebagai base32 (32 karakter). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

// ---------- HOTP/TOTP ----------
export function hotp(secret: Buffer, counter: number, digits = TOTP_DIGITS, algorithm: "sha1" | "sha256" | "sha512" = "sha1"): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac(algorithm, secret).update(msg).digest();
  const off = h[h.length - 1]! & 0x0f;
  const bin = ((h[off]! & 0x7f) << 24) | (h[off + 1]! << 16) | (h[off + 2]! << 8) | h[off + 3]!;
  return String(bin % 10 ** digits).padStart(digits, "0");
}

export function totpStep(nowMs: number, periodSec = TOTP_PERIOD_SEC): number {
  return Math.floor(nowMs / 1000 / periodSec);
}

export function totpAt(secret: Buffer, nowMs: number, digits = TOTP_DIGITS, algorithm: "sha1" | "sha256" | "sha512" = "sha1"): string {
  return hotp(secret, totpStep(nowMs), digits, algorithm);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Bentuk kode TOTP yang sah dari input pengguna: 6 digit (spasi diabaikan). Null bila bukan. */
export function normalizeTotpCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(c) ? c : null;
}

/**
 * Cocokkan kode dengan langkah [now-window, now+window]. Perbandingan waktu-konstan; SEMUA kandidat selalu dihitung
 * (tanpa keluar lebih awal) supaya waktu respons tidak membocorkan langkah mana yang cocok.
 * Mengembalikan langkah yang cocok (untuk pencegahan replay oleh pemanggil) atau null.
 */
export function verifyTotp(secret: Buffer, rawCode: unknown, nowMs = Date.now(), window = TOTP_WINDOW): { step: number } | null {
  const code = normalizeTotpCode(rawCode);
  if (!code) return null;
  const current = totpStep(nowMs);
  let matched: number | null = null;
  for (let d = -window; d <= window; d++) {
    const step = current + d;
    if (step < 0) continue;
    const ok = safeEqual(hotp(secret, step), code);
    if (ok && matched === null) matched = step;
  }
  return matched === null ? null : { step: matched };
}

/** URI untuk aplikasi autentikator (Google Authenticator, Authy, 1Password, dll). */
export function otpauthUri(o: { secretBase32: string; accountEmail: string; issuer?: string }): string {
  const issuer = o.issuer ?? TOTP_ISSUER;
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(o.accountEmail)}`;
  const q = new URLSearchParams({ secret: o.secretBase32, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_PERIOD_SEC) });
  return `otpauth://totp/${label}?${q.toString()}`;
}

/** Kunci rahasia dikelompokkan 4-4-... agar mudah diketik manual. */
export function formatSecretForManualEntry(secretBase32: string): string {
  return secretBase32.replace(/(.{4})/g, "$1 ").trim();
}

// ---------- enkripsi rahasia at-rest (AES-256-GCM) ----------
const KEY_SALT = "klandesa/platform-2fa/v1";
const KEY_INFO = "totp-secret-at-rest";

/**
 * Kunci diturunkan (HKDF-SHA256, label khusus) dari rahasia server yang sudah ada: `PLATFORM_TOTP_KEY` bila diset
 * (opsional; memisahkan 2FA dari rotasi AUTH_SECRET), selain itu AUTH_SECRET/NEXTAUTH_SECRET.
 * Bila rahasia server berubah, rahasia TOTP tersimpan TIDAK terbaca lagi (gagal tertutup): pakai kode pemulihan atau
 * `scripts/platform-reset-2fa.ts`.
 */
export function deriveTotpKey(material?: string): Buffer {
  const m = material ?? process.env.PLATFORM_TOTP_KEY?.trim() ?? "";
  let source = m;
  if (!source) {
    source = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
    if (!source && process.env.NODE_ENV !== "production") source = "__dev_only_nextauth_secret_min_32_chars_static__";
  }
  if (!source) throw new Error("Rahasia server (AUTH_SECRET) belum diset; 2FA tidak dapat dipakai.");
  return Buffer.from(hkdfSync("sha256", source, KEY_SALT, KEY_INFO, 32));
}

const VERSION = "v1";

/** Keluaran: `v1.<base64url(iv|tag|ciphertext)>`. `aad` mengikat sandi teks ke akun (tidak bisa dipindah antar akun). */
export function encryptTotpSecret(secretBase32: string, aad: string, key: Buffer = deriveTotpKey()): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(secretBase32, "utf8"), c.final()]);
  return `${VERSION}.${Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64url")}`;
}

/** Null bila format/kunci/aad salah atau data diubah (GCM menolak). */
export function decryptTotpSecret(stored: string | null | undefined, aad: string, key?: Buffer): string | null {
  if (!stored || !stored.startsWith(`${VERSION}.`)) return null;
  try {
    const raw = Buffer.from(stored.slice(VERSION.length + 1), "base64url");
    if (raw.length < 12 + 16 + 1) return null;
    const d = createDecipheriv("aes-256-gcm", key ?? deriveTotpKey(), raw.subarray(0, 12));
    d.setAAD(Buffer.from(aad));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export const totpAad = (platformUserId: number) => `platform-user:${platformUserId}`;

// ---------- kode pemulihan ----------
const RC_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa I, O, 0, 1
export const RECOVERY_CODE_COUNT = 10;
const RC_LEN = 16; // 80 bit: hash SHA-256 polos aman dari tebakan luring bila DB bocor

/** Format tampilan 4-4-4-4. */
export function generateRecoveryCode(): string {
  let s = "";
  for (let i = 0; i < RC_LEN; i++) s += RC_ALPHABET[randomInt(RC_ALPHABET.length)];
  return s.match(/.{4}/g)!.join("-");
}

/** Huruf besar, tanpa pemisah. Null bila bentuknya bukan kode pemulihan. */
export function normalizeRecoveryCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length !== RC_LEN) return null;
  for (const ch of c) if (!RC_ALPHABET.includes(ch)) return null;
  return c;
}

export const hashRecoveryCode = (normalized: string) => createHash("sha256").update(normalized).digest("hex");

export function generateRecoveryCodes(n = RECOVERY_CODE_COUNT): { codes: string[]; hashes: string[] } {
  const codes = new Set<string>();
  while (codes.size < n) codes.add(generateRecoveryCode());
  const list = [...codes];
  return { codes: list, hashes: list.map((c) => hashRecoveryCode(normalizeRecoveryCode(c)!)) };
}

/** Bacaan aman kolom JSON `recoveryCodeHashes` → daftar hash heksa SHA-256. */
export function parseRecoveryHashes(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^[a-f0-9]{64}$/.test(x)) : [];
}

/** Cari hash kode pemulihan (waktu-konstan terhadap seluruh daftar). Mengembalikan hash yang cocok atau null. */
export function matchRecoveryHash(hashes: string[], rawInput: unknown): string | null {
  const n = normalizeRecoveryCode(rawInput);
  if (!n) return null;
  const h = hashRecoveryCode(n);
  let found: string | null = null;
  for (const x of hashes) if (safeEqual(x, h) && found === null) found = x;
  return found;
}
