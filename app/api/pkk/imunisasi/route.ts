import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { childStatus, recordDoses, removeDose } from "@/lib/gizi/immunization";
import { failResponse } from "@/lib/tata-kelola/http";
import { isSubscriptionBlocked } from "@/lib/gizi/guard";

/** Status imunisasi satu anak (?residentId=): tiap dosis jadwal beserta tanggal bila sudah diberikan. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const blocked = isSubscriptionBlocked(guard.ctx.village);
    if (blocked) return blocked;
    const id = Number(req.nextUrl.searchParams.get("residentId"));
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "residentId tidak valid" }, { status: 400 });
    const r = await childStatus(prisma, guard.ctx.village.id, id);
    return r.ok ? NextResponse.json(r.data, { headers: { "Cache-Control": "no-store" } }) : failResponse(r);
  } catch (e) {
    console.error("GET /api/pkk/imunisasi error:", e);
    return NextResponse.json({ error: "Gagal memuat imunisasi" }, { status: 500 });
  }
}

/** Catat dosis: { residentId, givenAt, codes[], note? }. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const blocked = isSubscriptionBlocked(ctx.village);
    if (blocked) return blocked;
    const r = await recordDoses(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    // Data kesehatan anak: audit hanya memuat id anak dan jumlah dosis.
    await auditWeb(req, ctx, "create", "immunization_records", r.data.recorded.join(",").slice(0, 100) || "-", { count: r.data.recorded.length });
    return NextResponse.json({ success: true, ...r.data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/pkk/imunisasi error:", e);
    return NextResponse.json({ error: "Gagal mencatat imunisasi" }, { status: 500 });
  }
}

/** Hapus satu catatan dosis yang salah: ?residentId=&code=. */
export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const blocked = isSubscriptionBlocked(ctx.village);
    if (blocked) return blocked;
    const sp = req.nextUrl.searchParams;
    const residentId = Number(sp.get("residentId"));
    const code = sp.get("code") ?? "";
    if (!Number.isInteger(residentId) || residentId < 1 || !/^[A-Z0-9]{2,10}$/.test(code)) return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
    const r = await removeDose(prisma, { villageId: ctx.village.id, residentId, code });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "immunization_records", `${residentId}:${code}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/pkk/imunisasi error:", e);
    return NextResponse.json({ error: "Gagal menghapus catatan" }, { status: 500 });
  }
}
