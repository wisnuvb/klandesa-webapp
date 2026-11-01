import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { loadCoopApiContextWithCooperative, requireManage } from "@/lib/coop/api-context";
import { addPayment } from "@/lib/coop/savings-loans";

/** Catat pembayaran angsuran: { amount, paidAt, note? }. Lunas otomatis bila sisa nol. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;
  const raw = (await params).id;
  if (!/^\d{1,10}$/.test(raw)) return NextResponse.json({ error: "Pinjaman tidak ditemukan" }, { status: 404 });
  const { cooperative, village, userId } = loaded.ctx;
  const body = await req.json().catch(() => null);
  const r = await addPayment(prisma, { cooperativeId: cooperative.id, userId, loanId: Number(raw), input: body });
  if (!r.ok) return NextResponse.json({ error: r.errors[0], errors: r.errors, ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}) }, { status: r.status });
  await auditWeb(req, { userId, village }, "create", "cooperative_loan_payments", Number(raw), { amount: (body as { amount?: unknown })?.amount, status: r.data.status });
  return NextResponse.json({ success: true, ...r.data }, { status: 201 });
}
