import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export const PAYMENT_GENERIC_ERROR =
  "Pembayaran belum bisa diproses saat ini. Silakan coba lagi beberapa saat lagi. Jika masih terjadi, hubungi tim Klandesa.";
export const PAYMENT_GATEWAY_DOWN_ERROR =
  "Layanan pembayaran sedang sibuk atau tidak merespons. Tunggu beberapa menit lalu coba lagi. Tagihan Anda tidak dikenai biaya.";
export const PAYMENT_NOT_CONFIGURED_ERROR =
  "Layanan pembayaran belum siap dipakai di desa ini. Silakan hubungi tim Klandesa.";

const isPrismaError = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError ||
  e instanceof Prisma.PrismaClientValidationError ||
  e instanceof Prisma.PrismaClientInitializationError ||
  e instanceof Prisma.PrismaClientUnknownRequestError ||
  e instanceof Prisma.PrismaClientRustPanicError;

/**
 * Petunjuk untuk developer (hanya saat NODE_ENV=development): error Prisma yang disebabkan skema/klien usang
 * sering terjadi setelah menarik perubahan dan membuat pesan umum di UI tidak informatif.
 */
function devHint(raw: string): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (/unknown (field|argument)/i.test(raw)) {
    return "[Dev] Prisma Client server ini usang. Jalankan `pnpm prisma generate`, lalu RESTART server dev.";
  }
  if (/does not exist in the current database|doesn't exist|unknown column/i.test(raw)) {
    return "[Dev] Skema database belum sinkron. Terapkan migrasi / `pnpm db:push`, lalu coba lagi.";
  }
  return null;
}

/**
 * Ubah error apa pun menjadi pesan yang aman dan ramah untuk pengguna non-teknis.
 * Error bisnis yang memang ditulis untuk pengguna (mis. "Kapasitas 10 perangkat sudah termasuk di paket Anda")
 * diteruskan apa adanya; detail teknis (Prisma, jaringan, konfigurasi, signature) hanya masuk log server.
 */
export function toUserFacingError(error: unknown, context: string): { message: string; status: number } {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const name = error instanceof Error ? error.name : "";
  const lower = raw.toLowerCase();

  let result: { message: string; status: number } | null = null;

  if (isPrismaError(error)) {
    result = { message: PAYMENT_GENERIC_ERROR, status: 500 };
  } else if (raw.startsWith("Missing env:")) {
    result = { message: PAYMENT_NOT_CONFIGURED_ERROR, status: 503 };
  } else if (
    name === "TimeoutError" ||
    name === "AbortError" ||
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("timed out") ||
    lower.includes("socket") ||
    // Gangguan di sisi LinkQu / CDN-nya (mis. "Linkqu API error: 522", 502, 503, 504).
    /linkqu api error:\s*5\d\d/i.test(raw)
  ) {
    result = { message: PAYMENT_GATEWAY_DOWN_ERROR, status: 503 };
  } else if (
    lower.includes("signature") ||
    lower.includes("invalid `") ||
    lower.includes("invocation") ||
    lower.includes("unauthorized") ||
    raw.length > 220 ||
    !raw.trim()
  ) {
    result = { message: PAYMENT_GENERIC_ERROR, status: 500 };
  }

  if (result) {
    const hint = isPrismaError(error) ? devHint(raw) : null;
    if (hint) result = { ...result, message: `${result.message}\n\n${hint}` };
    logger.error({ err: error, context }, "[Billing] Error teknis disembunyikan dari pengguna");
    return result;
  }
  return { message: raw, status: 400 };
}
