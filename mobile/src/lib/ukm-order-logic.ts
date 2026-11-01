/** Logika murni (tanpa React Native) untuk pesanan produk desa: tampilan status, jumlah, teks hasil. */
import type { Ionicons } from '@expo/vector-icons';

export type UkmOrderStatus = 'DIMINTA' | 'DIKONFIRMASI' | 'SELESAI' | 'DIBATALKAN';
export type UkmOrderAction = 'konfirmasi' | 'selesai' | 'batal';

/** Batas yang sama dengan server (lib/ukm-order/catalog.ts); server tetap memeriksa ulang. */
export const ORDER_LIMITS = { maxQuantity: 999, noteMax: 300 } as const;

type Look = { label: string; tone: 'gold' | 'green' | 'red' | 'muted'; icon: keyof typeof Ionicons.glyphMap };
const LOOK: Record<UkmOrderStatus, Look> = {
  DIMINTA: { label: 'Menunggu penjual', tone: 'gold', icon: 'time-outline' },
  DIKONFIRMASI: { label: 'Dikonfirmasi penjual', tone: 'green', icon: 'checkmark-circle-outline' },
  SELESAI: { label: 'Selesai', tone: 'green', icon: 'checkmark-done-outline' },
  DIBATALKAN: { label: 'Dibatalkan', tone: 'red', icon: 'close-circle-outline' },
};
/** Status + ikon + teks (bukan warna saja). Nilai tak dikenal dianggap dibatalkan, bukan berjalan. */
export const orderLook = (s: string): Look => LOOK[s as UkmOrderStatus] ?? LOOK.DIBATALKAN;

/** Ketikan jumlah ("3", " 12 "): bilangan bulat 1-999, selain itu null. */
export function parseQuantity(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,4}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= ORDER_LIMITS.maxQuantity ? n : null;
}

/** Tombol -/+ tidak keluar dari 1..batas; batas = stok bila dilacak. */
export function stepQuantity(current: number, delta: 1 | -1, stock: number | null): number {
  const max = stock !== null && stock > 0 ? Math.min(stock, ORDER_LIMITS.maxQuantity) : ORDER_LIMITS.maxQuantity;
  return Math.max(1, Math.min(max, current + delta));
}

/** Teks konfirmasi tindakan; pembatalan oleh penjual wajib beralasan. */
export const ACTION_TEXT: Record<UkmOrderAction, { button: string; confirm: string; needsNote: boolean }> = {
  konfirmasi: { button: 'Konfirmasi pesanan', confirm: 'Pembeli akan diberi tahu bahwa pesanan dikonfirmasi.', needsNote: false },
  selesai: { button: 'Tandai selesai', confirm: 'Tandai bahwa barang sudah diterima pembeli?', needsNote: false },
  batal: { button: 'Batalkan pesanan', confirm: 'Pesanan dibatalkan dan tidak bisa dibuka lagi.', needsNote: true },
};

/** Alasan pembatalan oleh penjual: minimal 3 huruf. Pembeli boleh tanpa alasan. */
export function noteProblem(action: UkmOrderAction, role: 'PEMBELI' | 'PENJUAL', note: string): string | null {
  if (note.trim().length > ORDER_LIMITS.noteMax) return `Catatan maksimal ${ORDER_LIMITS.noteMax} huruf.`;
  if (action === 'batal' && role === 'PENJUAL' && note.trim().length < 3) return 'Tulis alasan singkat agar pembeli tahu.';
  return null;
}

/** Teks setelah pesanan terkirim; bergantung pada ada-tidaknya kontak penjual. */
export function placedMessage(hasWhatsapp: boolean): { title: string; body: string } {
  return hasWhatsapp
    ? { title: 'Pesanan tercatat', body: 'Lanjutkan lewat WhatsApp untuk sepakat soal harga dan pengambilan dengan penjual. Pembayaran dilakukan langsung dengan penjual.' }
    : { title: 'Pesanan tercatat', body: 'Penjual tidak mencantumkan kontak, jadi penjual atau kantor desa yang akan menghubungi Anda lewat aplikasi. Pembayaran dilakukan langsung dengan penjual.' };
}
