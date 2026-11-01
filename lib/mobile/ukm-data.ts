import { prisma } from "@/lib/prisma";
import { UKM_CATEGORIES, parseUkmSettings, uniqueCategories, type UkmSettings } from "./ukm-logic";

/**
 * Kolom produk UKM untuk API mobile. Sengaja TANPA `productNotes` (catatan internal penjual) dan data pribadi pemilik.
 * `contactPhone`/`contactVisible` ikut dipilih, tetapi `toUkmDetail` hanya mengeluarkannya sesuai pilihan pemilik.
 */
export const UKM_SELECT = {
  id: true,
  name: true,
  description: true,
  subCategory: true,
  productionValue: true,
  productionUnit: true,
  stockQuantity: true,
  images: true,
  status: true,
  residentId: true,
  contactPhone: true,
  contactVisible: true,
  updatedAt: true,
  resident: { select: { name: true, hamlet: true } },
} as const;

/** Pengaturan UKM desa (mis. apakah produk warga diperiksa admin dulu). */
export async function ukmVillageSettings(villageId: number): Promise<UkmSettings> {
  const v = await prisma.village.findUnique({ where: { id: villageId }, select: { settings: true } });
  return parseUkmSettings(v?.settings);
}

/** Baris `Potential` milik katalog UKM desa ini (kategori UMKM/UKM). */
export const ukmScope = (villageId: number) => ({ villageId, category: { in: [...UKM_CATEGORIES] } });

/**
 * Daftar kategori yang dikelola admin. Admin membuat kategori kosong sebagai baris "Kategori: X" berstatus
 * inactive, jadi untuk formulir kategori diambil dari semua baris; untuk filter katalog hanya yang punya produk tayang.
 */
export async function ukmCategoryNames(villageId: number, onlyActive = false): Promise<string[]> {
  const rows = await prisma.potential.findMany({
    where: { ...ukmScope(villageId), subCategory: { not: null }, ...(onlyActive ? { status: "active" } : {}) },
    distinct: ["subCategory"],
    select: { subCategory: true },
    take: 200,
  });
  return uniqueCategories(rows.map((r) => r.subCategory));
}
