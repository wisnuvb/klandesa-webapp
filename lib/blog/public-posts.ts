import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BLOG_CACHE_SECONDS, BLOG_CACHE_TAG } from "./cache";
import { BLOG_PAGE_SIZE, totalPagesOf } from "./pagination";

/**
 * Kueri publik blog. Semuanya dibungkus `unstable_cache` (tag "blog", kedaluwarsa BLOG_CACHE_SECONDS) agar
 * halaman publik tidak menembak database di setiap kunjungan; rute admin memanggil `invalidateBlogCache()`
 * (lib/blog/cache.ts) setelah mengubah artikel.
 *
 * Aturan cache:
 * - Fungsi ber-cache mengembalikan JSON murni (id → string, Date → ISO string); hasil dipulihkan di luar.
 * - Galat database dilempar DARI DALAM fungsi ber-cache (Next tidak menyimpan hasil yang melempar), dan
 *   ditangani DI LUAR. Dengan begitu galat sesaat tidak pernah tersimpan sebagai "tidak ada artikel".
 * - Kueri halaman (daftar, detail, topik) melempar ulang galatnya: 500 membuat mesin pencari mencoba lagi,
 *   sedangkan 404/noindex palsu bisa mengeluarkan halaman dari indeks. Hanya "artikel terkait" (tambahan)
 *   yang diam-diam kosong.
 */

const blogPostListSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  publishedAt: true,
  createdAt: true,
} as const;

const blogPostDetailSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  content: true,
  coverImageUrl: true,
  coverImageAttribution: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  seoTitle: true,
  seoDescription: true,
  tags: { select: { tag: { select: { slug: true, name: true } } } },
} as const;

export type PublicBlogTag = { slug: string; name: string };

export type PublicBlogPostListItem = {
  id: bigint;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
};

export type PublicBlogPostDetail = {
  id: bigint;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  coverImageUrl: string | null;
  coverImageAttribution: unknown;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: PublicBlogTag[];
};

export type PublicBlogTagWithCount = PublicBlogTag & { count: number };

export type PublicBlogPostsPage = {
  posts: PublicBlogPostListItem[];
  total: number;
  totalPages: number;
  page: number;
};

export type PublicBlogFeedPost = PublicBlogPostListItem & { tags: string[] };

// ----------------------------------------------------------------- bentuk kabel (JSON murni)

type ListItemWire = Omit<PublicBlogPostListItem, "id" | "publishedAt" | "createdAt"> & {
  id: string;
  publishedAt: string | null;
  createdAt: string;
};

type DetailWire = Omit<PublicBlogPostDetail, "id" | "publishedAt" | "createdAt" | "updatedAt"> & {
  id: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Baris daftar dari Prisma (sebelum diubah ke bentuk kabel). */
type ListRow = PublicBlogPostListItem;

function toListWire(row: ListRow): ListItemWire {
  return {
    id: row.id.toString(),
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImageUrl: row.coverImageUrl,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function fromListWire(w: ListItemWire): PublicBlogPostListItem {
  return {
    ...w,
    id: BigInt(w.id),
    publishedAt: w.publishedAt ? new Date(w.publishedAt) : null,
    createdAt: new Date(w.createdAt),
  };
}

function fromDetailWire(w: DetailWire): PublicBlogPostDetail {
  return {
    ...w,
    id: BigInt(w.id),
    publishedAt: w.publishedAt ? new Date(w.publishedAt) : null,
    createdAt: new Date(w.createdAt),
    updatedAt: new Date(w.updatedAt),
  };
}

const cacheOptions = { revalidate: BLOG_CACHE_SECONDS, tags: [BLOG_CACHE_TAG] };
const publishedOrder = [{ publishedAt: "desc" as const }, { createdAt: "desc" as const }];

// ----------------------------------------------------------------- daftar (paginasi, opsional per topik)

const pageWire = unstable_cache(
  async (page: number, pageSize: number, tagSlug: string) => {
    const where = {
      status: "published",
      ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        orderBy: publishedOrder,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: blogPostListSelect,
      }),
    ]);
    return { total, posts: rows.map(toListWire) };
  },
  ["blog", "page"],
  cacheOptions,
);

/**
 * Satu halaman daftar artikel terbit (terbaru dulu). `tagSlug` kosong = semua artikel.
 * `page` di atas jumlah halaman dikembalikan apa adanya dengan `posts` kosong; pemanggil memutuskan 404.
 * Melempar bila database gagal (lihat catatan di atas).
 */
export async function listPublishedBlogPostsPage(opts: {
  page: number;
  pageSize?: number;
  tagSlug?: string;
}): Promise<PublicBlogPostsPage> {
  const pageSize = opts.pageSize ?? BLOG_PAGE_SIZE;
  try {
    const { total, posts } = await pageWire(opts.page, pageSize, opts.tagSlug ?? "");
    return { posts: posts.map(fromListWire), total, totalPages: totalPagesOf(total, pageSize), page: opts.page };
  } catch (error) {
    console.error("[blog] listPublishedBlogPostsPage:", error);
    throw error;
  }
}

// ----------------------------------------------------------------- detail

