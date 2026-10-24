import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { notifyAccount } from "@/lib/mobile/notify";
import { CHANGE_FIELDS, canApplyAutomatically, isChangeField } from "@/lib/mobile/data-change-logic";

/**
 * Setujui / tolak koreksi data. Kolom aman (alamat, telepon, dst) langsung diterapkan ke data warga;
 * kolom identitas hanya ditandai disetujui, staf mengubahnya di web setelah memeriksa dokumen.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "residents", "update");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = Number((await params).id);
  const body = (await req.json().catch(() => null)) as { decision?: unknown; note?: unknown } | null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : "";
  if (!Number.isInteger(id) || (body?.decision !== "approve" && body?.decision !== "reject")) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const approve = body.decision === "approve";
  if (!approve && note.length < 5) return mobileError("INVALID_REQUEST", "Tulis alasan penolakan (minimal 5 huruf) agar warga paham.", 400, { field: "note" });

  const req0 = await prisma.dataChangeRequest.findFirst({ where: { id, villageId: ctx.villageId } });
  if (!req0 || req0.status !== "pending") return mobileError("INVALID_REQUEST", "Pengajuan ini sudah diproses atau tidak ditemukan.", 409);
  const auto = approve && isChangeField(req0.field) && canApplyAutomatically(req0.field);

  const applied = await prisma.$transaction(async (tx) => {
    const res = await tx.dataChangeRequest.updateMany({
      where: { id, villageId: ctx.villageId, status: "pending" },
      data: { status: approve ? "approved" : "rejected", reviewedById: ctx.userId, reviewedAt: new Date(), reviewNote: note || null, appliedAt: auto ? new Date() : null },
    });
    if (res.count !== 1) return null;
    if (auto) {
      // Kolom yang boleh diterapkan otomatis bernama sama dengan kolom Resident (lihat CHANGE_FIELDS).
      await tx.resident.updateMany({ where: { id: req0.residentId, villageId: ctx.villageId }, data: { [req0.field]: req0.newValue } });
    }
    return true;
  });
  if (!applied) return mobileError("INVALID_REQUEST", "Pengajuan ini sudah diproses atau tidak ditemukan.", 409);

  void audit(ctx, req, approve ? "approve_data_change" : "reject_data_change", "data_change_requests", id, { field: req0.field, residentId: req0.residentId, applied: auto });

  const acc = await prisma.citizenAccount.findUnique({ where: { residentId: req0.requestedByResidentId }, select: { id: true, status: true } });
  if (acc?.status === "ACTIVE") {
    const label = isChangeField(req0.field) ? CHANGE_FIELDS[req0.field].label : "Data";
    void notifyAccount("citizen", acc.id, ctx.villageId, {
      type: "data_change", deepLink: "/koreksi",
      title: approve ? "Koreksi data disetujui" : "Koreksi data ditolak",
      body: approve ? (auto ? `${label} sudah diperbarui di data desa.` : `${label} disetujui. Desa akan memperbarui datanya.`) : `${label}: ${note}`,
    });
  }
  return new NextResponse(null, { status: 204 });
}
