import { NextResponse } from "next/server";
import type { SecondFactorResult } from "@/lib/platform/admins/two-factor";

/** Respons JSON yang tidak boleh disimpan cache (memuat rahasia 2FA, kode pemulihan, tautan manual). */
export function jsonNoStore(body: unknown, init?: { status?: number }): NextResponse {
  return NextResponse.json(body, { status: init?.status ?? 200, headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } });
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  const b = (await req.json().catch(() => null)) as unknown;
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
}

/** Terjemahkan kegagalan faktor kedua menjadi respons seragam (429 bila terkunci, 400 bila salah). */
export function secondFactorFailure(r: Extract<SecondFactorResult, { ok: false }>): NextResponse {
  if (r.reason === "locked") {
    return NextResponse.json(
      { error: `Terlalu banyak kode salah. Coba lagi dalam ${Math.max(1, Math.ceil(r.retryAfterSec / 60))} menit.`, code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(r.retryAfterSec) } },
    );
  }
  return NextResponse.json({ error: "Kode verifikasi salah atau sudah dipakai.", code: "TOTP_INVALID" }, { status: 400 });
}
