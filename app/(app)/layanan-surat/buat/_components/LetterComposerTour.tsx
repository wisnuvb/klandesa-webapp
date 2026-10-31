"use client";

import { useState } from "react";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import {
  LETTER_COMPOSER_DESKTOP_QUERY,
  LETTER_COMPOSER_TOUR_ID,
  buildLetterComposerTourSteps,
} from "@/lib/letter-composer-tour";

/**
 * Tur onboarding editor surat: tidak merender apa pun, hanya memicu driver.js lewat efek.
 * Dibatasi ke layar lebar (form & kertas berdampingan) — di layar kecil kedua panel itu
 * berpindah lewat tab, jadi penjelasannya belum akurat untuk versi pertama.
 */
export function LetterComposerTour({ active }: { active: boolean }) {
  const [isDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(LETTER_COMPOSER_DESKTOP_QUERY).matches,
  );

  useOnboardingTour({
    tourId: LETTER_COMPOSER_TOUR_ID,
    buildSteps: buildLetterComposerTourSteps,
    enabled: active && isDesktop,
  });

  return null;
}
