import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/keamanan/http";
import { escalateRondaLog } from "@/lib/keamanan/kejadian";

type Ctx = { params: Promise<{ id: string }> };

/** Menjadikan temuan ronda sebagai kejadian keamanan: { kind, title, severity? }. Uraian, waktu, dan wilayah diambil dari catatan dan regu. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/ronda/catatan/[id]/eskalasi", "Gagal membuat kejadian dari catatan ronda", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    const r = await escalateRondaLog(prisma, { villageId: ctx.village.id, logId: id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.event, r.data.eventId, { domain: "KEAMANAN", kind: r.data.kind, fromRondaLog: id });
    return NextResponse.json({ success: true, eventId: r.data.eventId }, { status: 201 });
  });
}
