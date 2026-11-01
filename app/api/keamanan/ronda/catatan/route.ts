import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT, keamananCan } from "@/lib/keamanan/http";
import { createRondaLog, listRondaLogs } from "@/lib/keamanan/ronda";
import { RONDA_LOG_KINDS } from "@/lib/keamanan/catalog";

/** Buku catatan ronda (?groupId=&page=). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/keamanan/ronda/catatan", "Gagal memuat catatan ronda", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const q = req.nextUrl.searchParams;
    const r = await listRondaLogs(prisma, { villageId: ctx.village.id, groupId: parseIntId(q.get("groupId") ?? ""), page: Math.max(1, Math.min(100000, Number(q.get("page")) || 1)) });
    return NextResponse.json({ ...r, kinds: RONDA_LOG_KINDS, can: keamananCan(ctx) });
  });
}

/** Mencatat situasi/temuan ronda: { groupId, shiftDate, loggedAt (ISO + zona), kind: NIHIL|TEMUAN, description, reporter? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/keamanan/ronda/catatan", "Gagal mencatat ronda", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = await req.json().catch(() => null);
    const groupId = typeof body === "object" && body !== null ? parseIntId(String((body as Record<string, unknown>).groupId ?? "")) : null;
    if (!groupId) return NextResponse.json({ error: "Pilih regu ronda.", fieldErrors: { groupId: "Pilih regu ronda." } }, { status: 400 });
    const r = await createRondaLog(prisma, { villageId: ctx.village.id, groupId, userId: ctx.userId ?? null, input: body, today: todayJakarta() });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.rondaLog, r.data.id, { groupId, kind: r.data.kind });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
