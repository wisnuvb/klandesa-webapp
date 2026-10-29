import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { categoryLabel, ensureCharges, requireFeeActor, scheduleScope } from "@/lib/mobile/fees";
import { isOwnReportPhotoUrl } from "@/lib/mobile/report-logic";
import { validateSchedule } from "@/lib/mobile/fees-logic";
import { getSpacesConfig } from "@/lib/spaces";

export async function GET(req: NextRequest) {
  const g = await requireFeeActor(req, "read");
  if (!g.ok) return g.response;
  const rows = await prisma.feeSchedule.findMany({ where: scheduleScope(g.actor), orderBy: [{ isActive: "desc" }, { createdAt: "desc" }], take: 100 });
  // Tagihan periode berjalan dibuat saat dibuka (selain oleh job harian).
  await Promise.all(rows.filter((r) => r.isActive).map((r) => ensureCharges(r)));
  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id, name: r.name, category: r.category, categoryLabel: categoryLabel(r.category), amount: r.amount, recurrence: r.recurrence,
      startPeriod: r.startPeriod, endPeriod: r.endPeriod, dueDay: r.dueDay, payInfo: r.payInfo, payQrUrl: r.payQrUrl, isActive: r.isActive,
    })),
  });
}

export async function POST(req: NextRequest) {
  const g = await requireFeeActor(req, "write");
  if (!g.ok) return g.response;
  const a = g.actor;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const v = validateSchedule(body, new Date());
  if (!v.ok) return mobileError("INVALID_REQUEST", v.message, 400);
  const qr = body?.payQrUrl;
  if (qr != null && qr !== "" && !isOwnReportPhotoUrl(qr, getSpacesConfig().cdnBaseUrl, a.villageCode, "mobile-fees")) {
    return mobileError("INVALID_REQUEST", "Gambar QRIS tidak valid. Unggah ulang dari aplikasi.", 400);
  }
  const active = await prisma.feeSchedule.count({ where: { ...scheduleScope(a), isActive: true } });
  if (active >= 30) return mobileError("INVALID_REQUEST", "Jadwal iuran aktif sudah banyak (maks. 30). Nonaktifkan yang tidak dipakai.", 400);

  const created = await prisma.feeSchedule.create({
    data: {
      villageId: a.villageId, scope: a.kind, rt: a.rt, rw: a.rw, ...v.value,
      payQrUrl: typeof qr === "string" && qr ? qr : null, createdByType: a.byType, createdById: a.byId,
    },
  });
  const made = await ensureCharges(created);
  if (a.kind === "desa") {
    const ctx = await requireStaff(req, "finance", "create");
    if (ctx.ok) void audit(ctx.ctx, req, "create_fee_schedule", "fee_schedules", created.id, { name: created.name, amount: created.amount });
  }
  return NextResponse.json({ id: created.id, chargesCreated: made }, { status: 201 });
}
