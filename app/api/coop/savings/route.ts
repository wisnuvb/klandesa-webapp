import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { loadCoopApiContextWithCooperative, requireManage } from "@/lib/coop/api-context";
import { addSaving, listSavings, memberBalances, SAVING_KIND_LABEL } from "@/lib/coop/savings-loans";
import { fromCents } from "@/lib/coop/loan-math";

/** Saldo simpanan tiap anggota dan riwayat transaksi (?memberId=&page=). */
export async function GET(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const { cooperative, access } = loaded.ctx;
  const sp = req.nextUrl.searchParams;
  const memberId = Number(sp.get("memberId"));
  const page = Math.max(1, Math.min(100000, Number(sp.get("page")) || 1));
  const [balances, history] = await Promise.all([memberBalances(prisma, cooperative.id), listSavings(prisma, cooperative.id, { memberId: Number.isInteger(memberId) && memberId > 0 ? memberId : undefined, page, pageSize: 25 })]);
  const sum = (k: "pokok" | "wajib" | "sukarela" | "total") => fromCents(balances.reduce((a, b) => a + b[k], 0n));
  return NextResponse.json(
    {
      members: balances.map((b) => ({ id: b.id, name: b.name, membershipNumber: b.membershipNumber, active: b.active, pokok: fromCents(b.pokok), wajib: fromCents(b.wajib), sukarela: fromCents(b.sukarela), total: fromCents(b.total) })),
      totals: { pokok: sum("pokok"), wajib: sum("wajib"), sukarela: sum("sukarela"), total: sum("total") },
      history,
      page,
      kinds: SAVING_KIND_LABEL,
      canManage: access.manage,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Catat setoran/penarikan: { memberId, kind, direction, amount, txDate, note? }. */
export async function POST(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;
  const { cooperative, village, userId } = loaded.ctx;
  const body = await req.json().catch(() => null);
  const r = await addSaving(prisma, { cooperativeId: cooperative.id, userId, input: body });
  if (!r.ok) return NextResponse.json({ error: r.errors[0], errors: r.errors, ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}) }, { status: r.status });
  const b = body as { memberId?: unknown; kind?: unknown; direction?: unknown; amount?: unknown };
  await auditWeb(req, { userId, village }, "create", "cooperative_savings", r.data.id, { memberId: b.memberId, kind: b.kind, direction: b.direction, amount: b.amount });
  return NextResponse.json({ success: true, ...r.data }, { status: 201 });
}
