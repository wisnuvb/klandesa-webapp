import { NextResponse } from "next/server";

export type VillageRouteCtx = { params: Promise<{ id: string }> };

/** ID desa dari segmen URL: bilangan bulat positif murni (tolak "12abc", "1e3", "0"). */
export function parseVillageId(raw: string): number | null {
  if (!/^\d{1,9}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 ? n : null;
}

export const badId = () => NextResponse.json({ error: "ID desa tidak valid" }, { status: 400 });
export const notFound = () => NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
