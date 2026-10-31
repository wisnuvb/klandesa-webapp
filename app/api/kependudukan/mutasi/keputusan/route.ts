import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { MUTATION_DECIDE_ROLES } from "@/lib/kependudukan/mutation";
import { decideMutationAtomic } from "@/lib/kependudukan/mutation-service";
import { parseId, requireV2 } from "@/lib/kependudukan/api";

/**
 * Putuskan pengajuan mutasi: { id, decision: "approve" | "reject", reason?, nik? }.
 * Izin "approve" pada sumber daya warga (admin, sekretaris, kepala desa). NIK warga baru diisi di sini, tidak disimpan di mutasi.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!isVillageSubscriptionActive(ctx.village)) return subscriptionBlockedResponse(ctx.village);
    const off = requireV2(ctx.village);
    if (off) return off;
    if (!MUTATION_DECIDE_ROLES.has(ctx.dbUser.role)) {
      return NextResponse.json({ error: "Peran Anda tidak dapat memutuskan mutasi." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const id = parseId(body?.id);
    const decision = body?.decision === "approve" || body?.decision === "reject" ? body.decision : null;
    if (id == null || !decision) return NextResponse.json({ error: "Pengajuan dan keputusan wajib diisi." }, { status: 400 });

    const result = await decideMutationAtomic({
      villageId: ctx.village.id,
      mutationId: id,
      userId: ctx.userId,
      decision,
      reason: typeof body.reason === "string" ? body.reason : undefined,
      nik: typeof body.nik === "string" ? body.nik : undefined,
    });
    if (!result.ok) return NextResponse.json({ error: result.errors[0], errors: result.errors }, { status: result.status });

    await auditWeb(req, ctx, decision === "approve" ? "approve" : "reject", "resident_mutations", String(id), { status: result.data.status, residentId: result.data.residentId });
    return NextResponse.json({ success: true, status: result.data.status, residentId: result.data.residentId });
  } catch (e) {
    console.error("POST /api/kependudukan/mutasi/keputusan error:", e);
    return NextResponse.json({ error: "Gagal memutuskan mutasi" }, { status: 500 });
  }
}
