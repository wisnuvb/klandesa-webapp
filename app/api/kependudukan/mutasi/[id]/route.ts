import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { MUTATION_DECIDE_ROLES } from "@/lib/kependudukan/mutation";
import { cancelMutation } from "@/lib/kependudukan/mutation-service";
import { parseId, requireV2 } from "@/lib/kependudukan/api";

/** Batalkan pengajuan yang masih menunggu: oleh pengaju atau pejabat yang berwenang memutuskan. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const off = requireV2(ctx.village);
    if (off) return off;

    const id = parseId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const body = await req.json().catch(() => null);
    if (body?.action !== "cancel") return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });

    const result = await cancelMutation(prisma, { villageId: ctx.village.id, mutationId: id, userId: ctx.userId, isDecider: MUTATION_DECIDE_ROLES.has(ctx.dbUser.role) });
    if (!result.ok) return NextResponse.json({ error: result.errors[0] }, { status: result.status });

    await auditWeb(req, ctx, "cancel", "resident_mutations", String(id), { status: "CANCELLED" });
    return NextResponse.json({ success: true, status: "CANCELLED" });
  } catch (e) {
    console.error("PATCH /api/kependudukan/mutasi/[id] error:", e);
    return NextResponse.json({ error: "Gagal membatalkan pengajuan" }, { status: 500 });
  }
}
