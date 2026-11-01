import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, yearOf } from "@/lib/apbdes/http";
import { clearRecord, saveRecord } from "@/lib/kepatuhan/service";

/** Mencatat status pengiriman satu laporan wajib: { year, itemKey, status: DRAF|TERKIRIM, sentOn?, referenceNo?, note?, archiveId? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/kepatuhan/catatan", "Gagal menyimpan catatan pengiriman", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = await req.json().catch(() => null);
    const year = yearOf(body && typeof body === "object" ? (body as Record<string, unknown>).year : null, 0);
    if (!year) return NextResponse.json({ error: "Tahun tidak valid." }, { status: 400 });
    const r = await saveRecord(prisma, { villageId: ctx.village.id, year, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "compliance_report_records", `${year}:${r.data.itemKey}`, { status: r.data.status });
    return NextResponse.json({ success: true, ...r.data });
  });
}

/** Menghapus catatan pengiriman (kembali ke belum): ?year=&itemKey=. */
export async function DELETE(req: NextRequest) {
  return attempt("DELETE /api/kepatuhan/catatan", "Gagal menghapus catatan pengiriman", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const year = yearOf(sp.get("year"), 0);
    if (!year) return NextResponse.json({ error: "Tahun tidak valid." }, { status: 400 });
    const r = await clearRecord(prisma, { villageId: ctx.village.id, year, itemKey: sp.get("itemKey") ?? "" });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "compliance_report_records", `${year}:${r.data.itemKey}`);
    return NextResponse.json({ success: true });
  });
}
