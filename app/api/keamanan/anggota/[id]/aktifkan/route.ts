import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT, denyUnless } from "@/lib/keamanan/http";
import { reactivateMember } from "@/lib/keamanan/service";

type Ctx = { params: Promise<{ id: string }> };

/** Mengaktifkan kembali anggota yang keanggotaannya sudah berakhir. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/anggota/[id]/aktifkan", "Gagal mengaktifkan anggota", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = denyUnless(ctx, "update");
    if (denied) return denied;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Anggota tidak ditemukan." }, { status: 404 });
    const r = await reactivateMember(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "reactivate", AUDIT.member, id, { residentId: r.data.residentId });
    return NextResponse.json({ success: true });
  });
}
