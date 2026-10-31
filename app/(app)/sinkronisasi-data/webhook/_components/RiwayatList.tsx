"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Loader2, RotateCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import type { DeliveryItem } from "./types";

const fmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const when = (iso: string) => fmt.format(new Date(iso));

const STATUS = {
  SUCCESS: { label: "Terkirim", Icon: CheckCircle2, cls: "text-emerald-800 dark:text-emerald-300" },
  PENDING: { label: "Menunggu kirim ulang", Icon: Clock, cls: "text-amber-800 dark:text-amber-300" },
  DEAD: { label: "Gagal, berhenti dicoba", Icon: XCircle, cls: "text-red-800 dark:text-red-300" },
} as const;

export function RiwayatList({ endpointId, eventLabel, active }: { endpointId: number; eventLabel: (id: string) => string; active: boolean }) {
  const list = useApiGet<{ retentionDays: number; items: DeliveryItem[] }>(`/api/developer/webhooks/${endpointId}/deliveries?limit=30`);
  const [retrying, setRetrying] = useState<string | null>(null);

  async function retry(id: string) {
    setRetrying(id);
    try {
      const res = await fetch(`/api/developer/webhooks/${endpointId}/deliveries/${id}`, { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof j?.error === "string" ? j.error : "Gagal mengirim ulang.");
      toast.success("Dijadwalkan kirim ulang. Hasilnya muncul dalam semenit.");
      list.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim ulang.");
    } finally {
      setRetrying(null);
    }
  }

  if (list.loading)
    return (
      <p role="status" className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Memuat riwayat…
      </p>
    );
  if (list.error)
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
        <span>{list.error}</span>
        <Button type="button" variant="outline" className="min-h-11" onClick={list.reload}>
          Coba lagi
        </Button>
      </div>
    );
  if (!list.data || list.data.items.length === 0) return <p className="py-2 text-sm text-muted-foreground">Belum ada pengiriman. Tekan &quot;Kirim uji&quot; untuk mencoba.</p>;

  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-md border">
        {list.data.items.map((d) => {
          const st = STATUS[d.status];
          return (
            <li key={d.id} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
              <div className="space-y-0.5">
                <p className="font-medium">{d.eventType === "webhook.tes" ? "Kejadian uji" : eventLabel(d.eventType)}</p>
                <p className={`flex items-center gap-1.5 ${st.cls}`}>
                  <st.Icon aria-hidden="true" className="size-4" />
                  {st.label}
                  {d.lastStatusCode ? ` (kode ${d.lastStatusCode})` : ""}
                </p>
                <p className="text-muted-foreground">
                  {when(d.createdAt)} · {d.attempts} percobaan
                  {d.status === "PENDING" && d.nextAttemptAt ? ` · berikutnya ${when(d.nextAttemptAt)}` : ""}
                </p>
                {d.lastError ? <p className="text-muted-foreground">{d.lastError}</p> : null}
              </div>
              {d.status === "DEAD" && active ? (
                <Button type="button" variant="outline" className="min-h-11" disabled={retrying === d.id} onClick={() => void retry(d.id)}>
                  {retrying === d.id ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RotateCw aria-hidden="true" />}
                  Kirim ulang
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">Riwayat disimpan {list.data.retentionDays} hari.</p>
    </div>
  );
}
