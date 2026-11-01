import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { createManualJournal, listJournals } from "@/lib/bumdes/service";
import { isAddonActive, bumdesLimit } from "@/lib/modules/resource-limits";
import { loadActiveModuleSubs } from "@/lib/modules/require-module";

const isoDate = (v: string | null): string | null => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** Daftar jurnal (?from=&to=&unitId=&source=&status=&page=&pageSize=). unitId=PUSAT untuk Kantor Pusat. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bumdes/jurnal", "Gagal memuat jurnal", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx);
    if (!s.ok) return s.response;
    const sp = req.nextUrl.searchParams;
    const u = sp.get("unitId");
    const r = await listJournals(prisma, s.bumdes.id, {
      from: isoDate(sp.get("from")),
      to: isoDate(sp.get("to")),
      unitId: u === "PUSAT" ? "PUSAT" : u ? parseIntId(u) : null,
      source: sp.get("source"),
      status: sp.get("status"),
      page: Math.max(1, Math.min(100000, Number(sp.get("page")) || 1)),
      pageSize: Math.max(1, Math.min(100, Number(sp.get("pageSize")) || 25)),
    });
    return NextResponse.json({ ...r, canManage: s.canManage });
  });
}

/** Jurnal manual: { unitId|null, entryDate, description, reference?, lines: [{ accountCode, debit, credit, memo? }] }. Debit harus sama dengan kredit. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bumdes/jurnal", "Gagal mencatat jurnal", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx, { write: true });
    if (!s.ok) return s.response;
    const village = s.ctx.village;
    const addons = await loadActiveModuleSubs(village.id);
    const limit = bumdesLimit(village.subscriptionPlan, village.subscriptionStatus, isAddonActive("bumdes", addons));
    const r = await createManualJournal(prisma, { bumdesId: s.bumdes.id, userId: s.ctx.userId, input: await req.json().catch(() => null), cap: limit?.transactions ?? null });
    if (!r.ok) {
      if (r.status === 402) return NextResponse.json({ error: "RESOURCE_LIMIT_REACHED", limit: limit?.transactions, module: "bumdes", billingUrl: "/billing?module=bumdes" }, { status: 402 });
      return failResponse(r);
    }
    await auditWeb(req, s.ctx, "create", "bumdes_journals", r.data.id, { voucherNo: r.data.voucherNo });
    return NextResponse.json({ success: true, id: r.data.id, voucherNo: r.data.voucherNo }, { status: 201 });
  });
}
