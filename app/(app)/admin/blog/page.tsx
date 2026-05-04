"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d);
}

export default function AdminBlogPage() {
  const [query, setQuery] = useState("");
  const q = useMemo(() => query.trim(), [query]);
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BlogPostRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError(null);
        const url = `/api/admin/blog/posts?query=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`;
        const res = await fetch(url, { cache: "no-store", signal });
        const data = (await res.json().catch(() => null)) as {
          posts?: BlogPostRow[];
          error?: string;
        } | null;
        if (!res.ok) throw new Error(data?.error || "Gagal memuat blog post");
        setRows(data?.posts ?? []);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Gagal memuat blog post");
      } finally {
        setLoading(false);
      }
    },
    [q, status],
  );

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  const create = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      setCreating(true);
      setError(null);
      const res = await fetch("/api/admin/blog/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await res.json().catch(() => null)) as {
        id?: string;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal membuat post");
      setNewTitle("");
      if (data?.id) {
        window.location.href = `/admin/blog/${encodeURIComponent(data.id)}`;
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat post");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Kelola blog</CardTitle>
          <div className="text-sm text-muted-foreground">
            Buat, edit, dan publish artikel blog Klandesa.
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul / slug…"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Semua status</option>
              <option value="draft">draft</option>
              <option value="review">review</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setStatus("");
              }}
            >
              Reset
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Judul post baru…"
            />
            <Button
              className="w-full sm:w-auto"
              disabled={creating || newTitle.trim() === ""}
              onClick={create}
            >
              {creating ? "Membuat…" : "Buat post"}
            </Button>
          </div>

          {error ? (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Daftar post</CardTitle>
          <div className="text-sm text-muted-foreground">
            {loading ? "Memuat…" : `${rows.length} post`}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Tidak ada data.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        /blog/{p.slug} · {p.status} · publish:{" "}
                        {formatDate(p.publishedAt)}
                      </div>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                    >
                      <Link href={`/admin/blog/${encodeURIComponent(p.id)}`}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
