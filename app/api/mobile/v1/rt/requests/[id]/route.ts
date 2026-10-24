import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireRt } from "@/lib/mobile/rt";
import { maskNik } from "@/lib/mobile/mail-logic";
import { canRtAccessRequest, canRtDecide } from "@/lib/mobile/rt-logic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRt(req);
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const r = await prisma.mailRequest.findFirst({ where: { id: BigInt(id), villageId: ctx.villageId } });
  // Tidak ada / di luar cakupan RT → pesan yang sama (tidak membocorkan keberadaan permohonan RT lain).
  if (!r || !canRtAccessRequest({ villageId: ctx.villageId, scope: ctx.scope, residentId: ctx.residentId }, { ...r, requesterResidentId: r.residentId })) {
    return mobileError("INVALID_REQUEST", "Permohonan tidak ditemukan.", 404);
  }
  const resident = await prisma.resident.findUnique({
    where: { villageId_nik: { villageId: ctx.villageId, nik: r.nik } },
    select: { address: true, birthDate: true, occupation: true, familyRole: true },
  });
  return NextResponse.json({
    id: Number(r.id), type: r.mailType, name: r.name, nikMasked: maskNik(r.nik), purpose: r.purpose,
    note: (r.formData as { note?: string } | null)?.note ?? null, onBehalf: r.onBehalfResidentId != null,
    createdAt: r.requestDate, rtStatus: r.rtStatus, rtNote: r.rtNote, decidedAt: r.rtDecidedAt,
    resident: resident ? { address: resident.address, birthDate: resident.birthDate, occupation: resident.occupation, familyRole: resident.familyRole } : null,
    canDecide: canRtDecide(r),
  });
}
