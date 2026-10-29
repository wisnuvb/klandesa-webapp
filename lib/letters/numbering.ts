/**
 * Penomoran surat yang bisa diatur per jenis surat. Pola berbeda di tiap kabupaten
 * (nomor urut, kode klasifikasi, kode desa, bulan Romawi, tahun), jadi pola ditulis operator
 * dengan token, bukan di-hardcode. Murni (tanpa DB); penghitung atomik ada di lapisan server.
 */
import { romanMonth } from "./format";

export const NUMBERING_TOKENS = ["URUT", "KLASIFIKASI", "KODE_DESA", "BULAN", "BULAN_ROMAWI", "TAHUN"] as const;
export type NumberingToken = (typeof NUMBERING_TOKENS)[number];

export const DEFAULT_NUMBER_PATTERN = "{URUT}/{KLASIFIKASI}/{KODE_DESA}/{BULAN_ROMAWI}/{TAHUN}";
export const NUMBER_PATTERN_MAX = 120;
const SAFE_CHARS = /^[A-Za-z0-9/.\-_ :{}]+$/;
const TOKEN_RE = /\{([A-Z_]+)(?::(\d{1,2}))?\}/g;

export type NumberingReset = "never" | "yearly" | "monthly";

export type NumberingConfig = {
  mode: "auto" | "manual" | "none";
  pattern: string;
  reset: NumberingReset;
  /** Digit minimal untuk {URUT} (001 = 3). */
  padding: number;
  /** Dipakai bersama beberapa jenis surat agar berbagi satu buku agenda. */
  counterKey: string;
};

export function validateNumberPattern(pattern: string, mode: NumberingConfig["mode"] = "auto"): string | null {
  if (pattern.length === 0 || pattern.length > NUMBER_PATTERN_MAX) return `Pola nomor 1–${NUMBER_PATTERN_MAX} karakter`;
  if (!SAFE_CHARS.test(pattern)) return "Pola nomor memuat karakter yang tidak diizinkan";
  const stripped = pattern.replace(TOKEN_RE, "");
  if (/[{}]/.test(stripped)) return "Ada tanda { } yang tidak membentuk isian";
  let hasUrut = false;
  for (const m of pattern.matchAll(TOKEN_RE)) {
    if (!(NUMBERING_TOKENS as readonly string[]).includes(m[1])) return `Isian {${m[1]}} tidak dikenal`;
    if (m[2] && m[1] !== "URUT") return `Panjang digit hanya berlaku untuk {URUT}`;
    if (m[1] === "URUT") hasUrut = true;
  }
  if (mode === "auto" && !hasUrut) return "Pola nomor otomatis harus memuat {URUT}";
  return null;
}

export type NumberContext = {
  urut: number;
  date: Date;
  padding?: number;
  klasifikasi?: string;
  kodeDesa?: string;
};

/** Susun nomor surat dari pola. Isian yang belum diketahui (mis. klasifikasi) menjadi kosong. */
export function formatLetterNumber(pattern: string, ctx: NumberContext): string {
  const month = ctx.date.getMonth() + 1;
  const pad = (n: number, width: number) => String(n).padStart(Math.min(Math.max(width, 0), 10), "0");
  return pattern
    .replace(TOKEN_RE, (_, token: string, width?: string) => {
      switch (token) {
        case "URUT": return pad(ctx.urut, width ? Number(width) : (ctx.padding ?? 0));
        case "KLASIFIKASI": return ctx.klasifikasi ?? "";
        case "KODE_DESA": return ctx.kodeDesa ?? "";
        case "BULAN": return pad(month, 2);
        case "BULAN_ROMAWI": return romanMonth(month);
        case "TAHUN": return String(ctx.date.getFullYear());
        default: return "";
      }
    })
    // Segmen kosong (mis. klasifikasi belum diisi) tidak boleh meninggalkan "//".
    .replace(/(?:\/\s*){2,}/g, "/")
    .replace(/^\/|\/$/g, "")
    .trim();
}

/** Kunci penghitung: surat dengan kunci sama berbagi urutan; reset memutus per tahun/bulan. */
export function counterScopeKey(config: Pick<NumberingConfig, "counterKey" | "reset">, date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const period = config.reset === "yearly" ? `${y}` : config.reset === "monthly" ? `${y}-${m}` : "all";
  return `${config.counterKey}:${period}`;
}
