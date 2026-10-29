import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireRt } from "@/lib/mobile/rt";
import { canRtAccessRequest, canRtDecide } from "@/lib/mobile/rt-logic";
import { notifyAccount, notifyVillageStaff } from "@/lib/mobile/notify";
import { auditAs } from "@/lib/mobile/audit-actor";

/** Ketua RT setuju (pengantar) atau menolak permohonan warganya. Setuju → masuk antrean desa; tolak → warga diminta memperbaiki. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRt(req);
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = Number((await params).id);
  const body = (await req.json().catch(() => null)) as { decision?: unknown; note?: unknown } | null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : "";
  if (!Number.isInteger(id) || (body?.decision !== "approve" && body?.decision !== "reject")) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const approve = body.decision === "approve";
  if (!approve && note.length < 5) return mobileError("INVALID_REQUEST", "Tulis alasan penolakan (minimal 5 huruf) agar warga bisa memperbaiki.", 400, { field: "note" });

  const r = await prisma.mailRequest.findFirst({ where: { id: BigInt(id), villageId: ctx.villageId } });
  if (!r || !canRtAccessRequest({ villageId: ctx.villageId, scope: ctx.scope, residentId: ctx.residentId }, { ...r, requesterResidentId: r.residentId })) {
    return mobileError("INVALID_REQUEST", "Permohonan tidak ditemukan.", 404);
  }
  if (!canRtDecide(r)) return mobileError("INVALID_REQUEST", "Permohonan ini sudah diputuskan.", 409);

  // Bersyarat: dua petugas menekan bersamaan, hanya satu yang berhasil.
  const now = new Date();
  const res = await prisma.mailRequest.updateMany({
    where: { id: r.id, villageId: ctx.villageId, rtStatus: "pending", status: "pending" },
    data: approve
      ? { rtStatus: "approved", rtNote: note || null, rtDecidedAt: now, rtDecidedByResidentId: ctx.residentId }
      : { rtStatus: "rejected", rtNote: note, rtDecidedAt: now, rtDecidedByResidentId: ctx.residentId, status: "rejected", processedDate: now, rejectionReason: `Ditolak RT: ${note}` },
  });
  if (res.count !== 1) return mobileError("INVALID_REQUEST", "Permohonan ini sudah diputuskan.", 409);

  // RT bukan akun staf: pelaku dicatat di AuditLog.metadata.actor (selain kolom rtDecidedByResidentId).
  void auditAs(req, ctx.villageId, { type: "rt", residentId: ctx.residentId, name: ctx.name, rt: ctx.scope.rt, rw: ctx.scope.rw }, approve ? "rt_approve" : "rt_reject", "mail_requests", Number(r.id), { note: note || undefined });
  if (r.residentId) {
    const acc = await prisma.citizenAccount.findUnique({ where: { residentId: r.residentId }, select: { id: true, status: true } });
    if (acc?.status === "ACTIVE") {
      void notifyAccount("citizen", acc.id, ctx.villageId, {
        type: "mail_status", deepLink: `/surat/${Number(r.id)}`,
        title: approve ? "Pengantar RT disetujui" : "Permohonan ditolak RT",
        body: approve ? `${r.mailType} diteruskan ke kantor desa.` : `${r.mailType}: ${note}`,
      });
    }
  }
  if (approve) {
    void notifyVillageStaff(ctx.villageId, "mail", { type: "mail_status", title: "Permohonan surat baru (sudah dari RT)", body: `${r.mailType} - ${r.name}`, deepLink: `/staff/surat/${Number(r.id)}` });
  }
  return new NextResponse(null, { status: 204 });
}
