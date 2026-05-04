import { NextResponse } from "next/server";

export function toJSONSafe<T>(value: T): unknown {
  if (value === null || value === undefined) return value as unknown;
  const t = typeof value as string;
  if (t === "bigint") {
    return (value as unknown as bigint).toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((v) => toJSONSafe(v));
  }
  if (t === "object") {
    const toJson = (value as unknown as { toJSON?: () => unknown }).toJSON;
    if (typeof toJson === "function") {
      const jsonValue = toJson.call(value);
      if (jsonValue === null || jsonValue === undefined) return jsonValue;
      if (typeof jsonValue !== "object") return toJSONSafe(jsonValue);
      return toJSONSafe(jsonValue);
    }
    const maybeJson = value;
    return Object.fromEntries(
      Object.entries(maybeJson as Record<string, unknown>).map(([k, v]) => [
        k,
        toJSONSafe(v),
      ])
    );
  }
  return value as unknown;
}

export function jsonSuccess(
  data: unknown,
  message?: string,
  init?: ResponseInit
) {
  const payload: Record<string, unknown> = {
    success: true,
    data: toJSONSafe(data),
  };
  if (message) payload.message = message;
  return NextResponse.json(payload, init);
}

export function jsonError(
  error: string,
  status = 400,
  extra?: Record<string, unknown>
) {
  const payload: Record<string, unknown> = { error };
  if (extra) Object.assign(payload, extra);
  return NextResponse.json(payload, { status });
}
