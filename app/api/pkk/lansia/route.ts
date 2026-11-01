import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, permissions } from "@/lib/apbdes/http";
import { isSubscriptionBlocked } from "@/lib/gizi/guard";
import { addElderCheck, deleteElderCheck, elderBoard } from "@/lib/kia/service";

/** Papan lansia (60 tahun ke atas): terakhir diperiksa, penanda, dan yang perlu diperiksa. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/pkk/lansia", "Gagal memuat data lansia", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const blocked = isSubscriptionBlocked(guard.ctx.village);
    if (blocked) return blocked;
    return NextResponse.json({ ...(await elderBoard(prisma, guard.ctx.village.id)), can: permissions(guard.ctx, "pkk") }, { headers: { "Cache-Control": "no-store" } });
  });
}

/** Catat pemeriksaan: { residentId, checkedAt, weightKg?, heightCm?, systolic?, diastolic?, glucoseMgDl?, glucoseType?, adlScore?, note? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/pkk/lansia", "Gagal mencatat pemeriksaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const blocked = isSubscriptionBlocked(ctx.village);
    if (blocked) return blocked;
    const r = await addElderCheck(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "elderly_checks", r.data.id);
    return NextResponse.json({ success: true, ...r.data }, { status: 201 });
  });
}

/** Hapus satu catatan pemeriksaan yang salah: ?id=. */
export async function DELETE(req: NextRequest) {
  return attempt("DELETE /api/pkk/lansia", "Gagal menghapus pemeriksaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const blocked = isSubscriptionBlocked(ctx.village);
    if (blocked) return blocked;
    const id = parseIntId(req.nextUrl.searchParams.get("id") ?? "");
    if (!id) return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
    const r = await deleteElderCheck(prisma, { villageId: ctx.village.id, checkId: id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "elderly_checks", id);
    return NextResponse.json({ success: true });
  });
}
