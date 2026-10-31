import type { Prisma } from "@prisma/client";
import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { apiOk, badRequest } from "@/lib/api-v1/http";
import { parsePaging, slicePage } from "@/lib/api-v1/page";
import { RESIDENT_SELECT, residentStatusWhere, residentView } from "@/lib/api-v1/views";

/** Daftar penduduk (NIK dan KK tersamar). Filter: q, rt, rw, dusun, status (aktif|meninggal|pindah|semua), familyRole. */
export async function GET(req: Request) {
  const auth = await requireApiKey(req, "kependudukan:read");
  if (!auth.ok) return auth.response;

  const sp = new URL(req.url).searchParams;
  const paging = parsePaging(sp);
  if (!paging.ok) return badRequest(auth, paging.message);
  const statusWhere = residentStatusWhere(sp.get("status"));
  if (!statusWhere) return badRequest(auth, "status harus salah satu dari: aktif, meninggal, pindah, semua.");
  const q = (sp.get("q") ?? "").trim();
  if (q && q.length < 2) return badRequest(auth, "q minimal 2 karakter.");

  const where: Prisma.ResidentWhereInput = {
    villageId: auth.ctx.village.id,
    ...statusWhere,
    ...(paging.cursor ? { id: { gt: paging.cursor } } : {}),
    ...(q ? { name: { contains: q } } : {}),
    ...(sp.get("rt") ? { rt: sp.get("rt")!.slice(0, 10) } : {}),
    ...(sp.get("rw") ? { rw: sp.get("rw")!.slice(0, 10) } : {}),
    ...(sp.get("dusun") ? { hamlet: sp.get("dusun")!.slice(0, 100) } : {}),
    ...(sp.get("familyRole") ? { familyRole: sp.get("familyRole")!.slice(0, 50) } : {}),
  };
  const rows = await prisma.resident.findMany({ where, orderBy: { id: "asc" }, take: paging.limit + 1, select: RESIDENT_SELECT });
  const now = new Date();
  const { data, page } = slicePage(rows, paging.limit, (r) => r.id);
  return apiOk(auth, { data: data.map((r) => residentView(r, now)), page });
}
