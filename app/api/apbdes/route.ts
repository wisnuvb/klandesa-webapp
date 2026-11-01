import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { normalizeVillageRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ENTRY_TYPES, CHANNELS, FUND_SOURCES, TAX_KINDS, SOURCE_NOTE, activityOptions, leafAccounts } from "@/lib/apbdes/catalog";
import { overview } from "@/lib/apbdes/report-data";
import { attempt, permissions, yearOf } from "@/lib/apbdes/http";

/** Ringkasan satu tahun anggaran (?year=): dokumen, saldo, status bulan, peringatan tenggat, dan istilah untuk formulir. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/apbdes", "Gagal memuat keuangan desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    const data = await overview(prisma, ctx.village.id, year);
    return NextResponse.json({
      ...data,
      can: permissions(ctx),
      // Verifikasi, penetapan, dan pengaturan laporan bukan wewenang operator (staff): sekretaris atau admin.
      verifier: normalizeVillageRole(ctx.dbUser.role) !== "staff" && permissions(ctx).update,
      terms: {
        source: SOURCE_NOTE,
        entryTypes: ENTRY_TYPES,
        channels: CHANNELS,
        fundSources: FUND_SOURCES,
        taxKinds: TAX_KINDS,
        activities: activityOptions(),
        incomeAccounts: leafAccounts("PENDAPATAN"),
        expenseAccounts: leafAccounts("BELANJA"),
        financingAccounts: leafAccounts("PEMBIAYAAN"),
      },
    });
  });
}
