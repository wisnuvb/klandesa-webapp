import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions, yearOf } from "@/lib/apbdes/http";
import { addException, removeException } from "@/lib/dana-desa/service";

/**
 * Menyatakan pengecualian atas peringatan larangan: { year, ruleKey, activityCode, accountCode, reason }.
 * Pengecualian menggugurkan peringatan, jadi hanya peran yang boleh menyetujui (Kepala Desa, admin) yang dapat membuatnya.
 */
export async function POST(req: NextRequest) {
  return attempt("POST /api/dana-desa/pengecualian", "Gagal menyimpan pengecualian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "apbdes").approve) return forbidden("Pengecualian larangan hanya dapat dinyatakan oleh Kepala Desa atau admin.");
    const body = (await req.json().catch(() => null)) as { year?: unknown } | null;
    const year = yearOf(body?.year, 0);
    const r = await addException(prisma, { villageId: ctx.village.id, year, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "approve", "dd_rule_exceptions", r.data.id, { year, ruleKey: r.data.ruleKey, activityCode: r.data.activityCode, accountCode: r.data.accountCode, reason: r.data.reason });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}

/** Mencabut pengecualian: ?id= */
export async function DELETE(req: NextRequest) {
  return attempt("DELETE /api/dana-desa/pengecualian", "Gagal mencabut pengecualian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "apbdes").approve) return forbidden("Hanya Kepala Desa atau admin yang dapat mencabut pengecualian.");
    const id = parseIntId(req.nextUrl.searchParams.get("id") ?? "");
    if (!id) return NextResponse.json({ error: "Pengecualian tidak ditemukan." }, { status: 404 });
    const r = await removeException(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "dd_rule_exceptions", id, { ruleKey: r.data.ruleKey, activityCode: r.data.activityCode, accountCode: r.data.accountCode, reason: r.data.reason });
    return NextResponse.json({ success: true });
  });
}
