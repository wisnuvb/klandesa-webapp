import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { crossSiteOrNull, failJson, parseBigId } from "@/lib/aspirasi/http";
import { removeReply } from "@/lib/aspirasi/service";

/** Hapus tanggapan milik desa sendiri; status tindak lanjut dihitung ulang. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("DELETE /api/aspirasi-publik/replies/[id]", "Gagal menghapus tanggapan", async () => {
    const xs = crossSiteOrNull(req);
    if (xs) return xs;
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseBigId((await params).id);
    if (!id) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
    const r = await removeReply(prisma, id, ctx.village.id);
    if (!r.ok) return failJson(r);
    await auditWeb(req, ctx, "delete", "aspirasi_reply", String(id), {});
    return NextResponse.json({ ok: true, progress: r.data.progress });
  });
}
