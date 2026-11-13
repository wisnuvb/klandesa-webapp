import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogAlternates } from "@/lib/blog/alternates";
import { pageHref, parsePageParam } from "@/lib/blog/pagination";
import { listPublishedBlogPostsPage, listPublishedBlogTags } from "@/lib/blog/public-posts";
import { getLandingPageSeo } from "@/lib/seo/landing-pages";
import { BlogPagination, BlogPostCards } from "./_components/blog-ui";

type Props = { searchParams: Promise<{ page?: string | string[] }> };

const getPage = cache((page: number) => listPublishedBlogPostsPage({ page }));

/** Topik yang cukup berisi untuk ditautkan (≥2 artikel). Tambahan: bila gagal, daftar topik disembunyikan. */
const getTopics = cache(async () => {
  try {
    return (await listPublishedBlogTags()).filter((t) => t.count >= 2);
  } catch {
    return [];
  }
});

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = parsePageParam((await searchParams).page);
  if (page === null) return { robots: "noindex, follow" };
  const data = await getPage(page);
  const seo = getLandingPageSeo("blog");
  const alternates = blogAlternates(pageHref("/blog", page));

  // Selama belum ada artikel terbit, halaman ini konten tipis: jangan diindeks (tetap boleh di-crawl).
  if (data.total === 0) return { alternates, robots: "noindex, follow" };
  // Halaman 1 memakai metadata bawaan layout; halaman berikutnya diberi judul sendiri agar tidak kembar.
  if (page === 1) return { alternates };
  return {
    title: `${seo.title} — Halaman ${page}`,
    alternates,
    robots: "index, follow",
  };
}

export default async function BlogIndexPage({ searchParams }: Props) {
  const page = parsePageParam((await searchParams).page);
  if (page === null) notFound();
  const data = await getPage(page);
  // Halaman di luar rentang = 404 (halaman 1 selalu ada, walau kosong).
  if (page > data.totalPages) notFound();
  const topics = await getTopics();

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">Blog</h1>
          <p className="mt-2 text-gray-600">
            Artikel seputar digitalisasi desa, layanan publik, dan produk Klandesa.
          </p>
          {topics.length > 0 ? (
            <nav aria-label="Topik blog" className="mt-4">
              <ul className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/blog/topik/${t.slug}`}
                      className="inline-flex min-h-11 items-center rounded-full bg-teal-50 px-4 text-sm font-medium text-teal-800 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                    >
                      {t.name}
                      <span className="ml-1.5 text-teal-700/80">({t.count})</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>

        {data.total === 0 ? (
          <div className="rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
            Belum ada artikel yang dipublish.
          </div>
        ) : (
          <>
            <BlogPostCards posts={data.posts} />
            <BlogPagination basePath="/blog" page={page} totalPages={data.totalPages} />
          </>
        )}
      </div>
    </main>
  );
}
