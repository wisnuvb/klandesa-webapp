import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { auditPlatform } from "@/lib/platform/audit";
import { applyAiCredits } from "@/lib/platform/accounts/ai-credits";
import { maskEmail } from "@/lib/platform/accounts/mask";
import { parseAiCreditsInput, parseId } from "@/lib/platform/accounts/validate";
import { readRisky } from "@/lib/platform/legacy-risky";

/**
 * Rute lama: PUT { set } | { delta, confirmPassword, reason } -> { ok, user:{id,email,aiCredits}, updatedBy }.
 * Kredit AI = nilai uang, maka wajib konfirmasi sandi admin + alasan (sama dengan aksi Pusat Akun).
 * Memakai logika bersama dengan Pusat Akun dan menulis jejak audit `account.ai_credits`.
 * Antarmuka baru (dengan step-up + alasan): POST /api/admin/accounts/staff/[id]/ai-credits.
 */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const userId = parseId(id);
  if (userId == null) {
    return NextResponse.json({ error: "User ID tidak valid" }, { status: 400 });
  }

  const risky = await readRisky(req, auth.admin);
  if (!risky.ok) return risky.response;
  const input = parseAiCreditsInput(risky.body);
  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  const r = await applyAiCredits(prisma, userId, input.value);
  if (!r) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  await auditPlatform(req, { platformUserId: auth.admin.platformUserId, email: auth.admin.email }, {
    action: "account.ai_credits", targetType: "user", targetId: r.id, villageId: r.villageId,
    summary: `Kredit AI ${maskEmail(r.email)}: ${r.before} -> ${r.after}`,
    metadata: { via: "legacy_route", reason: risky.reason, mode: input.value.kind, value: input.value.value, before: r.before, after: r.after },
  });

  return NextResponse.json(
    { ok: true, user: { id: r.id, email: r.email, aiCredits: r.after }, updatedBy: auth.admin.email },
    { status: 200 },
  );
}
