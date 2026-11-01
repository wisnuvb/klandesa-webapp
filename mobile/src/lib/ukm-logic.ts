/** Logika murni (tanpa React Native) untuk fitur Produk desa: validasi formulir, format harga, tampilan status. */
import { formatRupiahFull, parseRupiahInput } from './format.ts';

export type UkmStatus = 'active' | 'pending' | 'hidden' | 'inactive';

/** Batas yang sama dengan server (lib/mobile/ukm-logic.ts); server tetap memeriksa ulang. */
export const UKM_LIMITS = {
  nameMin: 3,
  nameMax: 100,
  descMin: 10,
  descMax: 1000,
  unitMax: 20,
  stockMax: 999_999,
} as const;

/** Satuan yang paling sering dipakai; ketuk sekali, tidak perlu mengetik. */
export const QUICK_UNITS = ['pcs', 'kg', 'bungkus', 'porsi', 'liter'] as const;

export type UkmFormValues = {
  name: string;
  description: string;
  /** Ketikan harga apa adanya ("15.000", "Rp 15000"); kosong = harga belum diisi. */
  priceText: string;
  unit: string;
  category: string | null;
  /** Ketikan stok; kosong = stok tidak dilacak. */
  stockText: string;
};

export type UkmField = 'name' | 'description' | 'price' | 'unit' | 'category' | 'stock' | 'photos';
export type UkmFormErrors = Partial<Record<UkmField, string>>;

export type UkmPayload = {
  name: string;
  description: string;
  price: number | null;
  unit: string;
  category: string | null;
  stock: number | null;
  photos: string[];
};

export type UkmValidation = { ok: true; payload: UkmPayload } | { ok: false; errors: UkmFormErrors };

/** Pesan galat berbahasa awam; satu kalimat, menyebut apa yang perlu diperbaiki. */
export function validateUkmForm(
  v: UkmFormValues,
  ctx: { categories: readonly string[]; photos: readonly string[]; maxPhotos: number },
): UkmValidation {
  const errors: UkmFormErrors = {};
  const L = UKM_LIMITS;

  const name = v.name.trim();
  if (name.length < L.nameMin) errors.name = `Nama produk minimal ${L.nameMin} huruf.`;
  else if (name.length > L.nameMax) errors.name = `Nama produk maksimal ${L.nameMax} huruf.`;

  const description = v.description.trim();
  if (description.length < L.descMin) errors.description = `Ceritakan produknya minimal ${L.descMin} huruf, supaya pembeli paham.`;
  else if (description.length > L.descMax) errors.description = `Deskripsi maksimal ${L.descMax} huruf.`;

  let price: number | null = null;
  if (/\d/.test(v.priceText)) {
    price = parseRupiahInput(v.priceText);
    if (price === null) errors.price = 'Harga terlalu besar. Periksa lagi angkanya.';
  } else if (v.priceText.trim() !== '') {
    errors.price = 'Harga hanya boleh berisi angka.';
  }

  const unit = v.unit.trim();
  if (unit.length > L.unitMax) errors.unit = `Satuan maksimal ${L.unitMax} huruf.`;

  if (v.category !== null && !ctx.categories.includes(v.category)) {
    errors.category = 'Pilih kategori dari daftar, atau kosongkan.';
  }

  let stock: number | null = null;
  const stockText = v.stockText.trim();
  if (stockText !== '') {
    if (!/^\d+$/.test(stockText)) errors.stock = 'Stok hanya boleh berisi angka bulat.';
    else if (Number(stockText) > L.stockMax) errors.stock = `Stok maksimal ${L.stockMax.toLocaleString('id-ID')}.`;
    else stock = Number(stockText);
  }

  if (ctx.photos.length > ctx.maxPhotos) errors.photos = `Maksimal ${ctx.maxPhotos} foto.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, payload: { name, description, price, unit, category: v.category, stock, photos: [...ctx.photos] } };
}

/** Beri titik ribuan saat mengetik harga: "15000" → "15.000". Selain angka dibuang; maksimal 10 digit. */
export function formatPriceInput(text: string): string {
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 10);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** "Rp15.000 / kg"; tanpa harga: "Harga belum diisi". */
export function priceLabel(price: number | null, unit: string | null): string {
  if (price === null || price === undefined) return 'Harga belum diisi';
  const u = unit?.trim();
  return u ? `${formatRupiahFull(price)} / ${u}` : formatRupiahFull(price);
}

export type StatusTone = 'green' | 'gold' | 'muted' | 'red';
export type StatusLook = { label: string; tone: StatusTone; icon: 'checkmark-circle' | 'time' | 'eye-off' | 'close-circle' };

const STATUS_LOOK: Record<UkmStatus, StatusLook> = {
  active: { label: 'Tayang', tone: 'green', icon: 'checkmark-circle' },
  pending: { label: 'Menunggu persetujuan desa', tone: 'gold', icon: 'time' },
  hidden: { label: 'Disembunyikan oleh Anda', tone: 'muted', icon: 'eye-off' },
  inactive: { label: 'Disembunyikan oleh desa', tone: 'red', icon: 'close-circle' },
};

/** Tampilan status. Teks selalu ada (warna saja tidak cukup); `serverLabel` dipakai bila server mengirimnya. */
export function statusLook(status: UkmStatus, serverLabel?: string | null): StatusLook {
  const base = STATUS_LOOK[status] ?? STATUS_LOOK.pending;
  return serverLabel ? { ...base, label: serverLabel } : base;
}

/** Ada isian yang belum disimpan? Dipakai untuk bertanya sebelum keluar dari formulir. */
export function isFormDirty(a: UkmFormValues & { photos: readonly string[] }, b: UkmFormValues & { photos: readonly string[] }): boolean {
  return (
    a.name.trim() !== b.name.trim() ||
    a.description.trim() !== b.description.trim() ||
    a.priceText.replace(/\D/g, '') !== b.priceText.replace(/\D/g, '') ||
    a.unit.trim() !== b.unit.trim() ||
    a.category !== b.category ||
    a.stockText.trim() !== b.stockText.trim() ||
    a.photos.length !== b.photos.length ||
    a.photos.some((p, i) => p !== b.photos[i])
  );
}

/** Sisa jatah produk untuk teks "3 dari 20 produk". */
export function quotaLabel(count: number, max: number): string {
  return `${count} dari ${max} produk`;
}
