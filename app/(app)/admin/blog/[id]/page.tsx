"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type BlogTag = { id: number; slug: string; name: string };

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  status: string;
  coverImageUrl: string | null;
  coverImageAttribution: unknown | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  tags: BlogTag[];
};

type GeneratedDraft = {
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  content: string;
  unsplashQuery: string;
};

type UnsplashSearchResult = {
  id: string;
  alt: string | null;
  urls: { small: string; regular: string; full: string };
  links: { html: string; downloadLocation: string };
  attribution: {
    authorName: string;
    authorUsername: string;
    authorUrl: string;
    source: string;
  };
};

function joinTags(tags: BlogTag[]): string {
  return tags.map((t) => t.name).join(", ");
}

function asStringArray(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminBlogEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [tagsCsv, setTagsCsv] = useState("");

  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashResults, setUnsplashResults] = useState<
    UnsplashSearchResult[]
  >([]);

  const isPublished = post?.status === "published";

  const canSave = useMemo(
    () => Boolean(post?.title?.trim()) && Boolean(post?.slug?.trim()),
    [post],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setOk(null);
      const res = await fetch(
        `/api/admin/blog/posts/${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      const data = (await res.json().catch(() => null)) as {
        post?: BlogPost;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal memuat post");
      if (!data?.post) throw new Error("Data post tidak lengkap");
      setPost(data.post);
      setTagsCsv(joinTags(data.post.tags || []));
      setUnsplashQuery("");
      setUnsplashResults([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat post");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void load();
  }, [id, load]);

  const save = async () => {
    if (!post || !canSave) return;
    try {
      setSaving(true);
      setError(null);
      setOk(null);
      const res = await fetch(
        `/api/admin/blog/posts/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            status: post.status,
            coverImageUrl: post.coverImageUrl,
            coverImageAttribution: post.coverImageAttribution,
            seoTitle: post.seoTitle,
            seoDescription: post.seoDescription,
            tags: asStringArray(tagsCsv),
          }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal menyimpan");
      setOk("Tersimpan");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!post) return;
    try {
      setPublishing(true);
      setError(null);
      setOk(null);
      const res = await fetch(
        `/api/admin/blog/posts/${encodeURIComponent(id)}/publish`,
        {
          method: "POST",
        },
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal publish");
      setOk("Published");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal publish");
    } finally {
      setPublishing(false);
    }
  };

  const generate = async () => {
    if (!post?.title?.trim()) return;
    try {
      setGenerating(true);
      setError(null);
      setOk(null);
      const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: post.title }),
      });
      const data = (await res.json().catch(() => null)) as {
        draft?: GeneratedDraft;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal generate");
      const draft = data?.draft;
      if (!draft) throw new Error("Draft tidak tersedia");
      setPost((p) =>
        p
          ? {
              ...p,
              title: draft.title || p.title,
              excerpt: draft.excerpt,
              content: draft.content,
              seoTitle: draft.seoTitle,
              seoDescription: draft.seoDescription,
            }
          : p,
      );
      setTagsCsv(draft.tags.join(", "));
      setUnsplashQuery(draft.unsplashQuery);
      setOk("Draft AI siap (cek & edit sebelum publish)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal generate");
    } finally {
      setGenerating(false);
    }
  };

  const searchUnsplash = async () => {
    const q = unsplashQuery.trim();
    if (!q) return;
    try {
      setUnsplashLoading(true);
      setError(null);
      const res = await fetch(
        `/api/admin/unsplash/search?q=${encodeURIComponent(q)}&limit=12`,
        {
          cache: "no-store",
        },
      );
      const data = (await res.json().catch(() => null)) as {
        results?: UnsplashSearchResult[];
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal cari Unsplash");
      setUnsplashResults(data?.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal cari Unsplash");
    } finally {
      setUnsplashLoading(false);
    }
  };

  const selectCover = async (img: UnsplashSearchResult) => {
    if (!post) return;
    setPost({
      ...post,
      coverImageUrl: img.urls.regular,
      coverImageAttribution: {
        ...img.attribution,
        photoUrl: img.links.html,
        downloadLocation: img.links.downloadLocation,
      },
    });
    try {
      await fetch("/api/admin/unsplash/track-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadLocation: img.links.downloadLocation }),
      });
    } catch {
      return;
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 text-sm text-muted-foreground">Memuat…</div>
    );
  }
  if (!post) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Post tidak ditemukan</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin/blog">Kembali</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Editor blog</div>
          <div className="text-lg md:text-xl font-semibold truncate">
            {post.title}
          </div>
          <div className="text-xs text-muted-foreground">
            Status: {post.status} · URL: /blog/{post.slug}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className="w-full sm:w-auto"
            disabled={!canSave || saving}
            onClick={save}
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            disabled={generating}
            onClick={generate}
          >
            {generating ? "Generate…" : "Generate AI"}
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={publishing || isPublished}
            onClick={publish}
          >
            {publishing ? "Publish…" : isPublished ? "Published" : "Publish"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="text-sm text-red-600" role="alert">
          {error}
        </div>
      ) : ok ? (
        <div className="text-sm text-green-700" role="status">
          {ok}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Konten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Judul</div>
              <Input
                value={post.title}
                onChange={(e) => setPost({ ...post, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Slug</div>
              <Input
                value={post.slug}
                onChange={(e) => setPost({ ...post, slug: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Excerpt</div>
              <Textarea
                rows={3}
                value={post.excerpt ?? ""}
                onChange={(e) => setPost({ ...post, excerpt: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Content</div>
              <Textarea
                rows={16}
                value={post.content ?? ""}
                onChange={(e) => setPost({ ...post, content: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">
                Tags (pisahkan dengan koma)
              </div>
              <Input
                value={tagsCsv}
                onChange={(e) => setTagsCsv(e.target.value)}
                placeholder="contoh: digitalisasi desa, pelayanan publik"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Status</div>
              <select
                value={post.status}
                onChange={(e) => setPost({ ...post, status: e.target.value })}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
              >
                <option value="draft">draft</option>
                <option value="review">review</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">SEO Title</div>
                <Input
                  value={post.seoTitle ?? ""}
                  onChange={(e) =>
                    setPost({ ...post, seoTitle: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">SEO Description</div>
                <Textarea
                  rows={3}
                  value={post.seoDescription ?? ""}
                  onChange={(e) =>
                    setPost({ ...post, seoDescription: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {post.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.coverImageUrl}
                  alt=""
                  className="w-full rounded-lg border border-border"
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Belum ada cover
                </div>
              )}
              <div className="space-y-1">
                <div className="text-sm font-medium">Cari cover (Unsplash)</div>
                <div className="flex gap-2">
                  <Input
                    value={unsplashQuery}
                    onChange={(e) => setUnsplashQuery(e.target.value)}
                    placeholder="contoh: village digitalization"
                  />
                  <Button
                    variant="outline"
                    className="shrink-0"
                    disabled={unsplashLoading}
                    onClick={searchUnsplash}
                  >
                    {unsplashLoading ? "Cari…" : "Cari"}
                  </Button>
                </div>
              </div>
              {unsplashResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {unsplashResults.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => void selectCover(img)}
                      className="rounded-lg border border-border overflow-hidden hover:opacity-90"
                      type="button"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.urls.small}
                        alt={img.alt || ""}
                        className="w-full h-24 object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground">
                {post.coverImageAttribution
                  ? "Attribution tersimpan (lihat JSON)."
                  : "Attribution belum ada."}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
