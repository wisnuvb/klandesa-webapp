import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { apiOk, notFound, parseIdParam, badRequest } from "@/lib/api-v1/http";
import { RESIDENT_SELECT, residentView } from "@/lib/api-v1/views";

/** Satu penduduk menurut id (NIK dan KK tersamar). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiKey(req, "kependudukan:read");
  if (!auth.ok) return auth.response;
  const id = parseIdParam((await params).id);
  if (id == null) return badRequest(auth, "id tidak valid.");
  const row = await prisma.resident.findFirst({ where: { id, villageId: auth.ctx.village.id }, select: RESIDENT_SELECT });
  return row ? apiOk(auth, { data: residentView(row) }) : notFound(auth, "Penduduk");
}
