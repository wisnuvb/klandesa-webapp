import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { requireStepUp } from "@/lib/platform/step-up";
import { auditPlatform, auditPlatformStrict } from "@/lib/platform/audit";
import { validateReason } from "@/lib/platform/villages/subscription";
import { clearVillageHealthCache } from "@/lib/platform/villages/queries";
import { badId, notFound, parseVillageId, type VillageRouteCtx } from "@/lib/platform/villages/route-helpers";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Aktif/nonaktifkan desa. Body: { active: boolean, reason, confirmPassword }. */
export async function POST(req: NextRequest, ctx: VillageRouteCtx) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const id = parseVillageId((await ctx.params).id);
  if (id == null) return badId();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) return bad("Body tidak valid");

  const step = await requireStepUp(auth.admin.platformUserId, body.confirmPassword, { totpCode: body.totpCode, req });
  if (!step.ok) return step.response;

  const reason = validateReason(body.reason);
  if (!reason.ok) return bad(reason.error);
  if (typeof body.active !== "boolean") return bad("Field 'active' harus true atau false.");
  const active = body.active;

  const village = await prisma.village.findUnique({ where: { id }, select: { id: true, code: true, name: true, isActive: true } });
  if (!village) return notFound();
  if (village.isActive === active) {
    return NextResponse.json({ ok: true, changed: false, isActive: active });
  }

  const actor = { platformUserId: auth.admin.platformUserId, email: auth.admin.email };
  const entry = {
    action: active ? "village.activate" : "village.deactivate",
    targetType: "village" as const,
    targetId: id,
    villageId: id,
  };
  // Jejak KETAT sebelum efek: bila gagal tertulis, status desa tidak diubah.
  try {
    await auditPlatformStrict(req, actor, {
      ...entry,
      summary: `${active ? "Aktifkan" : "Nonaktifkan"} desa ${village.name} (${village.code}). Alasan: ${reason.value}`,
      metadata: { reason: reason.value, before: { isActive: village.isActive }, after: { isActive: active } },
    });
  } catch (e) {
    console.error("[admin/villages] jejak status desa gagal:", e instanceof Error ? e.message : e);
    return bad("Jejak audit gagal ditulis; status desa tidak diubah.", 500);
  }

  const res = await prisma.village.updateMany({ where: { id, isActive: village.isActive }, data: { isActive: active } });
  if (res.count === 0) {
    await auditPlatform(req, actor, { ...entry, summary: `Dibatalkan: status desa ${village.name} (${village.code}) berubah bersamaan; tidak diterapkan.`, metadata: { reason: reason.value, aborted: true } });
    return bad("Status desa baru saja berubah. Muat ulang halaman lalu coba lagi.", 409);
  }
  clearVillageHealthCache(id);

  return NextResponse.json({ ok: true, changed: true, isActive: active });
}
