import { NextRequest, NextResponse } from "next/server";
import { requireRegionalApi } from "@/lib/regional-api-handler";
import { prisma } from "@/lib/prisma";
import { regionalRecap } from "@/lib/kepatuhan/service";

export const dynamic = "force-dynamic";

/**
 * Rekap kepatuhan laporan wajib per desa di wilayah akun (?year=). Hanya status dan tenggat; tidak memuat isi laporan,
 * nomor surat, atau data pribadi. Desa dibatasi lingkup akun (requireRegionalApi) sebelum data apa pun dibaca.
 */
export async function GET(req: NextRequest) {
  const loaded = await requireRegionalApi(req, "regional_kepatuhan_get");
  if (!loaded.ok) return loaded.response;
  const { regional, villages, villageIds } = loaded.ctx;
  const yr = Number(req.nextUrl.searchParams.get("year"));
  const year = Number.isInteger(yr) && yr >= 2000 && yr <= 2100 ? yr : new Date().getUTCFullYear();
  const allowed = new Set(villageIds);
  const r = await regionalRecap(prisma, { villages: villages.filter((v) => allowed.has(v.id)).map((v) => ({ id: v.id, name: v.name, district: v.district, regency: v.regency, province: v.province })), year });
  if (!r.ok) return NextResponse.json({ error: r.errors[0] }, { status: r.status });
  return NextResponse.json({ scope: regional.scope, excludedVillages: villages.length - villageIds.length, ...r.data });
}
