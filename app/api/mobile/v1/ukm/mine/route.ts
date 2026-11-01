import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { UKM_SELECT, ukmCategoryNames, ukmScope, ukmVillageSettings } from "@/lib/mobile/ukm-data";
import { UKM_LIMITS, toUkmListItem, type UkmRow } from "@/lib/mobile/ukm-logic";

/** Semua produk milik warga yang login, apa pun statusnya, plus batas, kategori, dan aturan persetujuan desa untuk formulir. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);

  const rows = await prisma.potential.findMany({
    where: { ...ukmScope(ctx.villageId), residentId: me.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: UKM_SELECT,
  });
  return NextResponse.json({
    items: rows.map((r) => toUkmListItem(r as UkmRow, me.id, true)),
    categories: await ukmCategoryNames(ctx.villageId),
    limits: UKM_LIMITS,
    // Formulir memberi tahu warga apakah produk barunya diperiksa desa dulu atau langsung tayang.
    moderation: (await ukmVillageSettings(ctx.villageId)).moderation,
  });
}
