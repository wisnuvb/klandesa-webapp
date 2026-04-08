"use client";

import { motion } from "motion/react";
import { Edit, Eye, Image as ImageIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import type { UkmProduct } from "../_types";
import { firstImage, formatCurrency } from "../_utils";

type Props = {
  products: UkmProduct[];
  onEdit: (product: UkmProduct) => void;
  onDelete: (id: number) => void;
  onPreviewImages: (images: string[], index?: number) => void;
};

export default function UkmProductsGrid(props: Props) {
  const { products, onEdit, onDelete, onPreviewImages } = props;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => {
        const cover = firstImage(product.images);
        const categoryLabel = product.category?.trim() || "Tanpa Kategori";

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
              <div className="mb-4">
                {typeof product.price === "number" && product.price > 0 ? (
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(product.price)}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">Harga belum diisi</span>
                )}
              </div>
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

