"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ChevronRight, FileText, Loader2, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TemplateBody } from "../../types";

type Choice = { id: number; name: string; description: string; category: string; usage: number };

/** Penjelasan singkat tiap kelompok agar operator awam tahu isinya. Kategori lain tampil tanpa penjelasan. */
const CATEGORY_HINTS: Record<string, string> = {
  Keterangan: "Menerangkan keadaan atau data seorang warga",
  Pengantar: "Mengantar, mewakili, atau menyatakan sesuatu untuk keperluan warga",
  Kependudukan: "Perubahan data penduduk (pindah, datang, lahir, meninggal)",
  "Administrasi Desa": "Surat untuk urusan pemerintah desa sendiri (undangan, tugas, SK, berita acara)",
};

const STEPS = ["Pilih jenis surat", "Isi data", "Terbitkan & cetak"] as const;
const POPULAR_LIMIT = 4;

/** Hanya jenis surat berformat v2 yang aktif; yang lama tidak bisa dipakai di pembuatan surat baru. */
function toChoices(rows: unknown): Choice[] {
  if (!Array.isArray(rows)) return [];
  const out: Choice[] = [];
  for (const r of rows as Array<Record<string, unknown>>) {
    const ts = r.templateStructure as { schemaVersion?: unknown } | null | undefined;
    const v2 = r.schemaVersion === 2 || ts?.schemaVersion === 2;
    if (r.isActive === false || !v2 || typeof r.id !== "number") continue;
    out.push({
      id: r.id,
      name: String(r.name ?? "Jenis surat"),
      description: typeof r.description === "string" ? r.description : "",
      category: typeof r.category === "string" && r.category ? r.category : "Lainnya",
      usage: typeof r.usageCount === "number" ? r.usageCount : 0,
    });
  }
  return out;
}

/** Jenis surat yang sudah dimuat halaman induk (hanya v2 aktif) menjadi pilihan. */
function bodiesToChoices(bodies: TemplateBody[]): Choice[] {
  return bodies
    .filter((t) => t.is_active)
    .map((t) => ({ id: t.id, name: t.name, description: t.description, category: t.category || "Lainnya", usage: t.usage_count }));
}

/**
 * Layar "Pilih jenis surat". Dipakai di dua cara:
 * - tertanam di halaman Layanan Surat: daftar diberikan induk lewat `templates` (null = masih dimuat), tanpa fetch sendiri;
 * - berdiri sendiri di `/layanan-surat/buat` tanpa parameter: memuat daftarnya sendiri.
 */
