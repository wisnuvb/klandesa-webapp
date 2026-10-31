import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { requireV2 } from "@/lib/kependudukan/api";
import { ARCHIVE_RETENTION_DAYS, listArchives } from "@/lib/kependudukan/archive-service";

/** Warga yang dihapus dari Data Warga dan masih tersimpan di arsip (khusus admin desa). NIK hanya 4 digit terakhir. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const off = requireV2(ctx.village);
    if (off) return off;
    if (ctx.dbUser.role !== "admin") return NextResponse.json({ error: "Hanya admin desa yang dapat melihat arsip warga terhapus." }, { status: 403 });

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20));
    return NextResponse.json({ retentionDays: ARCHIVE_RETENTION_DAYS, ...(await listArchives(prisma, ctx.village.id, page, limit)) });
  } catch (e) {
    console.error("GET /api/kependudukan/arsip error:", e);
    return NextResponse.json({ error: "Gagal memuat arsip" }, { status: 500 });
  }
}
