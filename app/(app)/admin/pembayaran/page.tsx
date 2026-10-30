"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, FlaskConical, Lock, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Channel = {
  code: string;
  label: string;
  method: "qris" | "ewallet" | "va";
  enabled: boolean;
  note: string | null;
  envLocked: boolean;
  runtimeReason: string | null;
  available: boolean;
  lastError: string | null;
  lastErrorAt: string | null;
  lastProbe: { ok: boolean | null; at: string; message: string | null } | null;
  updatedAt: string | null;
  updatedByName: string | null;
};

type Overview = { mode: "sandbox" | "production" | "unconfigured"; host: string | null; channels: Channel[] };
type ProbeResponse = {
  mode: string;
  results: Array<{ code: string; label: string; kind: "ok" | "rejected" | "error"; message: string }>;
  disabled: string[];
};

const GROUPS: Array<{ method: Channel["method"]; title: string }> = [
  { method: "qris", title: "QRIS" },
  { method: "ewallet", title: "E-Wallet" },
  { method: "va", title: "Virtual Account" },
];

const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const fmt = (iso: string) => dateTime.format(new Date(iso));

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string; needsConfirmation?: boolean } }> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; needsConfirmation?: boolean };
  return { ok: res.ok, status: res.status, data };
}

function StatusBadge({ c }: { c: Channel }) {
  if (c.envLocked) {
    return (
      <Badge variant="outline" className="gap-1">
        <Lock className="size-3" aria-hidden="true" />
        Dikunci di server
      </Badge>
    );
  }
  if (!c.enabled) return <Badge variant="destructive">Dinonaktifkan</Badge>;
  if (c.runtimeReason) return <Badge variant="secondary">Baru ditolak LinkQu (sementara)</Badge>;
  return <Badge>Aktif</Badge>;
}

