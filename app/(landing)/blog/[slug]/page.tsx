import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublishedBlogPostBySlug, listRelatedBlogPosts } from "@/lib/blog/public-posts";
import { extractHeadings, readingMinutes, countWords } from "@/lib/blog/markdown";
import { isStaticOptimizableImageUrl } from "@/lib/image-hosts";
import { blogAlternates } from "@/lib/blog/alternates";
import { buildLandingSeo } from "@/lib/seo/landing";
import { getMainSiteOrigin, joinUrl } from "@/lib/seo/url";
import { BlogMarkdown } from "@/components/blog/BlogMarkdown";

type Props = { params: Promise<{ slug: string }> };

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(value);
}

/** JSON-LD disisipkan sebagai teks: "<" di-escape agar isi artikel tak bisa menutup tag script. */
function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) {
    return {
      title: "Artikel tidak ditemukan",
      robots: { index: false, follow: false },
    };
  }

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || undefined;
  const seo = buildLandingSeo(`/blog/${slug}`, title, description ?? title);
  const ogImages = post.coverImageUrl
    ? [{ url: post.coverImageUrl }]
    : [{ url: seo.ogImage }];
  const published = post.publishedAt ?? post.createdAt;

  return {
    title,
    description,
    keywords: post.tags.map((t) => t.name),
    alternates: blogAlternates(`/blog/${slug}`),
    robots: "index, follow",
    openGraph: {
      type: "article",
      locale: "id_ID",
      siteName: "Klandesa",
      title,
      description,
      url: seo.canonical,
      images: ogImages,
      publishedTime: published.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: ["Tim Klandesa"],
      tags: post.tags.map((t) => t.name),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages.map((img) => img.url),
    },
  };
}

export default async function BlogDetailPage(props: Props) {
  const { slug } = await props.params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  const related = await listRelatedBlogPosts(
    post.slug,
    post.tags.map((t) => t.slug),
    3,
  );

  const content = post.content ?? "";
  const published = post.publishedAt ?? post.createdAt;
  const showUpdated = post.updatedAt.getTime() - published.getTime() > DAY_MS;
  const minutes = readingMinutes(content);
  const headings = extractHeadings(content);
  const attribution =
    post.coverImageAttribution && typeof post.coverImageAttribution === "object"
      ? (post.coverImageAttribution as Record<string, unknown>)
      : null;

  const origin = getMainSiteOrigin();
  const url = joinUrl(origin, `/blog/${post.slug}`);
  const image = post.coverImageUrl ?? joinUrl(origin, "/images/og-klandesa.png");
  const description = post.seoDescription || post.excerpt || undefined;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: (post.seoTitle || post.title).slice(0, 110),
    description,
    image: [image],
    datePublished: published.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    inLanguage: "id-ID",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    wordCount: countWords(content),
    keywords: post.tags.map((t) => t.name).join(", ") || undefined,
    author: { "@type": "Organization", name: "Tim Klandesa", url: origin },
    publisher: {
      "@type": "Organization",
      name: "Klandesa",
      url: origin,
      logo: { "@type": "ImageObject", url: joinUrl(origin, "/brand/klandesa-logo.png") },
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: origin },
      { "@type": "ListItem", position: 2, name: "Blog", item: joinUrl(origin, "/blog") },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd) }} />

      <div className="mx-auto max-w-3xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
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

        <article>
          <header className="space-y-4">
            {post.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Topik">
                {post.tags.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/blog/topik/${t.slug}`}
                      className="inline-flex min-h-11 items-center rounded-full bg-teal-50 px-4 text-sm font-medium text-teal-800 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <h1 className="text-balance text-3xl font-semibold leading-tight text-gray-900 sm:text-4xl sm:leading-tight">
              {post.title}
            </h1>
            {post.excerpt ? (
              <p className="text-lg leading-relaxed text-gray-600">{post.excerpt}</p>
            ) : null}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
              <span>Oleh Tim Klandesa</span>
              <span aria-hidden="true">·</span>
              <time dateTime={published.toISOString()}>{formatDate(published)}</time>
              {showUpdated ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Diperbarui <time dateTime={post.updatedAt.toISOString()}>{formatDate(post.updatedAt)}</time>
                  </span>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span>{minutes} menit baca</span>
            </p>
          </header>

          {post.coverImageUrl ? (
            <figure className="mt-8">
              {/* Rasio tetap agar tidak menggeser tata letak saat gambar dimuat (CLS). */}
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                {isStaticOptimizableImageUrl(post.coverImageUrl) ? (
                  // Dioptimalkan (WebP/AVIF, ukuran sesuai layar): unggahan asli bisa beberapa MB.
                  <Image
                    src={post.coverImageUrl}
                    alt={`Gambar sampul: ${post.title}`}
                    fill
                    priority
                    sizes="(min-width: 768px) 768px, 100vw"
                    className="object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImageUrl}
                    alt={`Gambar sampul: ${post.title}`}
                    fetchPriority="high"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>
              {attribution && typeof attribution.authorName === "string" ? (
                <figcaption className="mt-2 text-xs text-gray-600">
                  Foto oleh{" "}
                  {typeof attribution.authorUrl === "string" ? (
                    <a
                      href={attribution.authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-teal-700"
                    >
                      {attribution.authorName}
                    </a>
                  ) : (
                    attribution.authorName
                  )}{" "}
                  · {typeof attribution.source === "string" ? attribution.source : "Unsplash"}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          {headings.length >= 3 ? (
            <nav
              aria-label="Daftar isi"
              className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-5"
            >
              <p className="text-sm font-semibold text-gray-900">Daftar isi</p>
              <ol className="mt-3 space-y-1.5 text-base">
                {headings.map((h) => (
                  <li key={h.id} className={h.level === 3 ? "pl-5" : undefined}>
                    <a
                      href={`#${h.id}`}
                      className="text-teal-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="mt-8 max-w-[68ch]">
            <BlogMarkdown content={content} />
          </div>
        </article>

        <aside
          aria-labelledby="blog-cta-title"
          className="mt-14 rounded-2xl bg-teal-900 p-6 text-white sm:p-8"
        >
          <h2 id="blog-cta-title" className="text-xl font-semibold sm:text-2xl">
            Kelola administrasi desa dalam satu aplikasi
          </h2>
          <p className="mt-2 max-w-[60ch] text-teal-50">
            Data warga, surat, APB Desa, hingga pelaporan. Coba gratis 14 hari, tanpa kartu kredit.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Coba demo Klandesa
            </Link>
            <Link
              href="/harga"
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium text-white underline underline-offset-4 hover:text-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Lihat harga
            </Link>
          </div>
        </aside>

        {related.length > 0 ? (
          <section aria-labelledby="related-title" className="mt-14">
            <h2 id="related-title" className="text-xl font-semibold text-gray-900">
              Baca juga
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((p) => (
                <li key={p.id.toString()}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="block h-full rounded-2xl border border-gray-200 p-4 transition-colors hover:border-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                  >
                    <span className="block text-xs text-gray-600">
                      {formatDate(p.publishedAt ?? p.createdAt)}
                    </span>
                    <span className="mt-1 block font-semibold text-gray-900">{p.title}</span>
                    {p.excerpt ? (
                      <span className="mt-2 line-clamp-2 block text-sm text-gray-600">{p.excerpt}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
