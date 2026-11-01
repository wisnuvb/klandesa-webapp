import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { closePoll, publishPoll } from "@/lib/polls/service";
import { can, denied, failResponse, parseIntId } from "@/lib/tata-kelola/http";

type Ctx = { params: Promise<{ id: string }> };

/** { action: "publish" | "close" }. Dipetakan "create" oleh peta izin, jadi izin "update" dicek di sini. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!can("polls", ctx.dbUser.role, ["update"]).update) return denied("Peran Anda tidak berwenang menerbitkan atau menutup polling.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Polling tidak ditemukan" }, { status: 404 });
    const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
    if (body?.action !== "publish" && body?.action !== "close") return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
    const r = body.action === "publish" ? await publishPoll(prisma, { villageId: ctx.village.id, id }) : await closePoll(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, body.action, "polls", id);
    return NextResponse.json({ success: true, poll: r.data });
  } catch (e) {
    console.error("POST /api/polls/[id]/aksi error:", e);
    return NextResponse.json({ error: "Gagal memproses polling" }, { status: 500 });
  }
}
