import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, permissions } from "@/lib/apbdes/http";
import { requestInstallmentSpp } from "@/lib/kdmp/service";

/** Mengajukan SPP (penyedia) untuk membiayai angsuran KDMP: { year, activityCode, accountCode, amount, payee, hasReceipt?, workPeriod? }. Perlu izin mencatat di keuangan desa. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/kdmp/spp", "Gagal mengajukan SPP", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "apbdes").create) return forbidden("Anda tidak berwenang mengajukan SPP.");
    const body = await req.json().catch(() => null);
    const b = (body ?? {}) as Record<string, unknown>;
    const year = typeof b.year === "number" ? b.year : typeof b.year === "string" && /^\d{4}$/.test(b.year) ? Number(b.year) : NaN;
    if (!Number.isInteger(year)) return NextResponse.json({ error: "Tahun tidak valid.", fieldErrors: { year: "Isi tahun anggaran." } }, { status: 400 });
    const r = await requestInstallmentSpp(prisma, { villageId: ctx.village.id, year, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_pay_requests", r.data.id, { source: "KDMP", year, number: r.data.number, amount: r.data.amount, activityCode: b.activityCode, accountCode: b.accountCode });
    return NextResponse.json({ success: true, id: r.data.id, number: r.data.number }, { status: 201 });
  });
}
