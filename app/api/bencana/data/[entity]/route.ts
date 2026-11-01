import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { ENTITIES, isEntityKey } from "@/lib/bencana/entities";
import { bencanaCan, hasDetail } from "@/lib/bencana/http";
import { planLinkOptions } from "@/lib/bencana/service";

type Ctx = { params: Promise<{ entity: string }> };
const unknown = () => NextResponse.json({ error: "Data tidak dikenal." }, { status: 404 });

/** Daftar ancaman | sumber-daya | relawan | rencana desa. Kontak relawan hanya untuk izin baca rinci. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return attempt("GET /api/bencana/data/[entity]", "Gagal memuat data", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const key = (await params).entity;
    if (!isEntityKey(key)) return unknown();
    const rows = await ENTITIES[key].list(prisma, { villageId: ctx.village.id, detail: hasDetail(ctx) });
    const extra = key === "rencana" ? { links: await planLinkOptions(prisma, { villageId: ctx.village.id }) } : {};
    return NextResponse.json({ rows, ...extra, can: bencanaCan(ctx), detail: hasDetail(ctx) });
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/bencana/data/[entity]", "Gagal menyimpan data", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const key = (await params).entity;
    if (!isEntityKey(key)) return unknown();
    const r = await ENTITIES[key].create(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", ENTITIES[key].table, Number(r.data.id), r.data);
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
