/**
 * Produk UKM yang ditautkan ke warga (murni, tanpa DB). Dipakai API mobile `/ukm` dan rute web `ukm-products`.
 *
 * Status produk (kolom `Potential.status`):
 *  - active   tayang di katalog (juga satu-satunya yang keluar di API publik v1)
 *  - pending  kiriman warga, menunggu persetujuan admin desa
 *  - hidden   disembunyikan oleh pemilik; pemilik boleh menayangkannya lagi
 *  - inactive disembunyikan oleh admin desa; pemilik tidak bisa menayangkannya sendiri
 */
import { displayName } from "./social-logic";
import { isOwnReportPhotoUrl } from "./report-logic";

export const UKM_CATEGORIES = ["UMKM", "UKM"] as const;
export const UKM_PHOTO_FOLDER = "mobile-ukm";
export const UKM_LIMITS = { maxProducts: 30, maxPhotos: 4, maxPerDay: 5 } as const;
export const UKM_PAGE_SIZE = 20;

export const UKM_STATUSES = ["active", "pending", "hidden", "inactive"] as const;
export type UkmStatus = (typeof UKM_STATUSES)[number];

export const UKM_STATUS_LABEL: Record<UkmStatus, string> = {
  active: "Tayang",
  pending: "Menunggu persetujuan desa",
  hidden: "Disembunyikan oleh Anda",
  inactive: "Disembunyikan oleh desa",
};

/** Nilai lain (data lama, mis. "potential") dianggap tidak tayang, bukan tayang. */
export function normalizeUkmStatus(raw: string | null | undefined): UkmStatus {
  return (UKM_STATUSES as readonly string[]).includes(raw ?? "") ? (raw as UkmStatus) : "inactive";
}

export function ukmStatusNote(status: UkmStatus): string | null {
  switch (status) {
    case "pending":
      return "Admin desa akan memeriksa produk Anda sebelum tampil di katalog. Anda akan diberi tahu hasilnya.";
    case "hidden":
      return "Produk tidak tampil di katalog. Anda bisa menampilkannya kembali kapan saja.";
    case "inactive":
      return "Produk disembunyikan oleh admin desa. Perbaiki datanya lalu simpan: produk akan diajukan ulang untuk diperiksa.";
    default:
      return null;
  }
}

/** Pemilik hanya boleh bolak-balik tayang ⇄ sembunyi; menunggu persetujuan dan ditutup desa bukan wewenangnya. */
export const canToggleUkmVisible = (status: UkmStatus): boolean => status === "active" || status === "hidden";

export function ukmStatusForVisibility(
  status: UkmStatus,
  visible: boolean,
): { ok: true; status: UkmStatus } | { ok: false; message: string } {
  if (!canToggleUkmVisible(status)) {
    return {
      ok: false,
      message:
        status === "pending"
          ? "Produk masih menunggu persetujuan desa."
          : "Produk ini disembunyikan oleh admin desa. Perbaiki datanya agar diperiksa ulang, atau hubungi kantor desa.",
    };
  }
  return { ok: true, status: visible ? "active" : "hidden" };
}

/** Mengubah isi produk yang ditutup desa = mengajukan ulang. Status lain tidak berubah karena edit. */
export const ukmStatusAfterEdit = (status: UkmStatus): UkmStatus => (status === "inactive" ? "pending" : status);

// ---------- Validasi masukan ----------

export type UkmFields = {
  name: string;
  description: string;
  price: number | null;
  unit: string | null;
  category: string | null;
  stock: number | null;
  photos: string[];
};

export type UkmParseContext = {
  /** Kategori yang dikelola admin; pemilik tidak bisa membuat kategori baru. */
  categories: readonly string[];
  /** URL foto yang boleh dipakai (unggahan mobile desa ini, atau foto yang sudah ada di produk). */
  photoAllowed: (url: string) => boolean;
};

const MAX_PRICE = 1_000_000_000_000;
const MAX_STOCK = 999_999;
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

const clean = (s: string) => s.replace(CONTROL_CHARS, "").trim();

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

function parseText(v: unknown, label: string, min: number, max: number): Parsed<string> {
  const s = typeof v === "string" ? clean(v) : "";
  if (s.length < min || s.length > max) {
    return { ok: false, message: min > 0 ? `${label} ${min}–${max} huruf.` : `${label} maksimal ${max} huruf.` };
  }
  return { ok: true, value: s };
}

/** Kosong/null = tidak diisi. Bilangan bulat rupiah ≥ 0; 0 dianggap tidak diisi (sama dengan web). */
function parsePrice(v: unknown): Parsed<number | null> {
  if (v === null || v === "") return { ok: true, value: null };
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN;
  if (!Number.isFinite(n) || n < 0) return { ok: false, message: "Harga harus berupa angka rupiah." };
  if (n >= MAX_PRICE) return { ok: false, message: "Harga terlalu besar." };
  const whole = Math.round(n);
  return { ok: true, value: whole > 0 ? whole : null };
}

function parseStock(v: unknown): Parsed<number | null> {
  if (v === null || v === "") return { ok: true, value: null };
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > MAX_STOCK) return { ok: false, message: `Stok berupa bilangan bulat 0–${MAX_STOCK}.` };
  return { ok: true, value: n };
}

function parseCategory(v: unknown, categories: readonly string[]): Parsed<string | null> {
  if (v === null || v === "") return { ok: true, value: null };
  const s = typeof v === "string" ? clean(v) : "";
  if (!s || !categories.includes(s)) return { ok: false, message: "Pilih kategori dari daftar yang tersedia." };
  return { ok: true, value: s };
}

