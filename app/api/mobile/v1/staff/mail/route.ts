import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/mobile/staff";
import { excerpt, maskNik } from "@/lib/mobile/mail-logic";

/** Antrean permohonan surat. `?scope=pending` (default) atau `done` (30 hari terakhir). */
export async function GET(req: NextRequest) {
  const g = await requireStaff(req, "mail", "read");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const done = req.nextUrl.searchParams.get("scope") === "done";

  const rows = await prisma.mailRequest.findMany({
    where: done
      ? { villageId: ctx.villageId, status: { in: ["approved", "rejected"] }, processedDate: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } }
      : { villageId: ctx.villageId, status: "pending", OR: [{ rtStatus: null }, { rtStatus: "approved" }] }, // yang masih menunggu RT belum masuk antrean desa
    orderBy: done ? { processedDate: "desc" } : { requestDate: "asc" }, // antrean: yang paling lama menunggu di atas
    take: 100,
  });
  return NextResponse.json({
    items: rows.map((r) => ({
      id: Number(r.id), number: r.requestNumber, type: r.mailType, name: r.name, nikMasked: maskNik(r.nik),
      purpose: excerpt(r.purpose, 100), channel: r.channel, onBehalf: r.onBehalfResidentId != null,
      status: r.status, createdAt: r.requestDate, processedAt: r.processedDate,
    })),
  });
}
