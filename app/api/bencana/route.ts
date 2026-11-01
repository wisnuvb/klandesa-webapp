import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { localToday } from "@/lib/form-input";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { bencanaCan, hasDetail } from "@/lib/bencana/http";
import { getOverview } from "@/lib/bencana/service";
import { domainSummary } from "@/lib/incident/service";

/** Ringkasan kebencanaan: kejadian (jumlah/dampak, tanpa data pribadi), kesiapsiagaan, skor kesiapan Destana, dan temuan. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bencana", "Gagal memuat ringkasan kebencanaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const [overview, incidents] = await Promise.all([getOverview(prisma, { villageId: ctx.village.id, today: localToday() }), domainSummary(prisma, { domain: "BENCANA", villageId: ctx.village.id })]);
    return NextResponse.json({ ...overview, incidents, can: bencanaCan(ctx), detail: hasDetail(ctx) });
  });
}
