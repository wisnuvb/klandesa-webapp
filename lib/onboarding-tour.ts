/** Nama event/kunci penyimpanan untuk satu tur onboarding, dibangun dari id tur agar tidak bentrok antar halaman. */
export function tourReplayEvent(tourId: string): string {
  return `klandesa:tour:${tourId}:replay`;
}

export function tourReplayStorageKey(tourId: string): string {
  return `klandesa:tour:${tourId}:replay-pending`;
}

export function tourSeenKey(tourId: string, userId: string): string {
  return `klandesa:tour:${tourId}:v1:seen:${userId}`;
}
