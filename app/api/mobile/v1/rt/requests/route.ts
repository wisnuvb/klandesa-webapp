import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRt } from "@/lib/mobile/rt";
import { excerpt, maskNik } from "@/lib/mobile/mail-logic";

/** Antrean pengantar RT. `?scope=pending` (default) atau `done` (30 hari terakhir). Selalu dibatasi desa + RT/RW petugas. */
export async function GET(req: NextRequest) {
  const g = await requireRt(req);
  if (!g.ok) return g.response;
  const { ctx } = g;
  const done = req.nextUrl.searchParams.get("scope") === "done";
  const scopeWhere = {
    villageId: ctx.villageId, applicantRt: ctx.scope.rt, ...(ctx.scope.rw ? { applicantRw: ctx.scope.rw } : {}), NOT: { residentId: ctx.residentId },
  };
  const rows = await prisma.mailRequest.findMany({
    where: done
      ? { ...scopeWhere, rtStatus: { in: ["approved", "rejected"] }, rtDecidedAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } }
      : { ...scopeWhere, rtStatus: "pending", status: "pending" },
    orderBy: done ? { rtDecidedAt: "desc" } : { requestDate: "asc" },
    take: 100,
  });
  return NextResponse.json({
    items: rows.map((r) => ({
      id: Number(r.id), type: r.mailType, name: r.name, nikMasked: maskNik(r.nik), purpose: excerpt(r.purpose, 100),
      onBehalf: r.onBehalfResidentId != null, rtStatus: r.rtStatus, createdAt: r.requestDate, decidedAt: r.rtDecidedAt,
    })),
  });
}
