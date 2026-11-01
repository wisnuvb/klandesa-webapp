import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { localToday } from "@/lib/form-input";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { getLegal, saveLegal } from "@/lib/bumdes/service";

/** Data legalitas, pengurus, daftar kelengkapan, dan temuan. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bumdes/legalitas", "Gagal memuat legalitas", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx);
    if (!s.ok) return s.response;
    const r = await getLegal(prisma, { villageId: s.ctx.village.id, bumdesId: s.bumdes.id, today: localToday() });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, canManage: s.canManage });
  });
}

/** Menyimpan data legalitas (seluruh isian). NIB 13 angka; NPWP 15 atau 16 angka. */
export async function PUT(req: NextRequest) {
  return attempt("PUT /api/bumdes/legalitas", "Gagal menyimpan legalitas", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const r = await saveLegal(prisma, { villageId: s.ctx.village.id, bumdesId: s.bumdes.id, userId: s.ctx.userId, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    // Audit tanpa nilai NIB/NPWP: cukup menandai tindakan.
    await auditWeb(req, s.ctx, "update", "bumdes_legal_profiles", r.data.id);
    return NextResponse.json({ success: true });
  });
}
