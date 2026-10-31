import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { createRegister, listRegister, NATURE_LABEL } from "@/lib/tata-kelola/register";
import { can, failResponse, listParams } from "@/lib/tata-kelola/http";

/** Register surat (?direction=IN|OUT&year=&search=&page=&pageSize=). */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const { sp, page, pageSize, search, year } = listParams(req);
    const list = await listRegister(prisma, ctx.village.id, { direction: sp.get("direction") ?? undefined, year, search, page, pageSize });
    return NextResponse.json({ ...list, can: can("register_surat", ctx.dbUser.role, ["create", "update"]), natures: NATURE_LABEL });
  } catch (e) {
    console.error("GET /api/tata-kelola/surat error:", e);
    return NextResponse.json({ error: "Gagal memuat register surat" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createRegister(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "mail_register", r.data.id, { direction: r.data.direction, agenda: r.data.agendaLabel });
    return NextResponse.json({ success: true, item: r.data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/tata-kelola/surat error:", e);
    return NextResponse.json({ error: "Gagal mencatat surat" }, { status: 500 });
  }
}
