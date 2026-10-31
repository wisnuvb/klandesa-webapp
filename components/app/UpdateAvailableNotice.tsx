"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import pkg from "@/package.json";

const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const DISMISSED_KEY = "klandesa:update-dismissed-version";

export function UpdateAvailableNotice() {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const checkingRef = useRef(false);

  useEffect(() => {
    const checkVersion = async () => {
      if (checkingRef.current || document.visibilityState !== "visible") return;
      checkingRef.current = true;
      try {
        const res = await fetch("/api/app-version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { version?: string } | null;
        if (
          data?.version &&
          data.version !== pkg.version &&
          sessionStorage.getItem(DISMISSED_KEY) !== data.version
        ) {
          setLatestVersion(data.version);
        }
      } catch {
        // Biarkan diam — ini pengecekan latar belakang, bukan aksi yang diminta pengguna.
      } finally {
        checkingRef.current = false;
      }
    };

    void checkVersion();
    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", checkVersion);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", checkVersion);
    };
  }, []);

  if (!latestVersion) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border bg-background p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <RefreshCw className="size-4" />
      </div>
      <div className="flex-1 space-y-2">
        <div>
          <p className="text-sm font-medium text-foreground">Update tersedia</p>
          <p className="text-sm text-muted-foreground">
            Versi baru Klandesa sudah siap. Muat ulang halaman untuk memperbarui.
          </p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          Muat Ulang
        </Button>
      </div>
      <button
        type="button"
        aria-label="Tutup notifikasi update"
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={() => {
          sessionStorage.setItem(DISMISSED_KEY, latestVersion);
          setLatestVersion(null);
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
