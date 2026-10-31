import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { apiOk, badRequest } from "@/lib/api-v1/http";
import { parsePaging, slicePage } from "@/lib/api-v1/page";
import { POTENTIAL_SELECT, potentialView } from "@/lib/api-v1/views";

/** Potensi dan UMKM desa yang aktif. Filter: category. Tanpa nilai produksi dan pendapatan. */
export async function GET(req: Request) {
  const auth = await requireApiKey(req, "potensi:read");
  if (!auth.ok) return auth.response;
  const sp = new URL(req.url).searchParams;
  const paging = parsePaging(sp);
  if (!paging.ok) return badRequest(auth, paging.message);

  const rows = await prisma.potential.findMany({
    where: {
      villageId: auth.ctx.village.id,
      status: "active",
      ...(sp.get("category") ? { category: sp.get("category")!.slice(0, 100) } : {}),
      ...(paging.cursor ? { id: { gt: paging.cursor } } : {}),
    },
    orderBy: { id: "asc" },
    take: paging.limit + 1,
    select: POTENTIAL_SELECT,
  });
  const { data, page } = slicePage(rows, paging.limit, (r) => r.id);
  return apiOk(auth, { data: data.map(potentialView), page });
}
