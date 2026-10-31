"use client";

import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { DATA_WARGA_TOUR_ID, buildDataWargaTourSteps } from "@/lib/data-warga-tour";

/** Tur onboarding halaman Data Warga: tidak merender apa pun, hanya memicu driver.js lewat efek. */
export function DataWargaTour() {
  useOnboardingTour({ tourId: DATA_WARGA_TOUR_ID, buildSteps: buildDataWargaTourSteps });
  return null;
}
