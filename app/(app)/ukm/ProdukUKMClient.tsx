"use client";

import { motion } from "motion/react";
import { Package, Tag } from "lucide-react";
import type { UkmProduct, UkmProductDraft } from "./_types";
import UkmCategoryModal from "./components/UkmCategoryModal";
import UkmCategoryTable from "./components/UkmCategoryTable";
import UkmImagePreviewModal from "./components/UkmImagePreviewModal";
import UkmProductModal from "./components/UkmProductModal";
import UkmProductsGrid from "./components/UkmProductsGrid";
import UkmProductsToolbar from "./components/UkmProductsToolbar";
import UkmStatsCards from "./components/UkmStatsCards";
import { useCategories } from "../../../hooks/useCategories";
import { useImagePreview } from "../../../hooks/useImagePreview";
import { useProductModal } from "../../../hooks/useProductModal";
import { useCategoryModal } from "../../../hooks/useCategoryModal";
import { useProducts } from "../../../hooks/useProducts";
import { useStats } from "../../../hooks/useStats";
import { usePersistedTab } from "@/hooks/usePersistedTab";

type Props = {
  initialProducts: UkmProduct[];
};

const UKM_PRODUK_TABS = ["products", "categories"] as const;

export default function ProdukUKMClient(props: Props) {
  const { initialProducts } = props;

  const [activeTab, setActiveTab] = usePersistedTab(
    "ukm-produk",
    "products",
    UKM_PRODUK_TABS
  );

  const productsHook = useProducts(initialProducts);
  const categoriesHook = useCategories(productsHook.products);
  const productModalHook = useProductModal();
  const categoryModalHook = useCategoryModal();
  const imagePreviewHook = useImagePreview();
  const stats = useStats(productsHook.products, categoriesHook.categoryRows);

  const handleAddProduct = () => {
    productModalHook.openModal();
  };

  const handleEditProduct = (product: UkmProduct) => {
    productModalHook.openModal(product);
  };

  const handleDeleteProduct = (id: number) => {
    productsHook.deleteProduct(id);
  };

  const handleSaveProduct = async (draft: UkmProductDraft) => {
    productModalHook.setIsSaving(true);
    try {
      if (productModalHook.editingId) {
        await productsHook.editProduct(productModalHook.editingId, draft);
      } else {
        await productsHook.addProduct(draft);
      }
      productModalHook.closeModal();
    } finally {
      productModalHook.setIsSaving(false);
    }
  };

  const handlePreviewImages = (images: string[], index: number = 0) => {
    imagePreviewHook.openPreview(images, index);
  };

  const handleRenameCategory = (name: string) => {
    categoryModalHook.openModal(name);
  };

  const handleAddCategory = () => {
    categoryModalHook.openModal();
  };

  const handleSaveCategoryRename = async (newName: string) => {
    const from = categoryModalHook.editingName;
    const to = newName.trim();
    if (!to) return;

    categoryModalHook.setIsSaving(true);
    try {
      if (from) {
        await categoriesHook.renameCategory(from, to);
        productsHook.setProducts((prev) =>
          prev.map((p) =>
            (p.category?.trim() || "Tanpa Kategori") === from
              ? { ...p, category: to }
              : p,
          ),
        );
      } else {
        const newProduct = await categoriesHook.addCategory(to);
        productsHook.setProducts((prev) => [newProduct, ...prev]);
      }
      categoryModalHook.closeModal();
    } finally {
      categoryModalHook.setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (name: string) => {
    await categoriesHook.deleteCategory(name, productsHook.products);
    productsHook.setProducts((prev) =>
      prev.filter(
        (p) =>
          !(
            (p.category?.trim() || "Tanpa Kategori") === name &&
            p.status.toLowerCase() === "inactive" &&
            p.name.startsWith("Kategori: ")
          ),
      ),
    );
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
                searchQuery={productsHook.searchQuery}
                onSearchQueryChange={productsHook.setSearchQuery}
                filterCategory={productsHook.filterCategory}
                categories={categoriesHook.categoryRows.map((c) => c.name)}
                onFilterCategoryChange={productsHook.setFilterCategory}
                onAddProduct={handleAddProduct}
              />

              {productsHook.filteredProducts.length > 0 ? (
                <UkmProductsGrid
                  products={productsHook.filteredProducts}
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
                <button
                  onClick={handleAddCategory}
                  className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Tambah Kategori
                </button>
              </div>

              <p className="text-sm text-gray-500">
                Kategori diambil dari field kategori pada produk (subCategory di
                DB).
              </p>

              {categoriesHook.categoryRows.filter((c) => c.name !== "Tanpa Kategori").length >
              0 ? (
                <UkmCategoryTable
                  categories={categoriesHook.categoryRows.filter(
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
        key={productModalHook.key}
        open={productModalHook.open}
        title={productModalHook.editingId ? "Edit Produk" : "Tambah Produk Baru"}
        initialDraft={productModalHook.initialDraft}
        categoryOptions={categoriesHook.categoryOptions}
        isSaving={productModalHook.isSaving}
        onClose={productModalHook.closeModal}
        onSave={handleSaveProduct}
      />

      <UkmCategoryModal
        key={categoryModalHook.key}
        open={categoryModalHook.open}
        title={categoryModalHook.editingName ? "Ubah Nama Kategori" : "Tambah Kategori Baru"}
        initialName={categoryModalHook.initialName}
        isSaving={categoryModalHook.isSaving}
        onClose={categoryModalHook.closeModal}
        onSave={handleSaveCategoryRename}
      />

      <UkmImagePreviewModal
        open={imagePreviewHook.open}
        images={imagePreviewHook.images}
        currentIndex={imagePreviewHook.currentIndex}
        onClose={imagePreviewHook.closePreview}
        onSelectIndex={imagePreviewHook.setCurrentIndex}
      />
    </div>
  );
}

