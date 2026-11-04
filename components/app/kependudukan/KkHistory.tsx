"use client";

import { useState } from "react";
import { ChevronDown, History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MUTATION_LABEL, type MutationType } from "@/lib/kependudukan/mutation";
import { MUTASI_TYPES, STATUS_META, formatTanggal, type MutasiStatus } from "@/lib/kependudukan/mutasi-labels";

interface HistoryItem {
  id: string;
  type: string;
  status: string;
  effectiveDate: string;
  residentName: string | null;
}
interface HistoryResponse {
  enabled: boolean;
  items: HistoryItem[];
}

const isMutType = (t: string): t is MutationType => (MUTASI_TYPES as readonly string[]).includes(t);
const isStatus = (s: string): s is MutasiStatus => s in STATUS_META;

/** Riwayat Buku Mutasi satu KK, dimuat hanya saat dibuka (modal detail tidak menanggung biayanya bila tak dibuka). */
export function KkHistory({ refId }: { refId: number }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: HistoryResponse | null }>({ loading: false, error: null, data: null });

  async function load() {
    setState({ loading: true, error: null, data: null });
    try {
      const res = await fetch(`/api/kk/${refId}/riwayat`);
      if (!res.ok) throw new Error();
      setState({ loading: false, error: null, data: (await res.json()) as HistoryResponse });
    } catch {
      setState({ loading: false, error: "Riwayat tidak bisa dimuat. Coba lagi.", data: null });
    }
  }

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !state.data && !state.loading) void load();
  };

  const panelId = `kk-history-${refId}`;
  return (
    <div>
      <Button type="button" variant="outline" className="min-h-11 gap-2" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
        <History aria-hidden="true" className="h-4 w-4" />
        Riwayat mutasi KK
        <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      <div id={panelId} hidden={!open} className="mt-3" aria-live="polite">
        {state.loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Memuat riwayat…
          </p>
        ) : state.error ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-destructive">{state.error}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              Coba lagi
            </Button>
          </div>
        ) : state.data && state.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {state.data.enabled ? "Belum ada kejadian tercatat untuk KK ini di Buku Mutasi." : "Buku Mutasi belum diaktifkan di desa ini, jadi belum ada riwayat yang tercatat."}
          </p>
        ) : state.data ? (
          <ol className="space-y-2">
            {state.data.items.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border p-3 text-sm">
                <span className="tabular-nums text-muted-foreground">{formatTanggal(m.effectiveDate)}</span>
                <span className="font-medium">{isMutType(m.type) ? MUTATION_LABEL[m.type] : m.type}</span>
                <span>{m.residentName ?? "-"}</span>
                <Badge variant="outline" className="ml-auto" title={isStatus(m.status) ? STATUS_META[m.status].hint : undefined}>
                  {isStatus(m.status) ? STATUS_META[m.status].label : m.status}
                </Badge>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