export function TemplatePicker({
  embedded = false,
  templates,
  error: parentError = "",
  onRetry,
}: {
  embedded?: boolean;
  templates?: TemplateBody[] | null;
  error?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const controlled = templates !== undefined;
  const [ownChoices, setOwnChoices] = useState<Choice[] | null>(null);
  const [ownError, setOwnError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const choices = useMemo(
    () => (controlled ? (templates ? bodiesToChoices(templates) : null) : ownChoices),
    [controlled, templates, ownChoices],
  );
  const error = controlled ? parentError : ownError;

  useEffect(() => {
    if (controlled) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/mail-templates");
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || "Gagal memuat daftar jenis surat.");
        }
        const rows = toChoices(await res.json());
        if (!cancelled) setOwnChoices(rows);
      } catch (e) {
        if (!cancelled) setOwnError(e instanceof Error ? e.message : "Gagal memuat daftar jenis surat.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [controlled]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of choices ?? []) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b, "id"));
  }, [choices]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (choices ?? []).filter(
      (c) => (!category || c.category === category) && (!q || `${c.name} ${c.description} ${c.category}`.toLowerCase().includes(q)),
    );
    const map = new Map<string, Choice[]>();
    for (const c of filtered) map.set(c.category, [...(map.get(c.category) ?? []), c]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "id"));
  }, [choices, query, category]);

  // "Sering dipakai" hanya muncul bila sudah ada riwayat pemakaian dan pengguna belum menyaring.
  const popular = useMemo(() => {
    if (query.trim() || category) return [];
    return (choices ?? [])
      .filter((c) => c.usage > 0)
      .sort((a, b) => b.usage - a.usage)
      .slice(0, POPULAR_LIMIT);
  }, [choices, query, category]);

  const choose = (id: number) => {
    const to = `/layanan-surat/buat?templateId=${id}`;
    if (embedded) router.push(to);
    else router.replace(to);
  };

  const manageLink = (
    <Link href="/layanan-surat?tab=template" className="font-medium text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      Atur Jenis Surat
    </Link>
  );

  const renderChoice = (c: Choice) => (
    <li key={c.id}>
      <button
        type="button"
        onClick={() => choose(c.id)}
        className="group flex min-h-16 w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium leading-snug">{c.name}</span>
          {c.description && <span className="line-clamp-2 block text-sm text-muted-foreground">{c.description}</span>}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
      </button>
    </li>
  );

  const back = embedded ? null : (
    <Button type="button" variant="outline" size="sm" className="min-h-9 gap-2 pointer-coarse:min-h-11" onClick={() => router.push("/layanan-surat")}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Kembali ke daftar surat
    </Button>
  );

  return (
    <div className={embedded ? "space-y-5" : "mx-auto max-w-4xl space-y-5 p-4 md:p-6"}>
      <header className="space-y-3">
        <div className="space-y-1">
          {embedded ? <h2 className="text-xl font-semibold">Surat apa yang ingin dibuat?</h2> : <h1 className="text-2xl font-semibold">Surat apa yang ingin dibuat?</h1>}
          <p className="text-sm text-muted-foreground">Klik salah satu jenis surat di bawah. Data warga dan desa akan terisi otomatis, Anda tinggal memeriksanya.</p>
        </div>
        <ol aria-label="Langkah membuat surat" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === 0 ? "step" : undefined} className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} aria-hidden="true">{i + 1}</span>
              <span className={i === 0 ? "font-medium" : "text-muted-foreground"}>{label}</span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </header>

      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 p-4 text-sm">
          <p className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" className="min-h-9 pointer-coarse:min-h-11" onClick={onRetry}>
              Coba lagi
            </Button>
          ) : null}
          {back}
        </div>
      ) : choices === null ? (
        <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Memuat jenis surat…
        </p>
      ) : choices.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border p-6 text-sm">
          <p className="font-medium">Belum ada jenis surat yang bisa dipakai.</p>
          <p className="text-muted-foreground">Buka {manageLink} untuk membuat jenis surat baru atau memakai contoh.</p>
          {back}
        </div>
      ) : (
        <>
          <div className="relative max-w-lg">
            <label htmlFor="pilih-jenis-cari" className="sr-only">Cari jenis surat</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="pilih-jenis-cari" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ketik nama surat, mis. “domisili” atau “usaha”" className="min-h-11 pl-9" />
          </div>

          {categories.length > 1 && (
            <div role="group" aria-label="Saring menurut kelompok" className="flex flex-wrap gap-2">
              {[{ name: null as string | null, label: "Semua", count: choices.length }, ...categories.map(([name, count]) => ({ name, label: name, count }))].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  aria-pressed={category === chip.name}
                  onClick={() => setCategory(chip.name)}
                  className="min-h-9 rounded-full border px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground pointer-coarse:min-h-11 motion-reduce:transition-none"
                >
                  {chip.label} <span className="opacity-75">({chip.count})</span>
                </button>
              ))}
            </div>
          )}

          {popular.length > 0 && (
            <section aria-labelledby="grup-sering" className="space-y-2">
              <h2 id="grup-sering" className="flex items-center gap-1.5 text-sm font-semibold">
                <Star className="h-4 w-4 text-amber-500" aria-hidden="true" /> Sering dipakai
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">{popular.map((c) => renderChoice(c))}</ul>
            </section>
          )}

          {groups.length === 0 ? (
            <div role="status" className="space-y-3 rounded-lg border border-dashed p-5 text-sm">
              <p className="font-medium">Tidak ada surat yang cocok{query.trim() ? ` dengan “${query.trim()}”` : ""}.</p>
              <p className="text-muted-foreground">Coba kata yang lebih pendek, atau lihat semua jenis surat.</p>
              <Button type="button" variant="outline" size="sm" className="min-h-9 pointer-coarse:min-h-11" onClick={() => { setQuery(""); setCategory(null); }}>
                Tampilkan semua surat
              </Button>
            </div>
          ) : (
            groups.map(([name, items]) => (
              <section key={name} aria-labelledby={`grup-${name}`} className="space-y-2">
                <div>
                  <h2 id={`grup-${name}`} className="text-sm font-semibold">{name}</h2>
                  {CATEGORY_HINTS[name] && <p className="text-sm text-muted-foreground">{CATEGORY_HINTS[name]}</p>}
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">{items.map((c) => renderChoice(c))}</ul>
              </section>
            ))
          )}

          <p className="border-t pt-4 text-sm text-muted-foreground">
            Jenis surat yang dicari belum ada? Tambah atau ubah di {manageLink}.
          </p>
          <div>{back}</div>
        </>
      )}
    </div>
  );
}
