/** Warga pemilik produk. Hanya 4 digit terakhir NIK yang dikirim ke layar admin. */
export type UkmOwner = { id: number; name: string; nikLast4: string };

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
  /** Kontak penjual yang diisi pemilik di aplikasi (baca-saja); visible = tampil ke warga lain */
  contact: { phone: string; visible: boolean } | null;
  /** Warga yang ditautkan sebagai pemilik; null = dikelola desa */
  owner: UkmOwner | null;
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
  owner: UkmOwner | null;
};

export type UkmCategoryRow = {
  name: string;
  slug: string;
  productCount: number;
  createdAt: string | null;
};


export type UkmStatusFilter = "ALL" | "active" | "pending" | "hidden" | "inactive";

type StatusTone = "ok" | "warn" | "muted" | "danger";

/** Status produk di mata admin. Warna selalu dipasangkan dengan teks (bukan satu-satunya penanda). */
export const UKM_STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  active: { label: "Tayang", tone: "ok" },
  pending: { label: "Menunggu persetujuan", tone: "warn" },
  hidden: { label: "Disembunyikan pemilik", tone: "muted" },
  inactive: { label: "Disembunyikan desa", tone: "danger" },
};

export function ukmStatusMeta(status: string): { label: string; tone: StatusTone } {
  return UKM_STATUS_META[status.toLowerCase()] ?? { label: status, tone: "muted" };
}
