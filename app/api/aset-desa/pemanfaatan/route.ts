import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { can } from "@/lib/tata-kelola/http";
import { createAgreement, listAgreements } from "@/lib/aset-desa/land-service";
import { AGREEMENT_KINDS, AGREEMENT_STATUS, DOC_KINDS, LEASE_ACCOUNTS, LESSEE_KINDS, LIMITS, PERIOD_UNITS } from "@/lib/aset-desa/land-catalog";
import { accountName } from "@/lib/apbdes/catalog";

/** Daftar perjanjian pemanfaatan: ?status=DRAF|AKTIF|SELESAI|BATAL&itemId=&page=&pageSize=. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/aset-desa/pemanfaatan", "Gagal memuat perjanjian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Math.min(100000, Number(sp.get("page")) || 1));
    const pageSize = Math.max(1, Math.min(100, Number(sp.get("pageSize")) || 25));
    const itemId = parseIntId(sp.get("itemId") ?? "") ?? undefined;
    const list = await listAgreements(prisma, ctx.village.id, { status: sp.get("status") ?? undefined, itemId, page, pageSize });
    return NextResponse.json({
      ...list,
      can: { ...can("aset_desa", ctx.dbUser.role, ["create", "update", "delete"]), receive: can("apbdes", ctx.dbUser.role, ["create"]).create, revert: can("apbdes", ctx.dbUser.role, ["delete"]).delete },
      limits: LIMITS,
      terms: {
        kinds: AGREEMENT_KINDS,
        status: AGREEMENT_STATUS,
        periodUnits: PERIOD_UNITS,
        lesseeKinds: LESSEE_KINDS,
        docKinds: DOC_KINDS,
        accounts: LEASE_ACCOUNTS.map((c) => ({ code: c, name: accountName(c) ?? c })),
      },
    });
  });
}

/** Buat draf perjanjian. Badan: { itemId, kind, lesseeName, lesseeKind, startOn, endOn, periodUnit, amount, ... }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/aset-desa/pemanfaatan", "Gagal membuat perjanjian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const r = await createAgreement(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, itemId: body?.itemId, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "land_agreements", r.data.id, { kind: r.data.kind, itemId: r.data.itemId, startOn: r.data.startOn, endOn: r.data.endOn });
    return NextResponse.json({ success: true, agreement: r.data }, { status: 201 });
  });
}
