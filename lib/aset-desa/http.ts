import { NextResponse } from "next/server";
import type { Result } from "./service";

export function failResponse(r: Extract<Result<unknown>, { ok: false }>) {
  return NextResponse.json({ error: r.errors[0], errors: r.errors, ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}) }, { status: r.status });
}

export const parseIntId = (raw: string): number | null => (/^\d{1,10}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null);
