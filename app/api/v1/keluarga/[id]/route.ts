import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { isKependudukanV2 } from "@/lib/kependudukan/sync";
import { apiOk, badRequest, featureOff, notFound, parseIdParam } from "@/lib/api-v1/http";
import { HOUSEHOLD_SELECT, MEMBER_SELECT, householdView, memberView } from "@/lib/api-v1/views";

/** Satu keluarga beserta anggotanya (NIK anggota tersamar). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiKey(req, "kependudukan:read");
  if (!auth.ok) return auth.response;
  if (!isKependudukanV2(auth.ctx.village.settings)) return featureOff(auth);
  const id = parseIdParam((await params).id);
  if (id == null) return badRequest(auth, "id tidak valid.");

  const h = await prisma.household.findFirst({ where: { id, villageId: auth.ctx.village.id }, select: HOUSEHOLD_SELECT });
  if (!h) return notFound(auth, "Keluarga");
  const members = await prisma.resident.findMany({ where: { villageId: auth.ctx.village.id, householdId: id }, orderBy: { id: "asc" }, select: MEMBER_SELECT });
  const now = new Date();
  return apiOk(auth, { data: { ...householdView(h), members: members.map((m) => memberView(m, now)) } });
}
