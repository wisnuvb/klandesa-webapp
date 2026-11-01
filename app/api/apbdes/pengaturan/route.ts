import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { normalizeVillageRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { saveSettings } from "@/lib/apbdes/service";
import { failResponse, forbidden, attempt, yearOf } from "@/lib/apbdes/http";

/** Rekening kas desa dan nama penandatangan laporan untuk satu tahun (?year=). */
export async function PUT(req: NextRequest) {
  return attempt("PUT /api/apbdes/pengaturan", "Gagal menyimpan pengaturan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    // Rekening dan nama penandatangan tercetak di laporan resmi: bukan wewenang operator.
    if (normalizeVillageRole(ctx.dbUser.role) === "staff") return forbidden("Pengaturan laporan hanya oleh admin atau sekretaris");
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    const body = await req.json().catch(() => null);
    const r = await saveSettings(prisma, { villageId: ctx.village.id, year, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_years", year, { year });
    return NextResponse.json({ success: true, settings: r.data });
  });
}
