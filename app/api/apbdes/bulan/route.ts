import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { normalizeVillageRole } from "@/lib/permissions";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { actOnMonth, monthStatuses } from "@/lib/apbdes/service";
import { failResponse, forbidden, attempt, permissions, yearOf } from "@/lib/apbdes/http";

/**
 * Tutup (close), verifikasi Sekretaris Desa (verify), atau buka kembali (reopen) buku kas satu bulan:
 * { year, month, action }. Persetujuan Kepala Desa lewat /api/apbdes/bulan/persetujuan.
 */
export async function POST(req: NextRequest) {
  return attempt("POST /api/apbdes/bulan", "Gagal memproses bulan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown; month?: unknown; action?: unknown } | null;
    const action = body?.action;
    if (action !== "close" && action !== "verify" && action !== "reopen") return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
    const can = permissions(ctx);
    if (!can.update) return forbidden("Anda tidak berwenang memproses penutupan bulan");
    const staff = normalizeVillageRole(ctx.dbUser.role) === "staff";
    // Membuka kembali menghapus kunci pembukuan, dan verifikasi adalah langkah Sekretaris Desa (Pasal 67): bukan wewenang operator.
    if (action === "reopen" && staff) return forbidden("Pembukaan kembali bulan hanya oleh admin atau sekretaris");
    if (action === "verify" && staff) return forbidden("Verifikasi buku kas dilakukan Sekretaris Desa");
    const year = yearOf(body?.year, 0);
    const month = Number(body?.month);
    const before = (await monthStatuses(prisma, ctx.village.id, year)).find((m) => m.month === month)?.state ?? null;
    const r = await actOnMonth(prisma, { villageId: ctx.village.id, userId: ctx.userId, year, month, action, allowReopenApproved: can.approve });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_month_closes", `${year}-${month}`, { action, before });
    return NextResponse.json({ success: true, months: r.data });
  });
}
