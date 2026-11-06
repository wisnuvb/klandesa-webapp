import type { PrismaClient } from "@prisma/client";
import type { AiCreditsInput } from "./validate";

/**
 * Logika kredit AI bersama: dipakai rute lama `/api/admin/users/[id]/ai-credits` dan aksi `ai-credits` di Pusat Akun.
 * Hasil tidak pernah negatif (rute lama bisa menghasilkan saldo negatif lewat delta besar).
 */
export type AiCreditsChange = { id: number; email: string; villageId: number; before: number; after: number };

export async function applyAiCredits(db: PrismaClient, userId: number, input: AiCreditsInput): Promise<AiCreditsChange | null> {
  return db.$transaction(async (tx) => {
    // Kunci baris: dua penyesuaian bersamaan saling menunggu (tanpa baca-lalu-tulis yang saling menimpa), sehingga before/after akurat.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const cur = await tx.user.findUnique({ where: { id: userId }, select: { id: true, email: true, villageId: true, aiCredits: true } });
    if (!cur) return null;
    // Penambahan atomik di sisi SQL dengan klem [0, batas Int 32-bit]; "set" juga dijepit ke rentang yang sama.
    if (input.kind === "set") {
      await tx.$executeRaw`UPDATE users SET aiCredits = LEAST(2147483647, GREATEST(0, ${input.value})) WHERE id = ${userId}`;
    } else {
      await tx.$executeRaw`UPDATE users SET aiCredits = LEAST(2147483647, GREATEST(0, CAST(aiCredits AS SIGNED) + ${input.value})) WHERE id = ${userId}`;
    }
    const after = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { aiCredits: true } });
    return { id: cur.id, email: cur.email, villageId: cur.villageId, before: cur.aiCredits, after: after.aiCredits };
  });
}
