import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogAlternates } from "@/lib/blog/alternates";
import { pageHref, parsePageParam } from "@/lib/blog/pagination";
import { getPublishedBlogTag, listPublishedBlogPostsPage } from "@/lib/blog/public-posts";
import { buildLandingSeo } from "@/lib/seo/landing";
import { BlogPagination, BlogPostCards } from "../../_components/blog-ui";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

/** Topik dengan artikel di bawah ini dianggap konten tipis: tetap bisa dibuka, tapi tidak diindeks. */
const MIN_ARTICLES_TO_INDEX = 2;

const getTag = cache((slug: string) => getPublishedBlogTag(slug));
const getPosts = cache((slug: string, page: number) => listPublishedBlogPostsPage({ page, tagSlug: slug }));

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = parsePageParam((await searchParams).page);
  const tag = await getTag(slug);
  if (!tag || page === null) {
    return { title: "Topik tidak ditemukan", robots: { index: false, follow: false } };
  }

  const base = `/blog/topik/${tag.slug}`;
  const title = `Topik ${tag.name} — Artikel Blog${page > 1 ? ` (Halaman ${page})` : ""}`;
  const description = `Kumpulan ${tag.count} artikel Klandesa bertopik ${tag.name}: panduan dan informasi untuk pemerintah desa.`;
  const seo = buildLandingSeo(pageHref(base, page), title, description);
  return {
    title,
    description,
    alternates: blogAlternates(pageHref(base, page)),
    robots: tag.count >= MIN_ARTICLES_TO_INDEX ? "index, follow" : "noindex, follow",
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: "Klandesa",
      title,
      description,
      url: seo.canonical,
      images: [{ url: seo.ogImage }],
    },
  };
}

export default async function BlogTopicPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const page = parsePageParam((await searchParams).page);
  const tag = await getTag(slug);
  if (!tag || page === null) notFound();

  const data = await getPosts(slug, page);
  if (page > data.totalPages) notFound();
  const base = `/blog/topik/${tag.slug}`;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-600">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href="/" className="hover:text-teal-700 hover:underline">
                Beranda
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/blog" className="hover:text-teal-700 hover:underline">
                Blog
              </Link>
            </li>
          </ol>
        </nav>

        <header className="mb-10">
          <h1 className="text-balance text-3xl font-semibold text-gray-900 sm:text-4xl">Topik: {tag.name}</h1>
          <p className="mt-2 text-gray-600">{tag.count} artikel bertopik {tag.name}.</p>
        </header>

        <BlogPostCards posts={data.posts} />
        <BlogPagination basePath={base} page={page} totalPages={data.totalPages} label={`Paginasi topik ${tag.name}`} />
      </div>
    </main>
  );
}
