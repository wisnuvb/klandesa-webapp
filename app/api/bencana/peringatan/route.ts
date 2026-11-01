import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { ALERT_LEVELS, HAZARD_TYPES } from "@/lib/bencana/catalog";
import { alertTemplate } from "@/lib/bencana/calc";
import { bencanaCan } from "@/lib/bencana/http";
import { areaOptions, listAlerts } from "@/lib/bencana/service";

/** Log siaran peringatan dini + pilihan wilayah sasaran dan templat pesan (?page=). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bencana/peringatan", "Gagal memuat peringatan dini", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const [log, areas] = await Promise.all([listAlerts(prisma, { villageId: ctx.village.id, page: Number(req.nextUrl.searchParams.get("page")) || 1 }), areaOptions(prisma, { villageId: ctx.village.id })]);
    const templates = Object.fromEntries((Object.keys(ALERT_LEVELS) as (keyof typeof ALERT_LEVELS)[]).map((l) => [l, alertTemplate(l, null, null)]));
    return NextResponse.json({ ...log, areas, levels: ALERT_LEVELS, hazards: HAZARD_TYPES, templates, can: bencanaCan(ctx) });
  });
}
