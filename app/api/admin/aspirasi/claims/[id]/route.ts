import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { auditPlatform } from "@/lib/platform/audit";
import { actorOf } from "@/lib/platform/legacy-audit";
import { reviewClaim } from "@/lib/aspirasi/moderation";
import { failJson } from "@/lib/aspirasi/http";
import { notifyClaimDecision, notifyVillageBacklog } from "@/lib/aspirasi/notify";

/** Putuskan klaim desa. Body: { decision: "approve" | "reject" | "revoke", note? } (alasan wajib untuk reject/revoke). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const idRaw = (await params).id;
  const id = /^\d{1,10}$/.test(idRaw) ? Number(idRaw) : 0;
  if (!id) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { decision?: unknown; note?: unknown } | null;
  const r = await reviewClaim(prisma, id, { id: auth.admin.platformUserId, email: auth.admin.email }, body);
  if (!r.ok) return failJson(r);
  await auditPlatform(req, actorOf(auth), {
    action: `aspirasi.claim_${String(body?.decision)}`,
    targetType: "village",
    targetId: r.data.villageId,
    villageId: r.data.villageId,
    summary: `Klaim halaman aspirasi ${r.data.areaSlug} untuk ${r.data.villageName}: ${r.data.status}`,
    metadata: { claimId: id, status: r.data.status, areaSlug: r.data.areaSlug },
  });
  const area = await prisma.aspirationArea.findUnique({ where: { slug: r.data.areaSlug }, select: { id: true, name: true } });
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null;
  void notifyClaimDecision({ to: r.data.userEmail, decision: r.data.status as "APPROVED" | "REJECTED" | "REVOKED", areaName: area?.name ?? r.data.areaSlug, note });
  if (r.data.status === "APPROVED" && area) void notifyVillageBacklog(r.data.villageId, area.id);
  return NextResponse.json({ ok: true, status: r.data.status });
}
