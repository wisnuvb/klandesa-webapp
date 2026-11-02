"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPTY_FILTERS, type FilterState } from "./RequestFilters";
import { readApiError } from "./shared";

type NlResponse = { filters: Partial<Record<keyof FilterState, string>>; explanation: string; ignored: string[]; remainingCredits: number };

const EXAMPLES = ["SKTM yang menunggu RT lebih dari 3 hari", "permohonan ditolak bulan ini", "surat dari kiosk yang belum diputuskan"];

/** Pencarian bahasa alami: AI menerjemahkan kalimat menjadi filter yang sama dengan yang bisa dipasang manual. */
export function NlSearch({ onApply }: { onApply: (f: FilterState) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ text: string; ignored: string[] } | null>(null);

  async function run() {
    if (q.trim().length < 3) return;
    setBusy(true);
    setInfo(null);
    try {
      const res = await fetch("/api/mail-requests/nl-filter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
      if (!res.ok) {
        toast.error(await readApiError(res, "Pencarian cerdas gagal."));
        return;
      }
      const data = (await res.json()) as NlResponse;
      onApply({ ...EMPTY_FILTERS, ...(data.filters as Partial<FilterState>) });
      setInfo({ text: `${data.explanation || "Filter dipasang."} (sisa kredit AI: ${data.remainingCredits})`, ignored: data.ignored });
    } catch {
      toast.error("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void run(); }}>
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-600" aria-hidden />
          <Input
            aria-label="Cari dengan bahasa sehari-hari"
            className="bg-input-background pl-10"
            placeholder={`Tanya dengan kalimat biasa, mis. “${EXAMPLES[0]}”`}
            value={q}
            maxLength={200}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" className="gap-2" disabled={busy || q.trim().length < 3}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          Cari dengan AI <span className="text-xs opacity-70">· 1 kredit</span>
        </Button>
      </form>
      {info ? (
        <p className="text-sm text-muted-foreground" role="status">
          {info.text}
          {info.ignored.map((t) => <span key={t} className="block text-amber-800">{t}</span>)}
        </p>
      ) : null}
    </div>
  );
}
