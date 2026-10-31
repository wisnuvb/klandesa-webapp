"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type { DriveStep } from "driver.js";
import { tourReplayEvent, tourReplayStorageKey, tourSeenKey } from "@/lib/onboarding-tour";

type UseOnboardingTourOptions = {
  tourId: string;
  buildSteps: () => DriveStep[];
  /** Tur hanya boleh berjalan saat halaman benar-benar siap (data termuat, breakpoint sesuai, dst). Default true. */
  enabled?: boolean;
};

/** Mesin generik tur onboarding berbasis driver.js: dipakai berulang oleh setiap halaman yang punya tur sendiri. */
export function useOnboardingTour({ tourId, buildSteps, enabled = true }: UseOnboardingTourOptions) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const runningRef = useRef(false);
  const buildStepsRef = useRef(buildSteps);
  buildStepsRef.current = buildSteps;

  useEffect(() => {
    if (!userId || !enabled) return;

    let destroyed = false;
    const replayEvent = tourReplayEvent(tourId);
    const replayKey = tourReplayStorageKey(tourId);
    const seenKey = tourSeenKey(tourId, userId);

    const start = async () => {
      if (runningRef.current) return;
      runningRef.current = true;

      const { driver } = await import("driver.js");
      if (destroyed) return;

      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const markSeen = () => {
        try {
          localStorage.setItem(seenKey, "1");
        } catch {
          /* localStorage tidak tersedia (mode privat dsb.); tur cukup diulang, bukan error fatal */
        }
        runningRef.current = false;
      };

      const tourDriver = driver({
        showProgress: true,
        animate: !reduceMotion,
        overlayOpacity: 0.6,
        stagePadding: 6,
        allowClose: true,
        popoverClass: "klandesa-tour-popover",
        nextBtnText: "Lanjut",
        prevBtnText: "Kembali",
        doneBtnText: "Selesai",
        progressText: "Langkah {{current}} dari {{total}}",
        steps: buildStepsRef.current(),
        onDestroyStarted: () => {
          tourDriver.destroy();
        },
        onDestroyed: markSeen,
      });

      tourDriver.drive();
    };

    const seen = (() => {
      try {
        return localStorage.getItem(seenKey);
      } catch {
        return "1";
      }
    })();

    const isReplayPending = (() => {
      try {
        return sessionStorage.getItem(replayKey) === "1";
      } catch {
        return false;
      }
    })();

    if (isReplayPending) {
      try {
        sessionStorage.removeItem(replayKey);
      } catch {
        /* abaikan */
      }
      void start();
    } else if (!seen) {
      void start();
    }

    const onReplay = () => {
      runningRef.current = false;
      void start();
    };
    window.addEventListener(replayEvent, onReplay);

    return () => {
      destroyed = true;
      window.removeEventListener(replayEvent, onReplay);
    };
  }, [userId, enabled, tourId]);
}
