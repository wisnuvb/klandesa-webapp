import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { apiOk, badRequest } from "@/lib/api-v1/http";

const num = (v: unknown) => Number(v ?? 0);
const pct = (realized: number, budget: number) => (budget > 0 ? Math.round((realized / budget) * 1000) / 10 : 0);

/** Ringkasan anggaran per kategori untuk satu tahun (bawaan: tahun terbaru yang ada). Tanpa rincian transaksi. Filter: year. */
export async function GET(req: Request) {
  const auth = await requireApiKey(req, "anggaran:read");
  if (!auth.ok) return auth.response;
  const villageId = auth.ctx.village.id;
  const sp = new URL(req.url).searchParams;

  let year: number;
  if (sp.get("year") != null) {
    year = Number(sp.get("year"));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return badRequest(auth, "year harus tahun 4 digit.");
  } else {
    const latest = await prisma.budget.aggregate({ where: { villageId }, _max: { year: true } });
    year = latest._max.year ?? new Date().getUTCFullYear();
  }

  const groups = await prisma.budget.groupBy({
    by: ["category"],
    where: { villageId, year, status: { not: "cancelled" } },
    _sum: { budgetAmount: true, realizedAmount: true },
    orderBy: { category: "asc" },
  });
  const categories = groups.map((g) => {
    const budget = num(g._sum.budgetAmount);
    const realized = num(g._sum.realizedAmount);
    return { category: g.category, budget, realized, remaining: budget - realized, realizationPercent: pct(realized, budget) };
  });
  const budget = categories.reduce((a, c) => a + c.budget, 0);
  const realized = categories.reduce((a, c) => a + c.realized, 0);
  return apiOk(auth, { data: { year, totals: { budget, realized, remaining: budget - realized, realizationPercent: pct(realized, budget) }, categories } });
}
