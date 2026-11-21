import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";
import { RATE } from "@/lib/aspirasi/catalog";
import { crossSiteOrNull, failJson, limitOrNull } from "@/lib/aspirasi/http";
import { submitClaim, upsertArea } from "@/lib/aspirasi/service";
import { resolveVillageCode } from "@/lib/aspirasi/wilayah";
import { notifyOwnerAspirasi } from "@/lib/aspirasi/notify";

/**
 * Desa terdaftar meminta mengelola halaman aspirasi sebuah wilayah (disetujui manual admin platform).
 * Body: { areaSlug } untuk halaman yang sudah ada, atau { areaCode } (kode wilayah.id) untuk mengaktifkan halaman desa sendiri
 * sebelum ada laporan, plus { position, contactPhone?, evidenceNote }.
 */
export async function POST(req: NextRequest) {
  return attempt("POST /api/aspirasi-publik/claim", "Gagal mengajukan klaim", async () => {
    const xs = crossSiteOrNull(req);
    if (xs) return xs;
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const limited = await limitOrNull("aspirasi-claim", String(ctx.userId), RATE.claimPerUser, "Terlalu banyak permohonan klaim hari ini.");
    if (limited) return limited;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    let slug = typeof body?.areaSlug === "string" ? body.areaSlug.trim() : "";
    if (!slug && typeof body?.areaCode === "string" && body.areaCode.trim()) {
      const resolved = await resolveVillageCode(body.areaCode);
      if (!resolved) return NextResponse.json({ error: "Desa tidak ditemukan. Pilih ulang dari daftar." }, { status: 400 });
      const areaId = await upsertArea(prisma, resolved);
      const a = await prisma.aspirationArea.findUnique({ where: { id: areaId }, select: { slug: true } });
      slug = a?.slug ?? "";
    }
    if (!slug) return NextResponse.json({ error: "Pilih wilayah yang ingin Anda kelola." }, { status: 400 });

    const r = await submitClaim(prisma, slug, { villageId: ctx.village.id, userId: ctx.userId }, body);
    if (!r.ok) return failJson(r);
    await auditWeb(req, ctx, "create", "aspirasi_claim", r.data.id, { areaSlug: slug });
    const area = await prisma.aspirationArea.findUnique({ where: { slug }, select: { name: true, district: true, regency: true } });
    void notifyOwnerAspirasi({
      kind: "claim",
      area: area ? `${area.name}, Kec. ${area.district}, ${area.regency}` : slug,
      village: `${ctx.village.name} (${ctx.village.code})`,
      position: String(body?.position ?? ""),
    });
    return NextResponse.json({ ok: true, id: r.data.id }, { status: 201 });
  });
}
