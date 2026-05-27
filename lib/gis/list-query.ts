import type { Prisma } from "@prisma/client";

export function assetSearchWhere(
  search: string | undefined,
): Prisma.VillageAssetWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { name: { contains: search } },
      { assetType: { contains: search } },
      { rt: { contains: search } },
      { rw: { contains: search } },
      { condition: { contains: search } },
    ],
  };
}

export function projectSearchWhere(
  search: string | undefined,
): Prisma.InfrastructureProjectWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { title: { contains: search } },
      { projectType: { contains: search } },
      { status: { contains: search } },
    ],
  };
}
