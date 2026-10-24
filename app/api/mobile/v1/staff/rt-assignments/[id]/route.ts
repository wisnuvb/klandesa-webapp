import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";

/** Cabut penugasan RT (nonaktif; riwayat keputusan RT tetap tersimpan di permohonan). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "settings", "update");
  if (!g.ok) return g.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const res = await prisma.villageRoleAssignment.updateMany({ where: { id, villageId: g.ctx.villageId, role: "rt", isActive: true }, data: { isActive: false } });
  if (res.count !== 1) return mobileError("INVALID_REQUEST", "Penugasan tidak ditemukan.", 404);
  void audit(g.ctx, req, "unassign_rt", "village_role_assignments", id);
  return new NextResponse(null, { status: 204 });
}
