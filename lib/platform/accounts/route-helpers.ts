import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireStepUp } from "@/lib/platform/step-up";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { parseReason } from "./validate";

/**
 * Alur wajib mutasi berisiko: parse body -> step-up (sandi admin) -> alasan 5-300 karakter.
 * `requirePlatformSession` TETAP dipanggil di rute (awal handler), lalu hasilnya diberikan ke sini.
 */
export async function readRiskyBody(
  req: NextRequest,
  admin: { platformUserId: number },
): Promise<{ ok: true; body: Record<string, unknown>; reason: string } | { ok: false; response: NextResponse }> {
  const raw = (await req.json().catch(() => null)) as unknown;
  const body = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!body) return { ok: false, response: NextResponse.json({ error: "Body tidak valid." }, { status: 400 }) };
  const step = await requireStepUp(admin.platformUserId, body.confirmPassword, { totpCode: body.totpCode, req });
  if (!step.ok) return step;
  const reason = parseReason(body.reason);
  if (!reason.ok) return { ok: false, response: NextResponse.json({ error: reason.error }, { status: 400 }) };
  return { ok: true, body, reason: reason.value };
}

/** Respons tanpa cache untuk data pribadi/rahasia sekali-lihat. */
export const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Batas pencarian per admin (60/menit): pencarian beruntun tidak boleh dipakai menyisir data lintas desa. null = lolos. */
export async function searchRateLimited(admin: { platformUserId: number }, bucket: "account" | "resident"): Promise<NextResponse | null> {
  const rl = await checkRateLimitDb(limiterKey(`admin-${bucket}-search`, admin.platformUserId), { max: 60, windowMs: 60_000 });
  if (rl.ok) return null;
  return NextResponse.json(
    { error: "Terlalu banyak pencarian. Coba lagi sebentar lagi.", code: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(rl.retryAfterSec), ...NO_STORE } },
  );
}
