import { prisma } from "@/lib/prisma";

/** Sementara: tidak kurangi kredit per pesan AI. */
export const AI_CREDITS_CONSUMPTION_ENABLED = false;

/** Kredit awal / top-up default per user. */
export const DEFAULT_AI_CREDITS = 1000;

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
