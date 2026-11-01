import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT } from "@/lib/keamanan/http";
import { generateSchedule } from "@/lib/keamanan/ronda";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Membuat jadwal rotasi adil: { from, to, excludeResidentIds?, unavailable?: [{ residentId, date }], preview?: boolean }.
 * `preview: true` hanya menghitung (tidak menulis). Malam yang sudah punya giliran dilewati.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/regu/[id]/jadwal/buat", "Gagal membuat jadwal", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Regu tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const preview = typeof body === "object" && body !== null && (body as Record<string, unknown>).preview === true;
    const r = await generateSchedule(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, groupId: id, input: body, apply: !preview, today: todayJakarta() });
    if (!r.ok) return failResponse(r);
    if (!preview) await auditWeb(req, ctx, "generate", AUDIT.shift, id, { groupId: id, from: r.data.from, to: r.data.to, created: r.data.created, spread: r.data.spread });
    return NextResponse.json({ success: true, ...r.data });
  });
}
