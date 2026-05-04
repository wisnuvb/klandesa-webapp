import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(value);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: {
      title: true,
      seoTitle: true,
      seoDescription: true,
      excerpt: true,
      coverImageUrl: true,
      status: true,
    },
  });
  if (!post || post.status !== "published") return { title: "Blog" };

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || undefined;

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogDetailPage(props: Props) {
  const { slug } = await props.params;
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      coverImageAttribution: true,
      status: true,
      publishedAt: true,
      createdAt: true,
    },
  });
  if (!post || post.status !== "published") notFound();

  const date = post.publishedAt ?? post.createdAt;
  const attribution =
    post.coverImageAttribution && typeof post.coverImageAttribution === "object"
      ? (post.coverImageAttribution as Record<string, unknown>)
      : null;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-[#0d9488]">
            Beranda
          </Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-[#0d9488]">
            Blog
          </Link>
        </nav>

        <article className="space-y-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            {formatDate(date)}
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="text-base text-gray-600">{post.excerpt}</p>
          ) : null}
          {post.coverImageUrl ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.coverImageUrl}
                alt=""
                className="w-full rounded-2xl border border-gray-200"
              />
              {attribution && typeof attribution.authorName === "string" ? (
                <div className="text-xs text-gray-500">
                  Foto oleh{" "}
                  {typeof attribution.authorUrl === "string" ? (
                    <a
                      href={attribution.authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {attribution.authorName}
                    </a>
                  ) : (
                    attribution.authorName
                  )}{" "}
                  · {typeof attribution.source === "string" ? attribution.source : "Unsplash"}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="max-w-none whitespace-pre-wrap text-base leading-relaxed text-gray-700">
            {post.content || ""}
          </div>
        </article>
      </div>
    </main>
  );
}

