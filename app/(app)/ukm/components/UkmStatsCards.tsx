"use client";

import { motion } from "motion/react";
import { DollarSign, Package, ShoppingBag, Tag } from "lucide-react";
import { formatCurrency } from "../_utils";

type Props = {
  totalProducts: number;
  totalCategories: number;
  activeProducts: number;
  totalValue: number;
};

export default function UkmStatsCards(props: Props) {
  const { totalProducts, totalCategories, activeProducts, totalValue } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Produk</p>
            <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Kategori</p>
            <p className="text-3xl font-bold text-gray-900">
              {totalCategories}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Tag className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Produk Aktif</p>
            <p className="text-3xl font-bold text-teal-600">
              {activeProducts}
            </p>
          </div>
          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-teal-600" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Nilai Total</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalValue)}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

