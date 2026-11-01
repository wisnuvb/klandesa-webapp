import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { localToday } from "@/lib/form-input";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { ASSESSMENT_KINDS, LEVELS, READINESS_STATUSES, SOURCE_NOTES, REGULATION } from "@/lib/bencana/catalog";
import { bencanaCan } from "@/lib/bencana/http";
import { getReadiness, setReadiness } from "@/lib/bencana/service";

/** Kesiapan Destana: butir aktivitas [V Peraturan BNPB 7/2025 Pasal 8(1)], skor kelengkapan, butir tambahan desa, penilaian, temuan. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bencana/kesiapan", "Gagal memuat kesiapan Destana", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const data = await getReadiness(prisma, { villageId: ctx.village.id, today: localToday() });
    return NextResponse.json({ ...data, statuses: READINESS_STATUSES, levels: LEVELS, assessmentKinds: ASSESSMENT_KINDS, regulation: REGULATION, notes: SOURCE_NOTES, can: bencanaCan(ctx) });
  });
}

/** Mengisi status satu butir katalog: { code, status, note? }. */
export async function PUT(req: NextRequest) {
  return attempt("PUT /api/bencana/kesiapan", "Gagal menyimpan kesiapan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await setReadiness(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "drm_readiness_items", r.data.code, { status: r.data.status });
    return NextResponse.json({ success: true });
  });
}
