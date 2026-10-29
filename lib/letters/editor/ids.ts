/** Pembuat id untuk bagian, peran, isian, dan daftar. Murni; sumber acak bisa disuntik untuk tes. */
import { RESERVED_NAMESPACES } from "../registry";

export type Rng = () => number;

const defaultRng: Rng = () => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) {
    const a = new Uint32Array(1);
    c.getRandomValues(a);
    return a[0] / 2 ** 32;
  }
  return Math.random();
};

/** `b_<8 hex>` yang belum dipakai. Bila sumber acak terus bentrok, tambahkan penghitung. */
export function newBlockId(taken: ReadonlySet<string>, rng: Rng = defaultRng): string {
  for (let i = 0; i < 1000; i++) {
    const hex = Math.floor(rng() * 0xffffffff).toString(16).padStart(8, "0");
    const id = i < 50 ? `b_${hex}` : `b_${hex}${i}`;
    if (!taken.has(id)) return id;
  }
  throw new Error("Tidak dapat membuat id bagian baru");
}

/**
 * Id peran/isian/daftar dari label: huruf kecil snake_case ASCII tanpa aksen, diawali huruf,
 * maksimal 30 karakter (sesuai skema), unik (`_2`, `_3`, …), dan tidak memakai nama yang dipesan sistem.
 */
export function slugId(
  label: string,
  taken: Iterable<string>,
  reserved: Iterable<string> = RESERVED_NAMESPACES,
): string {
  const takenSet = new Set(taken);
  const reservedSet = new Set(reserved);
  let base = label
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!base) base = "item"; // "isian" dipesan sistem sebagai nama ruang
  if (!/^[a-z]/.test(base)) base = `i_${base}`;
  base = base.slice(0, 30).replace(/_+$/, "");

  let id = base;
  for (let n = 2; takenSet.has(id) || reservedSet.has(id); n++) {
    const suffix = `_${n}`;
    id = base.slice(0, 30 - suffix.length).replace(/_+$/, "") + suffix;
  }
  return id;
}
