"use client";

import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { DASHBOARD_TOUR_ID, buildDashboardTourSteps } from "@/lib/dashboard-tour";

/** Tur onboarding dashboard: tidak merender apa pun, hanya memicu driver.js lewat efek. */
export function DashboardTour() {
  useOnboardingTour({ tourId: DASHBOARD_TOUR_ID, buildSteps: buildDashboardTourSteps });
  return null;
}
