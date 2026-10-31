import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { createInstitution, INSTITUTION_TYPE_LABEL, listInstitutions, ROLE_LABEL } from "@/lib/tata-kelola/institutions";
import { can, failResponse } from "@/lib/tata-kelola/http";

/** Semua lembaga desa beserta anggotanya. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    return NextResponse.json({
      institutions: await listInstitutions(prisma, ctx.village.id),
      can: can("lembaga_desa", ctx.dbUser.role, ["create", "update", "delete"]),
      types: INSTITUTION_TYPE_LABEL,
      roles: ROLE_LABEL,
    });
  } catch (e) {
    console.error("GET /api/tata-kelola/lembaga error:", e);
    return NextResponse.json({ error: "Gagal memuat lembaga desa" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createInstitution(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "village_institutions", r.data.id, { type: r.data.type, name: r.data.name });
    return NextResponse.json({ success: true, institution: r.data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/tata-kelola/lembaga error:", e);
    return NextResponse.json({ error: "Gagal mencatat lembaga" }, { status: 500 });
  }
}
