import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { localToday } from "@/lib/form-input";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, permissions, yearOf } from "@/lib/apbdes/http";
import { createAgreement, listAgreements } from "@/lib/kerja-sama/service";
import { END_REASONS, FIELDS, INITIATIVES, KINDS, SOURCES, STATUS } from "@/lib/kerja-sama/catalog";

/** Daftar kerja sama desa satu tahun (?year=). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/kerja-sama", "Gagal memuat kerja sama desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    const r = await listAgreements(prisma, { villageId: ctx.village.id, year, today: localToday() });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, can: permissions(ctx, "perencanaan"), catalog: { kinds: KINDS, initiatives: INITIATIVES, fields: FIELDS, status: STATUS, endReasons: END_REASONS, sources: SOURCES } });
  });
}

/** Membuat kerja sama: { year, kind, initiative?, title, field }. Pihak "Desa ini" dibuat otomatis. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/kerja-sama", "Gagal membuat kerja sama", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createAgreement(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "village_agreements", r.data.id, { year: r.data.year, kind: r.data.kind, title: r.data.title });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
