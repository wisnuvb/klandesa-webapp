import type { DriveStep } from "driver.js";
import { tourReplayEvent, tourReplayStorageKey } from "@/lib/onboarding-tour";

export const LETTER_COMPOSER_TOUR_ID = "letter-composer";

export const LETTER_COMPOSER_TOUR_REPLAY_EVENT = tourReplayEvent(LETTER_COMPOSER_TOUR_ID);
export const LETTER_COMPOSER_TOUR_REPLAY_STORAGE_KEY = tourReplayStorageKey(LETTER_COMPOSER_TOUR_ID);

/** Breakpoint `lg` Tailwind — di bawah ini form & kertas dipisah lewat tab, bukan ditampilkan berdampingan. */
export const LETTER_COMPOSER_DESKTOP_QUERY = "(min-width: 1024px)";

export function buildLetterComposerTourSteps(): DriveStep[] {
  return [
    {
      element: "#panel-isi",
      popover: {
        title: "Formulir surat",
        description: "Isi data surat di sini — nama, tanggal, dan pihak yang terlibat.",
      },
    },
    {
      element: "#panel-pratinjau",
      popover: {
        title: "Kertas hidup",
        description:
          "Ini pratinjau asli surat. Anda juga bisa klik langsung teks di kertas untuk langsung edit isiannya.",
      },
    },
    {
      element: '[data-tour="composer-check"]',
      popover: {
        title: "Cek surat",
        description: "Daftar isian yang masih kurang, otomatis update.",
      },
    },
    {
      element: '[data-tour="composer-actions"]',
      popover: {
        title: "Terbitkan atau simpan draf",
        description:
          "\"Terbitkan & Cetak\" menerbitkan surat resmi. \"Simpan draf\" menyimpan dulu tanpa menerbitkan.",
      },
    },
  ];
}
