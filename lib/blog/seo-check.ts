import { countWords, extractHeadings, extractLinks, isInternalHref } from "./markdown.ts";

/**
 * Pemeriksa kualitas artikel sebelum terbit. Dipakai editor admin (umpan balik langsung)
 * dan rute publish (pagar server): `fail` memblokir penerbitan, `warn` hanya saran.
 */

export type BlogCheckStatus = "ok" | "warn" | "fail";

export type BlogCheckItem = {
  id: string;
  label: string;
  status: BlogCheckStatus;
  detail: string;
};

export type BlogCheckInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  coverImageUrl?: string | null;
  tags?: string[];
};

export type BlogCheckResult = {
  items: BlogCheckItem[];
  fail: number;
  warn: number;
  ok: number;
  canPublish: boolean;
};

/** Batas tampilan Google (perkiraan; dipotong oleh lebar piksel, bukan jumlah karakter). */
/** Template judul di root layout menambahkan akhiran ini ke setiap judul artikel. */
export const BRAND_SUFFIX = " | Klandesa";
/** Batas untuk judul LENGKAP (termasuk akhiran merek) yang tampil di Google. */
export const SEO_TITLE_MAX = 60;
export const SEO_TITLE_MIN = 30;
export const SEO_DESC_MAX = 160;
export const SEO_DESC_MIN = 70;
export const MIN_WORDS_FAIL = 120;
export const MIN_WORDS_WARN = 400;

const PLACEHOLDER_RE =
  /\[(?:isi|tulis|masukkan|nama|contoh|todo|tbd|link|tautan|sumber|angka)[^\]]*\](?!\()|lorem ipsum|\bTODO\b|\bTBD\b|\bXXX+\b|\{\{[^}]*\}\}/i;

function trimmed(v: string | null | undefined): string {
  return (v ?? "").trim();
}

export function checkBlogSeo(input: BlogCheckInput): BlogCheckResult {
  const items: BlogCheckItem[] = [];
  const add = (id: string, label: string, status: BlogCheckStatus, detail: string) =>
    items.push({ id, label, status, detail });

  const title = trimmed(input.title);
  const slug = trimmed(input.slug);
  const content = trimmed(input.content);
  const seoTitle = trimmed(input.seoTitle) || title;
  const seoDesc = trimmed(input.seoDescription);
  const excerpt = trimmed(input.excerpt);
  const tags = input.tags ?? [];

  // Judul (yang tampil di Google = judul SEO + akhiran merek dari template layout)
  const fullTitle = seoTitle ? seoTitle + BRAND_SUFFIX : "";
  const room = SEO_TITLE_MAX - BRAND_SUFFIX.length;
  if (!title) add("title", "Judul", "fail", "Judul wajib diisi.");
  else if (fullTitle.length > SEO_TITLE_MAX)
    add("title", "Judul SEO", "warn", `${fullTitle.length} karakter termasuk "${BRAND_SUFFIX.trim()}"; di atas ${SEO_TITLE_MAX} berisiko terpotong. Judul SEO maksimal ${room} karakter.`);
  else if (fullTitle.length < SEO_TITLE_MIN)
    add("title", "Judul SEO", "warn", `${fullTitle.length} karakter termasuk merek; terlalu pendek, manfaatkan sampai ${SEO_TITLE_MAX} dengan kata kunci utama.`);
  else add("title", "Judul SEO", "ok", `${fullTitle.length} karakter termasuk merek.`);

  // Deskripsi
  if (!seoDesc && !excerpt)
    add("description", "Deskripsi SEO", "fail", "Isi deskripsi SEO atau ringkasan; tanpa itu Google memilih potongan acak.");
  else if (!seoDesc)
    add("description", "Deskripsi SEO", "warn", "Kosong; ringkasan dipakai sebagai gantinya. Tulis deskripsi khusus.");
  else if (seoDesc.length > SEO_DESC_MAX)
    add("description", "Deskripsi SEO", "warn", `${seoDesc.length} karakter; di atas ${SEO_DESC_MAX} akan terpotong.`);
  else if (seoDesc.length < SEO_DESC_MIN)
    add("description", "Deskripsi SEO", "warn", `${seoDesc.length} karakter; terlalu pendek (target ${SEO_DESC_MIN}–${SEO_DESC_MAX}).`);
  else add("description", "Deskripsi SEO", "ok", `${seoDesc.length} karakter.`);

  // Slug
  if (!slug) add("slug", "Slug", "fail", "Slug wajib diisi.");
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    add("slug", "Slug", "fail", "Hanya huruf kecil, angka, dan tanda hubung.");
  else if (slug.length > 75)
    add("slug", "Slug", "warn", `${slug.length} karakter; URL pendek lebih mudah dibagikan.`);
  else add("slug", "Slug", "ok", `/blog/${slug}`);

  // Isi
  const words = countWords(content);
  if (words < MIN_WORDS_FAIL)
    add("length", "Panjang artikel", "fail", `${words} kata; minimal ${MIN_WORDS_FAIL} kata agar tidak dianggap konten tipis.`);
  else if (words < MIN_WORDS_WARN)
    add("length", "Panjang artikel", "warn", `${words} kata; artikel panduan biasanya ${MIN_WORDS_WARN}+ kata.`);
  else add("length", "Panjang artikel", "ok", `${words} kata.`);

  const headings = extractHeadings(content);
  const h2 = headings.filter((h) => h.level === 2).length;
  if (words >= MIN_WORDS_FAIL && h2 < 2)
    add("headings", "Struktur subjudul", "warn", "Pakai minimal dua subjudul (##) agar mudah dipindai.");
  else add("headings", "Struktur subjudul", "ok", `${h2} subjudul utama.`);

  if (/^\s{0,3}#\s+\S/m.test(content))
    add("h1", "Judul ganda", "warn", "Isi memuat '# ' (H1). Judul artikel sudah H1; mulai dari '## '.");

  if (PLACEHOLDER_RE.test(content) || PLACEHOLDER_RE.test(seoDesc) || PLACEHOLDER_RE.test(title))
    add("placeholder", "Penanda sisa", "fail", "Masih ada penanda seperti [isi ...], TODO, atau lorem ipsum.");

  const internal = extractLinks(content).filter((l) => isInternalHref(l.href)).length;
  if (internal === 0)
    add("internal-links", "Tautan internal", "warn", "Tambahkan minimal satu tautan ke halaman Klandesa (mis. [harga](/harga)).");
  else add("internal-links", "Tautan internal", "ok", `${internal} tautan.`);

  // Media & taksonomi
  if (!trimmed(input.coverImageUrl))
    add("cover", "Gambar cover", "warn", "Belum ada cover; pratinjau media sosial memakai gambar bawaan.");
  else add("cover", "Gambar cover", "ok", "Ada.");

  if (tags.length === 0) add("tags", "Tag", "warn", "Beri 2–5 tag agar artikel terkait bisa ditautkan.");
  else if (tags.length > 7) add("tags", "Tag", "warn", `${tags.length} tag; terlalu banyak, ringkas ke 2–5.`);
  else add("tags", "Tag", "ok", `${tags.length} tag.`);

  const fail = items.filter((i) => i.status === "fail").length;
  const warn = items.filter((i) => i.status === "warn").length;
  return { items, fail, warn, ok: items.length - fail - warn, canPublish: fail === 0 };
}
