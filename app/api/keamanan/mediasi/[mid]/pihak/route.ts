import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT } from "@/lib/keamanan/http";
import { addParty } from "@/lib/keamanan/kejadian";

type Ctx = { params: Promise<{ mid: string }> };

/** Menambah pihak: { side, residentId? | name?, attended?, agrees?, note? }. Tanpa NIK/alamat/telepon; anak ditandai otomatis dari tanggal lahir warga. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/mediasi/[mid]/pihak", "Gagal menambah pihak", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).mid);
    if (!id) return NextResponse.json({ error: "Mediasi tidak ditemukan." }, { status: 404 });
    const r = await addParty(prisma, { villageId: ctx.village.id, mediationId: id, input: await req.json().catch(() => null), today: todayJakarta() });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.party, r.data.id, { mediationId: id, eventId: r.data.eventId, side: r.data.side, isMinor: r.data.isMinor });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
