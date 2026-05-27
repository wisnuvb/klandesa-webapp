import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

export type ParsedListQuery = {
  page: number;
  pageSize: number;
  skip: number;
  sortKey?: string;
  sortOrder: "asc" | "desc";
  search?: string;
};

export function parseListQuery(
  req: NextRequest,
  defaults?: { pageSize?: number },
): ParsedListQuery {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(sp.get("pageSize") ?? defaults?.pageSize ?? 10) || 10),
  );
  const sortKey = sp.get("sortKey")?.trim() || undefined;
  const sortOrder: "asc" | "desc" =
    sp.get("sortOrder") === "asc" ? "asc" : "desc";
  const search = sp.get("search")?.trim() || undefined;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    sortKey,
    sortOrder,
    search,
  };
}

export function dasawismaSearchWhere(
  search: string | undefined,
): Prisma.DasawismaWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { leaderName: { contains: search } },
      { rt: { contains: search } },
      { rw: { contains: search } },
    ],
  };
}

export function sessionSearchWhere(
  search: string | undefined,
): Prisma.PosyanduSessionWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { location: { contains: search } },
      { dasawisma: { leaderName: { contains: search } } },
      { dasawisma: { rt: { contains: search } } },
      { dasawisma: { rw: { contains: search } } },
    ],
  };
}

export function visitSearchWhere(
  search: string | undefined,
): Prisma.PosyanduVisitWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { resident: { name: { contains: search } } },
      { resident: { nik: { contains: search } } },
      { session: { location: { contains: search } } },
    ],
  };
}

export function stuntingResidentSearchWhere(
  search: string | undefined,
): Prisma.ResidentWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { name: { contains: search } },
      { nik: { contains: search } },
      { rt: { contains: search } },
      { rw: { contains: search } },
    ],
  };
}
