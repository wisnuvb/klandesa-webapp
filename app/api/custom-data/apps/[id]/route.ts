import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { parseIntId, schemaForbidden, SCHEMA_ROLES } from "@/lib/custom-data/http";
import { getDashboard, uninstall } from "@/lib/village-apps/service";

/** Dasbor satu aplikasi terpasang (angka dihitung langsung dari tabel desa ini). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const id = parseIntId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const d = await getDashboard(prisma, { villageId: guard.ctx.village.id, id });
    if (!d) return NextResponse.json({ error: "Aplikasi tidak ditemukan." }, { status: 404 });
    return NextResponse.json(d);
  } catch (e) {
    console.error("GET /api/custom-data/apps/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat dasbor" }, { status: 500 });
  }
}

/** Lepas aplikasi dari daftar. Tabel dan datanya tetap ada. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!SCHEMA_ROLES.has(ctx.dbUser.role)) return schemaForbidden();
    const id = parseIntId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    if (!(await uninstall(prisma, { villageId: ctx.village.id, id }))) return NextResponse.json({ error: "Aplikasi tidak ditemukan." }, { status: 404 });
    await auditWeb(req, ctx, "uninstall", "app_installs", id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/custom-data/apps/[id] error:", e);
    return NextResponse.json({ error: "Gagal melepas aplikasi" }, { status: 500 });
  }
}
