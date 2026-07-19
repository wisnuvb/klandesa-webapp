import { prisma } from "@/lib/prisma";

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
  title: true,
  excerpt: true,
  content: true,
  coverImageUrl: true,
  coverImageAttribution: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  seoTitle: true,
  seoDescription: true,
} as const;

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
  title: string;
  excerpt: string | null;
  content: string | null;
  coverImageUrl: string | null;
  coverImageAttribution: unknown;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  seoTitle: string | null;
  seoDescription: string | null;
};

export async function listPublishedBlogPosts(
  take = 50,
): Promise<PublicBlogPostListItem[]> {
  try {
    return await prisma.blogPost.findMany({
      where: { status: "published" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take,
      select: blogPostListSelect,
    });
  } catch (error) {
    console.error("[blog] listPublishedBlogPosts:", error);
    return [];
  }
}

export async function getPublishedBlogPostBySlug(
  slug: string,
): Promise<PublicBlogPostDetail | null> {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: blogPostDetailSelect,
    });
    if (!post || post.status !== "published") return null;
    return post;
  } catch (error) {
    console.error("[blog] getPublishedBlogPostBySlug:", error);
    return null;
  }
}
