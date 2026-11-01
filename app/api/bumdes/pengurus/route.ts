import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { addOfficer } from "@/lib/bumdes/service";

/** Menambah pengurus/organ: { role, name, skNumber?, skDate?, startOn?, endOn?, note? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bumdes/pengurus", "Gagal menambah pengurus", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const r = await addOfficer(prisma, { bumdesId: s.bumdes.id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, s.ctx, "create", "bumdes_officers", r.data.id, { role: r.data.role });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
