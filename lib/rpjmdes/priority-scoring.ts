import type { SdgGoalScore } from "@/lib/sdgs/types";

/**
 * Skor prioritas usulan/kegiatan: goal SDGs dengan skor rendah → prioritas tinggi.
 * Return 0–100 (semakin tinggi semakin prioritas).
 */
export function computeSdgPriorityScore(
  sdgGoalIds: number[],
  goalScores: SdgGoalScore[],
): number {
  if (sdgGoalIds.length === 0) return 50;

  const scoreMap = new Map(goalScores.map((g) => [g.goalId, g.score]));
  let total = 0;

  for (const id of sdgGoalIds) {
    const score = scoreMap.get(id);
    total += score != null ? 100 - score : 70;
  }

  return Math.round((total / sdgGoalIds.length) * 10) / 10;
}
