"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/ui/search-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { countWords, readingMinutes } from "@/lib/blog/markdown";
import { prepareBlogImage } from "@/lib/blog/image-client";
import {
  BRAND_SUFFIX,
  SEO_DESC_MAX,
  SEO_TITLE_MAX,
  checkBlogSeo,
  type BlogCheckStatus,
} from "@/lib/blog/seo-check";

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

/** Pratinjau memuat react-markdown; baru diunduh saat tab Pratinjau dibuka. */
const BlogMarkdown = dynamic(() => import("@/components/blog/BlogMarkdown").then((m) => m.BlogMarkdown), {
  loading: () => <p className="text-sm text-muted-foreground">Memuat pratinjau…</p>,
});

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Unggah ke Spaces lewat /api/admin/blog/images; mengembalikan URL publik. */
async function uploadBlogImage(original: File): Promise<string> {
  // Diperkecil di peramban dulu (maks 1920 px, WebP) agar halaman artikel ringan.
  const file = await prepareBlogImage(original);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Ukuran gambar maksimal 5 MB, bahkan setelah diperkecil.");
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/blog/images", { method: "POST", body: form });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) throw new Error(data?.error || "Gagal mengunggah gambar");
  return data.url;
}

function snapshotOf(p: BlogPost | null, tagsCsv: string): string {
  if (!p) return "";
  return JSON.stringify([
    p.title,
    p.slug,
    p.excerpt,
    p.content,
    p.status,
    p.coverImageUrl,
    p.seoTitle,
    p.seoDescription,
    tagsCsv,
  ]);
}

const CHECK_STYLE: Record<
  BlogCheckStatus,
  { label: string; text: string; Icon: typeof CheckCircle2 }
> = {
  ok: { label: "Lulus", text: "text-green-700", Icon: CheckCircle2 },
  warn: { label: "Saran", text: "text-amber-700", Icon: AlertTriangle },
  fail: { label: "Perbaiki", text: "text-red-700", Icon: XCircle },
};

