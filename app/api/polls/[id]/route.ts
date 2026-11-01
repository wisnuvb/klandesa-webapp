import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { deletePoll, getPoll, updatePoll } from "@/lib/polls/service";
import { failResponse, parseIntId } from "@/lib/tata-kelola/http";

type Ctx = { params: Promise<{ id: string }> };

/** Detail polling beserta hasil (jumlah per pilihan dan partisipasi). Hasil jumlah saja; tidak ada data siapa memilih apa. */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Polling tidak ditemukan" }, { status: 404 });
    const r = await getPoll(prisma, guard.ctx.village.id, id);
    return r.ok ? NextResponse.json(r.data, { headers: { "Cache-Control": "no-store" } }) : failResponse(r);
  } catch (e) {
    console.error("GET /api/polls/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat polling" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Polling tidak ditemukan" }, { status: 404 });
    const r = await updatePoll(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "polls", id);
    return NextResponse.json({ success: true, poll: r.data });
  } catch (e) {
    console.error("PATCH /api/polls/[id] error:", e);
    return NextResponse.json({ error: "Gagal menyimpan polling" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Polling tidak ditemukan" }, { status: 404 });
    const r = await deletePoll(prisma, ctx.village.id, id);
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "polls", id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/polls/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus polling" }, { status: 500 });
  }
}