const detailWire = unstable_cache(
  async (slug: string): Promise<DetailWire | null> => {
    const post = await prisma.blogPost.findUnique({ where: { slug }, select: blogPostDetailSelect });
    if (!post || post.status !== "published") return null;
    const { tags, ...rest } = post;
    return {
      ...rest,
      id: post.id.toString(),
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      coverImageAttribution: post.coverImageAttribution ?? null,
      tags: tags.map((t) => t.tag),
    };
  },
  ["blog", "detail"],
  cacheOptions,
);

/**
 * Artikel terbit menurut slug, atau null bila tidak ada/belum terbit. Dibungkus React `cache()` agar
 * generateMetadata dan halaman di satu permintaan memakai hasil yang sama. Melempar bila database gagal.
 */
export const getPublishedBlogPostBySlug = cache(async function getPublishedBlogPostBySlug(
  slug: string,
): Promise<PublicBlogPostDetail | null> {
  try {
    const wire = await detailWire(slug);
    return wire ? fromDetailWire(wire) : null;
  } catch (error) {
    console.error("[blog] getPublishedBlogPostBySlug:", error);
    throw error;
  }
});

// ----------------------------------------------------------------- terkait

const relatedWire = unstable_cache(
  async (slug: string, tagSlugsKey: string, take: number): Promise<ListItemWire[]> => {
    const tagSlugs = tagSlugsKey ? tagSlugsKey.split(",") : [];
    const picked: ListRow[] = [];
    if (tagSlugs.length > 0) {
      picked.push(
        ...(await prisma.blogPost.findMany({
          where: {
            status: "published",
            slug: { not: slug },
            tags: { some: { tag: { slug: { in: tagSlugs } } } },
          },
          orderBy: publishedOrder,
          take,
          select: blogPostListSelect,
        })),
      );
    }
    if (picked.length < take) {
      picked.push(
        ...(await prisma.blogPost.findMany({
          where: {
            status: "published",
            slug: { not: slug },
            id: { notIn: picked.map((p) => p.id) },
          },
          orderBy: publishedOrder,
          take: take - picked.length,
          select: blogPostListSelect,
        })),
      );
    }
    return picked.map(toListWire);
  },
  ["blog", "related"],
  cacheOptions,
);


/**
 * Artikel terkait untuk tautan internal: yang berbagi tag dulu, lalu dilengkapi artikel terbaru lain sampai
 * `take`. Tambahan saja: bila gagal, daftar kosong (artikelnya tetap tampil).
 */
export async function listRelatedBlogPosts(
  slug: string,
  tagSlugs: string[],
  take = 3,
): Promise<PublicBlogPostListItem[]> {
  try {
    // Kunci cache stabil: slug tag diurutkan.
    const key = [...tagSlugs].sort().join(",");
    return (await relatedWire(slug, key, take)).map(fromListWire);
  } catch (error) {
    console.error("[blog] listRelatedBlogPosts:", error);
    return [];
  }
}

// ----------------------------------------------------------------- topik

const tagsWire = unstable_cache(
  async (): Promise<Array<PublicBlogTag & { count: number }>> => {
    const rows = await prisma.blogTag.findMany({
      where: { posts: { some: { post: { status: "published" } } } },
      select: {
        slug: true,
        name: true,
        _count: { select: { posts: { where: { post: { status: "published" } } } } },
      },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({ slug: r.slug, name: r.name, count: r._count.posts }));
  },
  ["blog", "tags"],
  cacheOptions,
);

/** Semua topik yang punya minimal satu artikel terbit, beserta jumlahnya. Melempar bila database gagal. */
export async function listPublishedBlogTags(): Promise<PublicBlogTagWithCount[]> {
  try {
    return await tagsWire();
  } catch (error) {
    console.error("[blog] listPublishedBlogTags:", error);
    throw error;
  }
}

/** Topik menurut slug (dengan jumlah artikel terbit), atau null bila tidak ada artikel terbit di topik itu. */
export async function getPublishedBlogTag(slug: string): Promise<PublicBlogTagWithCount | null> {
  return (await listPublishedBlogTags()).find((t) => t.slug === slug) ?? null;
}

// ----------------------------------------------------------------- feed

const feedWire = unstable_cache(
  async (take: number): Promise<Array<ListItemWire & { tags: string[] }>> => {
    const rows = await prisma.blogPost.findMany({
      where: { status: "published" },
      orderBy: publishedOrder,
      take,
      select: { ...blogPostListSelect, tags: { select: { tag: { select: { name: true } } } } },
    });
    return rows.map((r) => ({ ...toListWire(r), tags: r.tags.map((t) => t.tag.name) }));
  },
  ["blog", "feed"],
  cacheOptions,
);

/** Artikel terbit terbaru (dengan nama topik) untuk RSS. Melempar bila database gagal. */
export async function listPublishedBlogPostsForFeed(take = 20): Promise<PublicBlogFeedPost[]> {
  try {
    return (await feedWire(take)).map((w) => ({ ...fromListWire(w), tags: w.tags }));
  } catch (error) {
    console.error("[blog] listPublishedBlogPostsForFeed:", error);
    throw error;
  }
}
