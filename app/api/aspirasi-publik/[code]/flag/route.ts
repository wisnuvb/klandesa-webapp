import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { RATE, isFlagReason } from "@/lib/aspirasi/catalog";
import { crossSiteOrNull, failJson, limitOrNull } from "@/lib/aspirasi/http";
import { isAspirationCode } from "@/lib/aspirasi/slug";
import { createFlag } from "@/lib/aspirasi/service";
import { notifyOwnerAspirasi } from "@/lib/aspirasi/notify";

/** Keberatan desa atas sebuah aspirasi (mis. memuat data pribadi, tidak benar). Ditinjau admin platform; PERSONAL_DATA langsung menyembunyikan laporan. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  return attempt("POST /api/aspirasi-publik/[code]/flag", "Gagal mengajukan keberatan", async () => {
    const xs = crossSiteOrNull(req);
    if (xs) return xs;
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const code = (await params).code.toLowerCase();
    if (!isAspirationCode(code)) return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    const limited = await limitOrNull("aspirasi-flag-village", String(ctx.village.id), RATE.flagPerVillage, "Batas keberatan harian desa Anda tercapai. Coba lagi besok.");
    if (limited) return limited;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const r = await createFlag(prisma, code, { source: "VILLAGE", villageId: ctx.village.id }, body);
    if (!r.ok) return failJson(r);
    await auditWeb(req, ctx, "create", "aspirasi_flag", code, { reason: String(body?.reason ?? "") });
    const a = await prisma.aspiration.findUnique({ where: { code }, select: { title: true } });
    if (a && isFlagReason(body?.reason)) void notifyOwnerAspirasi({ kind: "flag", code, title: a.title, reason: body.reason, source: "VILLAGE", hidden: r.data.hidden });
    return NextResponse.json({ ok: true, hidden: r.data.hidden }, { status: 201 });
  });
}
