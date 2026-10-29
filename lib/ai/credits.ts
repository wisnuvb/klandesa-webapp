import { prisma } from "@/lib/prisma";
import { AI_FREE_CREDITS } from "@/lib/ai/credit-packages";

/** Aktif sejak 2026-10-29: 1 kredit dipotong per pertanyaan (lihat reserveAiCredit). Harga paket: credit-packages.ts. */
export const AI_CREDITS_CONSUMPTION_ENABLED = true;

/** Kredit gratis per pengguna saat akun dibuat. */
export const DEFAULT_AI_CREDITS = AI_FREE_CREDITS;

/** Pastikan user punya kredit default (untuk akun lama yang masih 0). */
export async function ensureDefaultAiCredits(userId: number): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiCredits: true },
  });
  if (!user) return 0;

  const current = typeof user.aiCredits === "number" ? user.aiCredits : 0;
  if (current >= DEFAULT_AI_CREDITS) return current;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { aiCredits: DEFAULT_AI_CREDITS },
    select: { aiCredits: true },
  });
  return updated.aiCredits;
}
