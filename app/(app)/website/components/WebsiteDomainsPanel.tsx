"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  Globe,
  RefreshCw,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type DomainDto = {
  id: number;
  hostname: string;
  type: "subdomain" | "custom";
  status: string;
  is_primary: boolean;
  verified_at?: string;
  ssl_status: string;
  created_at: string;
  last_error?: string;
};

function publicSiteUrl(hostname: string): string {
  if (typeof window === "undefined") return `https://${hostname}`;
  const host = hostname.toLowerCase();
  if (host.includes("localhost")) {
    const port = window.location.port;
    return port ? `http://${hostname}:${port}` : `http://${hostname}`;
  }
  return `https://${hostname}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Aktif";
    case "pending_verification":
      return "Menunggu verifikasi";
    case "error":
      return "Error";
    default:
      return status;
  }
}

export function WebsiteDomainsPanel({ villageCode }: { villageCode: string }) {
  const { appConfirm } = useAppDialogs();
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<DomainDto[]>([]);
  const [customHost, setCustomHost] = useState("");
  const [makePrimaryNew, setMakePrimaryNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastDnsHint, setLastDnsHint] = useState<unknown>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [primaryBusyId, setPrimaryBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/website/domains", { cache: "no-store" });
      const j = (await res.json().catch(() => null)) as {
        domains?: DomainDto[];
        error?: string;
      } | null;
      if (!res.ok) throw new Error(j?.error || "Gagal memuat domain");
      setDomains(Array.isArray(j?.domains) ? j.domains : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat domain");
      setDomains([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasSubdomain = useMemo(
    () => domains.some((d) => d.type === "subdomain"),
    [domains],
  );

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Disalin");
    } catch {
      toast.error("Gagal menyalin");
    }
  }, []);

  const addCustomDomain = async () => {
    const v = customHost.trim().toLowerCase();
    if (!v) {
      toast.error("Isi nama domain");
      return;
    }
    setSubmitting(true);
    setLastDnsHint(null);
    try {
      const res = await fetch("/api/website/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom",
          value: v,
          is_primary: makePrimaryNew,
        }),
      });
      const j = (await res.json().catch(() => null)) as {
        error?: string;
        instructions?: unknown;
        domain?: DomainDto;
      } | null;
      if (!res.ok) throw new Error(j?.error || "Gagal menambah domain");
      toast.success("Domain ditambahkan. Pasang DNS TXT lalu verifikasi.");
      setCustomHost("");
      setMakePrimaryNew(false);
      if (j?.instructions) setLastDnsHint(j.instructions);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah domain");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyDomain = async (id: number) => {
    setVerifyingId(id);
    try {
      const res = await fetch(`/api/website/domains/${id}/verify`, {
        method: "POST",
      });
      const j = (await res.json().catch(() => null)) as {
        error?: string;
        hint?: { type?: string; name?: string; value?: string };
      } | null;
      if (!res.ok) {
        if (j?.hint?.value && j?.hint?.name) {
          setLastDnsHint({
            verification: {
              type: j.hint.type,
              name: j.hint.name,
              value: j.hint.value,
              note: j.error,
            },
          });
        }
        throw new Error(j?.error || "Verifikasi gagal");
      }
      toast.success("Domain terverifikasi dan dijadikan utama.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verifikasi gagal");
      await load();
    } finally {
      setVerifyingId(null);
    }
  };

  const setPrimary = async (id: number) => {
    setPrimaryBusyId(id);
    try {
      const res = await fetch(`/api/website/domains/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_primary: true }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(j?.error || "Gagal mengatur domain utama");
      toast.success("Domain utama diperbarui.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengatur utama");
    } finally {
      setPrimaryBusyId(null);
    }
  };

  const removeDomain = async (d: DomainDto) => {
    const ok = await appConfirm({
      title: "Hapus domain?",
      description: `Hapus domain ${d.hostname} dari daftar? Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: "Hapus",
      tone: "destructive",
    });
    if (!ok) return;
    setDeletingId(d.id);
    try {
      const res = await fetch(`/api/website/domains/${d.id}`, {
        method: "DELETE",
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(j?.error || "Gagal menghapus");
      toast.success("Domain dihapus.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setDeletingId(null);
    }
  };

  const verificationBlock = useMemo(() => {
    if (!lastDnsHint || typeof lastDnsHint !== "object") return null;
    const h = lastDnsHint as Record<string, unknown>;
    const v = h.verification as Record<string, unknown> | undefined;
    if (!v) return null;
    const name = typeof v.name === "string" ? v.name : "";
    const value = typeof v.value === "string" ? v.value : "";
    const typ = typeof v.type === "string" ? v.type : "TXT";
    if (!name || !value) return null;
    return (
      <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
        <div className="font-medium">Catatan DNS (verifikasi kepemilikan)</div>
        <div className="grid gap-1 font-mono text-xs break-all">
          <div>
            <span className="text-muted-foreground">Tipe:</span> {typ}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground shrink-0">Nama:</span>
            <span className="min-w-0">{name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => void copyText(name)}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground shrink-0">Nilai:</span>
            <span className="min-w-0">{value}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => void copyText(value)}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
        </div>
        {typeof v.note === "string" ? (
          <p className="text-muted-foreground text-xs">{v.note}</p>
        ) : null}
      </div>
    );
  }, [lastDnsHint, copyText]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Domain & akses
          </CardTitle>
          <CardDescription>
            Kelola subdomain Klandesa dan custom domain. Setelah DNS siap, lakukan
            verifikasi untuk domain kustom.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Muat ulang
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {villageCode ? (
          <p className="text-sm text-muted-foreground">
            Preview lokal:{" "}
            <span className="font-mono text-foreground">
              {publicSiteUrl(`${villageCode.toLowerCase()}.localhost`)}
            </span>{" "}
            (pastikan kode desa cocok dengan subdomain terdaftar)
          </p>
        ) : null}

        {loading ? (
          <div className="text-sm text-muted-foreground">Memuat daftar domain…</div>
        ) : domains.length === 0 ? (
          <div className="text-sm text-muted-foreground rounded-lg border border-dashed p-6 text-center">
            Belum ada domain di sistem. Tambahkan custom domain di bawah, atau
            pastikan checkout website sudah menyelesaikan aktivasi subdomain.
          </div>
        ) : (
          <ul className="space-y-3">
            {domains.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium truncate">{d.hostname}</span>
                    {d.is_primary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs dark:bg-amber-900/40 dark:text-amber-100">
                        <Star className="size-3" />
                        Utama
                      </span>
                    ) : null}
                    <span className="text-xs rounded-md bg-muted px-2 py-0.5">
                      {d.type === "subdomain" ? "Subdomain" : "Custom"}
                    </span>
                    <span className="text-xs rounded-md bg-muted px-2 py-0.5">
                      {statusLabel(d.status)}
                    </span>
                  </div>
                  {d.last_error ? (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {d.last_error}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={publicSiteUrl(d.hostname)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="size-4" />
                      Buka
                    </a>
                  </Button>
                  {!d.is_primary ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setPrimary(d.id)}
                      disabled={primaryBusyId === d.id}
                    >
                      Jadikan utama
                    </Button>
                  ) : null}
                  {d.type === "custom" && d.status === "pending_verification" ? (
                    <Button
                      size="sm"
                      onClick={() => void verifyDomain(d.id)}
                      disabled={verifyingId === d.id}
                    >
                      <ShieldCheck className="size-4" />
                      {verifyingId === d.id ? "Memeriksa…" : "Verifikasi DNS"}
                    </Button>
                  ) : null}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void removeDomain(d)}
                    disabled={deletingId === d.id}
                  >
                    <Trash2 className="size-4" />
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-xl border p-4 space-y-3">
          <div className="font-medium text-sm">Tambah custom domain</div>
          <p className="text-xs text-muted-foreground">
            Contoh: desaku.go.id atau www.desaku.go.id. Anda akan mendapat catatan
            rekaman TXT untuk membuktikan kepemilikan domain.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="contoh.go.id"
                value={customHost}
                onChange={(e) => setCustomHost(e.target.value)}
                disabled={submitting}
              />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={makePrimaryNew}
                  onChange={(e) => setMakePrimaryNew(e.target.checked)}
                  disabled={submitting}
                />
                Jadikan domain utama setelah aktif
              </label>
            </div>
            <Button
              type="button"
              onClick={() => void addCustomDomain()}
              disabled={submitting}
            >
              {submitting ? "Menyimpan…" : "Tambah"}
            </Button>
          </div>
          {verificationBlock}
        </div>

        {!hasSubdomain ? (
          <p className="text-xs text-muted-foreground">
            Belum ada subdomain Klandesa di daftar. Subdomain biasanya dibuat saat
            aktivasi langganan website; jika perlu bantuan, hubungi pusat bantuan.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
