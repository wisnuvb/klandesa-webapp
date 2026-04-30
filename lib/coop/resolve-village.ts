import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/** Sama pola dengan app/api/finance/budgets — resolusi desa aktif dari sesi. */
export async function resolveVillageFromSession(
  session: Session | null,
  token: { villageCode?: string } | null,
) {
  if (session?.user?.villageCode) {
    const v = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (v) return v;
  }
  if (token?.villageCode) {
    const v = await prisma.village.findUnique({
      where: { code: token.villageCode },
    });
    if (v) return v;
  }
  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const v = await prisma.village.findUnique({ where: { code: defaultCode } });
    if (v) return v;
  }
  return prisma.village.findFirst({ orderBy: { id: "asc" } });
}
