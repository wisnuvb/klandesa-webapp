import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { AUDIT, hasDetail, keamananCan } from "@/lib/keamanan/http";
import { createContact, listContacts } from "@/lib/keamanan/service";
import { CONTACT_KINDS, NATIONAL_REFERRALS } from "@/lib/keamanan/catalog";

/** Daftar kontak layanan. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/keamanan/kontak", "Gagal memuat kontak layanan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const rows = await listContacts(prisma, { villageId: ctx.village.id });
    return NextResponse.json({ rows, kinds: CONTACT_KINDS, national: NATIONAL_REFERRALS, can: keamananCan(ctx), detail: hasDetail(ctx) });
  });
}

export async function POST(req: NextRequest) {
  return attempt("POST /api/keamanan/kontak", "Gagal menyimpan kontak layanan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createContact(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.contact, r.data.id, { kind: r.data.kind });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
