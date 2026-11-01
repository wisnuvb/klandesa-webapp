"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Baby, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiGet } from "@/hooks/useApiGet";
import { HAZ_LABEL, WAZ_LABEL, WHZ_LABEL } from "@/lib/gizi/zscore";
import type { GiziReport, GiziRow } from "@/lib/gizi/report";

const FILTERS = [
  { id: "all", label: "Semua" },
  { id: "stunted", label: "Pendek (stunting)" },
  { id: "wasted", label: "Gizi kurang/buruk" },
  { id: "underweight", label: "Berat badan kurang" },
  { id: "mismatch", label: "Perlu ditinjau" },
  { id: "incomplete", label: "Data belum lengkap" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

const match = (r: GiziRow, f: FilterId): boolean => {
  const a = r.assessment;
  switch (f) {
    case "stunted": return a?.stunted === true;
    case "wasted": return a?.whzCategory === "GIZI_BURUK" || a?.whzCategory === "GIZI_KURANG";
    case "underweight": return a?.wazCategory === "BB_KURANG" || a?.wazCategory === "BB_SANGAT_KURANG";
    case "mismatch": return r.mismatch || (a?.implausible.length ?? 0) > 0;
    case "incomplete": return a === null;
    default: return true;
  }
};

const z = (v: number | null) => (v === null ? "-" : `${v > 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}`);
const bad = (c: string | null) => c === "SANGAT_PENDEK" || c === "PENDEK" || c === "BB_SANGAT_KURANG" || c === "BB_KURANG" || c === "GIZI_BURUK" || c === "GIZI_KURANG";

export function GiziView() {
  const { data, loading, error, reload } = useApiGet<GiziReport>("/api/pkk/gizi");
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");
  const rows = useMemo(() => (data ? data.rows.filter((r) => match(r, filter) && (!search || r.name.toLowerCase().includes(search.toLowerCase()))) : []), [data, filter, search]);
  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/pkk">
            <ArrowLeft aria-hidden="true" />
            Kembali ke PKK
          </Link>
        </Button>
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Baby aria-hidden="true" className="size-6" />
            Status Gizi Balita
          </h1>
          <p className="max-w-prose text-muted-foreground">
            Dihitung otomatis dari pengukuran posyandu terakhir tiap anak (0–60 bulan) dengan standar pertumbuhan WHO yang menjadi dasar Permenkes 2/2020. Ini alat bantu skrining untuk kader dan bidan, bukan diagnosis.
          </p>
        </header>
      </div>

      {s ? (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Balita terukur" value={s.children} />
          <Stat label="Pendek (stunting)" value={s.stunted} warn={s.stunted > 0} />
          <Stat label="Gizi kurang/buruk" value={s.wasted} warn={s.wasted > 0} />
          <Stat label="Berat badan kurang" value={s.underweight} warn={s.underweight > 0} />
        </dl>
      ) : null}

      {s && s.mismatch > 0 ? (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{s.mismatch} anak punya tanda stunting di sistem yang berbeda dari hitungan WHO. Minta bidan memeriksa ulang pengukuran, lalu perbarui tanda di data kunjungan posyandu.</p>
        </div>
      ) : null}

      <section aria-label="Penyaring" className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Kelompok">
          {FILTERS.map((f) => (
            <Button key={f.id} type="button" variant={filter === f.id ? "default" : "outline"} aria-pressed={filter === f.id} className="min-h-11" onClick={() => setFilter(f.id)}>
              {f.label}
            </Button>
          ))}
        </div>
        <div className="relative max-w-sm">
          <label htmlFor="gz-cari" className="sr-only">Cari nama anak</label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <Input id="gz-cari" className="h-11 pl-9" value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama anak" />
        </div>
      </section>

      {loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Menghitung…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}

      {data && rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">{data.rows.length === 0 ? "Belum ada pengukuran balita di posyandu." : "Tidak ada anak yang cocok."}</p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.slice(0, 200).map((r) => {
            const a = r.assessment;
            return (
              <li key={r.visitId} className="rounded-lg border bg-card p-4 text-card-foreground">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="break-words font-semibold">
                      {r.name}
                      <span className="font-normal text-muted-foreground"> · RT {r.rt ?? "-"}/RW {r.rw ?? "-"}</span>
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {a ? `${a.ageMonths.toString().replace(".", ",")} bulan` : ""} · diukur {r.measuredOn} · BB {r.weightKg ?? "-"} kg · {a && a.ageMonths < 24 ? "PB" : "TB"} {r.heightCm ?? "-"} cm
                    </p>
                  </div>
                  {r.mismatch ? <span className="rounded border border-amber-400 bg-amber-50 px-2 py-0.5 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50">Tanda sistem: {r.flaggedStunting ? "stunting" : "tidak stunting"}</span> : null}
                </div>
                {a ? (
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <Index label="TB/U atau PB/U" z={a.haz} text={a.hazCategory ? HAZ_LABEL[a.hazCategory] : null} bad={bad(a.hazCategory)} />
                    <Index label="BB/U" z={a.waz} text={a.wazCategory ? WAZ_LABEL[a.wazCategory] : null} bad={bad(a.wazCategory)} />
                    <Index label="BB/TB atau BB/PB" z={a.whz} text={a.whzCategory ? WHZ_LABEL[a.whzCategory] : null} bad={bad(a.whzCategory)} />
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">{r.reason}</p>
                )}
                {a && a.implausible.length > 0 ? (
                  <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm font-medium text-destructive">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    {a.implausible.join(". ")}. Periksa ulang pengukuran atau pencatatannya.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {rows.length > 200 ? <p className="text-sm text-muted-foreground">Menampilkan 200 anak pertama; persempit dengan penyaring atau pencarian.</p> : null}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${warn ? "border-destructive/60" : ""}`}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Index({ label, z: zv, text, bad: isBad }: { label: string; z: number | null; text: string | null; bad: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${isBad ? "border-destructive/60" : ""}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{text ?? "Belum bisa dihitung"}</dd>
      <dd className="text-xs tabular-nums text-muted-foreground">z = {z(zv)}</dd>
    </div>
  );
}
