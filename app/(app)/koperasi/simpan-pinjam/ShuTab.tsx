"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rupiah, SELECT_CLASS } from "./shared";
import { SearchSelect } from "@/components/ui/search-select";

interface ShuResult {
  year: number;
  total: string;
  distributed: string;
  undistributed: string;
  rows: { memberId: number; name: string; fromSavings: string; fromLoans: string; total: string }[];
}

export function ShuTab() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const [total, setTotal] = useState("");
  const [share, setShare] = useState("60");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShuResult | null>(null);

  async function calc(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/coop/shu?${new URLSearchParams({ year, total, savingsSharePercent: share })}`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setResult(null);
        setError(typeof j?.error === "string" ? j.error : "Gagal menghitung.");
      } else setResult(j as ShuResult);
    } catch {
      setError("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="max-w-prose text-sm text-muted-foreground">
        Kalkulator pembantu pembagian Sisa Hasil Usaha (SHU). Masukkan total SHU yang dibagikan kepada anggota sesuai keputusan Rapat Anggota Tahunan. Porsi jasa simpanan dibagi sebanding saldo simpanan akhir tahun; sisanya dibagi sebanding bunga pinjaman yang dibayar anggota tahun itu. Hasil tidak disimpan dan tidak mengganti keputusan RAT.
      </p>
      <form onSubmit={calc} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="shu-year">Tahun buku</Label>
          <SearchSelect id="shu-year" className={SELECT_CLASS} value={year} onChange={(e) => setYear(e.target.value)}>
            {Array.from({ length: 6 }, (_, k) => thisYear - k).map((y) => <option key={y} value={y}>{y}</option>)}
          </SearchSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shu-total">Total SHU untuk anggota *</Label>
          <CurrencyInput id="shu-total" inputClassName="h-11" value={total} onValueChange={setTotal} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shu-share">Porsi jasa simpanan (%)</Label>
          <Input id="shu-share" className="h-11" type="number" inputMode="decimal" min={0} max={100} value={share} onChange={(e) => setShare(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <Button type="submit" className="min-h-11" disabled={busy}>
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            Hitung
          </Button>
        </div>
      </form>
      {error ? <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      {result ? (
        <div className="space-y-3" aria-live="polite">
          <p className="text-sm">Terbagi {rupiah(result.distributed)} dari {rupiah(result.total)}. Tidak terbagi {rupiah(result.undistributed)} (pembulatan, atau porsi tanpa dasar pembagi seperti tak ada bunga pinjaman).</p>
          {result.rows.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada anggota yang berhak menerima pada tahun ini.</p> : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Pembagian SHU tahun {result.year}</caption>
                <thead className="bg-muted/50"><tr>{["Anggota", "Jasa simpanan", "Jasa pinjaman", "Total"].map((h) => <th key={h} scope="col" className="p-2 font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y tabular-nums">
                  {result.rows.map((r) => (
                    <tr key={r.memberId}>
                      <td className="p-2 font-sans font-medium">{r.name}</td>
                      <td className="p-2">{rupiah(r.fromSavings)}</td>
                      <td className="p-2">{rupiah(r.fromLoans)}</td>
                      <td className="p-2 font-semibold">{rupiah(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
