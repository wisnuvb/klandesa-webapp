import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { apiOk, badRequest } from "@/lib/api-v1/http";
import { decodeCursor, parsePaging, slicePage } from "@/lib/api-v1/page";
import { ANNOUNCEMENT_SELECT, announcementView } from "@/lib/api-v1/views";

/** Pengumuman yang sedang tayang (sudah terbit dan belum kedaluwarsa), terbaru dulu. Filter: category. */
export async function GET(req: Request) {
  const auth = await requireApiKey(req, "pengumuman:read");
  if (!auth.ok) return auth.response;
  const sp = new URL(req.url).searchParams;
  const paging = parsePaging(sp);
  if (!paging.ok) return badRequest(auth, paging.message);
  const cursor = paging.cursor != null ? decodeCursor(sp.get("cursor")!) : null;
  const now = new Date();

  const rows = await prisma.announcement.findMany({
    where: {
      villageId: auth.ctx.village.id,
      isActive: true,
      publishDate: { lte: now },
      AND: [{ OR: [{ expiryDate: null }, { expiryDate: { gt: now } }] }],
      ...(sp.get("category") ? { category: sp.get("category")!.slice(0, 100) } : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: "desc" },
    take: paging.limit + 1,
    select: ANNOUNCEMENT_SELECT,
  });
  const { data, page } = slicePage(rows, paging.limit, (r) => r.id);
  return apiOk(auth, { data: data.map(announcementView), page });
}
