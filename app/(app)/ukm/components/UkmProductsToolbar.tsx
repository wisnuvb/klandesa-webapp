"use client";

import { ChevronDown, Filter, Plus, Search } from "lucide-react";

type Props = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  filterCategory: string | "ALL";
  categories: string[];
  onFilterCategoryChange: (value: string | "ALL") => void;
  onAddProduct: () => void;
};

export default function UkmProductsToolbar(props: Props) {
  const {
    searchQuery,
    onSearchQueryChange,
    filterCategory,
    categories,
    onFilterCategoryChange,
    onAddProduct,
  } = props;

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={filterCategory}
            onChange={(e) =>
              onFilterCategoryChange(
                e.target.value === "ALL" ? "ALL" : e.target.value,
              )
            }
            className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        </div>
      </div>
      <button
        onClick={onAddProduct}
        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
      >
        <Plus className="w-4 h-4" />
        Tambah Produk
      </button>
    </div>
  );
}

