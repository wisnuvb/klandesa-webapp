import { addMonths } from "@/lib/billing/duration";
import { LENGKAP_TIER, isLegacyTier } from "@/lib/billing/lengkap";

/**
 * Aturan mutasi langganan desa oleh super admin (murni, tanpa DB). Selaras dengan aturan nyata di lib/subscription.ts
 * (fase trial/grace/active/inactive) dan lib/billing/service.ts (paket desa = starter|profesional|enterprise|lengkap,
 * status huruf kecil). Perpanjangan manual TIDAK melewati tagihan, sehingga tidak ada komisi mitra
 * (komisi hanya dari `accrueSubscriptionCommissionInTx` saat tagihan lunas dan `accrueClosingCommissionInTx` saat tautan mitra baru).
 */

export const VILLAGE_PLANS = ["starter", "profesional", "enterprise", LENGKAP_TIER] as const;
export type VillagePlan = (typeof VILLAGE_PLANS)[number];

export const VILLAGE_SUBSCRIPTION_STATUSES = ["active", "trial", "grace", "inactive", "cancelled"] as const;
export type VillageSubscriptionStatus = (typeof VILLAGE_SUBSCRIPTION_STATUSES)[number];

export const EXTEND_UNITS = ["days", "months"] as const;
export type ExtendUnit = (typeof EXTEND_UNITS)[number];

/** Batas perpanjangan sekali aksi (cegah salah ketik: 36 bulan / 1095 hari). */
export const EXTEND_MAX = { days: 1095, months: 36 } as const;
/** Batas masa berlaku eksplisit ke depan. */
export const MAX_YEARS_AHEAD = 10;

const MS_DAY = 24 * 60 * 60 * 1000;

export function isVillagePlan(v: unknown): v is VillagePlan {
  return typeof v === "string" && (VILLAGE_PLANS as readonly string[]).includes(v);
}
export function isVillageSubscriptionStatus(v: unknown): v is VillageSubscriptionStatus {
  return typeof v === "string" && (VILLAGE_SUBSCRIPTION_STATUSES as readonly string[]).includes(v);
}

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

/** Alasan wajib 5-300 karakter (aturan rencana Super Admin). */
export function validateReason(raw: unknown): Validation<string> {
  if (typeof raw !== "string") return { ok: false, error: "Alasan wajib diisi (5-300 karakter)." };
  const s = raw.trim();
  if (s.length < 5 || s.length > 300) return { ok: false, error: "Alasan wajib diisi (5-300 karakter)." };
  return { ok: true, value: s };
}

export type ExtendInput = { amount: number; unit: ExtendUnit };

export function validateExtend(body: { amount?: unknown; unit?: unknown }): Validation<ExtendInput> {
  const unit = body.unit;
  if (unit !== "days" && unit !== "months") return { ok: false, error: "Satuan harus 'days' (hari) atau 'months' (bulan)." };
  const n = typeof body.amount === "number" ? body.amount : typeof body.amount === "string" && body.amount.trim() !== "" ? Number(body.amount) : NaN;
  if (!Number.isInteger(n) || n < 1) return { ok: false, error: "Jumlah harus bilangan bulat positif." };
  if (n > EXTEND_MAX[unit]) {
    return { ok: false, error: `Maksimal ${EXTEND_MAX[unit]} ${unit === "days" ? "hari" : "bulan"} sekali perpanjangan.` };
  }
  return { ok: true, value: { amount: n, unit } };
}

export type SubscriptionSnapshot = {
  plan: string;
  status: string;
  expiry: Date | null;
  startedAt: Date | null;
};

/**
 * Perpanjangan manual. Basis = yang LEBIH AKHIR antara masa berlaku sekarang dan waktu sekarang (sisa waktu tidak hangus;
 * yang sudah lewat dihitung dari sekarang).
 *
 * Status: trial tetap trial (memperpanjang uji coba); active tetap active; grace/inactive menjadi active (desa kembali
 * dapat bekerja). `cancelled` ditolak: pembatalan oleh desa dibalik lewat "Ubah langganan" yang eksplisit.
 */
