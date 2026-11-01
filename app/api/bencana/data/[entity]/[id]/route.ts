import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { ENTITIES, isEntityKey } from "@/lib/bencana/entities";

type Ctx = { params: Promise<{ entity: string; id: string }> };
const notFound = () => NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/bencana/data/[entity]/[id]", "Gagal menyimpan data", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const id = parseIntId(p.id);
    if (!isEntityKey(p.entity) || !id) return notFound();
    const r = await ENTITIES[p.entity].patch(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", ENTITIES[p.entity].table, id, r.data);
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/bencana/data/[entity]/[id]", "Gagal menghapus data", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const id = parseIntId(p.id);
    if (!isEntityKey(p.entity) || !id) return notFound();
    const r = await ENTITIES[p.entity].remove(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", ENTITIES[p.entity].table, id, r.data);
    return NextResponse.json({ success: true });
  });
}
