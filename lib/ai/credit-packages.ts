/**
 * Paket kredit Asisten Desa AI (Laras). Satu sumber untuk UI, route top-up, dan penagihan.
 * 1 kredit = 1 pertanyaan. Murni (tanpa DB) agar aman dipakai di client dan mudah dites.
 * Harga ditetapkan 2026-10-29: Rp50/kredit (paket kecil) turun sampai Rp30/kredit (paket terbesar).
 */

/** Kredit gratis per pengguna saat akun dibuat. */
export const AI_FREE_CREDITS = 1000;

export const AI_CREDIT_PACKAGES = [
  { id: "pkg1", credits: 300, price: 15_000, label: "300 Kredit", desc: "~300 pertanyaan" },
  { id: "pkg2", credits: 1000, price: 40_000, label: "1.000 Kredit", desc: "~1.000 pertanyaan" },
  { id: "pkg3", credits: 3000, price: 105_000, label: "3.000 Kredit", desc: "Paling populer" },
  { id: "pkg4", credits: 10000, price: 300_000, label: "10.000 Kredit", desc: "Hemat 40%" },
] as const;

export type AiCreditPackage = (typeof AI_CREDIT_PACKAGES)[number];

export function findAiCreditPackageById(id: string): AiCreditPackage | undefined {
  return AI_CREDIT_PACKAGES.find((p) => p.id === id);
}

/** Harga (Rp) untuk jumlah kredit yang persis sama dengan salah satu paket; null bila tidak dikenal. */
export function aiCreditPriceForCredits(credits: number): number | null {
  return AI_CREDIT_PACKAGES.find((p) => p.credits === credits)?.price ?? null;
}

export const AI_CREDIT_MIN_PRICE = Math.min(...AI_CREDIT_PACKAGES.map((p) => p.price));
