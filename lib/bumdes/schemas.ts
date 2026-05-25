export type BumdesTransactionDirection = "income" | "expense";

export function parseTransactionDirection(
  value: unknown,
): BumdesTransactionDirection | null {
  if (value === "income" || value === "expense") return value;
  return null;
}

export function parsePositiveAmount(value: unknown): number | null {
  const amt = Number(value);
  if (!Number.isFinite(amt) || amt <= 0) return null;
  return amt;
}

export function parseOptionalString(
  value: unknown,
  maxLen: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

export function parseRequiredString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

export function parseEntryDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return new Date();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
