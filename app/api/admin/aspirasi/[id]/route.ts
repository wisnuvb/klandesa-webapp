import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { auditPlatform } from "@/lib/platform/audit";
import { actorOf } from "@/lib/platform/legacy-audit";
import { moderateAspiration } from "@/lib/aspirasi/moderation";
import { failJson, parseBigId } from "@/lib/aspirasi/http";
import { notifyVillageNewAspiration } from "@/lib/aspirasi/notify";
import { deleteAspirationPhotos } from "@/lib/aspirasi/photo-cleanup";

/** Moderasi satu aspirasi. Body: { action: publish|reject|hide|remove|reopen|noindex|index|edit, note?, rejectReason?, title?, body?, locationNote?, keepPhotoKeys? }. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const id = parseBigId((await params).id);
  if (!id) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  const body = await req.json().catch(() => null);
  const r = await moderateAspiration(prisma, id, { id: auth.admin.platformUserId, email: auth.admin.email }, body);
  if (!r.ok) return failJson(r);
  const action = String((body as { action?: unknown } | null)?.action ?? "");
  await auditPlatform(req, actorOf(auth), {
    action: `aspirasi.${action}`,
    targetType: "system",
    targetId: `aspirasi:${r.data.code}`,
    villageId: r.data.villageId,
    summary: `Moderasi aspirasi ${r.data.code}: ${action} → ${r.data.status}`,
    metadata: { code: r.data.code, action, status: r.data.status, photosRemoved: r.data.removedPhotoKeys.length },
  });
  // Foto yang dibuang (takedown/sunting) ikut dihapus dari penyimpanan, bukan hanya disembunyikan.
  if (r.data.removedPhotoKeys.length) void deleteAspirationPhotos(r.data.removedPhotoKeys);
  // Desa pengelola dikabari saat aspirasi tayang di wilayahnya.
  if (action === "publish" && r.data.villageId != null) {
    const a = await prisma.aspiration.findUnique({ where: { id }, select: { code: true, title: true, category: true } });
    if (a) void notifyVillageNewAspiration(r.data.villageId, a);
  }
  return NextResponse.json({ ok: true, ...r.data, publishedAt: r.data.publishedAt?.toISOString() ?? null });
}
