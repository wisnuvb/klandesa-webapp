/** Pengelompokan riwayat percakapan per kedekatan waktu ("Hari ini", "Kemarin", …) untuk panel riwayat. */

export type ThreadGroupKey = "today" | "yesterday" | "week" | "older";

export type ThreadGroup<T> = { key: ThreadGroupKey; label: string; items: T[] };

const LABELS: Record<ThreadGroupKey, string> = {
  today: "Hari ini",
  yesterday: "Kemarin",
  week: "7 hari terakhir",
  older: "Lebih lama",
};

const ORDER: ThreadGroupKey[] = ["today", "yesterday", "week", "older"];

/** Selisih hari kalender (zona waktu lokal) antara `now` dan `d`; DST tidak menggeser hitungan. */
function calendarDaysAgo(now: Date, d: Date): number {
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((a - b) / 86_400_000);
}

export function threadGroupKey(updatedAt: string, now: Date = new Date()): ThreadGroupKey {
  const d = new Date(updatedAt);
  if (Number.isNaN(d.getTime())) return "older";
  const days = calendarDaysAgo(now, d);
  if (days <= 0) return "today"; // jam perangkat yang mundur/maju tidak boleh menghilangkan percakapan
  if (days === 1) return "yesterday";
  if (days <= 7) return "week";
  return "older";
}

/** Kelompok kosong dibuang; urutan item dalam kelompok mengikuti urutan masukan. */
export function groupThreadsByRecency<T extends { updatedAt: string }>(
  threads: T[],
  now: Date = new Date(),
): ThreadGroup<T>[] {
  const buckets: Record<ThreadGroupKey, T[]> = { today: [], yesterday: [], week: [], older: [] };
  for (const t of threads) buckets[threadGroupKey(t.updatedAt, now)].push(t);
  return ORDER.filter((k) => buckets[k].length > 0).map((k) => ({ key: k, label: LABELS[k], items: buckets[k] }));
}
