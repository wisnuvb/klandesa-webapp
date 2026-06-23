"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { Copy, Link2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hasPartnerPortalAccess } from "@/lib/partner-session";

type ReferralRow = {
  id: number;
  code: string;
  label: string;
  ownerName: string | null;
  ownerEmail: string | null;
  commission: string | null;
  status: string;
  landingPath: string;
  createdAt: string;
  eventCount: number;
  publicSlug: string | null;
  shareUrl: string | null;
};

type Summary = {
  totalEvents: number;
  registerSubmit: number;
  contactSubmit: number;
  whatsappClick: number;
  pageView: number;
};

type Ev = {
  id: bigint | string | number;
  codeSnapshot: string | null;
  action: string;
  sourcePath: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  villageName: string | null;
  subject: string | null;
  createdAt: string;
};

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    page_view: "Kunjungan",
    register_open: "Buka daftar",
    register_submit: "Daftar berhasil",
    contact_open: "Buka CS",
    contact_submit: "Kirim kontak",
    whatsapp_click: "Klik WhatsApp",
  };
  return labels[action] || action;
}

function baseUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function buildShareLink(code: ReferralRow | null): string {
  if (!code) return "";
  if (code.shareUrl) return code.shareUrl;
  const slug = code.publicSlug || code.code.toLowerCase();
  return `${baseUrl()}/m/${encodeURIComponent(slug)}`;
}

function formatDt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default function MitraReferralPage() {
  const { data: session } = useSession();
  const portalOk = hasPartnerPortalAccess(session as Session | null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [codeRow, setCodeRow] = useState<ReferralRow | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/partner/referral", {
        cache: "no-store",
        signal,
      });
      const data = (await res.json().catch(() => null)) as {
        referralCode?: ReferralRow | null;
        summary?: Summary;
        recentEvents?: Ev[];
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal memuat referral");
      setCodeRow(data?.referralCode ?? null);
      setSummary(data?.summary ?? null);
      setEvents(data?.recentEvents ?? []);
    } catch (e) {
      const name =
        e && typeof e === "object" && "name" in e
          ? String((e as { name?: unknown }).name || "")
          : "";
      if (name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Gagal memuat referral");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => {
      c.abort();
    };
  }, [load]);

  const copyLink = async () => {
    const link = buildShareLink(codeRow);
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setOk(`Disalin: ${link}`);
  };

  if (!portalOk) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Tidak tersedia</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Hanya pemilik dengan kode referral yang tertaut ke mitra Anda yang bisa melihat halaman ini.
          </CardContent>
        </Card>
      </div>
    );
  }

  const shareLink = buildShareLink(codeRow);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
            <Link href="/mitra">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <h1 className="text-xl md:text-2xl font-semibold">Kode referral</h1>
          <p className="text-sm text-muted-foreground">
            Statistik kampanye Anda dan tautan halaman publik bagi calon pelanggan.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading || !shareLink}
          onClick={() => void load()}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Memuat…</div>
      ) : !codeRow ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Belum ada kode</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Kontak administrator Klandesa untuk membuat atau menautkan kode referral ke akun mitra Anda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Kunjungan
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">
                {summary?.pageView ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Daftar
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">
                {summary?.registerSubmit ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Kontak
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">
                {summary?.contactSubmit ?? 0}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">
                {summary?.whatsappClick ?? 0}
              </CardContent>
            </Card>
            <Card className="col-span-2 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total event
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">
                {summary?.totalEvents ?? codeRow.eventCount}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{codeRow.label}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono font-semibold text-foreground">
                  {codeRow.code}
                </span>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                  {codeRow.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm break-all font-mono bg-muted rounded-md px-3 py-2">
                {shareLink}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void copyLink()}>
                  <Copy className="w-4 h-4 mr-2" />
                  Salin link
                </Button>
                <Button asChild variant="outline">
                  <a href={shareLink} target="_blank" rel="noreferrer">
                    <Link2 className="w-4 h-4 mr-2" />
                    Uji tautan
                  </a>
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Komisi (catatan UI):{" "}
                <span>{codeRow.commission || "Sesuai aturan bagi hasil"}</span>
              </div>
            </CardContent>
          </Card>

          {ok ? (
            <div className="text-sm text-green-700" role="status">
              {ok}
            </div>
          ) : null}
          {error ? (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event terbaru</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Belum ada event tercatat.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-border">
                        <th className="py-2 pr-3 font-medium">Waktu</th>
                        <th className="py-2 pr-3 font-medium">Aksi</th>
                        <th className="py-2 pr-3 font-medium">Kontak</th>
                        <th className="py-2 pr-3 font-medium">Desa/Subjek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e, idx) => (
                        <tr
                          key={`${String(e.id)}-${idx}`}
                          className="border-b border-border align-top"
                        >
                          <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                            {formatDt(e.createdAt)}
                          </td>
                          <td className="py-2 pr-3">{actionLabel(e.action)}</td>
                          <td className="py-2 pr-3">
                            <div>{e.name || "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {[e.phone, e.email].filter(Boolean).join(" · ") ||
                                "—"}
                            </div>
                          </td>
                          <td className="py-2 pr-3">
                            <div>{e.villageName || "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {e.subject || "—"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
