import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { slugifyBlog } from "@/app/api/admin/blog/_slug";
import { checkBlogSeo } from "@/lib/blog/seo-check";
import { forbiddenBlogSlugMessage, isForbiddenBlogSlug } from "@/lib/blog/slug-rules";
import { invalidateBlogCache } from "@/lib/blog/cache";
import { deleteReplacedBlogImages, removedInlineImageUrls } from "@/lib/blog/cover-cleanup";
import { toJSONSafe } from "@/utils/json";
import { auditPlatform } from "@/lib/platform/audit";
import { actorOf, clip } from "@/lib/platform/legacy-audit";

const MAX_CONTENT = 300_000;
const MAX_TAGS = 20;
const ATTRIBUTION_TEXT_KEYS = ["authorName", "authorUsername", "source"] as const;
const ATTRIBUTION_URL_KEYS = ["authorUrl", "photoUrl", "downloadLocation"] as const;

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Sampul: kosong (hapus), jalur lokal, atau URL http(s). Skema lain (javascript:, data:) ditolak. */
function validCoverUrl(v: string): boolean {
  if (v === "") return true;
  if (v.length > 2000) return false;
  if (v.startsWith("/") && !v.startsWith("//")) return true;
  return isHttpUrl(v);
}

/** Atribusi tampil publik (tautan <a href>): hanya kunci dikenal, teks pendek, URL harus http(s). */
function sanitizeAttribution(input: object): Prisma.InputJsonValue {
  const src = input as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of ATTRIBUTION_TEXT_KEYS) {
    if (typeof src[k] === "string") out[k] = (src[k] as string).slice(0, 200);
  }
  for (const k of ATTRIBUTION_URL_KEYS) {
    const v = src[k];
    if (typeof v === "string" && v.length <= 1000 && isHttpUrl(v)) out[k] = v;
  }
  return out;
}

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
    allowSlugChange?: unknown;
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
  if (
    (title !== undefined && title.length > 200) ||
    (seoTitle !== undefined && seoTitle.length > 200) ||
    (seoDescription !== undefined && seoDescription.length > 500) ||
    (excerpt !== undefined && excerpt.length > 5000) ||
    (content !== undefined && content.length > MAX_CONTENT)
  ) {
    return NextResponse.json({ error: "Salah satu isian melebihi batas panjang" }, { status: 400 });
  }
  if (coverImageUrl !== undefined && !validCoverUrl(coverImageUrl)) {
    return NextResponse.json({ error: "coverImageUrl harus berupa URL http(s) atau jalur lokal" }, { status: 400 });
  }
  let attributionData: Prisma.InputJsonValue | typeof Prisma.DbNull | undefined;
  if (coverImageAttributionInput !== undefined) {
    if (coverImageAttributionInput === null) {
      attributionData = Prisma.DbNull;
    } else if (typeof coverImageAttributionInput === "object" && !Array.isArray(coverImageAttributionInput)) {
      attributionData = sanitizeAttribution(coverImageAttributionInput);
    } else {
      return NextResponse.json({ error: "coverImageAttribution tidak valid" }, { status: 400 });
    }
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
    if (isForbiddenBlogSlug(slug))
      return NextResponse.json({ error: forbiddenBlogSlugMessage(slug) }, { status: 400 });
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
    ? tagsInput.filter((t): t is string => typeof t === "string").slice(0, MAX_TAGS)
    : null;

  const before = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: {
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      excerpt: true,
      content: true,
      seoTitle: true,
      seoDescription: true,
      coverImageUrl: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mengganti slug artikel yang sudah terbit memutus URL lama (404, peringkat hilang; belum ada pengalihan).
  // Wajib dikonfirmasi eksplisit oleh pemanggil.
  if (
    before.status === "published" &&
    slug !== undefined &&
    slug !== before.slug &&
    body.allowSlugChange !== true
  ) {
    return NextResponse.json(
      {
        error: `Artikel sudah terbit. Mengganti slug dari "${before.slug}" memutus URL lama (404) dan peringkat pencariannya.`,
        code: "SLUG_CHANGE_NEEDS_CONFIRM",
      },
      { status: 409 },
    );
  }

  // Pagar mutu yang sama dengan rute /publish: memilih status "published" lewat Simpan tidak boleh
  // melewatinya. Hanya saat peralihan ke terbit; menyunting artikel yang sudah terbit tidak diblokir.
  if (statusOk === "published" && before.status !== "published") {
    const check = checkBlogSeo({
      title: title ?? before.title,
      slug: slug ?? before.slug,
      excerpt: excerpt ?? before.excerpt,
      content: content ?? before.content,
      seoTitle: seoTitle ?? before.seoTitle,
      seoDescription: seoDescription ?? before.seoDescription,
      coverImageUrl: coverImageUrl ?? before.coverImageUrl,
      tags: tags ?? before.tags.map((t) => t.tag.name),
    });
    if (!check.canPublish) {
      const reasons = check.items.filter((i) => i.status === "fail").map((i) => `${i.label}: ${i.detail}`);
      return NextResponse.json(
        { error: `Belum bisa diterbitkan. ${reasons.join(" ")}`, checks: check.items },
        { status: 422 },
      );
    }
  }

  let updated: { id: bigint; slug: string };
  try {
    updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.BlogPostUpdateInput = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (content !== undefined) data.content = content;
    if (statusOk !== undefined) {
      data.status = statusOk;
      // Terbit tanpa tanggal terbit membuat artikel hilang dari urutan daftar publik: isi bila belum ada.
      if (statusOk === "published" && !before.publishedAt) data.publishedAt = new Date();
    }
    if (coverImageUrl !== undefined) data.coverImageUrl = coverImageUrl || null;
    if (seoTitle !== undefined) data.seoTitle = seoTitle || null;
    if (seoDescription !== undefined)
      data.seoDescription = seoDescription || null;

    if (attributionData !== undefined) data.coverImageAttribution = attributionData;

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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Slug sudah dipakai" }, { status: 400 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }

  invalidateBlogCache();

  // Gambar yang tidak lagi dipakai (cover lama, atau gambar yang dibuang dari isi) dihapus dari Spaces:
  // best-effort, setelah DB sukses. Pemeriksaan pemakaian bersama ada di deleteReplacedBlogImages.
  const staleImages: string[] = [];
  if (coverImageUrl !== undefined && before.coverImageUrl && before.coverImageUrl !== (coverImageUrl || null)) {
    staleImages.push(before.coverImageUrl);
  }
  if (content !== undefined) staleImages.push(...removedInlineImageUrls(before.content, content));
  const deletedKeys =
    staleImages.length > 0
      ? await deleteReplacedBlogImages(staleImages, {
          postId,
          coverImageUrl: coverImageUrl !== undefined ? coverImageUrl || null : before.coverImageUrl,
          content: content ?? before.content,
        })
      : [];

  const changed = [
    title !== undefined && "title",
    slug !== undefined && "slug",
    excerpt !== undefined && "excerpt",
    content !== undefined && "content",
    statusOk !== undefined && "status",
    coverImageUrl !== undefined && "coverImageUrl",
    attributionData !== undefined && "coverImageAttribution",
    seoTitle !== undefined && "seoTitle",
    seoDescription !== undefined && "seoDescription",
    tags !== null && "tags",
  ].filter(Boolean) as string[];
  const wasPublished = before.status === "published";
  const action =
    statusOk === "published" && !wasPublished
      ? "blog.publish"
      : statusOk !== undefined && statusOk !== "published" && wasPublished
        ? "blog.unpublish"
        : "blog.update";
  await auditPlatform(req, actorOf(auth), {
    action,
    targetType: "system",
    targetId: `blog_post:${postId}`,
    summary: `${action === "blog.publish" ? "Menerbitkan" : action === "blog.unpublish" ? "Menarik dari terbit" : "Mengubah"} artikel blog "${clip(title ?? before.title, 120)}" (slug ${updated.slug})${action === "blog.update" ? `: ${changed.join(", ") || "tanpa perubahan"}` : ""}`,
    metadata: {
      postId: postId.toString(),
      changedFields: changed,
      before: { status: before.status, slug: before.slug, title: clip(before.title, 120) },
      after: { status: statusOk ?? before.status, slug: updated.slug, ...(title !== undefined ? { title: clip(title, 120) } : {}) },
    },
  });

  if (deletedKeys.length > 0) {
    await auditPlatform(req, actorOf(auth), {
      action: "blog.image_delete",
      targetType: "system",
      targetId: `blog_post:${postId}`,
      summary: `Menghapus ${deletedKeys.length} gambar yang tidak lagi dipakai (cover lama / dibuang dari isi) dari penyimpanan`,
      metadata: { postId: postId.toString(), keys: deletedKeys },
    });
  }

  return NextResponse.json(
    { ok: true, post: toJSONSafe(updated) },
    { status: 200 },
  );
}
