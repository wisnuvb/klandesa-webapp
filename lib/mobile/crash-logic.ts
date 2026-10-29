/**
 * Laporan crash dari aplikasi mobile (tanpa akun, tanpa data pribadi). Dibersihkan di server karena pesan error
 * bisa tidak sengaja memuat NIK, nomor HP, email, atau token.
 */

export type CrashReport = {
  appVersion: string;
  platform: string;
  osVersion: string | null;
  screen: string | null;
  fatal: boolean;
  message: string;
  stack: string | null;
};

/** Samarkan pola data pribadi: email, token Bearer/JWT, dan deret angka ≥ 9 digit (NIK, KK, HP). */
export function maskSensitive(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]")
    .replace(/Bearer\s+\S+/gi, "Bearer [token]")
    .replace(/\+?\d[\d\s-]{7,}\d/g, (m) => (m.replace(/\D/g, "").length >= 9 ? "[angka]" : m));
}

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function sanitizeCrashReport(raw: unknown): CrashReport | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const message = str(r.message, 400);
  if (!message) return null;
  const stack = str(r.stack, 3000);
  return {
    appVersion: str(r.appVersion, 20) ?? "?",
    platform: str(r.platform, 20) ?? "?",
    osVersion: str(r.osVersion, 30),
    screen: str(r.screen, 80),
    fatal: r.fatal === true,
    message: maskSensitive(message),
    stack: stack ? maskSensitive(stack) : null,
  };
}
