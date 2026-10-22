import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { notifyReportUpdate } from "@/lib/mobile/notify";
import { canRespondToReport } from "@/lib/mobile/report-logic";

/** Tulis tanggapan untuk pelapor (hanya saat laporan masih PENDING/PROCESS, seperti di web). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "citizen_reports", "update");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = Number((await params).id);
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!Number.isInteger(id) || text.length < 3 || text.length > 1000) {
    return mobileError("INVALID_REQUEST", "Tulis tanggapan 3–1000 huruf.", 400, { field: "text" });
  }
  const r = await prisma.citizenReport.findFirst({ where: { id: BigInt(id), villageId: ctx.villageId }, select: { status: true } });
  if (!r) return mobileError("INVALID_REQUEST", "Laporan tidak ditemukan.", 404);
  if (!canRespondToReport(r.status)) {
    return mobileError("INVALID_REQUEST", "Tanggapan tidak bisa ditambahkan pada laporan yang sudah selesai atau ditolak.", 409);
  }
  const created = await prisma.citizenReportResponse.create({
    data: { citizenReportId: BigInt(id), villageId: ctx.villageId, response: text, responderId: ctx.userId, responderName: ctx.name, responderRole: ctx.roleLabel },
  });
  void audit(ctx, req, "respond", "citizen_reports", id, { responseId: Number(created.id) });
  void notifyReportUpdate(BigInt(id), "response");
  return NextResponse.json({ id: Number(created.id) }, { status: 201 });
}
