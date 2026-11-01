import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { voidManualJournal } from "@/lib/bumdes/service";

/** Membatalkan jurnal manual: { reason }. Jurnal tetap tersimpan berstatus dibatalkan. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/bumdes/jurnal/[id]/batal", "Gagal membatalkan jurnal", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Jurnal tidak valid." }, { status: 400 });
    const r = await voidManualJournal(prisma, { bumdesId: s.bumdes.id, journalId: id, userId: s.ctx.userId, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, s.ctx, "void", "bumdes_journals", id);
    return NextResponse.json({ success: true, id });
  });
}
