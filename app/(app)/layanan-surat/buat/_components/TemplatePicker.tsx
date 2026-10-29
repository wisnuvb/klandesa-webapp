"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, FileText, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Choice = { id: number; name: string; description: string; category: string };

/** Hanya jenis surat berformat v2 yang aktif; yang lama tidak bisa dipakai di pembuatan surat baru. */
function toChoices(rows: unknown): Choice[] {
  if (!Array.isArray(rows)) return [];
  const out: Choice[] = [];
  for (const r of rows as Array<Record<string, unknown>>) {
    const ts = r.templateStructure as { schemaVersion?: unknown } | null | undefined;
    if (r.isActive === false || ts?.schemaVersion !== 2 || typeof r.id !== "number") continue;
    out.push({
      id: r.id,
      name: String(r.name ?? "Jenis surat"),
      description: typeof r.description === "string" ? r.description : "",
      category: typeof r.category === "string" && r.category ? r.category : "Lainnya",
    });
  }
  return out;
}

/** Layar "Pilih jenis surat" saat halaman Buat Surat dibuka tanpa jenis surat. */
export function TemplatePicker({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/mail-templates");
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || "Gagal memuat daftar jenis surat.");
        }
        const rows = toChoices(await res.json());
        if (!cancelled) setChoices(rows);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal memuat daftar jenis surat.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (choices ?? []).filter((c) => !q || `${c.name} ${c.description} ${c.category}`.toLowerCase().includes(q));
    const map = new Map<string, Choice[]>();
    for (const c of filtered) map.set(c.category, [...(map.get(c.category) ?? []), c]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "id"));
  }, [choices, query]);

  const back = embedded ? null : (
    <Button type="button" variant="outline" size="sm" className="min-h-9 gap-2 pointer-coarse:min-h-11" onClick={() => router.push("/layanan-surat")}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Kembali ke daftar surat
    </Button>
  );

  return (
    <div className={embedded ? "space-y-5" : "mx-auto max-w-4xl space-y-5 p-4 md:p-6"}>
      <header className="space-y-1">
        {embedded ? <h2 className="text-lg font-semibold">Pilih jenis surat</h2> : <h1 className="text-xl font-semibold">Pilih jenis surat</h1>}
        <p className="text-sm text-muted-foreground">Pilih surat yang ingin dibuat. Data warga dan desa akan terisi otomatis di langkah berikutnya.</p>
      </header>

      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 p-4 text-sm">
          <p className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </p>
          {back}
        </div>
      ) : choices === null ? (
        <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Memuat jenis surat…
        </p>
      ) : choices.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border p-6 text-sm">
          <p className="font-medium">Belum ada jenis surat yang bisa dipakai.</p>
          <p className="text-muted-foreground">Buka tab &ldquo;Kelola Template&rdquo; untuk membuat jenis surat baru atau memakai contoh.</p>
          {back}
        </div>
      ) : (
        <>
          <div className="relative max-w-md">
            <label htmlFor="pilih-jenis-cari" className="sr-only">Cari jenis surat</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="pilih-jenis-cari" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari jenis surat…" className="min-h-11 pl-9" />
          </div>

          {groups.length === 0 ? (
            <p role="status" className="py-6 text-sm text-muted-foreground">Tidak ada jenis surat yang cocok dengan “{query}”.</p>
          ) : (
            groups.map(([category, items]) => (
              <section key={category} aria-labelledby={`grup-${category}`} className="space-y-2">
                <h2 id={`grup-${category}`} className="text-sm font-semibold text-muted-foreground">{category}</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {items.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          const to = `/layanan-surat/buat?templateId=${c.id}`;
                          if (embedded) router.push(to);
                          else router.replace(to);
                        }}
                        className="flex min-h-14 w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                      >
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{c.name}</span>
                          {c.description && <span className="line-clamp-2 block text-sm text-muted-foreground">{c.description}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
          <div>{back}</div>
        </>
      )}
    </div>
  );
}
