import { useState } from "react";

export function useCategoryModal() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [initialName, setInitialName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openModal = (name?: string) => {
    setEditingName(name || null);
    setInitialName(name || "");
    setKey((k) => k + 1);
    setOpen(true);
  };

  const closeModal = () => setOpen(false);

  return {
    open,
    key,
    initialName,
    editingName,
    isSaving,
    setIsSaving,
    openModal,
    closeModal,
  };
}