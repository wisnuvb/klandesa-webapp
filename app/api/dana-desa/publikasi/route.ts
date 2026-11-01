import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, yearOf } from "@/lib/apbdes/http";
import { addPublication, publicList, removePublication } from "@/lib/dana-desa/service";

/** Daftar nama kegiatan, lokasi, dan besaran anggaran Dana Desa untuk dipublikasikan (?year=, ?apbdes=). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/dana-desa/publikasi", "Gagal memuat daftar publikasi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    const raw = req.nextUrl.searchParams.get("apbdes");
    const apbdesId = raw ? parseIntId(raw) : null;
    if (raw && !apbdesId) return NextResponse.json({ error: "Dokumen APB Desa tidak valid." }, { status: 400 });
    const r = await publicList(prisma, { villageId: ctx.village.id, year, apbdesId });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ year, village: { name: ctx.village.name }, ...r.data });
  });
}

/** Mencatat bukti publikasi: { year, channel, publishedOn, location?, note? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/dana-desa/publikasi", "Gagal menyimpan bukti publikasi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown } | null;
    const year = yearOf(body?.year, 0);
    const r = await addPublication(prisma, { villageId: ctx.village.id, year, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "dd_publications", r.data.id, { year });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}

/** Menghapus bukti publikasi: ?id= */
export async function DELETE(req: NextRequest) {
  return attempt("DELETE /api/dana-desa/publikasi", "Gagal menghapus bukti publikasi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId(req.nextUrl.searchParams.get("id") ?? "");
    if (!id) return NextResponse.json({ error: "Bukti publikasi tidak ditemukan." }, { status: 404 });
    const r = await removePublication(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "dd_publications", id);
    return NextResponse.json({ success: true });
  });
}
