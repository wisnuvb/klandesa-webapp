import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { categoryLabel, describeReport, parseImages } from "@/lib/mobile/report-logic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  const id = Number((await params).id);
  if (!me || !Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const r = await prisma.citizenReport.findFirst({
    where: { id: BigInt(id), villageId: loaded.ctx.villageId, residentId: me.id },
    include: { responses: { orderBy: { createdAt: "asc" } } },
  });
  if (!r) return mobileError("INVALID_REQUEST", "Laporan tidak ditemukan.", 404);

  const v = describeReport(r.status, r.responses.length > 0);
  return NextResponse.json({
    id: Number(r.id), title: r.title, category: categoryLabel(r.category), content: r.content, photos: parseImages(r.images),
    locationNote: r.locationNote, hasLocation: r.locationLat != null && r.locationLng != null,
    isPublic: r.isPublic, isAnonymous: r.isAnonymous, createdAt: r.createdAt,
    stage: v.stage, stageTitle: v.title, next: v.next, steps: v.steps,
    feedback: r.resolvedFeedback, canGiveFeedback: r.status === "DONE" && !r.resolvedFeedback,
    responses: r.responses.map((x) => ({ id: Number(x.id), by: x.responderName, role: x.responderRole, text: x.response, at: x.createdAt })),
  });
}
