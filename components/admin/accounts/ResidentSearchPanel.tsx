"use client";

import { useEffect, useId, useState } from "react";
import { AlertCircle, Eye, EyeOff, Search, ShieldCheck, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StepUpDialog } from "@/components/admin/StepUpDialog";
import { VillageFilter } from "./VillageFilter";
import { apiJson, postAction, type ResidentRow, type VillageRef } from "./shared";

type Revealed = { nik: string; phone: string | null };
/** Data lengkap otomatis disembunyikan lagi setelah 60 detik. */
const REVEAL_TTL_MS = 60_000;

export function ResidentSearchPanel() {
  const hide = (id: number) => setRevealed((cur) => Object.fromEntries(Object.entries(cur).filter(([k]) => Number(k) !== id)));
  const [q, setQ] = useState("");
  const [village, setVillage] = useState<VillageRef | null>(null);
  const [rows, setRows] = useState<ResidentRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<number, Revealed>>({});
  const [target, setTarget] = useState<ResidentRow | null>(null);
  const qId = useId();
  const villageId = useId();

  // Pembukaan data lengkap hangus otomatis; buang juga saat komponen dilepas.
  useEffect(() => {
    const ids = Object.keys(revealed);
    if (ids.length === 0) return;
    const t = window.setTimeout(() => setRevealed({}), REVEAL_TTL_MS);
    return () => window.clearTimeout(t);
  }, [revealed]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRevealed({});
    const sp = new URLSearchParams({ q: q.trim() });
    if (village) sp.set("villageId", String(village.id));
    try {
      const d = await apiJson<{ residents: ResidentRow[] }>(`/api/admin/accounts/residents?${sp.toString()}`);
      setRows(d.residents);
    } catch (err) {
      setRows(null);
      setError(err instanceof Error ? err.message : "Gagal mencari warga.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={search} role="search" aria-label="Cari warga" className="grid gap-3 md:grid-cols-[2fr_1.5fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor={qId}>Nama warga atau NIK</Label>
              <Input id={qId} type="search" className="min-h-10" value={q} maxLength={100} placeholder="Awalan nama (min. 3 huruf) atau NIK 16 digit" onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={villageId}>Desa</Label>
              <VillageFilter id={villageId} value={village} onChange={setVillage} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="min-h-10 w-full" disabled={loading || q.trim().length < 3}>
                <Search aria-hidden="true" className="h-4 w-4" /> Cari
              </Button>
            </div>
          </form>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            Baca-saja. NIK hanya dicari dengan 16 digit lengkap. Hasil tersamar; membuka NIK dan telepon lengkap butuh konfirmasi sandi, alasan, dan tercatat di jejak audit (maks. 20 pembukaan per 10 menit).
          </p>
        </CardContent>
      </Card>

      <div aria-live="polite" role="status" className="text-sm text-muted-foreground tabular-nums">
        {loading ? "Mencari…" : rows ? `${rows.length} warga ditemukan${rows.length >= 25 ? " (dibatasi 25 teratas, persempit pencarian)" : ""}` : ""}
      </div>

      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      ) : null}

      {loading ? <div className="space-y-2" aria-busy="true"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div> : null}

      {rows && rows.length === 0 && !loading ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada warga yang cocok.</p>
      ) : null}

      {rows && rows.length > 0 && !loading ? (
        <>
          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Desa</TableHead>
                  <TableHead className="w-44 text-right"><span className="sr-only">Aksi</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const v = revealed[r.id];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[14rem]">
                        <div className="truncate font-medium">{r.name}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {!r.isAlive ? <Badge variant="secondary">Meninggal</Badge> : null}
                          {r.hasCitizenAccount ? <Badge variant="outline"><Smartphone aria-hidden="true" /> Punya akun mobile</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">{v ? v.nik : r.nikMasked}</TableCell>
                      <TableCell className="font-mono tabular-nums">{v ? v.phone || "-" : r.phoneMasked || "-"}</TableCell>
                      <TableCell className="max-w-[12rem]"><div className="truncate">{r.village.name}</div><div className="text-xs tabular-nums text-muted-foreground">{r.village.code}</div></TableCell>
                      <TableCell className="text-right">
                        {v ? (
                          <Button type="button" size="sm" variant="outline" className="min-h-10" onClick={() => hide(r.id)}>
                            <EyeOff aria-hidden="true" className="h-4 w-4" /> Sembunyikan
                          </Button>
                        ) : (
                          <Button type="button" size="sm" variant="outline" className="min-h-10" onClick={() => setTarget(r)}>
                            <Eye aria-hidden="true" className="h-4 w-4" /> Tampilkan data lengkap
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-2 md:hidden">
            {rows.map((r) => {
              const v = revealed[r.id];
              return (
                <li key={r.id} className="rounded-lg border bg-card p-3">
                  <div className="font-medium break-words">{r.name}</div>
                  <dl className="mt-1 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-0.5 text-sm">
                    <dt className="text-muted-foreground">NIK</dt>
                    <dd className="break-all font-mono tabular-nums">{v ? v.nik : r.nikMasked}</dd>
                    <dt className="text-muted-foreground">Telepon</dt>
                    <dd className="font-mono tabular-nums">{v ? v.phone || "-" : r.phoneMasked || "-"}</dd>
                    <dt className="text-muted-foreground">Desa</dt>
                    <dd>{r.village.name} ({r.village.code})</dd>
                  </dl>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {!r.isAlive ? <Badge variant="secondary">Meninggal</Badge> : null}
                    {r.hasCitizenAccount ? <Badge variant="outline"><Smartphone aria-hidden="true" /> Punya akun mobile</Badge> : null}
                  </div>
                  <Button type="button" size="sm" variant="outline" className="mt-2 min-h-10 w-full" onClick={() => (v ? hide(r.id) : setTarget(r))}>
                    {v ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                    {v ? "Sembunyikan" : "Tampilkan data lengkap"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {target ? (
        <StepUpDialog
          open
          onOpenChange={(v) => {
            if (!v) setTarget(null);
          }}
          title={`Tampilkan data lengkap ${target.name}`}
          description={<p>NIK dan nomor telepon lengkap akan tampil selama 60 detik. Pembukaan ini dicatat di jejak audit beserta alasan Anda (tanpa menyimpan NIK).</p>}
          confirmLabel="Tampilkan"
          onConfirm={async (v) => {
            const d = await postAction<{ resident: { id: number; nik: string; phone: string | null } }>(`/api/admin/accounts/residents/${target.id}/reveal`, { ...v });
            setRevealed((cur) => ({ ...cur, [target.id]: { nik: d.resident.nik, phone: d.resident.phone } }));
          }}
        />
      ) : null}
    </div>
  );
}
