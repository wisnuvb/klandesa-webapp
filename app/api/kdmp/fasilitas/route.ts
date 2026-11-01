import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { createFacility } from "@/lib/kdmp/service";

/** Mendaftarkan gerai/gudang/kelengkapan: { year, kind, name, location?, contract?, note? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/kdmp/fasilitas", "Gagal menambah gerai/gudang", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createFacility(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "kdmp_facilities", r.data.id, { year: r.data.year, kind: r.data.kind, name: r.data.name, contract: r.data.contract });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
