import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireStepUp } from "@/lib/platform/step-up";
import { parseReason } from "@/lib/platform/accounts/validate";

/**
 * Konfirmasi sandi + alasan untuk rute `/api/admin/*` lama yang menggerakkan uang/akses (Paket F1).
 * Pola sama dengan `readRiskyBody` (lib/platform/accounts/route-helpers.ts), tetapi bisa dipakai pada body yang sudah dibaca
 * (mis. bila hanya sebagian jenis perubahan yang berisiko) dan tidak mengubah kontrak field lain di body.
 */
export type RiskyOk = { ok: true; reason: string };
export type RiskyResult = RiskyOk | { ok: false; response: NextResponse };

type Admin = { platformUserId: number };

/** Body JSON objek, atau null bila tidak valid. */
export async function readJsonObject(req: NextRequest): Promise<Record<string, unknown> | null> {
  const raw = (await req.json().catch(() => null)) as unknown;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

/** `confirmPassword` (sandi admin) -> `reason` 5-300 karakter. Dipanggil SEBELUM efek apa pun. */
export async function requireRisky(admin: Admin, body: Record<string, unknown>, req?: Request): Promise<RiskyResult> {
  // Admin ber-2FA wajib menyertakan `totpCode` (kode TOTP atau pemulihan); `req` dipakai untuk pembatas per-IP.
  const step = await requireStepUp(admin.platformUserId, body.confirmPassword, { totpCode: body.totpCode, req });
  if (!step.ok) return step;
  const reason = parseReason(body.reason);
  if (!reason.ok) return { ok: false, response: NextResponse.json({ error: reason.error }, { status: 400 }) };
  return { ok: true, reason: reason.value };
}

/** Baca body lalu `requireRisky` (400 bila body bukan objek JSON). */
export async function readRisky(
  req: NextRequest,
  admin: Admin,
): Promise<{ ok: true; body: Record<string, unknown>; reason: string } | { ok: false; response: NextResponse }> {
  const body = await readJsonObject(req);
  if (!body) return { ok: false, response: NextResponse.json({ error: "Body tidak valid" }, { status: 400 }) };
  const r = await requireRisky(admin, body, req);
  if (!r.ok) return r;
  return { ok: true, body, reason: r.reason };
}
