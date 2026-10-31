import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { createTable, listTables } from "@/lib/custom-data/service";
import { FIELD_TYPE_LABEL, LIMITS, PII_LABEL } from "@/lib/custom-data/schema";
import { failResponse, SCHEMA_ROLES, schemaForbidden } from "@/lib/custom-data/http";

/** Daftar tabel kustom desa ini, beserta batas dan istilah untuk layar. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    return NextResponse.json({
      canEditSchema: SCHEMA_ROLES.has(ctx.dbUser.role),
      limits: { tables: LIMITS.tablesPerVillage, fields: LIMITS.activeFieldsPerTable, records: LIMITS.recordsPerTable },
      fieldTypes: FIELD_TYPE_LABEL,
      piiClasses: PII_LABEL,
      tables: await listTables(prisma, ctx.village.id),
    });
  } catch (e) {
    console.error("GET /api/custom-data/tables error:", e);
    return NextResponse.json({ error: "Gagal memuat tabel" }, { status: 500 });
  }
}

/** Buat tabel: { name, description?, linkResident?, fields: [{ label, type, required?, options?, piiClass? }] }. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!SCHEMA_ROLES.has(ctx.dbUser.role)) return schemaForbidden();

    const body = await req.json().catch(() => null);
    const r = await createTable(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: body ?? {} });
    if (!r.ok) return failResponse(r);

    // Audit memuat struktur (nama, jumlah kolom), bukan isi data.
    await auditWeb(req, ctx, "create", "custom_tables", r.data.id, { slug: r.data.slug, fields: Array.isArray(body?.fields) ? body.fields.length : 0 });
    return NextResponse.json({ success: true, id: r.data.id, slug: r.data.slug }, { status: 201 });
  } catch (e) {
    console.error("POST /api/custom-data/tables error:", e);
    return NextResponse.json({ error: "Gagal membuat tabel" }, { status: 500 });
  }
}
