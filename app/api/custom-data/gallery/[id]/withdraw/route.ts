import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { failResponse, parseIntId, schemaForbidden, SCHEMA_ROLES } from "@/lib/custom-data/http";
import { withdrawTemplate } from "@/lib/village-apps/service";

/** Tarik templat milik desa ini dari galeri. Desa yang sudah memasangnya tidak terpengaruh. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!SCHEMA_ROLES.has(ctx.dbUser.role)) return schemaForbidden();
    const id = parseIntId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const r = await withdrawTemplate(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "withdraw", "app_templates", id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/custom-data/gallery/[id]/withdraw error:", e);
    return NextResponse.json({ error: "Gagal menarik templat" }, { status: 500 });
  }
}
