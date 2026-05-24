/**
 * Nilai default skema bagi hasil mitra (boleh dioverride admin per mitra).
 */

function envNumber(key: string, fallback: number): number {
  const raw = typeof process.env[key] === "string" ? process.env[key] : "";
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Komisi flat per closing desa pertama kali tertaut mitra (IDR). */
export const DEFAULT_PARTNER_CLOSING_BONUS_IDR = envNumber(
  "PARTNER_DEFAULT_CLOSING_BONUS_IDR",
  500_000,
);

/** Persentase bagi hasil dari nilai invoice langganan yang sudah lunas (%). */
export const DEFAULT_PARTNER_SUBSCRIPTION_SHARE_PERCENT = envNumber(
  "PARTNER_DEFAULT_SUBSCRIPTION_SHARE_PERCENT",
  10,
);
