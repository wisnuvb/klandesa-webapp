import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { normalizeVillageRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId } from "@/lib/apbdes/http";
import { checkPanjarSpj } from "@/lib/apbdes/spp";

/** Sekretaris Desa menandai bukti pertanggungjawaban sudah diperiksa (Pasal 54 ayat 5). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ spjId: string }> }) {
  return attempt("POST /api/apbdes/panjar/spj/[spjId]/periksa", "Gagal menandai pemeriksaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (normalizeVillageRole(ctx.dbUser.role) === "staff") return forbidden("Pemeriksaan bukti dilakukan Sekretaris Desa");
    const id = parseIntId((await params).spjId);
    if (!id) return NextResponse.json({ error: "Bukti tidak ditemukan" }, { status: 404 });
    const r = await checkPanjarSpj(prisma, { villageId: ctx.village.id, spjId: id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_panjar_spj", id, { action: "check" });
    return NextResponse.json({ success: true });
  });
}
