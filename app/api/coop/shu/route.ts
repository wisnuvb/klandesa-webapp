import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadCoopApiContextWithCooperative, requireManage } from "@/lib/coop/api-context";
import { shuPreview } from "@/lib/coop/savings-loans";

/**
 * Kalkulator pembagian SHU (tidak disimpan): ?year=&total=&savingsSharePercent=. Angka pembagian mengikuti keputusan RAT;
 * ini hanya hitungan pembantu dari saldo simpanan akhir tahun dan bunga pinjaman yang dibayar selama tahun itu.
 */
export async function GET(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;
  const sp = req.nextUrl.searchParams;
  const year = Number(sp.get("year"));
  const thisYear = new Date().getUTCFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > thisYear) return NextResponse.json({ error: "Tahun tidak valid" }, { status: 400 });
  const r = await shuPreview(prisma, { cooperativeId: loaded.ctx.cooperative.id, year, total: sp.get("total"), savingsSharePercent: sp.get("savingsSharePercent") ?? "60" });
  if (!r.ok) return NextResponse.json({ error: r.errors[0] }, { status: r.status });
  return NextResponse.json(r.data, { headers: { "Cache-Control": "no-store" } });
}
