export type UkmProduct = {
  id: number;
  name: string;
  description: string;
  price: number | null;
  category: string | null;
  images: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type UkmCategoryRow = {
  name: string;
  slug: string;
  productCount: number;
  createdAt: string | null;
};

