"use client";

import { useState } from "react";
import { CheckCheck, CircleCheck, CircleX, Clock, Loader2, MessageSquareText, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import type { ActionCard } from "@/lib/ai/laras-actions";

type ItemState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done" }
  | { status: "skipped" }
  | { status: "error"; message: string };

type ConfirmResponse = {
  results: Array<{ ok: boolean; error?: string }>;
};

const isExpired = (a: ActionCard) => Date.parse(a.expiresAt) < Date.now();

/**
 * Usulan aksi dari Laras. Tidak ada yang dijalankan sampai perangkat desa menekan tombol; hasilnya tetap terlihat di kartu
 * (bukan toast yang hilang) dan diumumkan lewat live region untuk pembaca layar.
 */
export function LarasActionCards({ actions }: { actions: ActionCard[] }) {
  const [state, setState] = useState<Record<string, ItemState>>({});
  const get = (key: string): ItemState => state[key] ?? { status: "idle" };
  const patch = (keys: string[], s: ItemState) =>
    setState((prev) => ({ ...prev, ...Object.fromEntries(keys.map((k) => [k, s])) }));

  async function confirm(items: ActionCard[]) {
    const live = items.filter((a) => !isExpired(a));
    for (const a of items) {
      if (isExpired(a)) {
        patch([a.key], { status: "error", message: "Usulan kedaluwarsa. Minta Laras menyusun ulang." });
      }
    }
    if (live.length === 0) return;
    patch(live.map((a) => a.key), { status: "loading" });
    try {
      const res = await fetch("/api/ai/actions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: live.map((a) => a.token) }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<ConfirmResponse> & { error?: string };
      if (!res.ok || !data.results) throw new Error(data.error || "Gagal memproses. Coba lagi.");
      live.forEach((a, i) => {
        const r = data.results![i];
        patch([a.key], r?.ok ? { status: "done" } : { status: "error", message: r?.error || "Gagal memproses." });
      });
    } catch (e) {
      patch(live.map((a) => a.key), {
        status: "error",
        message: e instanceof Error ? e.message : "Gagal memproses. Coba lagi.",
      });
    }
  }

  // Konfirmasi massal hanya untuk usulan yang ditandai server `batchable` (berisiko rendah) dan tanpa peringatan.
  // Persetujuan/penolakan/penerbitan selalu ditinjau satu per satu.
  const batchable = actions.filter(
    (a) => a.batchable && a.warnings.length === 0 && !isExpired(a) && ["idle", "error"].includes(get(a.key).status),
  );
  const pendingCount = actions.filter((a) => ["idle", "error", "loading"].includes(get(a.key).status)).length;

  return (
    <section
      aria-label="Usulan Laras menunggu konfirmasi"
      className="mt-3 space-y-2 border-t pt-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {pendingCount > 0
            ? `${pendingCount} usulan menunggu konfirmasi Anda`
            : "Semua usulan sudah ditindaklanjuti"}
        </p>
        {batchable.length > 1 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-11 gap-1.5 sm:h-8"
            onClick={() => confirm(batchable)}
          >
            <CheckCheck className="h-4 w-4" aria-hidden />
            Konfirmasi {batchable.length} usulan berisiko rendah
          </Button>
        ) : null}
      </div>

      <ul className="space-y-2" aria-live="polite">
        {actions.map((a) => {
          const s = get(a.key);
          const Icon = a.icon === "x" ? CircleX : a.icon === "message" ? MessageSquareText : CircleCheck;
          const expired = s.status === "idle" && isExpired(a);
          const busy = s.status === "loading";
          const finished = s.status === "done" || s.status === "skipped";
          return (
            <li
              key={a.key}
              className={cn(
                "rounded-lg border bg-muted/30 p-3 text-sm",
                finished && "opacity-80",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge variant="outline" className="gap-1">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {a.badge}
                </Badge>
                <span className="font-medium">{a.heading}</span>
              </div>
              <p className="mt-1 break-words text-muted-foreground">
                {a.subheading}
              </p>

              {a.evidence ? (
                <p className="mt-2 break-words rounded-md border border-dashed px-2.5 py-1.5 text-sm text-muted-foreground">
                  <span className="text-xs">{a.evidenceLabel}</span>
                  {a.evidence}
                </p>
              ) : null}

              {a.note ? (
                <p className="mt-2 whitespace-pre-wrap break-words rounded-md bg-background px-2.5 py-1.5 text-sm">
                  <span className="text-xs text-muted-foreground">{a.noteLabel}</span>
                  {a.note}
                </p>
              ) : null}

              {a.warnings.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {a.warnings.map((w) => (
                    <li key={w} className="flex items-start gap-1.5 text-sm">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                      <span>
                        <span className="sr-only">Peringatan: </span>
                        {w}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3">
                {s.status === "done" ? (
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <CircleCheck className="h-4 w-4 text-green-600" aria-hidden />
                    {a.doneText}
                  </p>
                ) : s.status === "skipped" ? (
                  <p className="text-sm text-muted-foreground">Dilewati. Permohonan tetap menunggu.</p>
                ) : expired ? (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" aria-hidden />
                    Usulan kedaluwarsa. Minta Laras menyusun ulang.
                  </p>
                ) : (
                  <>
                    {s.status === "error" ? (
                      <p role="alert" className="mb-2 flex items-start gap-1.5 text-sm text-destructive">
                        <CircleX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        {s.message}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={a.tone === "destructive" ? "destructive" : "default"}
                        className="h-11 min-w-28 sm:h-9"
                        disabled={busy}
                        onClick={() => confirm([a])}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                        {busy ? "Memproses…" : s.status === "error" ? "Coba lagi" : a.confirmLabel}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-11 sm:h-9"
                        disabled={busy}
                        onClick={() => patch([a.key], { status: "skipped" })}
                      >
                        Lewati
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
