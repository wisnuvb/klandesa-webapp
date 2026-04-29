export type UkmProduct = {
  id: number;
  name: string;
  description: string;
  price: number | null;
  category: string | null;
  images: string[];
  /** Satuan (pcs, kg, dll.) — kolom productionUnit di DB */
  unit: string | null;
  /** Jumlah stok; null jika tidak diisi */
  stockQuantity: number | null;
  /** Catatan tambahan */
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type UkmProductDraft = {
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  unit: string;
  stockQuantity: number | null;
  notes: string;
};

export type UkmCategoryRow = {
  name: string;
  slug: string;
  productCount: number;
  createdAt: string | null;
};

