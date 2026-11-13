/**
 * Utilitas Markdown artikel blog (murni, tanpa dependensi) — dipakai oleh
 * renderer publik, daftar isi, pemeriksa SEO di editor, dan perkiraan waktu baca.
 */

/** Kecepatan baca rata-rata bahasa Indonesia (kata/menit). */
const WORDS_PER_MINUTE = 200;

export type BlogHeading = { level: 2 | 3; text: string; id: string };

/** Buang sintaks inline Markdown dari satu baris, sisakan teks yang tampil. */
export function stripInlineMarkdown(input: string): string {
  return input
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Slug untuk id jangkar heading: huruf kecil, angka, tanda hubung. */
export function slugifyHeading(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "bagian";
}

/** Pembagi id unik per dokumen: heading kembar mendapat akhiran -2, -3, … */
export function createHeadingIdAllocator(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text) => {
    const base = slugifyHeading(text);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };
}

type HeadingLine = { line: number; level: number; text: string; id: string };

/** Semua heading ATX (# … ####) di luar blok kode berpagar, dengan nomor baris (1-based) dan id unik. */
function scanHeadings(markdown: string): HeadingLine[] {
  const alloc = createHeadingIdAllocator();
  const out: HeadingLine[] = [];
  let fence: string | null = null;
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (fence === null) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const m = /^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = stripInlineMarkdown(m[2]);
    if (!text) continue;
    out.push({ line: i + 1, level: m[1].length, text, id: alloc(text) });
  }
  return out;
}

/**
 * id heading menurut nomor baris sumbernya. Renderer memakai ini (bukan penghitung yang berubah
 * saat dirender), sehingga hasilnya sama walau komponen dirender ulang atau dua kali (StrictMode).
 */
export function headingIdsByLine(markdown: string): Map<number, string> {
  return new Map(scanHeadings(markdown).map((h) => [h.line, h.id]));
}

/**
 * Daftar heading (h2/h3) sesuai urutan dokumen. `#` (h1) dihitung h2 karena halaman
 * artikel sudah punya satu h1 (judul), sama seperti renderer.
 */
export function extractHeadings(markdown: string): BlogHeading[] {
  return scanHeadings(markdown)
    .filter((h) => h.level <= 3)
    .map((h) => ({ level: h.level === 3 ? 3 : 2, text: h.text, id: h.id }));
}

/** Baris-baris di luar blok kode berpagar (``` atau ~~~). */
function linesOutsideFences(markdown: string): string[] {
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (m) {
      if (fence === null) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
      continue;
    }
    if (fence === null) out.push(line);
  }
  return out;
}

/** Teks polos artikel (tanpa kode berpagar, tanpa sintaks) untuk hitung kata. */
export function markdownToPlainText(markdown: string): string {
  return linesOutsideFences(markdown)
    .map((line) =>
      stripInlineMarkdown(
        line
          .replace(/^\s{0,3}#{1,6}\s+/, "")
          .replace(/^\s*>+\s?/, "")
          .replace(/^\s*([-*+]|\d+[.)])\s+/, "")
          .replace(/^\s*\|?[\s:|-]+\|?\s*$/, ""),
      ).replace(/\|/g, " "),
    )
    .filter(Boolean)
    .join("\n");
}

export function countWords(markdown: string): number {
  const text = markdownToPlainText(markdown);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

/** Menit baca, minimal 1. */
export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.ceil(countWords(markdown) / WORDS_PER_MINUTE));
}

export type MarkdownLink = { text: string; href: string };

/** Semua tautan `[teks](url)` (bukan gambar) di luar blok kode. */
export function extractLinks(markdown: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  const re = /(^|[^!])\[([^\]]+)\]\(\s*([^)\s]+)[^)]*\)/g;
  for (const line of linesOutsideFences(markdown)) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) links.push({ text: m[2], href: m[3] });
    re.lastIndex = 0;
  }
  return links;
}

/** Tautan internal: path relatif ("/harga") atau host klandesa.com. */
export function isInternalHref(href: string, siteHost = "klandesa.com"): boolean {
  if (href.startsWith("#")) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    const host = new URL(href).hostname.toLowerCase();
    return host === siteHost || host === `www.${siteHost}`;
  } catch {
    return false;
  }
}

/** Teks dari anak React (string/angka/array bersarang) — untuk id heading di renderer. */
export function textOfNode(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOfNode).join("");
  if (typeof node === "object" && "props" in node) {
    return textOfNode((node as { props?: { children?: unknown } }).props?.children);
  }
  return "";
}