export default function AdminPaymentChannelsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [probing, setProbing] = useState<string | "all" | null>(null);

  const [disableTarget, setDisableTarget] = useState<Channel | null>(null);
  const [reason, setReason] = useState("");
  const [probeConfirm, setProbeConfirm] = useState<{ codes?: string[] } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await api<Overview>("/api/admin/payment-channels");
      if (!r.ok) throw new Error(r.data.error || "Gagal memuat kanal pembayaran");
      setData(r.data);
    } catch (e) {
      setError(e instanceof TypeError ? "Tidak bisa terhubung ke server." : e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(
    () => GROUPS.map((g) => ({ ...g, items: (data?.channels ?? []).filter((c) => c.method === g.method) })),
    [data],
  );

  const setEnabled = async (c: Channel, enabled: boolean, note?: string) => {
    setBusyCode(c.code);
    try {
      const r = await api<{ ok: boolean }>("/api/admin/payment-channels", {
        method: "PATCH",
        body: JSON.stringify({ code: c.code, enabled, note }),
      });
      if (!r.ok) throw new Error(r.data.error || "Gagal menyimpan");
      toast.success(enabled ? `${c.label} diaktifkan` : `${c.label} dinonaktifkan`, {
        description: "Berlaku untuk semua desa dalam beberapa detik.",
      });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusyCode(null);
    }
  };

  const runProbe = async (codes: string[] | undefined, confirmProduction = false) => {
    setProbing(codes?.length === 1 ? codes[0] : "all");
    try {
      const r = await api<ProbeResponse>("/api/admin/payment-channels/probe", {
        method: "POST",
        body: JSON.stringify({ codes, confirmProduction }),
      });
      if (r.status === 409 && r.data.needsConfirmation) {
        setProbeConfirm({ codes });
        return;
      }
      if (!r.ok) throw new Error(r.data.error || "Uji kanal gagal");
      const ok = r.data.results.filter((x) => x.kind === "ok").length;
      const rejected = r.data.results.filter((x) => x.kind === "rejected");
      const errors = r.data.results.filter((x) => x.kind === "error").length;
      toast.success(`Uji selesai: ${ok} diterima, ${rejected.length} ditolak${errors ? `, ${errors} tidak bisa disimpulkan` : ""}`, {
        description: rejected.length
          ? `Dinonaktifkan otomatis: ${rejected.map((x) => x.label).join(", ")}`
          : "Tidak ada kanal yang perlu dinonaktifkan.",
      });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uji kanal gagal");
    } finally {
      setProbing(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Kanal Pembayaran</h1>
          <p className="text-sm text-muted-foreground">
            Matikan kanal LinkQu yang bermasalah atau belum aktif di akun merchant. Perubahan berlaku untuk semua desa dan
            pengguna tidak lagi bisa memilihnya.
          </p>
        </div>
        <Button onClick={() => setProbeConfirm({})} disabled={probing != null || !data || data.mode === "unconfigured"}>
          {probing === "all" ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <FlaskConical className="size-4" aria-hidden="true" />
          )}
          {probing === "all" ? "Menguji…" : "Uji semua kanal"}
        </Button>
      </div>

      {data && (
        <div
          role="status"
          className={`flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            data.mode === "production" ? "border-amber-200 bg-amber-50 text-amber-900" : "bg-muted/40"
          }`}
        >
          {data.mode === "production" && <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />}
          <span>
            Terhubung ke LinkQu <strong>{data.mode === "production" ? "PRODUKSI" : data.mode === "sandbox" ? "sandbox" : "(belum dikonfigurasi)"}</strong>
            {data.host ? ` · ${data.host}` : ""}.
          </span>
          {data.mode === "sandbox" && (
            <span className="text-muted-foreground">Hasil uji di sandbox bisa berbeda dengan produksi.</span>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Coba lagi
          </Button>
        </div>
      )}

      {loading && !data && (
        <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Memuat kanal…
        </p>
      )}

      {grouped.map((g) =>
        g.items.length === 0 ? null : (
          <Card key={g.method}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{g.title}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {g.items.map((c) => {
                const busy = busyCode === c.code;
                return (
                  <div key={c.code} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{c.label}</span>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{c.code}</code>
                        <StatusBadge c={c} />
                      </div>

                      {c.envLocked && (
                        <p className="text-xs text-muted-foreground">
                          Ditutup lewat <code>LINKQU_DISABLED_CHANNELS</code> di server; tidak bisa dibuka dari sini.
                        </p>
                      )}
                      {!c.enabled && c.note && (
                        <p className="text-xs text-muted-foreground">
                          Alasan: {c.note}
                          {c.updatedByName && c.updatedAt ? ` — ${c.updatedByName}, ${fmt(c.updatedAt)}` : ""}
                        </p>
                      )}
                      {c.lastError && c.lastErrorAt && (
                        <p className="text-xs text-amber-800">
                          Ditolak LinkQu saat checkout ({fmt(c.lastErrorAt)}): {c.lastError}
                        </p>
                      )}
                      {c.lastProbe && (
                        <p className={`text-xs ${c.lastProbe.ok === false ? "text-red-700" : "text-muted-foreground"}`}>
                          Uji {fmt(c.lastProbe.at)}: {c.lastProbe.message ?? (c.lastProbe.ok ? "Diterima" : "-")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={probing != null || data?.mode === "unconfigured"}
                        onClick={() => setProbeConfirm({ codes: [c.code] })}
                        aria-label={`Uji kanal ${c.label}`}
                      >
                        {probing === c.code ? (
                          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        ) : (
                          "Uji"
                        )}
                      </Button>
                      <Switch
                        checked={c.enabled && !c.envLocked}
                        disabled={c.envLocked || busy}
                        aria-label={`${c.enabled ? "Nonaktifkan" : "Aktifkan"} ${c.label}`}
                        onCheckedChange={(next) => {
                          if (next) void setEnabled(c, true);
                          else {
                            setReason("");
                            setDisableTarget(c);
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ),
      )}

      <p className="text-xs text-muted-foreground">
        Selain pengaturan di sini, kanal yang ditolak LinkQu saat checkout disembunyikan otomatis sekitar 10 menit, dan
        nominal di luar batas kanal (mis. e-wallet maksimum Rp 2.500.000) otomatis dinonaktifkan di dialog pembayaran.
      </p>

      {/* Alasan menonaktifkan */}
      <Dialog open={disableTarget != null} onOpenChange={(open) => !open && setDisableTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nonaktifkan {disableTarget?.label}?</DialogTitle>
            <DialogDescription>
              Pengguna tidak akan bisa memilih kanal ini sampai Anda mengaktifkannya lagi. Tagihan yang sudah dibuat tetap bisa dibayar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="channel-reason">Alasan (opsional, hanya untuk catatan internal)</Label>
            <Textarea
              id="channel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={250}
              placeholder="mis. Belum diaktifkan di dashboard LinkQu"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const target = disableTarget;
                setDisableTarget(null);
                if (target) void setEnabled(target, false, reason);
              }}
            >
              Nonaktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi uji kanal */}
      <AlertDialog open={probeConfirm != null} onOpenChange={(open) => !open && setProbeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {probeConfirm?.codes?.length === 1 ? "Uji kanal ini ke LinkQu?" : "Uji semua kanal ke LinkQu?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sistem membuat satu tagihan uji kecil (Rp 20.000) per kanal. Tagihan ini tidak dibayar dan kedaluwarsa sendiri.
              {data?.mode === "production" && (
                <strong className="mt-2 block text-amber-800">
                  Server ini terhubung ke LinkQu PRODUKSI, jadi tagihan ujinya tercatat sungguhan di akun merchant.
                </strong>
              )}{" "}
              Kanal yang <strong>ditolak</strong> LinkQu akan otomatis dinonaktifkan; kanal yang diterima tidak diubah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const codes = probeConfirm?.codes;
                setProbeConfirm(null);
                void runProbe(codes, data?.mode === "production");
              }}
            >
              Mulai uji
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
