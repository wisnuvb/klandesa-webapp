/**
 * Util murni untuk halaman publik Aspirasi Warga: alamat kanonik, deskripsi/judul meta, JSON-LD, kueri paginasi.
 * Tanpa dependensi server agar mudah dites.
 */
import { categoryLabel } from "./catalog";
import { isAreaIndexable, isAspirationIndexable, type IndexableInput } from "./seo";
import { aspirationPath, codeFromSegment } from "./slug";

export type IndexableSource = { noindex: boolean; publishedAt: Date | null; body: string; openFlags: number };

/** Masukan pagar indeks dari tampilan publik (yang selalu berstatus PUBLISHED). */
export function toIndexableInput(a: IndexableSource): IndexableInput {
  return { status: "PUBLISHED", noindex: a.noindex, publishedAt: a.publishedAt, bodyLength: a.body.length, openFlags: a.openFlags };
}

export function isPublicAspirationIndexable(a: IndexableSource, now: Date = new Date(), env: NodeJS.ProcessEnv = process.env): boolean {
  return isAspirationIndexable(toIndexableInput(a), now, env);
}

export { isAreaIndexable };

/** Segmen alamat → kode, dan apakah alamat saat ini sudah kanonik. `redirectTo` terisi bila slug-nya beda. */
export function resolveAspirationSegment(segment: string, a: { slug: string; code: string } | null): { code: string | null; redirectTo: string | null } {
  const code = codeFromSegment(segment);
  if (!code || !a) return { code, redirectTo: null };
  const canonical = aspirationPath(a);
  return { code, redirectTo: canonical.endsWith(`/${segment}`) ? null : canonical };
}

/** Ringkasan satu baris dari isi laporan (untuk meta description / kartu). */
export function excerpt(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

/** Judul tab; template root menambahkan " | Klandesa", jadi sisakan ruang agar total ≲ 55 karakter. */
export function aspirationTitleTag(title: string, max = 45): string {
  const t = title.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export function aspirationMetaDescription(a: { title: string; body: string; category: string; area: { name: string; regency: string } }): string {
  return excerpt(`${categoryLabel(a.category)} di ${a.area.name}, ${a.area.regency}: ${a.body}`, 155);
}

const fmtDay = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
export const formatDayWib = (d: Date | null | undefined): string => (d ? fmtDay.format(d) : "-");

/** Serialisasi JSON-LD aman di dalam <script> (mencegah penutupan tag dari isi). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

/** Penulis sengaja anonim: tidak ada nama/kontak pelapor di keluaran. */
export function aspirationJsonLd(a: { title: string; body: string; publishedAt: Date | null; area: { name: string; district: string; regency: string; province: string } }, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: a.title.slice(0, 110),
    articleBody: excerpt(a.body, 500),
    ...(a.publishedAt ? { datePublished: a.publishedAt.toISOString() } : {}),
    inLanguage: "id-ID",
    mainEntityOfPage: url,
    author: { "@type": "Person", name: "Warga desa" },
    about: { "@type": "AdministrativeArea", name: `${a.area.name}, ${a.area.district}, ${a.area.regency}, ${a.area.province}` },
  };
}

/** Bentuk alamat dengan query: nilai kosong/undefined dibuang; halaman 1 tidak ditulis. */
export function withQuery(base: string, params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (k === "page" && Number(v) <= 1) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Nilai ?page= → bilangan bulat ≥1 (maks 1000); selain itu 1. */
export function pageFromQuery(raw: string | string[] | undefined): number {
  if (typeof raw !== "string" || !/^[1-9]\d{0,3}$/.test(raw)) return 1;
  return Math.min(Number(raw), 1000);
}

export const single = (v: string | string[] | undefined): string | undefined => (typeof v === "string" ? v : undefined);
