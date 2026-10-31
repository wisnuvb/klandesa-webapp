import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { failResponse, schemaForbidden, SCHEMA_ROLES } from "@/lib/custom-data/http";
import { submitTemplate } from "@/lib/village-apps/service";

/**
 * Bagikan tabel sebagai templat: { tableIds[], name, description, lineageKey? }. Hanya SKEMA yang dibagikan, tanpa baris data.
 * Templat menunggu tinjauan admin platform sebelum tampil di galeri.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!SCHEMA_ROLES.has(ctx.dbUser.role)) return schemaForbidden();
    const body = await req.json().catch(() => null);
    const r = await submitTemplate(prisma, {
      villageId: ctx.village.id,
      villageName: ctx.village.name,
      userId: ctx.userId ?? null,
      tableIds: body?.tableIds,
      name: body?.name,
      description: body?.description,
      lineageKey: body?.lineageKey,
    });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "submit", "app_templates", r.data.id, { version: r.data.version, tableIds: r.data.tableIds });
    return NextResponse.json({ success: true, id: r.data.id, version: r.data.version, warnings: r.data.warnings }, { status: 201 });
  } catch (e) {
    console.error("POST /api/custom-data/gallery/submit error:", e);
    return NextResponse.json({ error: "Gagal mengajukan templat" }, { status: 500 });
  }
}
