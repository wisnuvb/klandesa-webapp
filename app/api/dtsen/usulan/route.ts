import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { createProposal, listProposals } from "@/lib/dtsen/service";
import { can, failResponse, listParams } from "@/lib/tata-kelola/http";

/** Daftar usulan DTSEN (?status=&kind=&stale=1&search=&page=&pageSize=) beserta hitungan per tahap. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const { sp, page, pageSize, search } = listParams(req);
    const list = await listProposals(prisma, ctx.village.id, { status: sp.get("status") ?? undefined, kind: sp.get("kind") ?? undefined, stale: sp.get("stale") === "1", search, page, pageSize });
    return NextResponse.json({ ...list, can: can("dtsen_usulan", ctx.dbUser.role, ["create", "update", "delete"]) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("GET /api/dtsen/usulan error:", e);
    return NextResponse.json({ error: "Gagal memuat usulan DTSEN" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createProposal(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    // Audit memuat jenis dan id warga, bukan nama atau alasan.
    await auditWeb(req, ctx, "create", "dtsen_proposals", r.data.id, { kind: r.data.kind, residentId: r.data.residentId });
    return NextResponse.json({ success: true, item: r.data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/dtsen/usulan error:", e);
    return NextResponse.json({ error: "Gagal mencatat usulan" }, { status: 500 });
  }
}