/** Penghitung karakter: teks + angka, bukan warna saja. */
function CharCount({ value, max, note }: { value: number; max: number; note?: string }) {
  const over = value > max;
  return (
    <div
      className={`text-xs ${over ? "font-medium text-amber-700" : "text-muted-foreground"}`}
    >
      {value}/{max} karakter{note ? ` (${note})` : ""}
      {over ? " — terlalu panjang, akan terpotong" : ""}
    </div>
  );
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
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [savedSlug, setSavedSlug] = useState("");
  const [aiDrafted, setAiDrafted] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "inline" | null>(null);
  const [inlineAlt, setInlineAlt] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);

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

  const check = useMemo(
    () =>
      post
        ? checkBlogSeo({
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            seoTitle: post.seoTitle,
            seoDescription: post.seoDescription,
            coverImageUrl: post.coverImageUrl ?? "",
            tags: asStringArray(tagsCsv),
          })
        : null,
    [post, tagsCsv],
  );
  const dirty = useMemo(
    () => post !== null && snapshotOf(post, tagsCsv) !== savedSnapshot,
    [post, tagsCsv, savedSnapshot],
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
      setSavedSnapshot(snapshotOf(data.post, joinTags(data.post.tags || [])));
      setSavedSlug(data.post.slug);
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
    const slugChanged = isPublished && post.slug.trim() !== savedSlug;
    if (
      slugChanged &&
      !window.confirm(
        `Artikel ini sudah terbit. Mengganti slug dari "${savedSlug}" memutus URL lama (404) dan peringkat pencariannya.\n\nLanjutkan?`,
      )
    ) {
      return;
    }
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
            coverImageUrl: post.coverImageUrl ?? "",
            coverImageAttribution: post.coverImageAttribution,
            seoTitle: post.seoTitle,
            seoDescription: post.seoDescription,
            tags: asStringArray(tagsCsv),
            ...(slugChanged ? { allowSlugChange: true } : {}),
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
      setAiDrafted(true);
      setOk("Draft AI siap (cek & edit sebelum publish)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal generate");
    } finally {
      setGenerating(false);
    }
  };

  const uploadCover = async (file: File | undefined) => {
    if (!file || !post) return;
    try {
      setUploading("cover");
      setError(null);
      setOk(null);
      const url = await uploadBlogImage(file);
      // Gambar sendiri: tidak ada atribusi fotografer.
      setPost((p) => (p ? { ...p, coverImageUrl: url, coverImageAttribution: null } : p));
      setOk("Cover terunggah. Klik Simpan untuk menyimpan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah gambar");
    } finally {
      setUploading(null);
    }
  };

  const insertInlineImage = async (file: File | undefined) => {
    if (!file || !post) return;
    const alt = inlineAlt.trim();
    if (!alt) {
      setError("Isi teks alternatif gambar dulu (untuk pembaca layar dan SEO).");
      return;
    }
    try {
      setUploading("inline");
      setError(null);
      setOk(null);
      const url = await uploadBlogImage(file);
      // Tanda kurung siku/kurung di alt akan merusak sintaks Markdown.
      const safeAlt = alt.replace(/[[\]()]/g, "");
      const md = `\n\n![${safeAlt}](${url})\n\n`;
      const el = contentRef.current;
      setPost((p) => {
        if (!p) return p;
        const text = p.content ?? "";
        const at = el ? el.selectionStart : text.length;
        return { ...p, content: text.slice(0, at) + md + text.slice(at) };
      });
      setInlineAlt("");
      setOk("Gambar disisipkan ke artikel. Klik Simpan untuk menyimpan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah gambar");
    } finally {
      setUploading(null);
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
            disabled={publishing || isPublished || dirty || !check?.canPublish}
            onClick={publish}
          >
            {publishing ? "Publish…" : isPublished ? "Published" : "Publish"}
          </Button>
        </div>
      </div>

      {aiDrafted ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
          role="note"
        >
          <strong>Draf AI belum diverifikasi.</strong> Periksa fakta, angka, nama peraturan, dan
          klaim sebelum terbit. Artikel generik tanpa penyuntingan berisiko dinilai konten tipis
          oleh Google.
        </div>
      ) : null}

      {!isPublished && (dirty || (check && !check.canPublish)) ? (
        <div className="text-sm text-muted-foreground" role="status">
          {dirty
            ? "Ada perubahan yang belum disimpan. Simpan dulu agar pemeriksaan dan Publish memakai versi terbaru."
            : "Publish dinonaktifkan: perbaiki item “Perbaiki” di Pemeriksa SEO."}
        </div>
      ) : null}

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
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Content (Markdown)</div>
                <div className="text-xs text-muted-foreground">
                  {countWords(post.content ?? "")} kata · {readingMinutes(post.content ?? "")} menit baca
                </div>
              </div>
              <Tabs defaultValue="tulis">
                <TabsList aria-label="Mode konten">
                  <TabsTrigger value="tulis">Tulis</TabsTrigger>
                  <TabsTrigger value="pratinjau">Pratinjau</TabsTrigger>
                </TabsList>
                <TabsContent value="tulis">
                  <Textarea
                    ref={contentRef}
                    rows={20}
                    className="font-mono text-sm"
                    aria-label="Isi artikel (Markdown)"
                    value={post.content ?? ""}
                    onChange={(e) => setPost({ ...post, content: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mulai dari <code>## </code> (subjudul) dan <code>### </code>; judul artikel sudah H1.
                    Tautan internal: <code>[harga](/harga)</code>.
                  </p>
                  <div className="mt-3 space-y-2 rounded-md border border-dashed border-border p-3">
                    <label className="text-sm font-medium" htmlFor="inline-alt">
                      Sisipkan gambar di posisi kursor
                    </label>
                    <Input
                      id="inline-alt"
                      value={inlineAlt}
                      onChange={(e) => setInlineAlt(e.target.value)}
                      placeholder="Teks alternatif: jelaskan isi gambar"
                      maxLength={200}
                    />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Pilih gambar untuk disisipkan"
                      disabled={uploading !== null}
                      className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
                      onChange={(e) => {
                        void insertInlineImage(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <p className="text-xs text-muted-foreground" role="status">
                      {uploading === "inline" ? "Mengunggah…" : "JPG, PNG, atau WebP, maks 5 MB."}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="pratinjau">
                  <div className="max-h-[36rem] overflow-y-auto rounded-md border border-border bg-white p-4 sm:p-6">
                    {post.content?.trim() ? (
                      <BlogMarkdown content={post.content} />
                    ) : (
                      <p className="text-sm text-muted-foreground">Belum ada isi untuk dipratinjau.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
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
              <SearchSelect
                value={post.status}
                onChange={(e) => setPost({ ...post, status: e.target.value })}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm w-full"
              >
                <option value="draft">draft</option>
                <option value="review">review</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </SearchSelect>
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
                  placeholder={post.title}
                  onChange={(e) =>
                    setPost({ ...post, seoTitle: e.target.value })
                  }
                />
                <CharCount
                  value={(post.seoTitle?.trim() || post.title).length + BRAND_SUFFIX.length}
                  max={SEO_TITLE_MAX}
                  note={`termasuk "${BRAND_SUFFIX.trim()}" yang ditambahkan otomatis`}
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
                <CharCount
                  value={(post.seoDescription ?? "").trim().length}
                  max={SEO_DESC_MAX}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Pratinjau hasil pencarian</div>
                <div className="rounded-lg border border-border bg-white p-3">
                  <div className="truncate text-xs text-gray-600">
                    klandesa.com › blog › {post.slug || "…"}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-lg leading-snug text-blue-800">
                    {`${post.seoTitle?.trim() || post.title || "Judul artikel"}${BRAND_SUFFIX}`}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-gray-700">
                    {(post.seoDescription?.trim() || post.excerpt?.trim() || "Deskripsi belum diisi.").slice(0, SEO_DESC_MAX + 20)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Perkiraan saja; Google bisa menulis ulang judul dan deskripsi.
                </p>
              </div>
            </CardContent>
          </Card>

          {check ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pemeriksa SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm" role="status" aria-live="polite">
                  {check.fail} perlu diperbaiki · {check.warn} saran · {check.ok} lulus
                </p>
                <ul className="space-y-2">
                  {check.items.map((item) => {
                    const st = CHECK_STYLE[item.status];
                    return (
                      <li key={item.id} className="flex items-start gap-2 text-sm">
                        <st.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${st.text}`} aria-hidden="true" />
                        <span>
                          <span className={`font-medium ${st.text}`}>{st.label}</span>
                          <span className="text-muted-foreground"> · </span>
                          <span className="font-medium">{item.label}</span>
                          <span className="block text-muted-foreground">{item.detail}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {post.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.coverImageUrl}
                  alt={`Cover: ${post.title}`}
                  className="w-full rounded-lg border border-border"
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Belum ada cover
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="cover-upload">
                  Unggah gambar sendiri
                </label>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading !== null}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
                  onChange={(e) => {
                    void uploadCover(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <p className="text-xs text-muted-foreground" role="status">
                  {uploading === "cover"
                    ? "Mengunggah…"
                    : "Disarankan rasio 16:9, lebar minimal 1200 px. JPG, PNG, atau WebP, maks 5 MB."}
                </p>
                {post.coverImageUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPost({ ...post, coverImageUrl: null, coverImageAttribution: null })
                    }
                  >
                    Hapus cover
                  </Button>
                ) : null}
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Atau cari cover (Unsplash)</div>
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
