"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ServicesResponse = {
  village: { id: number; code: string; name: string };
  device: { id: string; name: string };
  services: Array<{ mailType: string }>;
};

type CreateResponse = {
  request: {
    id: string;
    requestNumber: string;
    status: string;
    requestDate: string;
  };
  village: { id: number; code: string; name: string };
};

const STORAGE_KEY = "kioskKey";

export default function KioskPage() {
  const [kioskKey, setKioskKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [keyInvalid, setKeyInvalid] = useState(false);

  const [services, setServices] = useState<ServicesResponse | null>(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [nik, setNik] = useState("");
  const [name, setName] = useState("");
  const [mailType, setMailType] = useState("");
  const [purpose, setPurpose] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateResponse | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) ?? "";
      if (saved) {
        setKioskKey(saved);
        setKeyDraft(saved);
      }
    } catch {
      return;
    }
  }, []);

  const serviceOptions = useMemo(() => {
    return services?.services?.map((s) => s.mailType) ?? [];
  }, [services?.services]);

  const loadServices = async (key: string) => {
    setLoadingServices(true);
    setServicesError(null);
    setServices(null);
    try {
      const res = await fetch("/api/kiosk/services", {
        cache: "no-store",
        headers: { "x-kiosk-key": key },
      });
      const json = (await res.json().catch(() => null)) as
        | ServicesResponse
        | { error?: string }
        | null;
      if (!res.ok) {
        const message =
          (json as { error?: string })?.error || "Gagal memuat layanan";
        const invalid =
          res.status === 401 ||
          (res.status === 403 && message === "Kiosk tidak valid");
        setKeyInvalid(invalid);
        setServicesError(message);
        return;
      }
      const data = json as ServicesResponse;
      setServices(data);
      setKeyInvalid(false);
      const first = data.services?.[0]?.mailType ?? "";
      setMailType((prev) => prev || first);
    } catch (e) {
      setServicesError(e instanceof Error ? e.message : "Gagal memuat layanan");
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    if (!kioskKey) return;
    void loadServices(kioskKey);
  }, [kioskKey]);

  const saveKey = async () => {
    const next = keyDraft.trim();
    setCreated(null);
    setSubmitError(null);
    if (!next) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      return;
    }
    setKeyDraft("");
    setKioskKey(next);
  };

  const submit = async () => {
    if (!kioskKey) return;
    setSubmitting(true);
    setSubmitError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/kiosk/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kiosk-key": kioskKey,
        },
        body: JSON.stringify({
          nik,
          name,
          mailType,
          purpose,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | CreateResponse
        | { error?: string }
        | null;
      if (!res.ok) {
        throw new Error(
          (json as { error?: string })?.error || "Gagal mengirim permohonan",
        );
      }
      setCreated(json as CreateResponse);
      setNik("");
      setName("");
      setPurpose("");
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Gagal mengirim permohonan",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const showKeyEntry = !kioskKey || keyInvalid;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Kiosk Layanan Mandiri
          </h1>
          <p className="text-sm text-muted-foreground">
            Ajukan layanan desa langsung dari perangkat kiosk.
          </p>
        </div>

        {showKeyEntry ? (
          <Card>
            <CardHeader>
              <CardTitle>Aktivasi Perangkat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="password"
                    autoComplete="off"
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    placeholder="Masukkan kiosk key (Perangkat Desa)"
                  />
                  <Button
                    type="button"
                    onClick={() => void saveKey()}
                    disabled={!keyDraft.trim()}
                  >
                    Simpan
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Key hanya untuk petugas/perangkat desa. Setelah disimpan, form
                  warga akan tampil otomatis.
                </p>
              </div>

              {loadingServices && (
                <p className="text-sm text-muted-foreground">Memuat layanan…</p>
              )}
              {servicesError && (
                <p className="text-sm text-destructive">
                  {keyInvalid
                    ? "Key sudah direset oleh admin. Masukkan key baru untuk mengaktifkan kiosk."
                    : servicesError}
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {loadingServices && !services && !showKeyEntry && (
          <p className="text-sm text-muted-foreground">Memuat layanan…</p>
        )}
        {servicesError && !services && !showKeyEntry && (
          <p className="text-sm text-destructive">{servicesError}</p>
        )}

        {services ? (
          <Card>
            <CardHeader>
              <CardTitle>Form Permohonan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Desa:{" "}
                <span className="font-medium text-foreground">
                  {services.village.name}
                </span>{" "}
                • Device:{" "}
                <span className="font-medium text-foreground">
                  {services.device.name}
                </span>
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">NIK</p>
                  <Input
                    inputMode="numeric"
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    placeholder="16 digit"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Nama</p>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">Jenis Layanan</p>
                <select
                  value={mailType}
                  onChange={(e) => setMailType(e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  {serviceOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">Keperluan</p>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Tuliskan keperluan Anda"
                />
              </div>

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting ? "Mengirim…" : "Kirim Permohonan"}
              </Button>

              {created && (
                <div className="rounded-md border bg-card p-4 space-y-1">
                  <p className="text-sm font-medium">Permohonan terkirim</p>
                  <p className="text-sm text-muted-foreground">
                    Nomor:{" "}
                    <span className="font-mono text-foreground">
                      {created.request.requestNumber}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
