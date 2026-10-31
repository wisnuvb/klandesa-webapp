import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { disposeItem } from "@/lib/aset-desa/service";
import { failResponse, parseIntId } from "@/lib/aset-desa/http";
import { normalizeVillageRole, roleCan } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

/** Hapus barang dari buku inventaris: { reason, disposedAt, decree, note?, regencyApproved? }. Barisnya tetap tersimpan sebagai riwayat. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    // Rute ini dipetakan sebagai "create" oleh pemetaan izin; menghapus dari buku butuh izin "delete".
    if (!roleCan("aset_desa", "delete", normalizeVillageRole(ctx.dbUser.role))) {
      return NextResponse.json({ error: "Peran Anda tidak berwenang menghapus barang dari buku inventaris." }, { status: 403 });
    }
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await disposeItem(prisma, { villageId: ctx.village.id, id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "dispose", "inventory_items", id, { reason: r.data.disposalReason, decree: r.data.disposalDecree, disposedAt: r.data.disposedAt });
    return NextResponse.json({ success: true, item: r.data });
  } catch (e) {
    console.error("POST /api/aset-desa/[id]/penghapusan error:", e);
    return NextResponse.json({ error: "Gagal menghapus barang dari buku inventaris" }, { status: 500 });
  }
}
