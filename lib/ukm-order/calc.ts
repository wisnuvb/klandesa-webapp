/** Aturan murni pesanan UKM: transisi status, tautan WhatsApp, pembatasan kontak. */
import { isOpen, type ActorKind, type OrderAction, type OrderStatus } from "./catalog";

export interface Transition {
  to: OrderStatus;
  /** Alasan/catatan wajib (pembatalan oleh penjual atau admin). */
  noteRequired: boolean;
}

/**
 * Siapa boleh apa:
 *  - pembeli: membatalkan pesanannya selama masih DIMINTA (sesudah dikonfirmasi harus lewat penjual);
 *  - penjual dan admin: konfirmasi (DIMINTA), selesai (DIKONFIRMASI), batal (DIMINTA atau DIKONFIRMASI, wajib beralasan).
 */
export function transition(actor: ActorKind, from: string, action: OrderAction): Transition | { error: string } {
  if (!isOpen(from)) return { error: "Pesanan ini sudah ditutup dan tidak dapat diubah lagi." };
  if (actor === "PEMBELI") {
    if (action !== "batal") return { error: "Pembeli hanya dapat membatalkan pesanan." };
    if (from !== "DIMINTA") return { error: "Pesanan sudah dikonfirmasi penjual. Hubungi penjual untuk membatalkannya." };
    return { to: "DIBATALKAN", noteRequired: false };
  }
  if (action === "konfirmasi") return from === "DIMINTA" ? { to: "DIKONFIRMASI", noteRequired: false } : { error: "Pesanan ini sudah dikonfirmasi." };
  if (action === "selesai") return from === "DIKONFIRMASI" ? { to: "SELESAI", noteRequired: false } : { error: "Konfirmasi pesanan lebih dulu sebelum menandainya selesai." };
  return { to: "DIBATALKAN", noteRequired: true };
}

/** Aksi yang boleh dilakukan sekarang (untuk menampilkan tombol yang berlaku saja). */
export function allowedActions(actor: ActorKind, from: string): OrderAction[] {
  return (["konfirmasi", "selesai", "batal"] as const).filter((a) => !("error" in transition(actor, from, a)));
}

/** Kunci satu-pesanan-terbuka; null bila pesanan sudah ditutup. */
export const activeKeyOf = (status: string, productId: number | null, buyerResidentId: number): string | null => (isOpen(status) && productId !== null ? `${productId}:${buyerResidentId}` : null);

/** Nomor WhatsApp dengan awalan negara tanpa tanda: "0812..." menjadi "62812...". Mengembalikan null bila bukan 8-15 digit. */
export function waDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits.startsWith("62") ? digits : digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

/**
 * Tautan WhatsApp ke penjual. Kontak hanya keluar bila pemilik mengizinkan (contactVisible) DAN produk masih tayang (active);
 * selain itu null. Ini aturan yang sama dengan detail produk (lib/mobile/ukm-logic.ts).
 */
export function whatsappUrl(args: { contactPhone: string | null; contactVisible: boolean; productStatus: string; text: string }): string | null {
  if (!args.contactVisible || args.productStatus !== "active") return null;
  const d = waDigits(args.contactPhone);
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(args.text)}` : null;
}

/** Isi pesan WhatsApp awal: sebut produk, jumlah, dan kode pesanan supaya penjual dan pembeli menunjuk pesanan yang sama. */
export function orderMessage(args: { orderId: number; buyerName: string; productName: string; quantity: number; unit: string | null; village: string; note: string | null }): string {
  const qty = `${args.quantity}${args.unit ? ` ${args.unit}` : ""}`;
  const lines = [`Halo, saya ${args.buyerName} dari ${args.village}.`, `Saya ingin memesan ${qty} ${args.productName} (kode pesanan #${args.orderId}) lewat aplikasi desa.`];
  if (args.note) lines.push(`Catatan: ${args.note}`);
  lines.push("Mohon dikonfirmasi ketersediaannya. Terima kasih.");
  return lines.join("\n").slice(0, 900);
}

/** Kunci "stok cukup": stok kosong (null) tidak dilacak. */
export function stockProblem(stock: number | null, quantity: number): string | null {
  if (stock === null) return null;
  if (stock <= 0) return "Stok produk ini sedang habis.";
  if (quantity > stock) return `Stok tersisa ${stock}. Kurangi jumlah pesanan.`;
  return null;
}

export const totalRupiah = (unitPriceCents: bigint | null, quantity: number): string | null => (unitPriceCents === null ? null : String((unitPriceCents * BigInt(quantity)) / 100n));
