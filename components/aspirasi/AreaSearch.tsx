"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, MapPin, Search } from "lucide-react";
import { areaPath } from "@/lib/aspirasi/slug";

type AreaHit = { slug: string; name: string; kind: string; district: string; regency: string; province: string; claimed: boolean; published: number };

/** Cari desa yang sudah punya halaman aspirasi (laporan tayang atau dikelola desa). Debounce 300 ms. */
export function AreaSearch() {
  const id = React.useId();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<AreaHit[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const seq = React.useRef(0);

  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits(null);
      setError(null);
      return;
    }
    const my = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/aspirasi/areas?q=${encodeURIComponent(term)}`);
        const data = (await res.json().catch(() => null)) as { items?: AreaHit[]; error?: string } | null;
        if (my !== seq.current) return;
        if (!res.ok) throw new Error(data?.error || "Gagal mencari desa.");
        setHits(data?.items ?? []);
      } catch (e) {
        if (my === seq.current) setError(e instanceof Error ? e.message : "Gagal mencari desa.");
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-medium text-gray-900">
        Cari desa
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-600" aria-hidden="true" />
        <input
          id={id}
          type="search"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={60}
          placeholder="Ketik nama desa, mis. Muara Badak Ulu"
          aria-describedby={`${id}-hint`}
          className="block min-h-12 w-full rounded-xl border border-gray-400 bg-white py-3 pl-12 pr-12 text-base text-gray-900 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0d9488]/30"
        />
        {loading ? <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-gray-600 motion-reduce:animate-none" aria-hidden="true" /> : null}
      </div>
      <p id={`${id}-hint`} className="mt-1 text-sm text-gray-700">
        Hanya desa yang sudah punya laporan tayang atau sudah dikelola pemerintah desanya yang muncul di sini.
      </p>
      <div role="status" aria-live="polite" className="mt-3">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {hits && hits.length === 0 && !loading && !error ? (
          <p className="rounded-xl border border-dashed border-gray-300 p-4 text-base text-gray-800">
            Belum ada halaman untuk desa itu. Anda bisa{" "}
            <Link href="/aspirasi/kirim" className="font-medium text-teal-800 underline underline-offset-2">
              menyampaikan aspirasi pertama
            </Link>
            .
          </p>
        ) : null}
      </div>
      {hits && hits.length > 0 ? (
        <ul className="mt-2 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200">
          {hits.map((h) => (
            <li key={h.slug}>
              <Link href={areaPath(h.slug)} className="flex min-h-14 items-start gap-3 bg-white px-4 py-3 transition hover:bg-teal-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-700">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-teal-800" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-gray-900">
                    {h.kind === "kelurahan" ? "Kelurahan" : "Desa"} {h.name}
                  </span>
                  <span className="block text-sm text-gray-700">
                    Kec. {h.district}, {h.regency}, {h.province} · {h.published} laporan{h.claimed ? " · dikelola pemerintah desa" : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
