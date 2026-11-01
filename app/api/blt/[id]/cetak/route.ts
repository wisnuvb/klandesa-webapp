import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { printData } from "@/lib/blt/service";

/**
 * Data cetak SK dan tanda terima, memuat NIK lengkap. Dipetakan ke izin "export" lewat pola rute dan dicek lagi di sini;
 * setiap pengambilan dicatat di log audit karena memuat data pribadi.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("GET /api/blt/[id]/cetak", "Gagal menyiapkan data cetak BLT", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "blt").export) return forbidden("Peran Anda tidak dapat mencetak daftar penerima BLT.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Program BLT tidak ditemukan." }, { status: 404 });
    const includeEnded = req.nextUrl.searchParams.get("semua") === "1";
    // Dicatat lebih dulu, sebelum data pribadi dikirim.
    await auditWeb(req, ctx, "export", "blt_programs", id, { includeEnded });
    const r = await printData(prisma, { villageId: ctx.village.id, id, includeEnded });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, village: { name: ctx.village.name } });
  });
}
