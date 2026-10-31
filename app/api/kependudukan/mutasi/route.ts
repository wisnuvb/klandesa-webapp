import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { MUTATION_DECIDE_ROLES, MUTATION_SUBMIT_ROLES, type MutationInput, type MutationType } from "@/lib/kependudukan/mutation";
import { submitMutation } from "@/lib/kependudukan/mutation-service";
import { requireV2, serializeMutations } from "@/lib/kependudukan/api";

const TYPES: readonly MutationType[] = ["BIRTH", "DEATH", "MOVE_OUT", "MOVE_IN", "KK_CHANGE"];
const STATUSES = ["PENDING", "APPLIED", "REJECTED", "CANCELLED"] as const;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Buku mutasi desa: daftar pengajuan dan mutasi yang sudah diterapkan. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { village } = guard.ctx;
    const off = requireV2(village);
    if (off) return off;

    const sp = req.nextUrl.searchParams;
    const type = TYPES.find((t) => t === sp.get("type"));
    const status = STATUSES.find((s) => s === sp.get("status"));
    const from = YMD.test(sp.get("from") ?? "") ? sp.get("from")! : null;
    const to = YMD.test(sp.get("to") ?? "") ? sp.get("to")! : null;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20));

    const where = {
      villageId: village.id,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(from || to ? { effectiveDate: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}) } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.residentMutation.findMany({ where, orderBy: [{ effectiveDate: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit }),
      prisma.residentMutation.count({ where }),
    ]);
    const role = guard.ctx.dbUser.role;
    return NextResponse.json({
      total,
      page,
      limit,
      permissions: { canSubmit: MUTATION_SUBMIT_ROLES.has(role), canDecide: MUTATION_DECIDE_ROLES.has(role) },
      items: await serializeMutations(rows),
    });
  } catch (e) {
    console.error("GET /api/kependudukan/mutasi error:", e);
    return NextResponse.json({ error: "Gagal memuat buku mutasi" }, { status: 500 });
  }
}

/** Ajukan mutasi (status PENDING). Memutuskan lewat /mutasi/keputusan. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!isVillageSubscriptionActive(ctx.village)) return subscriptionBlockedResponse(ctx.village);
    const off = requireV2(ctx.village);
    if (off) return off;
    if (!MUTATION_SUBMIT_ROLES.has(ctx.dbUser.role)) {
      return NextResponse.json({ error: "Peran Anda tidak dapat mengajukan mutasi." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const type = TYPES.find((t) => t === body?.type);
    if (!type || typeof body?.effectiveDate !== "string") {
      return NextResponse.json({ error: "Jenis mutasi dan tanggal kejadian wajib diisi." }, { status: 400 });
    }
    const residentId = body.residentId == null || body.residentId === "" ? null : Number(body.residentId);
    if (residentId != null && !Number.isInteger(residentId)) {
      return NextResponse.json({ error: "Warga tidak valid." }, { status: 400 });
    }
    const input: MutationInput = { type, effectiveDate: body.effectiveDate, residentId, details: body.details && typeof body.details === "object" ? body.details : {} };

    const result = await submitMutation(prisma, { villageId: ctx.village.id, userId: ctx.userId, input, source: "web" });
    if (!result.ok) return NextResponse.json({ error: result.errors[0], errors: result.errors }, { status: result.status });

    await auditWeb(req, ctx, "create", "resident_mutations", result.data.id, { type, effectiveDate: input.effectiveDate, residentId });
    return NextResponse.json({ success: true, id: result.data.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/kependudukan/mutasi error:", e);
    return NextResponse.json({ error: "Gagal mengajukan mutasi" }, { status: 500 });
  }
}
