"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type {
  ResolvedEngineStructure,
  WebsiteThemeTokens,
} from "@/lib/website-engine/types";
import { CmsLivePreviewCard } from "./CmsLivePreviewCard";

const SUGGESTIONS = [
  "Buat tampilan lebih modern dan segar",
  "Tambahkan bagian pertanyaan umum (FAQ)",
  "Fokuskan beranda ke berita desa",
  "Buat warna lebih hijau dan alami",
  "Rapikan urutan bagian beranda",
];

type Proposal = {
  summary: string;
  changes: string[];
  skipped: string[];
  theme: Partial<WebsiteThemeTokens>;
  overrides: ResolvedEngineStructure;
};

type Props = {
  templateKey: string;
  baseTheme: WebsiteThemeTokens;
  hideSiteHeader: boolean;
  village: {
    name: string;
    address: string;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    logoUrl?: string | null;
  } | null;
  /** Ada isian yang belum disimpan: AI bekerja dari versi tersimpan, jadi simpan dulu */
  blockedReason: string | null;
  onApplied: () => void | Promise<void>;
};

export function CmsAiAssistant({ templateKey, baseTheme, hideSiteHeader, village, blockedReason, onApplied }: Props) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [cost, setCost] = useState<{ cost: number; remaining: number | null } | null>(null);

  const reset = () => {
    setProposal(null);
    setError(null);
    setCost(null);
  };

  const ask = async () => {
    setBusy(true);
    setError(null);
    setProposal(null);
    try {
      const res = await fetch("/api/website/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; proposal?: Proposal; creditCost?: number; remainingCredits?: number | null }
        | null;
      if (!res.ok || !json?.proposal) throw new Error(json?.error || "Gagal meminta usulan AI");
      setProposal(json.proposal);
      setCost({ cost: json.creditCost ?? 0, remaining: json.remainingCredits ?? null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!proposal) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/website/engine/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrides: proposal.overrides,
          ...(Object.keys(proposal.theme).length ? { theme: proposal.theme } : {}),
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || "Gagal menerapkan usulan");
      toast.success("Usulan AI masuk ke draf. Periksa lalu tekan Terbitkan.");
      setOpen(false);
      reset();
      setRequest("");
      await onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setApplying(false);
    }
  };

  const home = proposal?.overrides.pages.find((p) => p.slug === "") ?? proposal?.overrides.pages[0];

  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 text-violet-600" aria-hidden />
            <div>
              <div className="text-sm font-medium">Minta AI memperbaiki tampilan</div>
              <p className="text-muted-foreground text-xs">
                Ceritakan yang Anda inginkan dengan kata-kata biasa. Hasilnya masuk ke draf dan tidak mengubah website
                sebelum Anda menerbitkannya.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" disabled={Boolean(blockedReason)} onClick={() => setOpen(true)}>
            <Sparkles className="size-4" />
            Minta AI
          </Button>
          {blockedReason ? <p className="text-xs text-amber-700 basis-full">{blockedReason}</p> : null}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (busy || applying) return;
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Minta AI memperbaiki tampilan</DialogTitle>
            <DialogDescription>
              AI hanya mengatur warna, huruf, dan susunan bagian. Anda bisa melihat hasilnya dulu sebelum menerapkan.
            </DialogDescription>
          </DialogHeader>

          {!proposal ? (
            <div className="space-y-3">
              <label htmlFor="ai-request" className="text-sm font-medium">
                Apa yang ingin diperbaiki?
              </label>
              <Textarea
                id="ai-request"
                rows={4}
                maxLength={600}
                value={request}
                disabled={busy}
                placeholder="Contoh: buat lebih modern, tambahkan bagian pertanyaan umum, dan ganti warna jadi hijau"
                onChange={(e) => setRequest(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy}
                    onClick={() => setRequest(s)}
                    className="min-h-9 rounded-full border px-3 text-xs transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Memakai 5 kredit AI per permintaan. Kredit dikembalikan otomatis bila AI gagal atau tidak menghasilkan usulan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-violet-50 p-3">
                <div className="text-sm font-medium">{proposal.summary}</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {proposal.changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
                {proposal.skipped.length ? (
                  <details className="mt-2 text-xs text-muted-foreground">
                    <summary className="cursor-pointer">{proposal.skipped.length} usulan dilewati</summary>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {proposal.skipped.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
              <div className="max-h-[45vh] overflow-y-auto rounded-lg">
                <CmsLivePreviewCard
                  templateKey={templateKey}
                  theme={{ ...baseTheme, ...proposal.theme }}
                  hideSiteHeader={hideSiteHeader}
                  navItems={proposal.overrides.nav}
                  page={home}
                  village={village}
                />
              </div>
              {cost ? (
                <p className="text-muted-foreground text-xs">
                  {cost.cost > 0 ? `${cost.cost} kredit terpakai.` : "Tanpa biaya kredit."}
                  {cost.remaining !== null ? ` Sisa ${cost.remaining.toLocaleString("id-ID")} kredit.` : ""}
                </p>
              ) : null}
            </div>
          )}

          {error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            {proposal ? (
              <>
                <Button type="button" variant="outline" disabled={applying} onClick={reset}>
                  Coba permintaan lain
                </Button>
                <Button type="button" disabled={applying} onClick={() => void apply()}>
                  {applying ? <Loader2 className="size-4 animate-spin" /> : null}
                  Terapkan ke draf
                </Button>
              </>
            ) : (
              <Button type="button" disabled={busy || request.trim().length < 5} onClick={() => void ask()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {busy ? "AI sedang bekerja…" : "Buat usulan"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
