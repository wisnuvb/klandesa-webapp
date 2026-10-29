/**
 * Logika murni untuk layar Info Desa, Dana Desa dan Bantuan Saya (tanpa Prisma agar mudah dites).
 * Pengaturan per desa disimpan di Village.settings.mobile.info (aditif, tanpa migrasi).
 */

export type EmergencyContact = { label: string; phone: string };
export type VillageInfoSettings = {
  /** Desa harus menyalakan sendiri: default tidak menampilkan angka anggaran ke warga. */
  budgetPublic: boolean;
  /** Rapor layanan desa boleh dibuka lewat halaman publik /rapor-desa/<kode>. Default mati (opt-in). */
  scorecardPublic: boolean;
  emergencyContacts: EmergencyContact[];
  serviceHours: string | null;
};

const MAX_CONTACTS = 10;

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Nomor untuk tombol telepon: hanya digit dan awalan "+", 5–16 digit. Selain itu null. */
export function normalizeDialNumber(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 3 || digits.length > 16) return null;
  return `${plus}${digits}`;
}

export function sanitizeEmergencyContacts(input: unknown): EmergencyContact[] {
  if (!Array.isArray(input)) return [];
  const out: EmergencyContact[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    const r = asRecord(item);
    const label = typeof r.label === "string" ? r.label.trim().replace(/\s+/g, " ") : "";
    const phone = normalizeDialNumber(r.phone);
    if (label.length < 2 || label.length > 40 || !phone) continue;
    const key = `${label.toLowerCase()}|${phone}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, phone });
    if (out.length >= MAX_CONTACTS) break;
  }
  return out;
}

export function sanitizeServiceHours(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim().replace(/\s+/g, " ");
  return v ? v.slice(0, 120) : null;
}

export function readVillageInfoSettings(settings: unknown): VillageInfoSettings {
  const info = asRecord(asRecord(asRecord(settings).mobile).info);
  return {
    budgetPublic: info.budgetPublic === true,
    scorecardPublic: info.scorecardPublic === true,
    emergencyContacts: sanitizeEmergencyContacts(info.emergencyContacts),
    serviceHours: sanitizeServiceHours(info.serviceHours),
  };
}

/** Gabungkan perubahan ke settings tanpa menghapus kunci lain milik web atau modul mobile lain. */
export function mergeVillageInfoSettings(
  settings: unknown,
  patch: { budgetPublic?: boolean; scorecardPublic?: boolean; emergencyContacts?: unknown; serviceHours?: unknown },
): Record<string, unknown> {
  const root = { ...asRecord(settings) };
  const mobile = { ...asRecord(root.mobile) };
  const info = { ...asRecord(mobile.info) };
  if (typeof patch.budgetPublic === "boolean") info.budgetPublic = patch.budgetPublic;
  if (typeof patch.scorecardPublic === "boolean") info.scorecardPublic = patch.scorecardPublic;
  if (patch.emergencyContacts !== undefined) info.emergencyContacts = sanitizeEmergencyContacts(patch.emergencyContacts);
  if (patch.serviceHours !== undefined) info.serviceHours = sanitizeServiceHours(patch.serviceHours);
  mobile.info = info;
  root.mobile = mobile;
  return root;
}

export type BudgetRow = { category: string; budgetAmount: number; realizedAmount: number };
export type BudgetCategorySummary = { name: string; budget: number; realized: number; percent: number };
export type BudgetSummary = { totalBudget: number; totalRealized: number; percent: number; categories: BudgetCategorySummary[] };

function pct(realized: number, budget: number): number {
  if (!(budget > 0)) return 0;
  return Math.round((realized / budget) * 1000) / 10;
}

/** Agregat per kategori. Tidak ada transaksi mentah; angka negatif dan non-angka dianggap 0. */
export function summarizeBudget(rows: BudgetRow[]): BudgetSummary {
  const by = new Map<string, { budget: number; realized: number }>();
  for (const r of rows) {
    const name = (r.category ?? "").trim() || "Lainnya";
    const budget = Number.isFinite(r.budgetAmount) && r.budgetAmount > 0 ? r.budgetAmount : 0;
    const realized = Number.isFinite(r.realizedAmount) && r.realizedAmount > 0 ? r.realizedAmount : 0;
    const cur = by.get(name) ?? { budget: 0, realized: 0 };
    cur.budget += budget;
    cur.realized += realized;
    by.set(name, cur);
  }
  const categories = [...by.entries()]
    .map(([name, v]) => ({ name, budget: v.budget, realized: v.realized, percent: pct(v.realized, v.budget) }))
    .sort((a, b) => b.budget - a.budget || a.name.localeCompare(b.name));
  const totalBudget = categories.reduce((s, c) => s + c.budget, 0);
  const totalRealized = categories.reduce((s, c) => s + c.realized, 0);
  return { totalBudget, totalRealized, percent: pct(totalRealized, totalBudget), categories };
}

/** Perangkat yang tampil ke warga: aktif dan belum berakhir masa jabatannya, urut jenjang jabatan lalu nama. */
export function visibleOfficials<T extends { status: string; endDate: Date | null; name: string; position: { level: number } }>(
  rows: T[],
  now = new Date(),
): T[] {
  return rows
    .filter((o) => o.status === "active" && (!o.endDate || o.endDate.getTime() > now.getTime()))
    .sort((a, b) => a.position.level - b.position.level || a.name.localeCompare(b.name));
}
