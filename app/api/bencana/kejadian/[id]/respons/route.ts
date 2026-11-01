import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/bencana/http";
import { addResponse } from "@/lib/incident/service";

type Ctx = { params: Promise<{ id: string }> };

/** Menambah catatan tindakan: { loggedAt (ISO + zona), kind, description, actor? }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/bencana/kejadian/[id]/respons", "Gagal mencatat tindakan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kejadian tidak ditemukan." }, { status: 404 });
    const r = await addResponse(prisma, { domain: "BENCANA", villageId: ctx.village.id, id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.response, r.data.id, { eventId: id, kind: r.data.kind });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
