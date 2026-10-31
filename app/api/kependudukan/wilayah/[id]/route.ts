import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { requireV2 } from "@/lib/kependudukan/api";
import { rewriteWilayah } from "@/lib/kependudukan/wilayah-service";

/**
 * Ubah nama atau gabungkan unit wilayah: { name }. Bila nama baru sudah ada, kedua unit menyatu.
 * Menulis ulang kolom dusun/RW/RT warga yang tergabung, lalu membentuk ulang struktur. Khusus admin dan sekretaris desa.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const off = requireV2(ctx.village);
    if (off) return off;
    if (ctx.dbUser.role !== "admin" && ctx.dbUser.role !== "secretary") {
      return NextResponse.json({ error: "Hanya admin atau sekretaris desa yang dapat mengubah wilayah." }, { status: 403 });
    }

    const id = parseInt((await params).id, 10);
    const body = await req.json().catch(() => null);
    if (!Number.isInteger(id) || typeof body?.name !== "string") return NextResponse.json({ error: "Wilayah dan nama baru wajib diisi." }, { status: 400 });

    const result = await prisma.$transaction((tx) => rewriteWilayah(tx, { villageId: ctx.village.id, unitId: id, newName: body.name }), { maxWait: 10_000, timeout: 60_000 });
    if (!result.ok) return NextResponse.json({ error: result.errors[0], errors: result.errors }, { status: result.status });

    await auditWeb(req, ctx, result.data.merged ? "merge" : "rename", "wilayah_units", id, { moved: result.data.moved, merged: result.data.merged });
    return NextResponse.json({ success: true, moved: result.data.moved, merged: result.data.merged });
  } catch (e) {
    console.error("PATCH /api/kependudukan/wilayah/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengubah wilayah" }, { status: 500 });
  }
}
