/**
 * Batas pengaman SANGAT longgar untuk daftar yang dulu memuat semua baris (`findMany` tanpa `take`).
 * Bukan paginasi: pemakaian wajar tidak pernah menyentuhnya. Bila terlampaui, rute WAJIB melapor
 * (`truncated: true` + `total` sebenarnya) dan UI WAJIB memberi tahu, sehingga data tidak hilang diam-diam;
 * pencarian/filter sisi server tetap menjangkau seluruh data.
 *
 * Pola: ambil `LIST_SAFETY_CAP + 1` baris (urutan terbaru + penentu seri `id`) lalu `capRows`.
 * Hitungan `total` dan agregat HANYA dijalankan saat terpotong, jadi kasus normal tidak menambah query.
 */
export const LIST_SAFETY_CAP = 2000;

/** Nilai `take` yang dipakai query: satu baris lebih banyak dari batas, untuk mendeteksi pemotongan. */
export const LIST_SAFETY_TAKE = LIST_SAFETY_CAP + 1;

export function capRows<T>(rows: T[], cap: number = LIST_SAFETY_CAP): { rows: T[]; truncated: boolean } {
  if (rows.length <= cap) return { rows, truncated: false };
  return { rows: rows.slice(0, cap), truncated: true };
}
