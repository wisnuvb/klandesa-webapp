/**
 * Operasi penyuntingan untuk kolom teks berformat (lihat rich.ts). Murni: menerima isi + seleksi, mengembalikan isi + seleksi baru.
 */

export type Edit = { value: string; start: number; end: number };

export type Marker = { open: string; close: string };
export const BOLD: Marker = { open: "**", close: "**" };
export const ITALIC: Marker = { open: "*", close: "*" };
export const UNDERLINE: Marker = { open: "<u>", close: "</u>" };

/** Bungkus/lepas penanda (`**` tebal, `*` miring, `<u>` garis bawah) di sekitar seleksi. Tanpa seleksi: sisipkan contoh "teks" yang terseleksi. */
export function toggleWrap(value: string, start: number, end: number, marker: Marker | "**" | "*"): Edit {
  const mk: Marker = typeof marker === "string" ? { open: marker, close: marker } : marker;
  const { open, close } = mk;
  const o = open.length;
  const c = close.length;
  const sel = value.slice(start, end);
  if (sel === "") {
    return { value: value.slice(0, start) + open + "teks" + close + value.slice(end), start: start + o, end: start + o + 4 };
  }
  // Penanda tepat di luar seleksi → lepas. Untuk `*`, abaikan bila itu bagian dari `**` (tebal).
  const outside = value.slice(start - o, start) === open && value.slice(end, end + c) === close;
  const partOfBold = open === "*" && (value[start - 2] === "*" || value[end + 1] === "*");
  if (outside && !partOfBold) {
    return { value: value.slice(0, start - o) + sel + value.slice(end + c), start: start - o, end: end - o };
  }
  // Penanda ikut terseleksi → lepas.
  if (sel.length > o + c && sel.startsWith(open) && sel.endsWith(close) && !(open === "*" && sel.startsWith("**"))) {
    const inner = sel.slice(o, sel.length - c);
    return { value: value.slice(0, start) + inner + value.slice(end), start, end: start + inner.length };
  }
  return { value: value.slice(0, start) + open + sel + close + value.slice(end), start: start + o, end: end + o };
}

const ORDERED = /^(\s*)\d{1,3}[.)]\s+/;
const BULLET = /^(\s*)[-*•]\s+/;

/**
 * Jadikan baris-baris yang tersentuh seleksi sebagai daftar bernomor/berpoin; bila semuanya sudah daftar sejenis, lepaskan.
 * Baris kosong dilewati. Nomor dihitung ulang dari 1.
 */
export function toggleList(value: string, start: number, end: number, kind: "ol" | "ul"): Edit {
  const from = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nl = value.indexOf("\n", end > start ? end : start);
  const to = nl === -1 ? value.length : nl;
  const lines = value.slice(from, to).split("\n");
  const target = kind === "ol" ? ORDERED : BULLET;
  const content = lines.filter((l) => l.trim() !== "");
  const allList = content.length > 0 && content.every((l) => target.test(l));

  let n = 0;
  const next = lines.map((l) => {
    if (l.trim() === "") return l;
    const bare = l.replace(ORDERED, "$1").replace(BULLET, "$1");
    if (allList) return bare;
    n += 1;
    return `${kind === "ol" ? `${n}. ` : "- "}${bare.replace(/^\s+/, "")}`;
  });
  const replaced = next.join("\n");
  return { value: value.slice(0, from) + replaced + value.slice(to), start: from, end: from + replaced.length };
}