export function computeExtend(
  current: SubscriptionSnapshot,
  input: ExtendInput,
  now: Date = new Date(),
): Validation<{ expiry: Date; status: VillageSubscriptionStatus; startedAt: Date }> {
  const status = current.status.toLowerCase();
  if (!isVillageSubscriptionStatus(status)) return { ok: false, error: "Status langganan desa tidak dikenal. Gunakan 'Ubah langganan'." };
  if (status === "cancelled") return { ok: false, error: "Langganan berstatus dibatalkan. Gunakan 'Ubah langganan' untuk mengaktifkan kembali." };
  const base = current.expiry && current.expiry.getTime() > now.getTime() ? current.expiry : now;
  const expiry = input.unit === "days" ? new Date(base.getTime() + input.amount * MS_DAY) : addMonths(base, input.amount);
  const next: VillageSubscriptionStatus = status === "trial" ? "trial" : "active";
  return { ok: true, value: { expiry, status: next, startedAt: current.startedAt ?? now } };
}

export type SetInput = { plan: VillagePlan; status: VillageSubscriptionStatus; expiry: Date | null };

/**
 * Ubah eksplisit. Aturan:
 *  - plan harus salah satu paket sah; status salah satu status sah;
 *  - `expiry` ISO tanggal atau null; maksimal 10 tahun ke depan;
 *  - status aktif/trial/grace WAJIB bermasa berlaku di masa depan (kalau tidak, fase langsung inactive/grace dan aksi sia-sia);
 *  - trial/grace tidak boleh tanpa masa berlaku (transisi otomatis butuh tanggal); active tanpa masa berlaku = tanpa batas (diizinkan);
 *  - inactive/cancelled: masa berlaku bebas (boleh kosong).
 */
export function validateSet(body: { plan?: unknown; status?: unknown; expiry?: unknown }, now: Date = new Date()): Validation<SetInput> {
  if (!isVillagePlan(body.plan)) return { ok: false, error: `Paket tidak sah. Pilihan: ${VILLAGE_PLANS.join(", ")}.` };
  if (!isVillageSubscriptionStatus(body.status)) return { ok: false, error: `Status tidak sah. Pilihan: ${VILLAGE_SUBSCRIPTION_STATUSES.join(", ")}.` };

  let expiry: Date | null = null;
  if (body.expiry !== null && body.expiry !== undefined && body.expiry !== "") {
    if (typeof body.expiry !== "string") return { ok: false, error: "Masa berlaku harus berupa tanggal (ISO) atau kosong." };
    const d = new Date(body.expiry);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "Masa berlaku tidak valid." };
    const max = new Date(now);
    max.setFullYear(max.getFullYear() + MAX_YEARS_AHEAD);
    if (d.getTime() > max.getTime()) return { ok: false, error: `Masa berlaku maksimal ${MAX_YEARS_AHEAD} tahun ke depan.` };
    expiry = d;
  }

  const live = body.status === "active" || body.status === "trial" || body.status === "grace";
  if (live && expiry && expiry.getTime() <= now.getTime()) {
    return { ok: false, error: "Untuk status aktif/trial/grace, masa berlaku harus di masa depan." };
  }
  if ((body.status === "trial" || body.status === "grace") && !expiry) {
    return { ok: false, error: "Status trial/grace wajib punya masa berlaku." };
  }
  return { ok: true, value: { plan: body.plan, status: body.status, expiry } };
}

/** Kuota penyimpanan tidak pernah diturunkan oleh perubahan paket manual (sama dengan perpanjangan Paket Lengkap di billing). */
export function nextStorageLimitGb(currentGb: number, tierDefaultGb: number): number {
  return Math.max(currentGb, tierDefaultGb);
}

export function planLabel(plan: string): string {
  if (plan === LENGKAP_TIER) return "Lengkap";
  if (isLegacyTier(plan)) return plan.charAt(0).toUpperCase() + plan.slice(1);
  return plan;
}
