"use client";

import { motion } from "motion/react";
import { Edit, Tag, Trash2 } from "lucide-react";
import type { UkmCategoryRow } from "../_types";

type Props = {
  categories: UkmCategoryRow[];
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
};

export default function UkmCategoryTable(props: Props) {
  const { categories, onRename, onDelete } = props;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nama Kategori
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Slug
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Jumlah Produk
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dibuat
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {categories.map((category) => (
            <motion.tr
              key={category.slug}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Tag className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="font-medium text-gray-900">
                    {category.name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4 text-sm text-gray-600">
                <code className="px-2 py-1 bg-gray-100 rounded text-xs">
                  {category.slug}
                </code>
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                  {category.productCount} produk
                </span>
              </td>
              <td className="px-4 py-4 text-sm text-gray-600">
                {category.createdAt
                  ? new Date(category.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "-"}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRename(category.name)}
                    className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(category.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

