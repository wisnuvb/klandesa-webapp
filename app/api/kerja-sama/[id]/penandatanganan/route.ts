import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { sign } from "@/lib/kerja-sama/service";

/** Mencatat penandatanganan: { signedOn, signedNumber, witnessName? }. Izin "approve" (Kepala Desa/admin) lewat peta rute. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/kerja-sama/[id]/penandatanganan", "Gagal mencatat penandatanganan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    // Gerbang kedua: pola peta rute memakai pathname ter-encode (mis. /%31%32/) sehingga dapat jatuh ke awalan "create".
    if (!permissions(ctx, "perencanaan").approve) return forbidden("Penandatanganan hanya dapat dicatat oleh Kepala Desa atau admin.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kerja sama tidak ditemukan." }, { status: 404 });
    const r = await sign(prisma, { villageId: ctx.village.id, id, body: await req.json().catch(() => null), canApprove: true });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "approve", "village_agreements", id, { signedNumber: r.data.signedNumber, signedOn: r.data.signedOn, title: r.data.title });
    return NextResponse.json({ success: true });
  });
}
