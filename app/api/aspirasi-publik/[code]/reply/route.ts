import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { crossSiteOrNull, failJson } from "@/lib/aspirasi/http";
import { isAspirationCode } from "@/lib/aspirasi/slug";
import { createReply } from "@/lib/aspirasi/service";

/** Tanggapan resmi desa atas aspirasi: tanggapan, kabar progres, sanggahan (banding), atau tanda selesai. Tampil publik. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  return attempt("POST /api/aspirasi-publik/[code]/reply", "Gagal menyimpan tanggapan", async () => {
    const xs = crossSiteOrNull(req);
    if (xs) return xs;
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const code = (await params).code.toLowerCase();
    if (!isAspirationCode(code)) return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    const r = await createReply(prisma, code, { villageId: ctx.village.id, userId: ctx.userId, authorLabel: `Pemerintah Desa ${ctx.village.name}` }, await req.json().catch(() => null));
    if (!r.ok) return failJson(r);
    await auditWeb(req, ctx, "create", "aspirasi_reply", r.data.id, { code });
    return NextResponse.json({ ok: true, id: r.data.id, progress: r.data.progress }, { status: 201 });
  });
}
