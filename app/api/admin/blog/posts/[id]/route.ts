import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { slugifyBlog } from "@/app/api/admin/blog/_slug";
import { toJSONSafe } from "@/utils/json";

function normalizeStatus(input: string): string | null {
  const s = input.trim().toLowerCase();
  if (
    s === "draft" ||
    s === "review" ||
    s === "published" ||
    s === "archived"
  ) {
    return s;
  }
  return null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  let postId: bigint;
  try {
    postId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      status: true,
      coverImageUrl: true,
      coverImageAttribution: true,
      seoTitle: true,
      seoDescription: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      tags: {
        select: { tag: { select: { id: true, slug: true, name: true } } },
      },
    },
  });

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const tags = post.tags.map((x) => x.tag);
  return NextResponse.json(
    { post: toJSONSafe({ ...post, tags }) },
    { status: 200 },
  );
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  let postId: bigint;
  try {
    postId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    slug?: unknown;
    excerpt?: unknown;
    content?: unknown;
    status?: unknown;
    coverImageUrl?: unknown;
    coverImageAttribution?: unknown;
    seoTitle?: unknown;
    seoDescription?: unknown;
    tags?: unknown;
  } | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  const slugIn = typeof body.slug === "string" ? body.slug.trim() : undefined;
  const excerpt = typeof body.excerpt === "string" ? body.excerpt : undefined;
  const content = typeof body.content === "string" ? body.content : undefined;
  const statusRaw = typeof body.status === "string" ? body.status : undefined;
  const status = statusRaw ? normalizeStatus(statusRaw) : undefined;
  const coverImageUrl =
    typeof body.coverImageUrl === "string"
      ? body.coverImageUrl.trim()
      : undefined;
  const seoTitle =
    typeof body.seoTitle === "string" ? body.seoTitle.trim() : undefined;
  const seoDescription =
    typeof body.seoDescription === "string"
      ? body.seoDescription.trim()
      : undefined;
  const coverImageAttributionInput = body.coverImageAttribution;

  if (title !== undefined && title === "") {
    return NextResponse.json(
      { error: "Judul tidak boleh kosong" },
      { status: 400 },
    );
  }
  if (statusRaw !== undefined && !status) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }
  const statusOk: string | undefined = status ?? undefined;

  let slug: string | undefined = undefined;
  if (slugIn !== undefined) {
    slug = slugifyBlog(slugIn);
    if (!slug)
      return NextResponse.json({ error: "Slug tidak valid" }, { status: 400 });
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing && existing.id !== postId) {
      return NextResponse.json(
        { error: "Slug sudah dipakai" },
        { status: 400 },
      );
    }
  }

  const tagsInput = body.tags;
  const tags = Array.isArray(tagsInput)
    ? tagsInput.filter((t) => typeof t === "string")
    : null;

  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.BlogPostUpdateInput = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (content !== undefined) data.content = content;
    if (statusOk !== undefined) data.status = statusOk;
    if (coverImageUrl !== undefined) data.coverImageUrl = coverImageUrl || null;
    if (seoTitle !== undefined) data.seoTitle = seoTitle || null;
    if (seoDescription !== undefined)
      data.seoDescription = seoDescription || null;

    if (coverImageAttributionInput !== undefined) {
      if (coverImageAttributionInput === null) {
        data.coverImageAttribution = Prisma.DbNull;
      } else if (typeof coverImageAttributionInput === "object") {
        data.coverImageAttribution =
          coverImageAttributionInput as Prisma.InputJsonValue;
      } else {
        return NextResponse.json(
          { error: "coverImageAttribution tidak valid" },
          { status: 400 },
        );
      }
    }

    const post = await tx.blogPost.update({
      where: { id: postId },
      data,
      select: { id: true, slug: true },
    });

    if (tags !== null) {
      await tx.blogPostTag.deleteMany({ where: { postId } });
      for (const raw of tags) {
        const name = raw.trim();
        if (!name) continue;
        const slug = slugifyBlog(name).slice(0, 80);
        if (!slug) continue;
        const tag = await tx.blogTag.upsert({
          where: { slug },
          create: { slug, name: name.slice(0, 80) },
          update: { name: name.slice(0, 80) },
          select: { id: true },
        });
        await tx.blogPostTag.create({
          data: { postId, tagId: tag.id },
          select: { postId: true, tagId: true },
        });
      }
    }

    return post;
  });

  return NextResponse.json(
    { ok: true, post: toJSONSafe(updated) },
    { status: 200 },
  );
}
