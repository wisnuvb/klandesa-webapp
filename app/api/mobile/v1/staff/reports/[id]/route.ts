import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireStaff } from "@/lib/mobile/staff";
import { maskNik } from "@/lib/mobile/mail-logic";
import { REPORT_TRANSITIONS, canRespondToReport, categoryLabel, describeReport, parseImages } from "@/lib/mobile/report-logic";
import { roleCan, normalizeVillageRole } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "citizen_reports", "read");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const r = await prisma.citizenReport.findFirst({
    where: { id: BigInt(id), villageId: ctx.villageId },
    include: { responses: { orderBy: { createdAt: "asc" } } },
  });
  if (!r) return mobileError("INVALID_REQUEST", "Laporan tidak ditemukan.", 404);

  const resident = r.residentId
    ? await prisma.resident.findUnique({ where: { id: r.residentId }, select: { rt: true, rw: true, hamlet: true, address: true, phone: true } })
    : null;
  const canAct = roleCan("citizen_reports", "update", normalizeVillageRole(ctx.role));
  const view = describeReport(r.status, r.responses.length > 0);

  return NextResponse.json({
    id: Number(r.id), title: r.title, category: categoryLabel(r.category), content: r.content, photos: parseImages(r.images),
    reporter: r.reporterName, reporterNikMasked: r.reporterNik ? maskNik(r.reporterNik) : null,
    reporterWantsAnonymous: r.isAnonymous, isPublic: r.isPublic,
    resident: resident ? { rt: resident.rt, rw: resident.rw, hamlet: resident.hamlet, address: resident.address } : null,
    location: r.locationLat != null && r.locationLng != null ? { lat: r.locationLat, lng: r.locationLng } : null,
    locationNote: r.locationNote, createdAt: r.createdAt, status: r.status, stage: view.stage, stageTitle: view.title,
    feedback: r.resolvedFeedback,
    actions: canAct ? REPORT_TRANSITIONS[r.status] ?? [] : [],
    canRespond: canAct && canRespondToReport(r.status),
    responses: r.responses.map((x) => ({ id: Number(x.id), by: x.responderName, role: x.responderRole, text: x.response, at: x.createdAt })),
  });
}
