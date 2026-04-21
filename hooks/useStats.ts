import { useMemo } from "react";
import type { UkmCategoryRow, UkmProduct } from "../_types";

export function useStats(products: UkmProduct[], categoryRows: UkmCategoryRow[]) {
  return useMemo(() => {
    const activeProducts = products.filter(
      (p) => p.status.toLowerCase() === "active",
    ).length;
    const totalValue = products
      .filter((p) => p.status.toLowerCase() === "active")
      .reduce((acc, p) => acc + (p.price ?? 0), 0);
    return {
      totalProducts: activeProducts,
      totalCategories: categoryRows.filter((c) => c.name !== "Tanpa Kategori")
        .length,
      activeProducts,
      totalValue,
    };
  }, [categoryRows, products]);
}