import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { patchCustomItem, removeCustomItem } from "@/lib/bencana/service";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Butir tidak ditemukan." }, { status: 404 });

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/bencana/kesiapan/butir/[id]", "Gagal menyimpan butir", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await patchCustomItem(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "drm_readiness_items", id, { keys: r.data.keys });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/bencana/kesiapan/butir/[id]", "Gagal menghapus butir", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await removeCustomItem(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "drm_readiness_items", id, { label: r.data.label });
    return NextResponse.json({ success: true });
  });
}
