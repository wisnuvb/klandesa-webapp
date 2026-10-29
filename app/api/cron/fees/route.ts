import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCronSecret } from "@/lib/regional-news/config";
import { isValidCronAuth } from "@/lib/regional-news/cron-auth";
import { ensureCharges, withStatus } from "@/lib/mobile/fees";
import { needsReminder } from "@/lib/mobile/fees-logic";
import { notifyAccount } from "@/lib/mobile/notify";

export const dynamic = "force-dynamic";

/** Job harian: buat tagihan periode berjalan untuk semua jadwal aktif, lalu kirim pengingat tagihan lewat jatuh tempo. Dijalankan dengan `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: NextRequest) {
  const secret = getCronSecret();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  if (!isValidCronAuth(req.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const schedules = await prisma.feeSchedule.findMany({ where: { isActive: true }, take: 5000 });
  let created = 0;
  for (const s of schedules) created += await ensureCharges(s, now);

  let reminded = 0;
  const dueDay = new Map(schedules.map((s) => [s.id, s.dueDay]));
  const names = new Map(schedules.map((s) => [s.id, s.name]));
  const candidates = await prisma.feeCharge.findMany({ where: { scheduleId: { in: schedules.map((s) => s.id) }, waivedAt: null }, orderBy: { period: "desc" }, take: 5000 });
  const withSt = await withStatus(candidates, dueDay, now);
  for (const c of withSt) {
    if (!c.headResidentId || !needsReminder({ status: c.status, dueDate: c.dueDate, lastRemindedAt: c.lastRemindedAt, now })) continue;
    const acc = await prisma.citizenAccount.findUnique({ where: { residentId: c.headResidentId }, select: { id: true, status: true } });
    if (acc?.status !== "ACTIVE") continue;
    await notifyAccount("citizen", acc.id, c.villageId, { type: "system", deepLink: "/tagihan", title: "Pengingat tagihan", body: `${names.get(c.scheduleId) ?? "Iuran"}: sisa Rp${c.outstanding.toLocaleString("id-ID")}` });
    await prisma.feeCharge.update({ where: { id: c.id }, data: { lastRemindedAt: now } });
    reminded += 1;
  }
  return NextResponse.json({ ok: true, schedules: schedules.length, chargesCreated: created, reminded });
}
