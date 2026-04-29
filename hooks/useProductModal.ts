import { useState } from "react";
import type { UkmProduct, UkmProductDraft } from "@/app/(app)/ukm/_types";

const emptyDraft: UkmProductDraft = {
  name: "",
  description: "",
  price: 0,
  category: "",
  images: [],
  unit: "",
  stockQuantity: null,
  notes: "",
};

export function useProductModal() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [initialDraft, setInitialDraft] = useState<UkmProductDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openModal = (product?: UkmProduct) => {
    setEditingId(product?.id || null);
    setInitialDraft(
      product
        ? {
            name: product.name,
            description: product.description,
            price: product.price ?? 0,
            category: product.category ?? "",
            images: product.images,
            unit: product.unit ?? "",
            stockQuantity: product.stockQuantity ?? null,
            notes: product.notes ?? "",
          }
        : emptyDraft
    );
    setKey((k) => k + 1);
    setOpen(true);
  };

  const closeModal = () => setOpen(false);

  return {
    open,
    key,
    initialDraft,
    editingId,
    isSaving,
    setIsSaving,
    openModal,
    closeModal,
  };
}
