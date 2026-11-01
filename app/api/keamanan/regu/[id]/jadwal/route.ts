import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addDays, timeJakarta, todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT, keamananCan } from "@/lib/keamanan/http";
import { addShift, getSchedule } from "@/lib/keamanan/ronda";
import { ATTENDANCE, MARKABLE } from "@/lib/keamanan/catalog";
import { parseIsoDate } from "@/lib/form-input";
import { sane } from "@/lib/incident/schema";

type Ctx = { params: Promise<{ id: string }> };

/** Jadwal satu regu (?from=YYYY-MM-DD&to=YYYY-MM-DD, maksimal 62 malam; bawaan: 3 malam lalu sampai 14 malam ke depan). */
export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/keamanan/regu/[id]/jadwal", "Gagal memuat jadwal", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Regu tidak ditemukan." }, { status: 404 });
    const today = todayJakarta();
    const q = req.nextUrl.searchParams;
    // Tahun dibatasi 2000-2100 (sane): tanggal ekstrem diganti bawaan, dan servis menolak rentang > 62 malam sebelum membangun larik.
    const from = sane(parseIsoDate(q.get("from"))) ? q.get("from")! : addDays(today, -3);
    const to = sane(parseIsoDate(q.get("to"))) ? q.get("to")! : addDays(today, 14);
    const r = await getSchedule(prisma, { villageId: ctx.village.id, groupId: id, from, to });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, from, to, today, nowTime: timeJakarta(), attendance: ATTENDANCE, markable: MARKABLE, can: keamananCan(ctx) });
  });
}

/** Menambah satu giliran manual: { shiftDate, residentId }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/regu/[id]/jadwal", "Gagal menambah giliran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Regu tidak ditemukan." }, { status: 404 });
    const r = await addShift(prisma, { villageId: ctx.village.id, groupId: id, userId: ctx.userId ?? null, input: await req.json().catch(() => null), today: todayJakarta() });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.shift, r.data.id, { groupId: id, date: r.data.date, residentId: r.data.residentId });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
