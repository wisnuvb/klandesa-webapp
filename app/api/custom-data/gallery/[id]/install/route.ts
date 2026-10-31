import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { failResponse, parseIntId, schemaForbidden, SCHEMA_ROLES } from "@/lib/custom-data/http";
import { installTemplate } from "@/lib/village-apps/service";

/** Pasang templat di desa ini: membuat tabelnya. Tidak memberi akses API apa pun. Hanya admin atau sekretaris. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!SCHEMA_ROLES.has(ctx.dbUser.role)) return schemaForbidden();
    const id = parseIntId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const r = await installTemplate(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, templateId: id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "install", "app_installs", r.data.installId, { templateId: id, tableIds: r.data.tableIds });
    return NextResponse.json({ success: true, installId: r.data.installId, tableIds: r.data.tableIds }, { status: 201 });
  } catch (e) {
    console.error("POST /api/custom-data/gallery/[id]/install error:", e);
    return NextResponse.json({ error: "Gagal memasang aplikasi" }, { status: 500 });
  }
}
