import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, permissions } from "@/lib/apbdes/http";
import { KINDS, LIMITS, STATUS, UNSUR } from "@/lib/musdes/catalog";
import { createMeeting, listMeetings } from "@/lib/musdes/service";

/** Daftar musyawarah (?kind=&status=&year=&page=&pageSize=) beserta istilah layar dan izin pengguna. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/musdes", "Gagal memuat daftar musyawarah", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const year = Number(sp.get("year"));
    const list = await listMeetings(prisma, ctx.village.id, {
      kind: sp.get("kind") ?? undefined,
      status: sp.get("status") ?? undefined,
      year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : undefined,
      page: Math.max(1, Math.min(100000, Number(sp.get("page")) || 1)),
      pageSize: Math.max(1, Math.min(100, Number(sp.get("pageSize")) || 25)),
    });
    return NextResponse.json({
      ...list,
      can: permissions(ctx, "perencanaan"),
      limits: LIMITS,
      terms: { kinds: KINDS, statuses: STATUS, unsur: UNSUR },
    });
  });
}

/** Jadwalkan musyawarah baru. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/musdes", "Gagal menyimpan musyawarah", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = await req.json().catch(() => null);
    const r = await createMeeting(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "village_meetings", r.data.id, { kind: (body as { kind?: string })?.kind });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
