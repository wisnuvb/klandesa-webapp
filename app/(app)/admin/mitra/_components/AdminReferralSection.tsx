"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Link2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildPartnerSharePath } from "@/lib/partner/public-page";

type ReferralCodeRow = {
  id: number;
  partnerId?: number | null;
  code: string;
  label: string;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  commission: string | null;
  status: string;
  landingPath: string;
  notes: string | null;
  createdAt: string;
  eventCount: number;
  actionSummary: Record<string, number>;
  latestEvent: {
    action: string;
    phone: string | null;
    email: string | null;
    createdAt: string;
  } | null;
};

type ReferralEventRow = {
  id: string;
  codeSnapshot: string | null;
  action: string;
  sourcePath: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  villageName: string | null;
  subject: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
  referralCode: {
    code: string;
    label: string;
    ownerName: string | null;
    commission: string | null;
  } | null;
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function baseUrl(): string {
  if (typeof window === "undefined") return "http://localhost:2042";
  return window.location.origin;
}

function referralLink(
  row: Pick<ReferralCodeRow, "code" | "landingPath">,
): string {
  const path = buildPartnerSharePath(null, row.code);
  if (path) return `${baseUrl()}${path}`;
  const legacyPath = row.landingPath || "/tim";
  return `${baseUrl()}${legacyPath}?ref=${encodeURIComponent(row.code)}`;
}

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

export function AdminReferralSection() {
  const [query, setQuery] = useState("");
  const [codes, setCodes] = useState<ReferralCodeRow[]>([]);
  const [events, setEvents] = useState<ReferralEventRow[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    label: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    commission: "",
    notes: "",
  });

  const q = useMemo(() => query.trim(), [query]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError(null);
        const [codesRes, eventsRes] = await Promise.all([
          fetch(`/api/admin/referrals?query=${encodeURIComponent(q)}`, {
            cache: "no-store",
            signal,
          }),
          fetch(
            `/api/admin/referrals/events?code=${encodeURIComponent(selectedCode)}`,
            { cache: "no-store", signal },
          ),
        ]);
        const codesData = (await codesRes.json().catch(() => null)) as {
          referralCodes?: ReferralCodeRow[];
          error?: string;
        } | null;
        const eventsData = (await eventsRes.json().catch(() => null)) as {
          events?: ReferralEventRow[];
          error?: string;
        } | null;
        if (!codesRes.ok)
          throw new Error(codesData?.error || "Gagal memuat referral");
        if (!eventsRes.ok)
          throw new Error(eventsData?.error || "Gagal memuat event");
        setCodes(codesData?.referralCodes ?? []);
        setEvents(eventsData?.events ?? []);
      } catch (e) {
        const name =
          e && typeof e === "object" && "name" in e
            ? String((e as { name?: unknown }).name || "")
            : "";
        if (name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    },
    [q, selectedCode],
  );

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => {
      c.abort();
    };
  }, [load]);

  const createCode = async () => {
    try {
      setSaving(true);
      setError(null);
      setOk(null);
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          landingPath: "/m",
          status: "active",
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        referralCode?: { code: string; partnerId?: number | null };
      } | null;
      if (!res.ok)
        throw new Error(data?.error || "Gagal membuat kode referral");
      const suffix =
        typeof data?.referralCode?.partnerId === "number"
          ? ` · Mitra #${data.referralCode.partnerId}`
          : "";
      setOk(`Kode ${data?.referralCode?.code || form.code} dibuat${suffix}`);
      setForm({
        code: "",
        label: "",
        ownerName: "",
        ownerPhone: "",
        ownerEmail: "",
        commission: "",
        notes: "",
      });
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal membuat kode referral",
      );
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (row: ReferralCodeRow) => {
    const link = referralLink(row);
    await navigator.clipboard.writeText(link);
    setOk(`Link disalin: ${link}`);
  };

  const totalEvents = codes.reduce((sum, c) => sum + c.eventCount, 0);
  const totalRegisters = codes.reduce(
    (sum, c) => sum + (c.actionSummary.register_submit ?? 0),
    0,
  );
  const totalContacts = codes.reduce(
    (sum, c) =>
      sum +
      (c.actionSummary.contact_submit ?? 0) +
      (c.actionSummary.whatsapp_click ?? 0),
    0,
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Kode aktif</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {codes.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total event</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totalEvents}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lead komisi</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalRegisters + totalContacts}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Buat kode referral</CardTitle>
          <div className="text-sm text-muted-foreground">
            Setiap kode aktif dapat otomatis membuat/taut akun mitra agar pemilik kode bisa login portal{" "}
            <span className="font-mono">/mitra</span>. Email pemilik wajib diisi untuk kode aktif.
          </div>
          <div className="text-sm text-muted-foreground">
            Link publik berbentuk{" "}
            <span className="font-mono">/m/kode-atau-slug</span>.
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="Kode, contoh: REFER01"
            />
            <Input
              value={form.label}
              onChange={(e) =>
                setForm((p) => ({ ...p, label: e.target.value }))
              }
              placeholder="Label campaign"
            />
            <Input
              value={form.ownerName}
              onChange={(e) =>
                setForm((p) => ({ ...p, ownerName: e.target.value }))
              }
              placeholder="Nama pemilik referral"
            />
            <Input
              value={form.ownerPhone}
              onChange={(e) =>
                setForm((p) => ({ ...p, ownerPhone: e.target.value }))
              }
              placeholder="Nomor HP pemilik referral"
            />
            <Input
              value={form.ownerEmail}
              onChange={(e) =>
                setForm((p) => ({ ...p, ownerEmail: e.target.value }))
              }
              placeholder="Email pemilik referral"
            />
            <Input
              value={form.commission}
              onChange={(e) =>
                setForm((p) => ({ ...p, commission: e.target.value }))
              }
              placeholder="Catatan komisi display, mis. 10%"
            />
          </div>
          <Textarea
            value={form.notes}
            onChange={(e) =>
              setForm((p) => ({ ...p, notes: e.target.value }))
            }
            placeholder="Catatan internal"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button disabled={saving} onClick={createCode}>
              <Plus className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan…" : "Buat kode"}
            </Button>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          {ok ? <div className="text-sm text-green-700">{ok}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Kode referral</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kode, pemilik, atau nomor HP..."
            />
            <Button variant="outline" onClick={() => setQuery("")}>
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : codes.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Belum ada kode.
            </div>
          ) : (
            <div className="space-y-3">
              {codes.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold">
                          {row.code}
                        </span>
                        <span className="text-xs rounded-full bg-muted px-2 py-0.5">
                          {row.status}
                        </span>
                        {typeof row.partnerId === "number" ? (
                          <span className="text-xs rounded-full border border-border px-2 py-0.5">
                            Mitra #{row.partnerId}
                          </span>
                        ) : null}
                      </div>
                      <div className="font-medium">{row.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {[row.ownerName, row.ownerPhone, row.ownerEmail]
                          .filter(Boolean)
                          .join(" · ") || "Tanpa pemilik"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Komisi (display): {row.commission || "-"} · Event:{" "}
                        {row.eventCount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Daftar: {row.actionSummary.register_submit ?? 0} · Kontak:{" "}
                        {row.actionSummary.contact_submit ?? 0} · WhatsApp:{" "}
                        {row.actionSummary.whatsapp_click ?? 0}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => copyLink(row)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Salin link
                      </Button>
                      <Button asChild variant="outline">
                        <a
                          href={referralLink(row)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Link2 className="w-4 h-4 mr-2" />
                          Buka
                        </a>
                      </Button>
                      <Button
                        variant={
                          selectedCode === row.code ? "default" : "outline"
                        }
                        onClick={() =>
                          setSelectedCode((current) =>
                            current === row.code ? "" : row.code,
                          )
                        }
                      >
                        Event
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Event referral</CardTitle>
            <div className="text-sm text-muted-foreground">
              {selectedCode
                ? `Filter kode ${selectedCode}`
                : "Semua kode referral"}
            </div>
          </div>
          {selectedCode ? (
            <Button variant="outline" onClick={() => setSelectedCode("")}>
              Lihat semua
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : events.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Belum ada event.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-2 pr-4 font-medium">Waktu</th>
                    <th className="py-2 pr-4 font-medium">Kode</th>
                    <th className="py-2 pr-4 font-medium">Aksi</th>
                    <th className="py-2 pr-4 font-medium">Kontak</th>
                    <th className="py-2 pr-4 font-medium">Desa/Subjek</th>
                    <th className="py-2 pr-4 font-medium">Halaman</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-b border-border align-top">
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                        {formatDate(e.createdAt)}
                      </td>
                      <td className="py-2 pr-4 font-mono">
                        {e.codeSnapshot || "-"}
                      </td>
                      <td className="py-2 pr-4">{actionLabel(e.action)}</td>
                      <td className="py-2 pr-4">
                        <div>{e.name || "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {[e.phone, e.email].filter(Boolean).join(" · ") ||
                            "-"}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <div>{e.villageName || "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.subject || "-"}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {e.sourcePath || "-"}
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
  );
}
