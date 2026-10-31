import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { apiOk, badRequest } from "@/lib/api-v1/http";
import { parsePaging, slicePage } from "@/lib/api-v1/page";
import { OFFICIAL_SELECT, officialView } from "@/lib/api-v1/views";

/** Perangkat desa yang aktif: nama, jabatan, masa jabatan. Tanpa NIK, telepon, email, dan alamat. */
export async function GET(req: Request) {
  const auth = await requireApiKey(req, "perangkat:read");
  if (!auth.ok) return auth.response;
  const paging = parsePaging(new URL(req.url).searchParams);
  if (!paging.ok) return badRequest(auth, paging.message);

  const rows = await prisma.official.findMany({
    where: { villageId: auth.ctx.village.id, status: "active", ...(paging.cursor ? { id: { gt: paging.cursor } } : {}) },
    orderBy: { id: "asc" },
    take: paging.limit + 1,
    select: OFFICIAL_SELECT,
  });
  const { data, page } = slicePage(rows, paging.limit, (r) => r.id);
  return apiOk(auth, { data: data.map(officialView), page });
}
