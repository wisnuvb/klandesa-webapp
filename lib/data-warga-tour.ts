import type { DriveStep } from "driver.js";
import { tourReplayEvent, tourReplayStorageKey } from "@/lib/onboarding-tour";

export const DATA_WARGA_TOUR_ID = "data-warga";

export const DATA_WARGA_TOUR_REPLAY_EVENT = tourReplayEvent(DATA_WARGA_TOUR_ID);
export const DATA_WARGA_TOUR_REPLAY_STORAGE_KEY = tourReplayStorageKey(DATA_WARGA_TOUR_ID);

export function buildDataWargaTourSteps(): DriveStep[] {
  return [
    {
      element: '[data-tour="warga-filter-btn"]',
      popover: {
        title: "Filter",
        description: "Saring data warga berdasarkan RT/RW, status, dan kriteria lain.",
      },
    },
    {
      element: '[data-tour="warga-add-btn"]',
      popover: {
        title: "Tambah Warga",
        description: "Tambah satu data warga secara manual.",
      },
    },
    {
      element: '[data-tour="warga-more-actions"]',
      popover: {
        title: "Import & export data",
        description:
          "Import banyak data sekaligus dari Excel, atau export ke Excel/CSV/PDF — ada di sini.",
      },
    },
    {
      element: '[data-tour="warga-table"]',
      popover: {
        title: "Daftar data warga",
        description: "Klik baris mana pun untuk lihat detail dan edit datanya.",
      },
    },
  ];
}
