import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/mobile/staff";
import { categoryLabel, describeReport, parseImages } from "@/lib/mobile/report-logic";

/** Antrean pengaduan. `?scope=open` (PENDING+PROCESS, default) atau `closed` (30 hari terakhir). */
export async function GET(req: NextRequest) {
  const g = await requireStaff(req, "citizen_reports", "read");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const closed = req.nextUrl.searchParams.get("scope") === "closed";

  const rows = await prisma.citizenReport.findMany({
    where: closed
      ? { villageId: ctx.villageId, status: { in: ["DONE", "REJECT"] }, updatedAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } }
      : { villageId: ctx.villageId, status: { in: ["PENDING", "PROCESS"] } },
    orderBy: closed ? { updatedAt: "desc" } : { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json({
    items: rows.map((r) => {
      const imgs = parseImages(r.images);
      return {
        id: Number(r.id), title: r.title, category: categoryLabel(r.category), status: r.status, stage: describeReport(r.status, false).stage,
        reporter: r.reporterName, photos: imgs.length, thumb: imgs[0] ?? null, createdAt: r.createdAt, source: r.residentId ? "mobile" : "web",
      };
    }),
  });
}
