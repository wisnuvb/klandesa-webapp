import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { UkmProduct } from "../app/(app)/ukm/_types";

export type UkmProductDraft = {
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
};

export function useProducts(initialProducts: UkmProduct[]) {
  const [products, setProducts] = useState<UkmProduct[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | "ALL">("ALL");

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q);

      const categoryLabel = product.category?.trim() || "Tanpa Kategori";
      const matchCategory =
        filterCategory === "ALL" || categoryLabel === filterCategory;

      return matchSearch && matchCategory;
    });
  }, [filterCategory, products, searchQuery]);

  const addProduct = async (draft: UkmProductDraft) => {
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        price: draft.price,
        category: draft.category,
        images: draft.images,
      };

      const res = await fetch("/api/ukm-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data?.error || "Request gagal");
      }

      const saved = (await res.json()) as UkmProduct;
      setProducts((prev) => [saved, ...prev]);
      toast.success("Produk berhasil disimpan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    }
  };

  const editProduct = async (id: number, draft: UkmProductDraft) => {
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        price: draft.price,
        category: draft.category,
        images: draft.images,
      };

      const res = await fetch(`/api/ukm-products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data?.error || "Request gagal");
      }

      const saved = (await res.json()) as UkmProduct;
      setProducts((prev) =>
        prev.map((p) => (p.id === saved.id ? saved : p))
      );
      toast.success("Produk berhasil disimpan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Hapus produk ini?")) return;

    try {
      const res = await fetch(`/api/ukm-products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data?.error || "Request gagal");
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Produk berhasil dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus");
    }
  };

  return {
    products,
    filteredProducts,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    addProduct,
    editProduct,
    deleteProduct,
  };
}