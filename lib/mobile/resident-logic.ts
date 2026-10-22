/** Logika murni pencarian warga untuk perangkat desa. */

export type SearchPlan =
  | { kind: "none" }
  | { kind: "nik-or-kk"; digits: string }
  | { kind: "name"; term: string };

/** 16 angka → cocokkan NIK/KK persis; ≥3 huruf → cari nama; selain itu tidak mencari (hindari mengunduh seluruh data). */
export function planResidentSearch(raw: unknown): SearchPlan {
  const q = typeof raw === "string" ? raw.trim().slice(0, 80) : "";
  const digits = q.replace(/\s+/g, "");
  if (/^\d{16}$/.test(digits)) return { kind: "nik-or-kk", digits };
  if (/^\d+$/.test(digits)) return { kind: "none" };
  const term = q.replace(/[%_\\]/g, "").replace(/\s+/g, " ").trim();
  return term.length >= 3 ? { kind: "name", term } : { kind: "none" };
}

export function ageFromBirthDate(birth: Date, now = new Date()): number {
  let a = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) a -= 1;
  return Math.max(0, a);
}

export const ANNOUNCEMENT_CATEGORIES = ["Pengumuman", "Berita", "Event"] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export function isAnnouncementCategory(v: unknown): v is AnnouncementCategory {
  return (ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(v as string);
}

export const MAX_BROADCAST_PUSH_PER_DAY = 3;
export const MAX_ANNOUNCEMENTS_PER_USER_PER_DAY = 10;
