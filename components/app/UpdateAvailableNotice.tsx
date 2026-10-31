"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Deploy jarang terjadi (tidak tiap menit), jadi interval panjang sudah cukup
// dan jauh lebih ringan daripada polling cepat.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const DISMISSED_KEY = "klandesa:update-dismissed-build";

export function UpdateAvailableNotice({ currentBuildId }: { currentBuildId: string }) {
  const [latestBuildId, setLatestBuildId] = useState<string | null>(null);
  const checkingRef = useRef(false);
  const lastCheckedAtRef = useRef(0);

  useEffect(() => {
    // Build ID "dev" hanya muncul di `next dev` (tidak ada file .next/BUILD_ID) —
    // fitur ini memang tidak relevan di luar production.
    if (currentBuildId === "dev") return;

    const checkBuildId = async () => {
      if (checkingRef.current || document.visibilityState !== "visible") return;
      // Throttle: visibilitychange bisa terpicu berkali-kali saat user sering
      // pindah tab, jadi jangan sampai lebih sering dari interval periodik.
      const now = Date.now();
      if (now - lastCheckedAtRef.current < CHECK_INTERVAL_MS) return;
      lastCheckedAtRef.current = now;

      checkingRef.current = true;
      try {
        const res = await fetch("/api/app-build-id", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { buildId?: string } | null;
        if (
          data?.buildId &&
          data.buildId !== currentBuildId &&
          sessionStorage.getItem(DISMISSED_KEY) !== data.buildId
        ) {
          setLatestBuildId(data.buildId);
        }
      } catch {
        // Biarkan diam — ini pengecekan latar belakang, bukan aksi yang diminta pengguna.
      } finally {
        checkingRef.current = false;
      }
    };

    void checkBuildId();
    const interval = setInterval(checkBuildId, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", checkBuildId);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", checkBuildId);
    };
  }, [currentBuildId]);

  if (!latestBuildId) {
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
          sessionStorage.setItem(DISMISSED_KEY, latestBuildId);
          setLatestBuildId(null);
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
