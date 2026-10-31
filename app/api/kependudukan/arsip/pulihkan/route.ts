import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { parseId, requireV2 } from "@/lib/kependudukan/api";
import { restoreResident } from "@/lib/kependudukan/archive-service";

/** Pulihkan satu warga dari arsip: { id }. Khusus admin desa. Hanya baris warga yang kembali. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const off = requireV2(ctx.village);
    if (off) return off;
    if (ctx.dbUser.role !== "admin") return NextResponse.json({ error: "Hanya admin desa yang dapat memulihkan warga." }, { status: 403 });

    const body = await req.json().catch(() => null);
    const archiveId = parseId(body?.id);
    if (archiveId == null) return NextResponse.json({ error: "Arsip wajib dipilih." }, { status: 400 });

    const result = await prisma.$transaction((tx) => restoreResident(tx, { villageId: ctx.village.id, archiveId }));
    if (!result.ok) return NextResponse.json({ error: result.errors[0], errors: result.errors }, { status: result.status });

    await auditWeb(req, ctx, "restore", "residents", result.data.residentId, { fromArchive: String(archiveId) });
    return NextResponse.json({ success: true, residentId: result.data.residentId, name: result.data.name });
  } catch (e) {
    console.error("POST /api/kependudukan/arsip/pulihkan error:", e);
    return NextResponse.json({ error: "Gagal memulihkan warga" }, { status: 500 });
  }
}
