import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { notifyReportUpdate } from "@/lib/mobile/notify";
import { REPORT_TRANSITIONS } from "@/lib/mobile/report-logic";

/** Ubah status laporan: PENDING→PROCESS|REJECT, PROCESS→DONE|REJECT. Menolak wajib beralasan. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "citizen_reports", "update");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = Number((await params).id);
  const body = (await req.json().catch(() => null)) as { status?: unknown; reason?: unknown } | null;
  const status = typeof body?.status === "string" ? body.status : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (!Number.isInteger(id) || !["PROCESS", "DONE", "REJECT"].includes(status)) {
    return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  if (status === "REJECT" && reason.length < 5) {
    return mobileError("INVALID_REQUEST", "Tulis alasan penolakan (minimal 5 huruf).", 400, { field: "reason" });
  }

  const existing = await prisma.citizenReport.findFirst({ where: { id: BigInt(id), villageId: ctx.villageId }, select: { status: true } });
  if (!existing) return mobileError("INVALID_REQUEST", "Laporan tidak ditemukan.", 404);
  if (!REPORT_TRANSITIONS[existing.status]?.includes(status)) {
    return mobileError("INVALID_REQUEST", "Status laporan ini tidak bisa diubah ke pilihan tersebut.", 409);
  }

  // Bersyarat pada status lama agar dua staf tidak saling menimpa.
  const res = await prisma.citizenReport.updateMany({
    where: { id: BigInt(id), villageId: ctx.villageId, status: existing.status },
    data: {
      status,
      doneById: status === "DONE" ? ctx.userId : null,
      // Masuk ulang ke penanganan/selesai: tanyakan lagi "sudah beres?" kepada pelapor.
      ...(status === "PROCESS" || status === "DONE" ? { resolvedFeedback: null, feedbackAt: null } : {}),
    },
  });
  if (res.count !== 1) return mobileError("INVALID_REQUEST", "Laporan ini baru saja diubah staf lain. Muat ulang.", 409);

  if (status === "REJECT") {
    await prisma.citizenReportResponse.create({
      data: { citizenReportId: BigInt(id), villageId: ctx.villageId, response: reason, responderId: ctx.userId, responderName: ctx.name, responderRole: ctx.roleLabel },
    });
  }
  void audit(ctx, req, "status_change", "citizen_reports", id, { from: existing.status, to: status });
  void notifyReportUpdate(BigInt(id), "status");
  return new NextResponse(null, { status: 204 });
}
