"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type KioskSettings = {
  enabled: boolean;
  allowedMailTypes: string[];
};

type Device = {
  id: string;
  name: string;
  locationLabel: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
};

export default function LayananMandiriPage() {
  const [settings, setSettings] = useState<KioskSettings | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceLocation, setNewDeviceLocation] = useState("");

  const [lastKey, setLastKey] = useState<string | null>(null);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);

  const allowedText = useMemo(() => {
    return (settings?.allowedMailTypes ?? []).join("\n");
  }, [settings?.allowedMailTypes]);
  const [allowedDraft, setAllowedDraft] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, dRes] = await Promise.all([
        fetch("/api/kiosk/settings", { cache: "no-store" }),
        fetch("/api/kiosk/devices", { cache: "no-store" }),
      ]);
      const sJson = (await sRes.json().catch(() => null)) as {
        settings?: KioskSettings;
        error?: string;
      } | null;
      const dJson = (await dRes.json().catch(() => null)) as {
        devices?: Device[];
        error?: string;
      } | null;

      if (!sRes.ok) {
        throw new Error(sJson?.error || "Gagal memuat pengaturan");
      }
      if (!dRes.ok) {
        throw new Error(dJson?.error || "Gagal memuat perangkat");
      }

      const nextSettings = sJson?.settings ?? {
        enabled: false,
        allowedMailTypes: [],
      };
      setSettings(nextSettings);
      setAllowedDraft(nextSettings.allowedMailTypes.join("\n"));
      setDevices(dJson?.devices ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const updateSettings = async (patch: Partial<KioskSettings>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/kiosk/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json().catch(() => null)) as {
        settings?: KioskSettings;
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(json?.error || "Gagal menyimpan");
      }
      const next = json?.settings ?? null;
      if (next) {
        setSettings(next);
        setAllowedDraft(next.allowedMailTypes.join("\n"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const saveAllowed = async () => {
    const allowedMailTypes = allowedDraft
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    await updateSettings({ allowedMailTypes });
  };

  const createDevice = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/kiosk/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDeviceName,
          locationLabel: newDeviceLocation,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        device?: Device;
        kioskKey?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(json?.error || "Gagal membuat perangkat");
      }
      setNewDeviceName("");
      setNewDeviceLocation("");
      if (json?.kioskKey) {
        setLastKey(json.kioskKey);
        setKeyDialogOpen(true);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const toggleDevice = async (id: string, isActive: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/kiosk/devices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(json?.error || "Gagal memperbarui perangkat");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const rotateKey = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/kiosk/devices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, rotateKey: true }),
      });
      const json = (await res.json().catch(() => null)) as {
        kioskKey?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(json?.error || "Gagal rotate key");
      }
      if (json?.kioskKey) {
        setLastKey(json.kioskKey);
        setKeyDialogOpen(true);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto container space-y-6">
      {/* <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Layanan Mandiri
        </h1>
        <p className="text-sm text-muted-foreground">
          Konfigurasi kiosk untuk warga mengajukan permohonan layanan secara
          mandiri.
        </p>
      </div> */}

      {loading && (
        <p className="text-sm text-muted-foreground">Memuat konfigurasi…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && settings && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Aktifkan layanan mandiri
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Jika dimatikan, kiosk tidak bisa memuat daftar layanan
                    maupun submit permohonan.
                  </p>
                </div>
                <Switch
                  checked={settings.enabled}
                  disabled={saving}
                  onCheckedChange={(v) => void updateSettings({ enabled: v })}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Daftar layanan (jenis surat)
                </p>
                <p className="text-xs text-muted-foreground">
                  Satu baris per layanan. Contoh: Surat Keterangan Domisili
                </p>
                <textarea
                  value={allowedDraft}
                  onChange={(e) => setAllowedDraft(e.target.value)}
                  className="min-h-35 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Surat Keterangan Domisili&#10;Surat Pengantar SKCK"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {allowedDraft === allowedText
                      ? "Tidak ada perubahan"
                      : "Belum disimpan"}
                  </p>
                  <Button
                    type="button"
                    disabled={saving || allowedDraft === allowedText}
                    onClick={() => void saveAllowed()}
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Perangkat Kiosk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <p className="text-sm font-medium mb-1">Nama perangkat</p>
                  <Input
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    placeholder="Kiosk Balai Desa"
                  />
                </div>
                <div className="sm:col-span-1">
                  <p className="text-sm font-medium mb-1">Lokasi (opsional)</p>
                  <Input
                    value={newDeviceLocation}
                    onChange={(e) => setNewDeviceLocation(e.target.value)}
                    placeholder="Lobby / Ruang Pelayanan"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <Button
                    type="button"
                    className="w-full"
                    disabled={saving || !newDeviceName.trim()}
                    onClick={() => void createDevice()}
                  >
                    Buat Perangkat
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {devices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada perangkat. Buat satu perangkat untuk mendapatkan
                    kiosk key.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {devices.map((d) => (
                      <div
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {d.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {d.locationLabel || "—"} • Last seen:{" "}
                            {d.lastSeenAt
                              ? new Date(d.lastSeenAt).toLocaleString("id-ID")
                              : "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {d.isActive ? (
                            <Badge>Aktif</Badge>
                          ) : (
                            <Badge variant="secondary">Nonaktif</Badge>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={saving}
                            onClick={() => void rotateKey(d.id)}
                          >
                            Rotate Key
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={saving}
                            onClick={() => void toggleDevice(d.id, !d.isActive)}
                          >
                            {d.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kiosk Key</DialogTitle>
            <DialogDescription>
              Simpan key ini di perangkat kiosk. Key hanya ditampilkan saat
              dibuat/di-rotate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={lastKey ?? ""} readOnly />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (lastKey) void navigator.clipboard.writeText(lastKey);
              }}
            >
              Salin
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
