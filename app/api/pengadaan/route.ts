import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, permissions, yearOf } from "@/lib/apbdes/http";
import { createPackage, listPackages } from "@/lib/pengadaan/service";
import { ELEMENTS, EXAMPLE_LIMITS, METHODS, MODES, ROLES, SOURCES, STATUS } from "@/lib/pengadaan/catalog";

/** Daftar paket pengadaan satu tahun (?year=) beserta pembayaran tanpa paket dan ambang metode milik desa. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/pengadaan", "Gagal memuat pengadaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    const r = await listPackages(prisma, { villageId: ctx.village.id, year });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, can: permissions(ctx), catalog: { modes: MODES, methods: METHODS, status: STATUS, roles: ROLES, elements: ELEMENTS, exampleLimits: EXAMPLE_LIMITS, sources: SOURCES } });
  });
}

/** Membuat paket: { year, activityCode, accountCode?, title, mode, method?, hps, ... }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/pengadaan", "Gagal membuat paket pengadaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createPackage(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "procurement_packages", r.data.id, { year: r.data.year, number: r.data.number, activityCode: r.data.activityCode, title: r.data.title, hps: r.data.hps });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
