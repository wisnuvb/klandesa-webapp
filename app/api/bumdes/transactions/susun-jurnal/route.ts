import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { journalizeLegacy } from "@/lib/bumdes/service";

/** Menyusun jurnal untuk transaksi kas lama yang belum berjurnal (akun bawaan), maksimal 200 per panggilan. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bumdes/transactions/susun-jurnal", "Gagal menyusun jurnal", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const r = await journalizeLegacy(prisma, { bumdesId: s.bumdes.id, userId: s.ctx.userId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, s.ctx, "create", "bumdes_journals", "legacy", r.data);
    return NextResponse.json({ success: true, ...r.data });
  });
}
