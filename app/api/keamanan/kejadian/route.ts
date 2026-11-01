import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { DOMAIN_DEFS } from "@/lib/incident/catalog";
import { AUDIT, keamananCan } from "@/lib/keamanan/http";
import { createSecurityEvent, eventListQuery, listSecurityEvents } from "@/lib/keamanan/kejadian";

/** Daftar kejadian keamanan (?status=ACTIVE|OPEN|…&kind=&page=&pageSize=). Hanya domain KEAMANAN. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/keamanan/kejadian", "Gagal memuat daftar kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await listSecurityEvents(prisma, { villageId: ctx.village.id, query: eventListQuery(req.nextUrl.searchParams) });
    if (!r.ok) return failResponse(r);
    const kinds = Object.fromEntries(Object.entries(DOMAIN_DEFS.KEAMANAN.kinds).map(([k, v]) => [k, v.label]));
    return NextResponse.json({ ...r.data, kinds, responseKinds: DOMAIN_DEFS.KEAMANAN.responses, can: keamananCan(ctx) });
  });
}

/** Mencatat kejadian keamanan. Kekerasan terhadap perempuan/anak tidak dicatat di sini (penjaga teks 422; lihat tab Rujukan). */
export async function POST(req: NextRequest) {
  return attempt("POST /api/keamanan/kejadian", "Gagal mencatat kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createSecurityEvent(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.event, r.data.id, { domain: "KEAMANAN", kind: r.data.kind, severity: r.data.severity });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
