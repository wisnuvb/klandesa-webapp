import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { slugifyBlog } from "@/app/api/admin/blog/_slug";
import { toJSONSafe } from "@/utils/json";

function readLimit(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("limit");
  const n = raw ? Number(raw) : 50;
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(100, Math.floor(n)));
}

export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const query = (req.nextUrl.searchParams.get("query") || "").trim();
  const status = (req.nextUrl.searchParams.get("status") || "").trim();
  const limit = readLimit(req);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (query) {
    where.OR = [
      { title: { contains: query } },
      { slug: { contains: query } },
    ];
  }

  const posts = await prisma.blogPost.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ posts: toJSONSafe(posts) }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as
    | { title?: unknown; slug?: unknown }
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const slugInput = String(body.slug ?? "").trim();
  if (!title) return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });

  const base = slugifyBlog(slugInput || title);
  if (!base) return NextResponse.json({ error: "Slug tidak valid" }, { status: 400 });

  let slug = base;
  for (let i = 0; i < 50; i++) {
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) break;
    slug = `${base}-${i + 2}`;
  }

  const created = await prisma.blogPost.create({
    data: {
      title,
      slug,
      status: "draft",
      createdByPlatformUserId: auth.admin.platformUserId,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id.toString() }, { status: 201 });
}

