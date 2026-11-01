import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { AUDIT, hasDetail, keamananCan } from "@/lib/keamanan/http";
import { createRisk, listRisks } from "@/lib/keamanan/service";
import { RISK_KINDS, RISK_LEVELS } from "@/lib/keamanan/catalog";

/** Daftar wilayah rawan. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/keamanan/kerawanan", "Gagal memuat wilayah rawan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const list = await listRisks(prisma, { villageId: ctx.village.id });
    return NextResponse.json({ ...list, kinds: RISK_KINDS, levels: RISK_LEVELS, can: keamananCan(ctx), detail: hasDetail(ctx) });
  });
}

export async function POST(req: NextRequest) {
  return attempt("POST /api/keamanan/kerawanan", "Gagal menyimpan wilayah rawan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createRisk(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.risk, r.data.id, { kind: r.data.kind, level: r.data.level });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
