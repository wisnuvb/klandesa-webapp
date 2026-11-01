import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { loadAlignment, prefillDpa } from "@/lib/rkpdes/alignment-service";

/**
 * Keselarasan RKP Desa dengan APB Desa tahun yang sama (?apbdes=<id dokumen>, default terbaru).
 * Membaca data keuangan, jadi selain izin "perencanaan" (dari peta rute) dicek juga izin baca "apbdes".
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("GET /api/perencanaan/rkpdes/[id]/keselarasan", "Gagal memuat keselarasan RKP Desa dan APB Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "apbdes").read) return forbidden("Peran Anda tidak dapat melihat data APB Desa.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "RKP Desa tidak ditemukan." }, { status: 404 });
    const raw = req.nextUrl.searchParams.get("apbdes");
    const apbdesId = raw ? parseIntId(raw) : null;
    if (raw && !apbdesId) return NextResponse.json({ error: "Dokumen APB Desa tidak valid." }, { status: 400 });
    const r = await loadAlignment(prisma, { villageId: ctx.village.id, documentId: id, apbdesId });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, can: { prefill: permissions(ctx, "perencanaan").update && permissions(ctx, "apbdes").update } });
  });
}

/**
 * Menyiapkan draf DPA dari data pelaksanaan kegiatan RKP Desa. Rutenya POST (dipetakan "create"),
 * jadi di sini dicek izin ubah pada perencanaan dan APB Desa. Tidak menimpa DPA yang sudah ada.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/perencanaan/rkpdes/[id]/keselarasan", "Gagal menyiapkan DPA", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "perencanaan").update || !permissions(ctx, "apbdes").update) return forbidden("Peran Anda tidak dapat menyiapkan DPA.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "RKP Desa tidak ditemukan." }, { status: 404 });
    const r = await prefillDpa(prisma, { villageId: ctx.village.id, documentId: id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_activity_plans", id, { from: "rkpdes", created: r.data.created, skipped: r.data.skipped.length });
    return NextResponse.json({ success: true, ...r.data });
  });
}
