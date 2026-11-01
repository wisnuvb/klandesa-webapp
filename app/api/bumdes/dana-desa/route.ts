import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, permissions, yearOf } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { createFlow, listFlows } from "@/lib/bumdes/service";

/** Arus penyertaan modal dan bagi hasil dengan APB Desa (?year= untuk anggaran penyertaan modal tahun itu). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bumdes/dana-desa", "Gagal memuat arus APB Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx);
    if (!s.ok) return s.response;
    const r = await listFlows(prisma, { villageId: s.ctx.village.id, bumdesId: s.bumdes.id, year: yearOf(req.nextUrl.searchParams.get("year")) });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, canManage: s.canManage && permissions(s.ctx, "apbdes").create, canVoid: s.canManage && permissions(s.ctx, "apbdes").delete });
  });
}

/**
 * Mencatat penyertaan modal Desa atau bagi hasil: { kind, flowDate, amount, musdesMeetingId, cashAccountCode, villageChannel?, fiscalYear? (bagi hasil), reference?, note? }.
 * Butuh izin kelola BUMDes dan izin mencatat di APB Desa karena menulis Buku Kas Umum.
 */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bumdes/dana-desa", "Gagal mencatat arus APB Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    if (!permissions(s.ctx, "apbdes").create) return forbidden("Anda tidak berwenang mencatat ke Buku Kas Umum APB Desa.");
    const r = await createFlow(prisma, { villageId: s.ctx.village.id, bumdesId: s.bumdes.id, bumdesName: s.bumdes.name, userId: s.ctx.userId, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, s.ctx, "create", "bumdes_village_flows", r.data.id, { apbdesEntryId: r.data.apbdesEntryId, journalId: r.data.journalId });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
