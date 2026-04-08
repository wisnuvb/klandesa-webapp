"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { firstImage } from "../_utils";

export type UkmProductDraft = {
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
};

type Props = {
  open: boolean;
  title: string;
  initialDraft: UkmProductDraft;
  categoryOptions: string[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (draft: UkmProductDraft) => void;
};

export default function UkmProductModal(props: Props) {
  const {
    open,
    title,
    initialDraft,
    categoryOptions,
    isSaving,
    onClose,
    onSave,
  } = props;

  const [draft, setDraft] = useState<UkmProductDraft>(() => initialDraft);
  const [newImageUrl, setNewImageUrl] = useState("");

  const canSave = useMemo(() => {
    return Boolean(draft.name.trim() && draft.description.trim());
  }, [draft.description, draft.name]);

  const cover = firstImage(draft.images);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8"
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {cover && (
                <div className="relative w-full aspect-[16/7] bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={cover}
                    alt="Cover"
                    className="w-full h-full object-cover"
                    width={800}
                    height={350}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Produk *
                </label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Contoh: Kerupuk Udang Premium"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi *
                </label>
                <textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Deskripsikan produk Anda..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    value={draft.price}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        price: parseInt(e.target.value) || 0,
                      }))
                    }
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <input
                    type="text"
                    list="ukm-category-options"
                    value={draft.category}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    placeholder="Contoh: Makanan & Minuman"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <datalist id="ukm-category-options">
                    {categoryOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gambar Produk (URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = newImageUrl.trim();
                      if (!url) return;
                      setDraft((prev) => ({
                        ...prev,
                        images: Array.from(new Set([...prev.images, url])),
                      }));
                      setNewImageUrl("");
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah
                  </button>
                </div>

                {draft.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {draft.images.map((url) => (
                      <div
                        key={url}
                        className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                      >
                        <Image
                          src={url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          width={200}
                          height={200}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              images: prev.images.filter((u) => u !== url),
                            }))
                          }
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={isSaving}
              >
                Batal
              </button>
              <button
                onClick={() => onSave(draft)}
                disabled={!canSave || isSaving}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simpan
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
