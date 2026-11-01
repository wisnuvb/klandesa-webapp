import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { AUDIT, bencanaCan } from "@/lib/bencana/http";
import { DOMAIN_DEFS } from "@/lib/incident/catalog";
import { createEvent, eventListQuery, listEvents } from "@/lib/incident/service";

/** Daftar kejadian bencana (?status=ACTIVE|OPEN|…&kind=&page=&pageSize=). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bencana/kejadian", "Gagal memuat daftar kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await listEvents(prisma, { domain: "BENCANA", villageId: ctx.village.id, query: eventListQuery("BENCANA", req.nextUrl.searchParams) });
    if (!r.ok) return failResponse(r);
    const kinds = Object.fromEntries(Object.entries(DOMAIN_DEFS.BENCANA.kinds).map(([k, v]) => [k, v.label]));
    return NextResponse.json({ ...r.data, kinds, responseKinds: DOMAIN_DEFS.BENCANA.responses, can: bencanaCan(ctx) });
  });
}

/** Mencatat kejadian: { kind, title, occurredAt (ISO + zona), severity?, lokasi, dampak, pelaporan supra-desa … }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bencana/kejadian", "Gagal mencatat kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createEvent(prisma, { domain: "BENCANA", villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.event, r.data.id, { domain: "BENCANA", kind: r.data.kind, severity: r.data.severity });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
