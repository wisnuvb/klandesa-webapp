import { prisma } from "@/lib/prisma";
import type { MobileContext } from "./context";

/** Resident milik akun warga yang sedang login (null bila bukan warga). */
export async function getCitizenResident(ctx: MobileContext) {
  if (ctx.accountType !== "citizen") return null;
  const acc = await prisma.citizenAccount.findUnique({
    where: { id: ctx.accountId },
    select: {
      resident: { select: { id: true, villageId: true, nik: true, kk: true, name: true, familyRole: true, birthDate: true, gender: true } },
    },
  });
  return acc?.resident ?? null;
}
