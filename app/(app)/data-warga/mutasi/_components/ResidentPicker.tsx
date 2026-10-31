"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResidentPick } from "@/lib/kependudukan/mutasi-labels";

interface Row {
  id: number;
  name: string;
  nik: string;
  kk: string | null;
  rt: string | null;
  rw: string | null;
  isAlive: boolean;
  moveDate: string | null;
}

const toPick = (r: Row): ResidentPick => ({
  id: r.id,
  name: r.name,
  nikLast4: r.nik.slice(-4),
  kkLast4: r.kk ? r.kk.slice(-4) : null,
  rt: r.rt,
  rw: r.rw,
  status: !r.isAlive ? "meninggal" : r.moveDate ? "pindah" : "aktif",
});

const STATUS_TEXT = { aktif: "Aktif", meninggal: "Meninggal", pindah: "Sudah pindah" } as const;

/** Cari warga menurut nama atau NIK. Layar hanya menampilkan 4 digit terakhir NIK dan KK. */
export function ResidentPicker({ value, onChange, label }: { value: ResidentPick | null; onChange: (r: ResidentPick | null) => void; label: string }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setRows([]);
      setFailed(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      setFailed(false);
      try {
        const res = await fetch(`/api/residents?search=${encodeURIComponent(term)}&page=1&pageSize=8`, { signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) throw new Error("gagal");
        const j = await res.json();
        setRows((j.rows ?? []) as Row[]);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  if (value) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{value.name}</p>
            <p className="text-sm text-muted-foreground">
              NIK ••••{value.nikLast4}
              {value.kkLast4 ? ` · KK ••••${value.kkLast4}` : ""} · {STATUS_TEXT[value.status]}
            </p>
          </div>
          <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => onChange(null)}>
            <X aria-hidden="true" className="size-4" />
            Ganti
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} className="h-11 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketik nama atau NIK (minimal 3 huruf)" autoComplete="off" />
      </div>
      <div role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Mencari…
          </span>
        ) : failed ? (
          "Pencarian gagal. Coba lagi."
        ) : q.trim().length >= 3 && rows.length === 0 ? (
          "Tidak ada warga yang cocok."
        ) : null}
      </div>
      {rows.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {rows.map((r) => {
            const p = toPick(r);
            return (
              <li key={r.id}>
                <button type="button" className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none" onClick={() => onChange(p)}>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-muted-foreground">
                    NIK ••••{p.nikLast4}
                    {p.kkLast4 ? ` · KK ••••${p.kkLast4}` : ""}
                    {p.rt || p.rw ? ` · RT ${p.rt ?? "-"}/RW ${p.rw ?? "-"}` : ""} · {STATUS_TEXT[p.status]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
