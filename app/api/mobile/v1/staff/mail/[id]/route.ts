import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireStaff } from "@/lib/mobile/staff";
import { findIssuedLetter } from "@/lib/mobile/mail-data";
import { maskNik } from "@/lib/mobile/mail-logic";
import { roleCan, normalizeVillageRole } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "mail", "read");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const r = await prisma.mailRequest.findFirst({ where: { id: BigInt(id), villageId: ctx.villageId } });
  if (!r) return mobileError("INVALID_REQUEST", "Permohonan tidak ditemukan.", 404);

  const [resident, letter] = await Promise.all([
    prisma.resident.findUnique({
      where: { villageId_nik: { villageId: ctx.villageId, nik: r.nik } },
      select: { address: true, rt: true, rw: true, hamlet: true, birthDate: true, birthplace: true, occupation: true, kk: true },
    }),
    r.status === "approved" ? findIssuedLetter(r) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    id: Number(r.id), number: r.requestNumber, type: r.mailType, name: r.name, nikMasked: maskNik(r.nik), purpose: r.purpose,
    note: (r.formData as { note?: string } | null)?.note ?? null,
    channel: r.channel, onBehalf: r.onBehalfResidentId != null,
    status: r.status, notes: r.notes, rejectionReason: r.rejectionReason, createdAt: r.requestDate, processedAt: r.processedDate,
    resident: resident ? { address: resident.address, rt: resident.rt, rw: resident.rw, hamlet: resident.hamlet, birthDate: resident.birthDate, birthplace: resident.birthplace, occupation: resident.occupation } : null,
    letterIssued: !!letter,
    waitingRt: r.rtStatus === "pending", rtStatus: r.rtStatus, rtNote: r.rtNote,
    canDecide: r.status === "pending" && r.rtStatus !== "pending" && roleCan("mail", "update", normalizeVillageRole(ctx.role)),
  });
}
