/** Pesanan sederhana produk UKM desa: diminta pembeli, dikonfirmasi/diselesaikan/dibatalkan penjual atau admin. Tanpa pembayaran online. */

export const STATUS = {
  DIMINTA: "Diminta",
  DIKONFIRMASI: "Dikonfirmasi",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
} as const;
export type OrderStatus = keyof typeof STATUS;
export const STATUS_KEYS = Object.keys(STATUS) as OrderStatus[];
export const isStatus = (v: unknown): v is OrderStatus => typeof v === "string" && Object.prototype.hasOwnProperty.call(STATUS, v);
/** Pesanan terbuka = masih bisa berubah; menempati kunci "satu pesanan terbuka per pembeli per produk". */
export const OPEN_STATUSES: readonly OrderStatus[] = ["DIMINTA", "DIKONFIRMASI"];
export const isOpen = (s: string): boolean => (OPEN_STATUSES as readonly string[]).includes(s);

export const ACTIONS = {
  konfirmasi: "Konfirmasi pesanan",
  selesai: "Tandai selesai",
  batal: "Batalkan pesanan",
} as const;
export type OrderAction = keyof typeof ACTIONS;
export const isAction = (v: unknown): v is OrderAction => typeof v === "string" && Object.prototype.hasOwnProperty.call(ACTIONS, v);

/** PEMBELI = warga yang memesan; PENJUAL = pemilik produk; ADMIN = staf desa (menangani produk yang dikelola desa dan dapat membantu semua pesanan). */
export type ActorKind = "PEMBELI" | "PENJUAL" | "ADMIN";

export const LIMITS = {
  maxQuantity: 999,
  maxOpenPerBuyer: 10,
  maxPerBuyerPerDay: 20,
  /** Pesanan (termasuk yang dibatalkan) pembeli yang sama untuk produk yang sama dalam 24 jam: mencegah batal-pesan-ulang sebagai spam notifikasi. */
  maxPerProductPerDay: 3,
  noteMax: 300,
  adminPageSize: 25,
  mobilePageSize: 20,
} as const;
