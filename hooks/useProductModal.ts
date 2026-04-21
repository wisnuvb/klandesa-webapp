import { useState } from "react";
import type { UkmProduct } from "../app/(app)/ukm/_types";
import type { UkmProductDraft } from "./useProducts";

const emptyDraft: UkmProductDraft = {
  name: "",
  description: "",
  price: 0,
  category: "",
  images: [],
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