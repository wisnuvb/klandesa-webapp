import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRt } from "@/lib/mobile/rt";

/** Ringkasan beranda Ketua RT: berapa pengantar menunggu. */
export async function GET(req: NextRequest) {
  const g = await requireRt(req);
  if (!g.ok) return g.response;
  const { ctx } = g;
  const pending = await prisma.mailRequest.count({
    where: {
      villageId: ctx.villageId, rtStatus: "pending", status: "pending", applicantRt: ctx.scope.rt,
      ...(ctx.scope.rw ? { applicantRw: ctx.scope.rw } : {}), NOT: { residentId: ctx.residentId },
    },
  });
  return NextResponse.json({ name: ctx.name, rt: ctx.scope.rt, rw: ctx.scope.rw, pendingRequests: pending });
}
