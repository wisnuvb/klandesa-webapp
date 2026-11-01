import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId } from "@/lib/apbdes/http";
import { normalizeVillageRole, roleCan } from "@/lib/permissions";
import { activateAgreement, closeAgreement } from "@/lib/aset-desa/land-service";

type Ctx = { params: Promise<{ id: string }> };

/** { action: "aktifkan" } memberlakukan draf dan membuat jadwal tagihan; { action: "akhiri"|"batalkan", reason, endedOn? } menutup perjanjian yang berlaku. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/aset-desa/pemanfaatan/[id]/aksi", "Gagal memproses perjanjian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Perjanjian tidak ditemukan" }, { status: 404 });
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const role = normalizeVillageRole(ctx.dbUser.role);
    const action = body?.action;
    if (action === "aktifkan") {
      const r = await activateAgreement(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, id });
      if (!r.ok) return failResponse(r);
      await auditWeb(req, ctx, "update", "land_agreements", id, { to: "AKTIF", charges: r.data.charges });
      return NextResponse.json({ success: true, ...r.data });
    }
    if (action === "akhiri" || action === "batalkan") {
      if (!roleCan("aset_desa", "update", role)) return forbidden("Anda tidak berwenang mengakhiri perjanjian.");
      const mode = action === "akhiri" ? "SELESAI" : "BATAL";
      const r = await closeAgreement(prisma, { villageId: ctx.village.id, id, mode, reason: body?.reason, endedOn: body?.endedOn });
      if (!r.ok) return failResponse(r);
      await auditWeb(req, ctx, "update", "land_agreements", id, { to: mode, voided: r.data.voided });
      return NextResponse.json({ success: true, ...r.data });
    }
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  });
}
