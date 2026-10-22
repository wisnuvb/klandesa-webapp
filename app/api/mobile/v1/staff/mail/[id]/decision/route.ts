import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { notifyMailRequestStatus } from "@/lib/mobile/notify";

/** Setujui / tolak permohonan surat. Menolak wajib memberi alasan agar warga tahu cara memperbaiki. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "mail", "update");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = Number((await params).id);
  const body = (await req.json().catch(() => null)) as { decision?: unknown; note?: unknown } | null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!Number.isInteger(id) || (body?.decision !== "approve" && body?.decision !== "reject")) {
    return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  if (body.decision === "reject" && note.length < 5) {
    return mobileError("INVALID_REQUEST", "Tulis alasan penolakan (minimal 5 huruf) agar warga bisa memperbaiki.", 400, { field: "note" });
  }

  // Update bersyarat: dua staf menekan bersamaan, hanya satu yang berhasil.
  const approve = body.decision === "approve";
  const res = await prisma.mailRequest.updateMany({
    where: { id: BigInt(id), villageId: ctx.villageId, status: "pending" },
    data: {
      status: approve ? "approved" : "rejected",
      processedDate: new Date(),
      ...(approve ? { notes: note || null } : { rejectionReason: note }),
    },
  });
  if (res.count !== 1) return mobileError("INVALID_REQUEST", "Permohonan ini sudah diproses atau tidak ditemukan.", 409);

  void audit(ctx, req, approve ? "approve" : "reject", "mail_requests", id, { via: "mobile", note: note || undefined });
  void notifyMailRequestStatus(BigInt(id));
  return new NextResponse(null, { status: 204 });
}
