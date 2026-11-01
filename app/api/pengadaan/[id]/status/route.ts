import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { transition } from "@/lib/pengadaan/service";

/** Memindahkan tahap paket: { to, reason? }. Setiap perpindahan melewati pagar di servis (409 memuat semua alasan). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/pengadaan/[id]/status", "Gagal mengubah status paket", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const perm = permissions(ctx);
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Paket pengadaan tidak ditemukan." }, { status: 404 });
    const body = (await req.json().catch(() => null)) as { to?: unknown; reason?: unknown } | null;
    // Gerbang di dalam rute (peta rute hanya memberi "read"; id ter-encode dapat jatuh ke awalan): memulai pelaksanaan = approve, lainnya = update.
    if (!(body?.to === "PELAKSANAAN" ? perm.approve : perm.update)) return forbidden(body?.to === "PELAKSANAAN" ? "Memulai pelaksanaan hanya dapat dilakukan oleh Kepala Desa atau admin." : "Peran Anda tidak dapat mengubah tahap paket.");
    const r = await transition(prisma, { villageId: ctx.village.id, id, to: body?.to, reason: body?.reason, canApprove: perm.approve });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "procurement_packages", id, { transition: `${r.data.from} -> ${r.data.to}`, title: r.data.title, ...(r.data.to === "BATAL" ? { reason: body?.reason } : {}) });
    return NextResponse.json({ success: true, status: r.data.to });
  });
}
