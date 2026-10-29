import type { Prisma } from "@prisma/client";

/**
 * Template yang boleh dilihat/dipakai sebuah desa: miliknya sendiri atau katalog global
 * (tanpa `villageId`). Template milik desa lain tidak pernah masuk, walau `isGlobal` true.
 */
export function villageTemplateScope(
  villageId: number,
): Prisma.MailTemplateWhereInput {
  return { OR: [{ villageId }, { isGlobal: true, villageId: null }] };
}
