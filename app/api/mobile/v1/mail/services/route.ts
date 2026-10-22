import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileContext } from "@/lib/mobile/context";
import { pickPopular } from "@/lib/mobile/mail-logic";

/** Daftar jenis surat yang bisa diajukan warga + penanda "paling sering diajukan" di desa ini. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;

  const templates = await prisma.mailTemplate.findMany({
    where: { isActive: true, OR: [{ villageId: ctx.villageId }, { isGlobal: true, villageId: null }] },
    select: { id: true, name: true, description: true, category: true, villageId: true, catalogKey: true, inheritsCatalogKey: true },
    orderBy: { name: "asc" },
  });
  // Template desa yang menggantikan entri katalog global (inheritsCatalogKey) menyembunyikan entri global itu.
  const overridden = new Set(templates.filter((t) => t.villageId && t.inheritsCatalogKey).map((t) => t.inheritsCatalogKey));
  const visible = templates.filter((t) => !(t.villageId === null && t.catalogKey && overridden.has(t.catalogKey)));

  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);
  const grouped = await prisma.mailRequest.groupBy({
    by: ["mailType"],
    where: { villageId: ctx.villageId, requestDate: { gte: since } },
    _count: { _all: true },
  });
  const counts = new Map(grouped.map((g) => [g.mailType.toLowerCase(), g._count._all]));
  const total = grouped.reduce((n, g) => n + g._count._all, 0);
  const popular = new Set(pickPopular(visible.map((t) => ({ id: t.id, name: t.name, category: t.category })), counts, total));

  return NextResponse.json({
    items: visible.map((t) => ({
      id: t.id, name: t.name, description: t.description, category: t.category, popular: popular.has(t.id),
    })),
  });
}