function parsePhotos(v: unknown, ctx: UkmParseContext): Parsed<string[]> {
  if (!Array.isArray(v)) return { ok: false, message: "Daftar foto tidak valid." };
  if (v.length > UKM_LIMITS.maxPhotos) return { ok: false, message: `Maksimal ${UKM_LIMITS.maxPhotos} foto.` };
  const urls: string[] = [];
  for (const u of v) {
    if (typeof u !== "string" || !ctx.photoAllowed(u)) return { ok: false, message: "Foto tidak valid. Unggah ulang fotonya." };
    if (!urls.includes(u)) urls.push(u);
  }
  return { ok: true, value: urls };
}

/**
 * Baca isi formulir. `create`: nama dan deskripsi wajib, sisanya opsional. `update`: hanya bidang yang
 * dikirim yang diperiksa dan dikembalikan (PATCH sebagian).
 */
export function parseUkmInput(
  body: unknown,
  ctx: UkmParseContext,
  mode: "create" | "update",
): { ok: true; value: Partial<UkmFields> } | { ok: false; message: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
  const out: Partial<UkmFields> = {};

  if (mode === "create" || has("name")) {
    const r = parseText(b.name, "Nama produk", 3, 100);
    if (!r.ok) return r;
    out.name = r.value;
  }
  if (mode === "create" || has("description")) {
    const r = parseText(b.description, "Deskripsi", 10, 1000);
    if (!r.ok) return r;
    out.description = r.value;
  }
  if (has("price")) {
    const r = parsePrice(b.price);
    if (!r.ok) return r;
    out.price = r.value;
  }
  if (has("unit")) {
    const raw = b.unit === null ? "" : b.unit;
    const r = parseText(raw, "Satuan", 0, 20);
    if (!r.ok) return r;
    out.unit = r.value || null;
  }
  if (has("category")) {
    const r = parseCategory(b.category, ctx.categories);
    if (!r.ok) return r;
    out.category = r.value;
  }
  if (has("stock")) {
    const r = parseStock(b.stock);
    if (!r.ok) return r;
    out.stock = r.value;
  }
  if (mode === "create" || has("photos")) {
    const r = parsePhotos(has("photos") ? b.photos : [], ctx);
    if (!r.ok) return r;
    out.photos = r.value;
  }
  return { ok: true, value: out };
}

/** Foto boleh: unggahan mobile UKM desa ini, atau URL yang sudah ada di produk (mis. diunggah admin lewat web). */
export function ukmPhotoAllowed(url: string, cdnBase: string, villageCode: string, existing: readonly string[]): boolean {
  return existing.includes(url) || isOwnReportPhotoUrl(url, cdnBase, villageCode, UKM_PHOTO_FOLDER);
}

// ---------- Serialisasi ----------

export type UkmRow = {
  id: number;
  name: string;
  description: string;
  subCategory: string | null;
  productionValue: unknown;
  productionUnit: string | null;
  stockQuantity: number | null;
  images: unknown;
  status: string;
  residentId: number | null;
  updatedAt: Date;
  resident: { name: string; hamlet: string | null } | null;
};

export const imageUrls = (images: unknown): string[] =>
  Array.isArray(images) ? images.filter((u): u is string => typeof u === "string" && u.trim() !== "").map((u) => u.trim()) : [];

const priceOf = (v: unknown): number | null => {
  const n = v == null ? null : Number(v);
  return n !== null && Number.isFinite(n) && n > 0 ? n : null;
};

/** Penjual ditampilkan ramah privasi ("Siti A."); produk tanpa pemilik dikelola desa. */
export const sellerName = (row: Pick<UkmRow, "resident">): string => (row.resident ? displayName(row.resident.name) : "Pengelola desa");

export type UkmListItem = {
  id: number;
  name: string;
  price: number | null;
  unit: string | null;
  category: string | null;
  thumb: string | null;
  seller: string;
  mine: boolean;
  status?: UkmStatus;
  statusLabel?: string;
};

export function toUkmListItem(row: UkmRow, myResidentId: number | null, withStatus = false): UkmListItem {
  const status = normalizeUkmStatus(row.status);
  return {
    id: row.id,
    name: row.name,
    price: priceOf(row.productionValue),
    unit: row.productionUnit,
    category: row.subCategory,
    thumb: imageUrls(row.images)[0] ?? null,
    seller: sellerName(row),
    mine: myResidentId !== null && row.residentId === myResidentId,
    ...(withStatus ? { status, statusLabel: UKM_STATUS_LABEL[status] } : {}),
  };
}

export function toUkmDetail(row: UkmRow, myResidentId: number | null) {
  const status = normalizeUkmStatus(row.status);
  const mine = myResidentId !== null && row.residentId === myResidentId;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: priceOf(row.productionValue),
    unit: row.productionUnit,
    category: row.subCategory,
    stock: row.stockQuantity,
    photos: imageUrls(row.images),
    seller: sellerName(row),
    sellerArea: row.resident?.hamlet?.trim() || null,
    mine,
    status,
    statusLabel: UKM_STATUS_LABEL[status],
    statusNote: mine ? ukmStatusNote(status) : null,
    canEdit: mine,
    canToggleVisible: mine && canToggleUkmVisible(status),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Kursor halaman = id terakhir (urut id menurun). Nilai rusak diabaikan, bukan galat. */
export function parseUkmCursor(raw: string | null | undefined): number | null {
  if (!raw || !/^\d{1,10}$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

/** Nama kategori unik, terurut abjad Indonesia; nilai kosong diabaikan. */
export function uniqueCategories(names: ReadonlyArray<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const n of names) {
    const s = n?.trim();
    if (s) set.add(s);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "id"));
}
