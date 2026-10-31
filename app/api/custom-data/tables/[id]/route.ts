import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { archiveTable, changeSchema, getTable } from "@/lib/custom-data/service";
import { diffIsEmpty } from "@/lib/custom-data/schema";
import { failResponse, parseIntId, SCHEMA_ROLES, schemaForbidden } from "@/lib/custom-data/http";

type Ctx = { params: Promise<{ id: string }> };

/** Satu tabel beserta kolomnya (termasuk yang diarsipkan, ditandai). */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const table = await getTable(prisma, ctx.village.id, { id });
    if (!table) return NextResponse.json({ error: "Tabel tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ canEditSchema: SCHEMA_ROLES.has(ctx.dbUser.role), table });
  } catch (e) {
    console.error("GET /api/custom-data/tables/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat tabel" }, { status: 500 });
  }
}

/**
 * Ubah susunan tabel: { name?, description?, addFields?, renameFields?, archiveFields?, addOptions?, setPii?, dryRun? }.
 * `dryRun: true` hanya menghitung ringkasan perubahan untuk pratinjau. Kolom tidak dihapus dan jenisnya tidak bisa diubah.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!SCHEMA_ROLES.has(ctx.dbUser.role)) return schemaForbidden();
    const id = parseIntId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const dryRun = body?.dryRun === true;
    const r = await changeSchema(prisma, { villageId: ctx.village.id, tableId: id, change: body ?? {}, dryRun });
    if (!r.ok) return failResponse(r);
    if (dryRun) return NextResponse.json({ success: true, dryRun: true, diff: r.data.diff });

    const d = r.data.diff;
    if (!diffIsEmpty(d)) {
      await auditWeb(req, ctx, "update", "custom_tables", id, {
        added: d.added.map((f) => f.key),
        renamed: d.renamed.map((f) => f.key),
        archived: d.archived,
        optionsAdded: d.optionsAdded.map((o) => o.key),
        piiChanged: d.piiChanged,
        nameChanged: d.name !== null,
      });
    }
    return NextResponse.json({ success: true, diff: d });
  } catch (e) {
    console.error("PATCH /api/custom-data/tables/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengubah tabel" }, { status: 500 });
  }
}

/** Arsipkan tabel (data tetap tersimpan; tabel hilang dari daftar dan API). Khusus admin dan sekretaris. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!SCHEMA_ROLES.has(ctx.dbUser.role)) return schemaForbidden();
    const id = parseIntId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const ok = await archiveTable(prisma, ctx.village.id, id);
    if (!ok) return NextResponse.json({ error: "Tabel tidak ditemukan" }, { status: 404 });
    await auditWeb(req, ctx, "archive", "custom_tables", id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/custom-data/tables/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengarsipkan tabel" }, { status: 500 });
  }
}
