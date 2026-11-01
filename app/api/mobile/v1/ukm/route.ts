import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { checkMobileRateLimit } from "@/lib/mobile/rate-limit";
import { auditAs } from "@/lib/mobile/audit-actor";
import { notifyVillageStaff } from "@/lib/mobile/notify";
import { displayName } from "@/lib/mobile/social-logic";
import { getSpacesConfig } from "@/lib/spaces";
import { UKM_SELECT, ukmCategoryNames, ukmScope } from "@/lib/mobile/ukm-data";
import {
  UKM_LIMITS,
  UKM_PAGE_SIZE,
  parseUkmCursor,
  parseUkmInput,
  toUkmListItem,
  ukmPhotoAllowed,
  type UkmRow,
} from "@/lib/mobile/ukm-logic";

/** Katalog produk UKM desa: hanya yang tayang. Warga dan perangkat desa boleh melihat. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen", "staff"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 60);
  const category = (sp.get("category") ?? "").trim().slice(0, 100);
  const cursor = parseUkmCursor(sp.get("cursor"));

  const rows = await prisma.potential.findMany({
    where: {
      ...ukmScope(ctx.villageId),
      status: "active",
      ...(category ? { subCategory: category } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] } : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: "desc" },
    take: UKM_PAGE_SIZE + 1,
    select: UKM_SELECT,
  });
  const page = rows.slice(0, UKM_PAGE_SIZE);
  const categories = await ukmCategoryNames(ctx.villageId, true);

  return NextResponse.json({
    items: page.map((r) => toUkmListItem(r as UkmRow, me?.id ?? null)),
    categories,
    nextCursor: rows.length > UKM_PAGE_SIZE ? String(page[page.length - 1]!.id) : null,
  });
}

/** Warga menjual produk baru. Selalu berstatus `pending` sampai admin desa menyetujui. */
export async function POST(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);

  const rl = checkMobileRateLimit(`ukm-write:${ctx.accountId}`, { max: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak permintaan. Coba lagi sebentar.", 429, { retryAfterSec: rl.retryAfterSec });

  const body = await req.json().catch(() => null);
  const cdn = getSpacesConfig().cdnBaseUrl;
  const parsed = parseUkmInput(
    body,
    { categories: await ukmCategoryNames(ctx.villageId), photoAllowed: (u) => ukmPhotoAllowed(u, cdn, ctx.village.code, []) },
    "create",
  );
  if (!parsed.ok) return mobileError("INVALID_REQUEST", parsed.message, 400);
  const v = parsed.value;

  // Produk yang disembunyikan pemilik tidak menghabiskan kuota (tidak terlihat siapa pun).
  const own = { ...ukmScope(ctx.villageId), residentId: me.id };
  const active = await prisma.potential.count({ where: { ...own, status: { not: "hidden" } } });
  if (active >= UKM_LIMITS.maxProducts) {
    return mobileError("INVALID_REQUEST", `Anda sudah punya ${UKM_LIMITS.maxProducts} produk. Sembunyikan produk lama sebelum menambah yang baru.`, 400);
  }
  const today = await prisma.potential.count({ where: { ...own, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } });
  if (today >= UKM_LIMITS.maxPerDay) {
    return mobileError("RATE_LIMITED", "Batas produk baru hari ini tercapai. Coba lagi besok.", 429);
  }

  const created = await prisma.potential.create({
    data: {
      villageId: ctx.villageId,
      category: "UMKM",
      subCategory: v.category ?? null,
      name: v.name!,
      description: v.description!,
      productionValue: v.price != null ? new Prisma.Decimal(v.price) : null,
      productionUnit: v.unit ?? null,
      stockQuantity: v.stock ?? null,
      images: v.photos ?? [],
      status: "pending",
      residentId: me.id,
    },
    select: { id: true },
  });

  void auditAs(req, ctx.villageId, { type: "citizen", residentId: me.id }, "create", "ukm_products", created.id, { name: v.name, status: "pending" });
  void notifyVillageStaff(ctx.villageId, "ukm", {
    type: "system",
    title: "Produk UKM baru dari warga",
    body: `${displayName(me.name)}: ${v.name}`,
  });
  return NextResponse.json({ id: created.id, status: "pending" }, { status: 201 });
}
