import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, permissions } from "@/lib/apbdes/http";
import { getOverview, importIdm } from "@/lib/idm/service";
import { DIMENSIONS, FOCUS_REF, LAYOUTS, LIMITS, SOURCES } from "@/lib/idm/catalog";

/** Skor IDM desa per tahun, indikator tahun terpilih (?year=), dan rekomendasi fokus (indikator/dimensi terendah). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/idm", "Gagal memuat Indeks Desa Membangun", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const y = Number(req.nextUrl.searchParams.get("year"));
    const r = await getOverview(prisma, { villageId: ctx.village.id, year: Number.isInteger(y) && y >= 2010 && y <= 2100 ? y : undefined });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, can: permissions(ctx, "perencanaan"), catalog: { dimensions: DIMENSIONS, layouts: LAYOUTS, limits: LIMITS, focusRef: FOCUS_REF, sources: SOURCES } });
  });
}

/**
 * Menyimpan hasil impor satu desa-tahun. Berkas dibaca di peramban; server hanya menerima baris yang sudah dipilih:
 * { year, layout: "SUMMARY"|"INDICATORS", fileName?, summary?: {iks,ike,ikl,idm,status}, indicators?: [...] }.
 */
export async function POST(req: NextRequest) {
  return attempt("POST /api/idm", "Gagal menyimpan data IDM", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = await req.json().catch(() => null);
    const r = await importIdm(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "idm_scores", `${ctx.village.id}:${r.data.year}`, { year: r.data.year, layout: r.data.layout, indicators: r.data.indicators, replaced: r.data.replaced });
    return NextResponse.json({ success: true, ...r.data }, { status: 201 });
  });
}
