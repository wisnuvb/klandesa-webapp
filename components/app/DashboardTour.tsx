"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  DASHBOARD_TOUR_REPLAY_EVENT,
  DASHBOARD_TOUR_REPLAY_STORAGE_KEY,
  buildDashboardTourSteps,
  dashboardTourSeenKey,
} from "@/lib/dashboard-tour";

/** Tur onboarding dashboard: tidak merender apa pun, hanya memicu driver.js lewat efek. */
export function DashboardTour() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const runningRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    let destroyed = false;

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
          localStorage.setItem(dashboardTourSeenKey(userId), "1");
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
        steps: buildDashboardTourSteps(),
        onDestroyStarted: () => {
          tourDriver.destroy();
        },
        onDestroyed: markSeen,
      });

      tourDriver.drive();
    };

    const seen = (() => {
      try {
        return localStorage.getItem(dashboardTourSeenKey(userId));
      } catch {
        return "1";
      }
    })();

    const isReplayPending = (() => {
      try {
        return sessionStorage.getItem(DASHBOARD_TOUR_REPLAY_STORAGE_KEY) === "1";
      } catch {
        return false;
      }
    })();

    if (isReplayPending) {
      try {
        sessionStorage.removeItem(DASHBOARD_TOUR_REPLAY_STORAGE_KEY);
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
    window.addEventListener(DASHBOARD_TOUR_REPLAY_EVENT, onReplay);

    return () => {
      destroyed = true;
      window.removeEventListener(DASHBOARD_TOUR_REPLAY_EVENT, onReplay);
    };
  }, [userId]);

  return null;
}
