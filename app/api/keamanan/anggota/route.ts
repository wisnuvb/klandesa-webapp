import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT, hasDetail, keamananCan } from "@/lib/keamanan/http";
import { createMember, listMembers } from "@/lib/keamanan/service";
import { MEMBER_ROLES, SQUAD_KINDS, END_REASONS } from "@/lib/keamanan/catalog";

/** Daftar anggota Satlinmas dengan temuan usia/SK. Telepon hanya untuk izin baca rinci. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/keamanan/anggota", "Gagal memuat anggota Satlinmas", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const detail = hasDetail(ctx);
    const list = await listMembers(prisma, { villageId: ctx.village.id, detail, today: todayJakarta() });
    return NextResponse.json({ ...list, roles: MEMBER_ROLES, squadKinds: SQUAD_KINDS, endReasons: END_REASONS, can: keamananCan(ctx), detail });
  });
}

/** Mencatat anggota: { residentId, role?, squadKind?, squadName?, decreeNumber?, decreeDate?, inauguratedOn?, cardNumber?, joinedOn?, extensionDecree?, note? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/keamanan/anggota", "Gagal mencatat anggota", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createMember(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.member, r.data.id, { residentId: r.data.residentId, role: r.data.role });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
