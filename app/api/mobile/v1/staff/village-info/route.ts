import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { mergeVillageInfoSettings, readVillageInfoSettings } from "@/lib/mobile/village-info-logic";
import { mergeRtApproval, readRtApproval } from "@/lib/mobile/rt-logic";

export async function GET(req: NextRequest) {
  const g = await requireStaff(req, "settings", "read");
  if (!g.ok) return g.response;
  const v = await prisma.village.findUnique({ where: { id: g.ctx.villageId }, select: { settings: true } });
  return NextResponse.json({ ...readVillageInfoSettings(v?.settings), rtApproval: readRtApproval(v?.settings) });
}

/** Atur Info Desa: tampilkan ringkasan anggaran ke warga, nomor penting, dan jam layanan. */
export async function PATCH(req: NextRequest) {
  const g = await requireStaff(req, "settings", "update");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const body = (await req.json().catch(() => null)) as { budgetPublic?: unknown; emergencyContacts?: unknown; serviceHours?: unknown; rtApproval?: unknown; scorecardPublic?: unknown } | null;
  if (!body || typeof body !== "object") return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  if (body.budgetPublic !== undefined && typeof body.budgetPublic !== "boolean") return mobileError("INVALID_REQUEST", "Nilai tidak valid.", 400);
  if (body.emergencyContacts !== undefined && !Array.isArray(body.emergencyContacts)) return mobileError("INVALID_REQUEST", "Daftar nomor penting tidak valid.", 400);
  if (body.serviceHours !== undefined && typeof body.serviceHours !== "string") return mobileError("INVALID_REQUEST", "Jam layanan tidak valid.", 400);
  if (body.scorecardPublic !== undefined && typeof body.scorecardPublic !== "boolean") return mobileError("INVALID_REQUEST", "Nilai tidak valid.", 400);
  if (body.rtApproval !== undefined && typeof body.rtApproval !== "boolean") return mobileError("INVALID_REQUEST", "Nilai tidak valid.", 400);
  if (body.budgetPublic === undefined && body.emergencyContacts === undefined && body.serviceHours === undefined && body.rtApproval === undefined && body.scorecardPublic === undefined) {
    return mobileError("INVALID_REQUEST", "Tidak ada yang diubah.", 400);
  }

  const v = await prisma.village.findUnique({ where: { id: ctx.villageId }, select: { settings: true } });
  let next = mergeVillageInfoSettings(v?.settings, body as { budgetPublic?: boolean; scorecardPublic?: boolean; emergencyContacts?: unknown; serviceHours?: unknown });
  if (typeof body.rtApproval === "boolean") next = mergeRtApproval(next, body.rtApproval);
  await prisma.village.update({ where: { id: ctx.villageId }, data: { settings: next as never } });
  void audit(ctx, req, "village_info_settings", "villages", ctx.villageId, {
    budgetPublic: body.budgetPublic,
    scorecardPublic: body.scorecardPublic,
    contacts: Array.isArray(body.emergencyContacts) ? body.emergencyContacts.length : undefined,
    serviceHours: body.serviceHours !== undefined,
    rtApproval: body.rtApproval,
  });
  return new NextResponse(null, { status: 204 });
}
