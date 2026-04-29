/* eslint-disable @typescript-eslint/no-explicit-any */
import { normalizeImageUrls } from "@/app/(app)/ukm/_utils";

export function parseStockQuantity(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

export function toUkmProduct(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.subCategory ?? null,
    price: row.productionValue ? Number(row.productionValue) : null,
    unit: row.productionUnit ?? null,
    stockQuantity: row.stockQuantity ?? null,
    notes: row.productNotes ?? null,
    images: normalizeImageUrls(row.images),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const ukmProductSelect = {
  id: true,
  name: true,
  description: true,
  subCategory: true,
  productionValue: true,
  productionUnit: true,
  stockQuantity: true,
  productNotes: true,
  images: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;
