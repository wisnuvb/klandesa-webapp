"use client";

import { motion } from "motion/react";
import { Check, Clock, Edit, Eye, EyeOff, Image as ImageIcon, Phone, Trash2, User } from "lucide-react";
import Image from "next/image";
import { ukmStatusMeta, type UkmProduct } from "../_types";
import { firstImage, formatCurrency } from "../_utils";

type Props = {
  products: UkmProduct[];
  onEdit: (product: UkmProduct) => void;
  onDelete: (id: number) => void;
  onSetStatus: (id: number, status: "active" | "inactive") => void;
  onPreviewImages: (images: string[], index?: number) => void;
};

const TONE_CLASS = {
  ok: "bg-green-100 text-green-800",
  warn: "bg-amber-100 text-amber-900",
  muted: "bg-gray-200 text-gray-800",
  danger: "bg-red-100 text-red-800",
} as const;

export default function UkmProductsGrid(props: Props) {
  const { products, onEdit, onDelete, onSetStatus, onPreviewImages } = props;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => {
        const cover = firstImage(product.images);
        const categoryLabel = product.category?.trim() || "Tanpa Kategori";
        const status = product.status.toLowerCase();
        const meta = ukmStatusMeta(status);

        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
          >
            <div className="relative aspect-square bg-gray-100 overflow-hidden">
              {cover ? (
                <>
                  <Image
                    src={cover}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    width={400}
                    height={400}
                  />
                  {product.images.length > 1 && (
                    <button
                      onClick={() => onPreviewImages(product.images, 0)}
                      className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 rounded-lg hover:bg-opacity-100 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Eye className="w-4 h-4 text-gray-700" />
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
              {status !== "active" && (
                <span
                  className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg ${TONE_CLASS[meta.tone]}`}
                >
                  {status === "pending" ? (
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {meta.label}
                </span>
              )}
              <div className="absolute bottom-2 left-2">
                <span className="inline-block px-2 py-1 bg-teal-500 text-white text-xs rounded-lg">
                  {categoryLabel}
                </span>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-12">
                {product.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-10">
                {product.description}
              </p>
              {product.owner ? (
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-gray-600">
                  <User className="w-3.5 h-3.5" aria-hidden="true" />
                  Milik {product.owner.name}
                </p>
              ) : null}
              {product.contact ? (
                <p className="mb-2 flex items-center gap-1.5 text-xs text-gray-600">
                  <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="tabular-nums">{product.contact.phone}</span>
                  <span className="text-gray-500">
                    · {product.contact.visible ? "tampil ke warga" : "tidak ditampilkan"}
                  </span>
                </p>
              ) : null}
              <div className="mb-4">
                {typeof product.price === "number" && product.price > 0 ? (
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(product.price)}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">Harga belum diisi</span>
                )}
              </div>
              {(product.stockQuantity !== null && product.stockQuantity !== undefined) ||
              (product.unit && product.unit.trim()) ? (
                <p className="text-sm text-gray-600 mb-2">
                  Stok:{" "}
                  {product.stockQuantity !== null &&
                  product.stockQuantity !== undefined
                    ? product.stockQuantity
                    : "—"}
                  {product.unit?.trim() ? ` ${product.unit.trim()}` : ""}
                </p>
              ) : null}
              {product.notes?.trim() ? (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                  {product.notes.trim()}
                </p>
              ) : null}
              {status === "pending" ? (
                <div className="mb-3 flex items-center gap-2">
                  <button
                    onClick={() => onSetStatus(product.id, "active")}
                    className="flex-1 inline-flex min-h-10 items-center justify-center gap-2 px-3 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Setujui
                  </button>
                  <button
                    onClick={() => onSetStatus(product.id, "inactive")}
                    className="flex-1 inline-flex min-h-10 items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    Tolak
                  </button>
                </div>
              ) : status === "inactive" ? (
                <button
                  onClick={() => onSetStatus(product.id, "active")}
                  className="mb-3 w-full inline-flex min-h-10 items-center justify-center gap-2 px-3 py-2 border border-teal-600 text-teal-700 text-sm rounded-lg hover:bg-teal-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  <Eye className="w-4 h-4" aria-hidden="true" />
                  Tayangkan
                </button>
              ) : status === "active" ? (
                <button
                  onClick={() => onSetStatus(product.id, "inactive")}
                  className="mb-3 w-full inline-flex min-h-10 items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                  Sembunyikan
                </button>
              ) : null}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(product)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => onDelete(product.id)}
                  aria-label={`Hapus ${product.name}`}
                  className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

