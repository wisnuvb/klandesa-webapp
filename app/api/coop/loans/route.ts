import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { loadCoopApiContextWithCooperative, requireManage } from "@/lib/coop/api-context";
import { createLoan, LIMITS, listLoans } from "@/lib/coop/savings-loans";

/** Daftar pinjaman anggota (?status=AKTIF|LUNAS&memberId=) beserta sisa kewajiban dan tunggakan. */
export async function GET(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const { cooperative, access } = loaded.ctx;
  const sp = req.nextUrl.searchParams;
  const memberId = Number(sp.get("memberId"));
  const loans = await listLoans(prisma, cooperative.id, { status: sp.get("status") ?? undefined, memberId: Number.isInteger(memberId) && memberId > 0 ? memberId : undefined });
  return NextResponse.json({ loans, canManage: access.manage, limits: LIMITS }, { headers: { "Cache-Control": "no-store" } });
}

/** Cairkan pinjaman: { memberId, principal, ratePercent?, termMonths, disbursedAt, purpose? }. */
export async function POST(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;
  const { cooperative, village, userId } = loaded.ctx;
  const body = await req.json().catch(() => null);
  const r = await createLoan(prisma, { cooperativeId: cooperative.id, userId, input: body });
  if (!r.ok) return NextResponse.json({ error: r.errors[0], errors: r.errors, ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}) }, { status: r.status });
  const b = body as { memberId?: unknown; principal?: unknown; termMonths?: unknown };
  await auditWeb(req, { userId, village }, "create", "cooperative_loans", r.data.id, { memberId: b.memberId, principal: b.principal, termMonths: b.termMonths });
  return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
}
