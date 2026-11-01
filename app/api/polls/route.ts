import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { createPoll, listPolls, POLL_LIMITS, STATUS_LABEL } from "@/lib/polls/service";
import { can, failResponse } from "@/lib/tata-kelola/http";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    return NextResponse.json({ polls: await listPolls(prisma, ctx.village.id), can: can("polls", ctx.dbUser.role, ["create", "update", "delete"]), limits: POLL_LIMITS, statusLabel: STATUS_LABEL }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("GET /api/polls error:", e);
    return NextResponse.json({ error: "Gagal memuat polling" }, { status: 500 });
  }
}

/** Buat draf polling: { title, description?, options[], minAge?, showLive?, opensAt?, closesAt }. Waktu dikirim sebagai ISO. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createPoll(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "polls", r.data.id, { options: r.data.options.length, minAge: r.data.minAge });
    return NextResponse.json({ success: true, poll: r.data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/polls error:", e);
    return NextResponse.json({ error: "Gagal membuat polling" }, { status: 500 });
  }
}
