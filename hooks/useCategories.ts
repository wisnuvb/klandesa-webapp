import { useMemo } from "react";
import { toast } from "sonner";
import type { UkmCategoryRow, UkmProduct } from "../app/(app)/ukm/_types";
import { generateSlug } from "../app/(app)/ukm/_utils";

export function useCategories(products: UkmProduct[]) {
  const categoryRows: UkmCategoryRow[] = useMemo(() => {
    const map = new Map<
      string,
      { productCount: number; createdAt: string | null }
    >();

    for (const p of products) {
      // Skip placeholder products
      if (p.status.toLowerCase() === "inactive" && p.name.startsWith("Kategori: ")) {
        continue;
      }
      const name = p.category?.trim() || "Tanpa Kategori";
      const existing = map.get(name);
      const createdAt = p.createdAt;
      if (!existing) {
        map.set(name, { productCount: 1, createdAt });
        continue;
      }
      existing.productCount += 1;
      if (existing.createdAt) {
        existing.createdAt =
          new Date(createdAt) < new Date(existing.createdAt)
            ? createdAt
            : existing.createdAt;
      } else {
        existing.createdAt = createdAt;
      }
    }

    return Array.from(map.entries())
      .map(([name, meta]) => ({
        name,
        slug: generateSlug(name),
        productCount: meta.productCount,
        createdAt: meta.createdAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const categoryOptions: string[] = useMemo(() => {
    return categoryRows
      .map((c) => c.name)
      .filter((name) => name !== "Tanpa Kategori");
  }, [categoryRows]);

  const renameCategory = async (from: string, to: string) => {
    if (from === "Tanpa Kategori") return;
    try {
      const res = await fetch("/api/ukm-products/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data?.error || "Request gagal");
      }
      toast.success("Kategori berhasil diubah");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    }
  };

  const addCategory = async (name: string) => {
    try {
      const res = await fetch("/api/ukm-products/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data?.error || "Request gagal");
      }
      const newProduct = (await res.json()) as UkmProduct;
      // Note: This hook doesn't manage products state, so we assume the parent will update products
      toast.success("Kategori berhasil ditambahkan");
      return newProduct; // Return to allow parent to update state
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menambahkan");
      throw error;
    }
  };

  const deleteCategory = async (name: string, products: UkmProduct[]) => {
    if (name === "Tanpa Kategori") return;

    // Check if category has active products
    const hasActiveProducts = products.some(
      (p) =>
        (p.category?.trim() || "Tanpa Kategori") === name &&
        p.status.toLowerCase() === "active",
    );

    if (hasActiveProducts) {
      toast.error("Kategori tidak bisa dihapus karena masih digunakan oleh produk aktif");
      return;
    }

    if (!confirm(`Hapus kategori "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch("/api/ukm-products/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data?.error || "Request gagal");
      }
      toast.success("Kategori berhasil dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus");
    }
  };

  return {
    categoryRows,
    categoryOptions,
    renameCategory,
    addCategory,
    deleteCategory,
  };
}