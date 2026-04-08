"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Package, Tag } from "lucide-react";
import { toast } from "sonner";
import type { UkmCategoryRow, UkmProduct } from "./_types";
import { generateSlug } from "./_utils";
import UkmCategoryModal from "./components/UkmCategoryModal";
import UkmCategoryTable from "./components/UkmCategoryTable";
import UkmImagePreviewModal from "./components/UkmImagePreviewModal";
import UkmProductModal, { UkmProductDraft } from "./components/UkmProductModal";
import UkmProductsGrid from "./components/UkmProductsGrid";
import UkmProductsToolbar from "./components/UkmProductsToolbar";
import UkmStatsCards from "./components/UkmStatsCards";

type Props = {
  initialProducts: UkmProduct[];
};

const emptyDraft: UkmProductDraft = {
  name: "",
  description: "",
  price: 0,
  category: "",
  images: [],
};

async function readJsonError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data?.error || "Request gagal";
  } catch {
    return "Request gagal";
  }
}

export default function ProdukUKMClient(props: Props) {
  const { initialProducts } = props;

  const [activeTab, setActiveTab] = useState<"products" | "categories">(
    "products",
  );
  const [products, setProducts] = useState<UkmProduct[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | "ALL">("ALL");

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalKey, setProductModalKey] = useState(0);
  const [productModalInitialDraft, setProductModalInitialDraft] =
    useState<UkmProductDraft>(emptyDraft);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalKey, setCategoryModalKey] = useState(0);
  const [categoryModalInitialName, setCategoryModalInitialName] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(
    null,
  );
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const categoryRows: UkmCategoryRow[] = useMemo(() => {
    const map = new Map<
      string,
      { productCount: number; createdAt: string | null }
    >();

    for (const p of products) {
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

  const stats = useMemo(() => {
    const activeProducts = products.filter(
      (p) => p.status.toLowerCase() === "active",
    ).length;
    const totalValue = products.reduce((acc, p) => acc + (p.price ?? 0), 0);
    return {
      totalProducts: products.length,
      totalCategories: categoryRows.filter((c) => c.name !== "Tanpa Kategori")
        .length,
      activeProducts,
      totalValue,
    };
  }, [categoryRows, products]);

  const handleAddProduct = () => {
    setEditingProductId(null);
    setProductModalInitialDraft(emptyDraft);
    setProductModalKey((k) => k + 1);
    setProductModalOpen(true);
  };

  const handleEditProduct = (product: UkmProduct) => {
    setEditingProductId(product.id);
    setProductModalInitialDraft({
      name: product.name,
      description: product.description,
      price: product.price ?? 0,
      category: product.category ?? "",
      images: product.images,
    });
    setProductModalKey((k) => k + 1);
    setProductModalOpen(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Hapus produk ini?")) return;

    try {
      const res = await fetch(`/api/ukm-products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readJsonError(res));
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Produk berhasil dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus");
    }
  };

  const handleSaveProduct = async (draft: UkmProductDraft) => {
    setIsSavingProduct(true);
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        price: draft.price,
        category: draft.category,
        images: draft.images,
      };

      const res = await fetch(
        editingProductId ? `/api/ukm-products/${editingProductId}` : "/api/ukm-products",
        {
          method: editingProductId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error(await readJsonError(res));
      const saved = (await res.json()) as UkmProduct;

      setProducts((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id);
        if (idx === -1) return [saved, ...prev];
        return prev.map((p) => (p.id === saved.id ? saved : p));
      });

      setProductModalOpen(false);
      toast.success("Produk berhasil disimpan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handlePreviewImages = (images: string[], index: number = 0) => {
    setPreviewImages(images);
    setCurrentImageIndex(index);
    setShowImagePreview(true);
  };

  const handleRenameCategory = (name: string) => {
    setEditingCategoryName(name);
    setCategoryModalInitialName(name);
    setCategoryModalKey((k) => k + 1);
    setCategoryModalOpen(true);
  };

  const handleSaveCategoryRename = async (newName: string) => {
    const from = editingCategoryName;
    const to = newName.trim();
    if (!from) return;
    if (from === "Tanpa Kategori") return;
    if (!to) return;

    setIsSavingCategory(true);
    try {
      const res = await fetch("/api/ukm-products/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      if (!res.ok) throw new Error(await readJsonError(res));

      setProducts((prev) =>
        prev.map((p) =>
          (p.category?.trim() || "Tanpa Kategori") === from
            ? { ...p, category: to }
            : p,
        ),
      );
      setCategoryModalOpen(false);
      toast.success("Kategori berhasil diubah");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (name: string) => {
    if (name === "Tanpa Kategori") return;
    if (!confirm(`Hapus kategori "${name}"? Produk di kategori ini akan jadi tanpa kategori.`)) {
      return;
    }

    setIsSavingCategory(true);
    try {
      const res = await fetch("/api/ukm-products/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await readJsonError(res));

      setProducts((prev) =>
        prev.map((p) =>
          (p.category?.trim() || "Tanpa Kategori") === name
            ? { ...p, category: null }
            : p,
        ),
      );
      toast.success("Kategori berhasil dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus");
    } finally {
      setIsSavingCategory(false);
    }
  };

  return (
    <div className="space-y-6">
      <UkmStatsCards {...stats} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200"
      >
        <div className="border-b border-gray-200">
          <div className="flex gap-1 p-1">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "products"
                  ? "bg-teal-50 text-teal-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Daftar Produk
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "categories"
                  ? "bg-teal-50 text-teal-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Kategori Produk
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "products" && (
            <div className="space-y-4">
              <UkmProductsToolbar
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                filterCategory={filterCategory}
                categories={categoryRows.map((c) => c.name)}
                onFilterCategoryChange={setFilterCategory}
                onAddProduct={handleAddProduct}
              />

              {filteredProducts.length > 0 ? (
                <UkmProductsGrid
                  products={filteredProducts}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  onPreviewImages={handlePreviewImages}
                />
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Tidak ada produk</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Tambah produk baru untuk memulai
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "categories" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-900">
                  Daftar Kategori Produk
                </h3>
              </div>

              <p className="text-sm text-gray-500">
                Kategori diambil dari field kategori pada produk (subCategory di
                DB).
              </p>

              {categoryRows.filter((c) => c.name !== "Tanpa Kategori").length >
              0 ? (
                <UkmCategoryTable
                  categories={categoryRows.filter(
                    (c) => c.name !== "Tanpa Kategori",
                  )}
                  onRename={handleRenameCategory}
                  onDelete={handleDeleteCategory}
                />
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Belum ada kategori</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Tambah produk dan isi kategori untuk membuat kategori baru
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <UkmProductModal
        key={productModalKey}
        open={productModalOpen}
        title={editingProductId ? "Edit Produk" : "Tambah Produk Baru"}
        initialDraft={productModalInitialDraft}
        categoryOptions={categoryOptions}
        isSaving={isSavingProduct}
        onClose={() => setProductModalOpen(false)}
        onSave={handleSaveProduct}
      />

      <UkmCategoryModal
        key={categoryModalKey}
        open={categoryModalOpen}
        title="Ubah Nama Kategori"
        initialName={categoryModalInitialName}
        isSaving={isSavingCategory}
        onClose={() => setCategoryModalOpen(false)}
        onSave={handleSaveCategoryRename}
      />

      <UkmImagePreviewModal
        open={showImagePreview}
        images={previewImages}
        currentIndex={currentImageIndex}
        onClose={() => setShowImagePreview(false)}
        onSelectIndex={setCurrentImageIndex}
      />
    </div>
  );
}

