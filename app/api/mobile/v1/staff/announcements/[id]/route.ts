import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";

/** Tarik pengumuman dari tampilan warga (isActive=false). Bisa diaktifkan lagi dengan { active: true }. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "announcements", "update");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = Number((await params).id);
  const body = (await req.json().catch(() => null)) as { active?: unknown; pinned?: unknown } | null;
  if (!Number.isInteger(id) || (typeof body?.active !== "boolean" && typeof body?.pinned !== "boolean")) {
    return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  const res = await prisma.announcement.updateMany({
    where: { id, villageId: ctx.villageId },
    data: { ...(typeof body.active === "boolean" ? { isActive: body.active } : {}), ...(typeof body.pinned === "boolean" ? { isPinned: body.pinned } : {}) },
  });
  if (res.count !== 1) return mobileError("INVALID_REQUEST", "Pengumuman tidak ditemukan.", 404);
  void audit(ctx, req, "update", "announcements", id, { active: body.active, pinned: body.pinned });
  return new NextResponse(null, { status: 204 });
}
