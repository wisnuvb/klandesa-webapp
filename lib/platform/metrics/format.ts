/**
 * Pemformat tampilan dasbor owner (Bahasa Indonesia, rupiah "Rp 1.234.567", waktu WIB). MURNI & deterministik:
 * tidak memakai Intl agar hasil sama di server, peramban, dan tes (Intl id-ID memakai spasi tak-putus).
 */
import { MONTH_LONG_ID, MONTH_SHORT_ID, wibParts } from "./period";

const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** 1234567 -> "1.234.567". */
export function formatNumberId(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n);
  return `${r < 0 ? "-" : ""}${groupThousands(String(Math.abs(r)))}`;
}

/** 1234567 -> "Rp 1.234.567"; -5000 -> "-Rp 5.000". */
export function formatRupiah(n: number): string {
  if (!Number.isFinite(n)) return "Rp 0";
  const r = Math.round(n);
  return `${r < 0 ? "-" : ""}Rp ${groupThousands(String(Math.abs(r)))}`;
}

const trimDecimal = (n: number) => (Math.round(n * 10) / 10).toString().replace(".", ",");

/** Ringkas untuk sumbu grafik/ruang sempit: 3500000 -> "Rp 3,5 jt"; 450000 -> "Rp 450 rb"; 1.2e9 -> "Rp 1,2 M". */
export function formatRupiahCompact(n: number): string {
  if (!Number.isFinite(n)) return "Rp 0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}Rp ${trimDecimal(abs / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${trimDecimal(abs / 1_000_000)} jt`;
  if (abs >= 1_000) return `${sign}Rp ${trimDecimal(abs / 1_000)} rb`;
  return `${sign}Rp ${Math.round(abs)}`;
}

/** Rasio 0..1 -> "12,5%". null (tak terukur) -> "—". */
export function formatPercent(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  const v = Math.round(ratio * 100 * 10 ** digits) / 10 ** digits;
  return `${v.toFixed(digits).replace(".", ",")}%`;
}

/** Perubahan relatif (mis. 0.123) -> "+12,3%"; null -> "—" (pembanding nol/tidak ada). */
export function formatDeltaPercent(change: number | null | undefined, digits = 1): string {
  if (change == null || !Number.isFinite(change)) return "—";
  const v = Math.round(change * 100 * 10 ** digits) / 10 ** digits;
  const s = Math.abs(v).toFixed(digits).replace(".", ",");
  return `${v > 0 ? "+" : v < 0 ? "-" : ""}${s}%`;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "6 Nov 2026, 09.25 WIB". */
export function formatDateTimeWib(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const p = wibParts(d);
  return `${p.day} ${MONTH_SHORT_ID[p.month - 1]} ${p.year}, ${pad2(p.hour)}.${pad2(p.minute)} WIB`;
}

/** "6 Nov 2026". */
export function formatDateWib(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const p = wibParts(d);
  return `${p.day} ${MONTH_SHORT_ID[p.month - 1]} ${p.year}`;
}

/** "2026-11-06 09:25:48" (WIB) untuk CSV; terurut dan terbaca spreadsheet. */
export function formatSortableWib(input: Date | string | number | null | undefined): string {
  if (input == null) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const p = wibParts(new Date(d.getTime()));
  const sec = new Date(d.getTime() + 7 * 3_600_000).getUTCSeconds();
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)} ${pad2(p.hour)}:${pad2(p.minute)}:${pad2(sec)}`;
}

/** "2026-11" -> "November 2026". */
export function formatMonthKey(key: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return key;
  return `${MONTH_LONG_ID[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** Sisa hari -> "hari ini", "besok", "5 hari lagi". */
export function formatDaysLeft(days: number): string {
  if (days <= 0) return "hari ini";
  if (days === 1) return "besok";
  return `${days} hari lagi`;
}
