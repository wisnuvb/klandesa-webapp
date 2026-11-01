import { NextResponse } from "next/server";
import type { VillageApiContext } from "@/lib/api-village-context";
import { normalizeVillageRole, roleCan, type PermissionAction, type PermissionResource } from "@/lib/permissions";

export { failResponse, parseIntId } from "@/lib/tata-kelola/http";

export const yearOf = (raw: unknown, fallback = new Date().getUTCFullYear()): number => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : fallback;
};

/** Izin aksi untuk peran pengguna (dikirim ke layar agar tombol yang tak berlaku disembunyikan). */
export const permissions = (ctx: VillageApiContext, resource: PermissionResource = "apbdes"): Record<PermissionAction, boolean> => {
  const role = normalizeVillageRole(ctx.dbUser.role);
  return Object.fromEntries((["read", "create", "update", "delete", "export", "approve"] as PermissionAction[]).map((a) => [a, roleCan(resource, a, role)])) as Record<PermissionAction, boolean>;
};

/** Membungkus isi rute: galat tak terduga menjadi 500 berpesan (guard tetap dipanggil eksplisit di setiap rute). */
export async function attempt(label: string, failMsg: string, run: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await run();
  } catch (e) {
    console.error(`${label} error:`, e);
    return NextResponse.json({ error: failMsg }, { status: 500 });
  }
}

export const forbidden = (msg: string) => NextResponse.json({ error: msg }, { status: 403 });
