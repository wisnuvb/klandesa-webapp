"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Loader2,
  RefreshCw,
  RotateCcw,
  Server,
  Upload,
} from "lucide-react";
import { AsyncState } from "@/components/app/patterns";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Adapter = {
  id: string;
  label: string;
  description: string;
  direction: string;
  formats: string[];
};

type SyncLog = {
  id: number;
  adapterId: string;
  direction: string;
  status: string;
  recordCount: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat data");
  return data as T;
}

function statusBadge(status: string) {
  if (status === "success") return <Badge className="bg-emerald-600">Berhasil</Badge>;
  if (status === "failed") return <Badge variant="destructive">Gagal</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

export default function SinkronisasiDataPage() {
  const { appAlert } = useAppDialogs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [selectedAdapter, setSelectedAdapter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, l] = await Promise.all([
        fetchJson<{ adapters: Adapter[] }>("/api/integrations/adapters"),
        fetchJson<{ rows: SyncLog[] }>("/api/integrations/logs"),
      ]);
      setAdapters(a.adapters);
      setLogs(l.rows);
      if (!selectedAdapter && a.adapters[0]) {
        setSelectedAdapter(a.adapters[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, [selectedAdapter]);

  useEffect(() => {
    void load();
  }, [load]);

  const adapter = adapters.find((a) => a.id === selectedAdapter);

  async function handleExport(format: "csv" | "json") {
    if (!selectedAdapter) return;
    setBusy(`export-${format}`);
    try {
      const res = await fetch("/api/integrations/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adapterId: selectedAdapter, format }),
      });
      if (format === "json") {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Export gagal");
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || "export.json";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Export gagal");
        }
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") || "";
        const match = cd.match(/filename="([^"]+)"/);
        const filename = match?.[1] || "export.csv";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      await appAlert("Export berhasil diunduh.");
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Export gagal");
    } finally {
      setBusy(null);
    }
  }

  async function handleSync() {
    if (!selectedAdapter) return;
    setBusy("sync");
    try {
      const data = await fetchJson<{ ok: boolean; sync: SyncLog }>(
        "/api/integrations/sync",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adapterId: selectedAdapter,
            format: adapter?.formats.includes("json") ? "json" : "csv",
          }),
        },
      );
      await appAlert(
        `Sinkronisasi selesai — ${data.sync.recordCount} record diproses.`,
      );
      await load();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Sinkronisasi gagal");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function handleRetry(logId: number) {
    setBusy(`retry-${logId}`);
    try {
      await fetchJson(`/api/integrations/logs/${logId}/retry`, { method: "POST" });
      await appAlert("Retry berhasil.");
      await load();
    } catch (e) {
      await appAlert(e instanceof Error ? e.message : "Retry gagal");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sinkronisasi Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hub integrasi Kemendesa — export standar, log sinkronisasi, dan retry.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Coba lagi
          </button>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              Adapter Integrasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedAdapter} onValueChange={setSelectedAdapter}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih adapter" />
              </SelectTrigger>
              <SelectContent>
                {adapters.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {adapter && (
              <p className="text-sm text-muted-foreground">{adapter.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {adapter?.formats.includes("csv") && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!busy}
                  onClick={() => void handleExport("csv")}
                >
                  {busy === "export-csv" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Export CSV
                </Button>
              )}
              {adapter?.formats.includes("json") && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!busy}
                  onClick={() => void handleExport("json")}
                >
                  {busy === "export-json" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Export JSON
                </Button>
              )}
              <Button size="sm" disabled={!!busy} onClick={() => void handleSync()}>
                {busy === "sync" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Jalankan Sinkronisasi
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Log Sinkronisasi</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adapter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Belum ada log sinkronisasi.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{log.adapterId}</TableCell>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                      <TableCell>{log.recordCount}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(log.startedAt).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        {log.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!!busy}
                            onClick={() => void handleRetry(log.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
