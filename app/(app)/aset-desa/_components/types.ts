import type { ItemView } from "@/lib/aset-desa/service";

export type { ItemView };

export interface ListResponse {
  items: ItemView[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    active: number;
    disposed: number;
    totalValue: string;
    byCategory: Record<string, number>;
    byCondition: Record<string, number>;
  };
  can: { create: boolean; update: boolean; dispose: boolean; export: boolean };
  limits: { items: number };
}

export const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

export const rupiah = (v: string | number): string => `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(v))}`;
