import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { createLegal, listLegal, LEGAL_TYPE_LABEL } from "@/lib/tata-kelola/legal";
import { can, failResponse, listParams } from "@/lib/tata-kelola/http";

/** Register produk hukum desa (?type=&status=BERLAKU|DICABUT&year=&search=&page=&pageSize=). */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const { sp, page, pageSize, search, year } = listParams(req);
    const list = await listLegal(prisma, ctx.village.id, { type: sp.get("type") ?? undefined, status: sp.get("status") ?? undefined, year, search, page, pageSize });
    return NextResponse.json({ ...list, can: can("produk_hukum", ctx.dbUser.role, ["create", "update", "delete"]), types: LEGAL_TYPE_LABEL });
  } catch (e) {
    console.error("GET /api/tata-kelola/produk-hukum error:", e);
    return NextResponse.json({ error: "Gagal memuat produk hukum" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = await req.json().catch(() => null);
    const r = await createLegal(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "legal_documents", r.data.id, { type: r.data.type, number: r.data.number, year: r.data.year });
    return NextResponse.json({ success: true, item: r.data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/tata-kelola/produk-hukum error:", e);
    return NextResponse.json({ error: "Gagal mencatat produk hukum" }, { status: 500 });
  }
}
