import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, yearOf } from "@/lib/apbdes/http";
import { clearFocusTag, setFocusTag } from "@/lib/dana-desa/service";

/** Menandai fokus penggunaan Dana Desa satu kegiatan: { year, activityCode, focus }. */
export async function PUT(req: NextRequest) {
  return attempt("PUT /api/dana-desa/fokus", "Gagal menyimpan penandaan fokus", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown } | null;
    const year = yearOf(body?.year, 0);
    const r = await setFocusTag(prisma, { villageId: ctx.village.id, year, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "dd_focus_tags", r.data.activityCode, { year });
    return NextResponse.json({ success: true });
  });
}

/** Menghapus penandaan: ?year=&activityCode= */
export async function DELETE(req: NextRequest) {
  return attempt("DELETE /api/dana-desa/fokus", "Gagal menghapus penandaan fokus", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"), 0);
    const activityCode = req.nextUrl.searchParams.get("activityCode") ?? "";
    const r = await clearFocusTag(prisma, { villageId: ctx.village.id, year, activityCode });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "dd_focus_tags", activityCode, { year });
    return NextResponse.json({ success: true });
  });
}
