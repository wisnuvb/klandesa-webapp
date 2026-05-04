"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Download, Copy, Trash2, Upload, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Row = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  disabled: boolean;
  onReloadEngine: () => Promise<void>;
};

export const CmsTemplateLibraryCard = memo(function CmsTemplateLibraryCard({
  disabled,
  onReloadEngine,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [applyAfterSave, setApplyAfterSave] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/website/templates", { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        if (!ok)
          throw new Error(String(j?.error || "Gagal memuat daftar template"));
        const next = Array.isArray(j?.rows) ? (j.rows as unknown[]) : [];
        const parsed: Row[] = next
          .map((x) => {
            if (!x || typeof x !== "object" || Array.isArray(x)) return null;
            const o = x as Record<string, unknown>;
            const id = typeof o.id === "string" ? o.id : "";
            const name = typeof o.name === "string" ? o.name : "";
            const description =
              typeof o.description === "string" ? o.description : "";
            const createdAt =
              typeof o.createdAt === "string" ? o.createdAt : "";
            const updatedAt =
              typeof o.updatedAt === "string" ? o.updatedAt : "";
            if (!id || !name) return null;
            return { id, name, description, createdAt, updatedAt };
          })
          .filter((x): x is NonNullable<typeof x> => Boolean(x));
        setRows(parsed);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "Gagal memuat daftar template",
        );
        setRows([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const canSave = useMemo(() => Boolean(name.trim()), [name]);

  const handleSave = useCallback(async () => {
    const nm = name.trim();
    if (!nm) return;
    setError(null);
    const res = await fetch("/api/website/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nm,
        description: description.trim(),
        apply: applyAfterSave,
      }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok)
      throw new Error(String(j?.error || "Gagal menyimpan template"));
    setName("");
    setDescription("");
    setApplyAfterSave(false);
    refresh();
    if (applyAfterSave) await onReloadEngine();
  }, [applyAfterSave, description, name, onReloadEngine, refresh]);

  const handleApply = useCallback(
    async (id: string) => {
      setError(null);
      const res = await fetch(`/api/website/templates/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply" }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(String(j?.error || "Gagal menerapkan template"));
      await onReloadEngine();
    },
    [onReloadEngine],
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      setError(null);
      const res = await fetch(`/api/website/templates/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(String(j?.error || "Gagal menduplikasi template"));
      refresh();
    },
    [refresh],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setError(null);
      const res = await fetch(`/api/website/templates/${id}`, {
        method: "DELETE",
      });
      const j = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(String(j?.error || "Gagal menghapus template"));
      refresh();
    },
    [refresh],
  );

  const handleExport = useCallback(async (id: string) => {
    setError(null);
    const res = await fetch(`/api/website/templates/${id}`, {
      cache: "no-store",
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) throw new Error(String(j?.error || "Gagal export template"));
    const blob = new Blob([JSON.stringify(j, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `website-template-${id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportFile = useCallback(
    async (file: File) => {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("File template tidak valid");
      }
      const o = parsed as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name : "Template import";
      const description =
        typeof o.description === "string" ? o.description : "";
      const snapshot = o.snapshot;
      if (!snapshot || typeof snapshot !== "object") {
        throw new Error("Snapshot template tidak valid");
      }
      const res = await fetch("/api/website/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          snapshot,
          apply: false,
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(String(j?.error || "Gagal import template"));
      refresh();
    },
    [refresh],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variasi template</CardTitle>
        <CardDescription>
          Simpan, duplikasi, terapkan, dan import/export variasi desain
          (tersimpan per-desa).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Nama variasi</div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={disabled}
              placeholder="Contoh: Landing - Event Desa"
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">
              Deskripsi (opsional)
            </div>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={disabled}
              placeholder="Catatan internal untuk membedakan variasi."
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={applyAfterSave}
              onChange={(e) => setApplyAfterSave(e.target.checked)}
              disabled={disabled}
            />
            Terapkan setelah disimpan
          </label>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <label className="inline-flex items-center gap-2">
              <input
                type="file"
                accept="application/json"
                className="hidden"
                disabled={disabled}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setError(null);
                  void handleImportFile(f).catch((err) => {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Gagal import template",
                    );
                  });
                  e.currentTarget.value = "";
                }}
              />
              <Button type="button" variant="outline" disabled={disabled}>
                <Upload className="size-4" />
                Import JSON
              </Button>
            </label>
            <Button
              type="button"
              onClick={() => {
                void handleSave().catch((err) => {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Gagal menyimpan template",
                  );
                });
              }}
              disabled={disabled || !canSave}
            >
              Simpan variasi
            </Button>
          </div>
        </div>

        <div className="rounded-xl border">
          <div className="border-b px-4 py-3 text-sm font-medium">
            Daftar variasi
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Memuat...
              </div>
            ) : rows.length ? (
              rows.map((r) => (
                <div
                  key={r.id}
                  className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-[220px]">
                    <div className="font-medium">{r.name}</div>
                    {r.description ? (
                      <div className="text-xs text-muted-foreground">
                        {r.description}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void handleApply(r.id).catch((err) => {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Gagal menerapkan template",
                          );
                        });
                      }}
                      disabled={disabled}
                    >
                      <Play className="size-4" />
                      Terapkan
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void handleDuplicate(r.id).catch((err) => {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Gagal menduplikasi template",
                          );
                        });
                      }}
                      disabled={disabled}
                    >
                      <Copy className="size-4" />
                      Duplikasi
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void handleExport(r.id).catch((err) => {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Gagal export template",
                          );
                        });
                      }}
                      disabled={disabled}
                    >
                      <Download className="size-4" />
                      Export
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        void handleDelete(r.id).catch((err) => {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Gagal menghapus template",
                          );
                        });
                      }}
                      disabled={disabled}
                    >
                      <Trash2 className="size-4" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Belum ada variasi tersimpan.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
