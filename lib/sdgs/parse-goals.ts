/** Parse & validate SDG goal IDs (1–18) from JSON or array input. */
export function parseSdgGoalIds(value: unknown): number[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [];
  const ids = arr
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 18);
  return [...new Set(ids)].sort((a, b) => a - b);
}

export function sdgGoalIdsToJson(ids: number[]): number[] {
  return parseSdgGoalIds(ids);
}
