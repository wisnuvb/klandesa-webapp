/**
 * Antrean kirim offline (murni, tanpa Expo agar bisa dites). Hanya untuk permintaan yang aman diulang:
 * foto sudah terunggah (yang disimpan hanya URL), jadi isi antrean kecil dan tidak memuat berkas.
 */
export type OutboxKind = 'report' | 'mail';
export type OutboxItem = {
  id: string;
  accountId: number;
  kind: OutboxKind;
  /** Judul ramah untuk ditampilkan ("Laporan: Lampu jalan"). */
  label: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  nextAt: number;
};

export const OUTBOX_MAX_ITEMS = 5;
export const OUTBOX_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 30 * 60_000;

/** Gagal karena jaringan atau server sibuk → boleh dicoba lagi. Kesalahan 4xx (data ditolak) tidak. */
export function isRetryable(code: string, status: number): boolean {
  return code === 'NETWORK' || code === 'SERVER' || status >= 500 || status === 429;
}

export function backoffMs(attempts: number): number {
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempts));
}

export function prune(items: OutboxItem[], now: number): OutboxItem[] {
  return items.filter((i) => now - i.createdAt < OUTBOX_MAX_AGE_MS);
}

export function enqueue(items: OutboxItem[], item: OutboxItem, now: number): { items: OutboxItem[]; ok: boolean } {
  const live = prune(items, now);
  if (live.length >= OUTBOX_MAX_ITEMS) return { items: live, ok: false };
  return { items: [...live, item], ok: true };
}

/** Item yang sudah waktunya dicoba untuk akun ini, yang paling lama dulu. */
export function dueItems(items: OutboxItem[], accountId: number, now: number): OutboxItem[] {
  return prune(items, now).filter((i) => i.accountId === accountId && i.nextAt <= now).sort((a, b) => a.createdAt - b.createdAt);
}

export function markFailed(items: OutboxItem[], id: string, now: number): OutboxItem[] {
  return items.map((i) => (i.id === id ? { ...i, attempts: i.attempts + 1, nextAt: now + backoffMs(i.attempts + 1) } : i));
}

export function removeItem(items: OutboxItem[], id: string): OutboxItem[] {
  return items.filter((i) => i.id !== id);
}

/** Muat dari teks JSON dengan aman; data rusak atau bentuk salah dibuang, bukan membuat app crash. */
export function parseOutbox(raw: string | null | undefined): OutboxItem[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is OutboxItem => {
      const o = x as Partial<OutboxItem> | null;
      return !!o && typeof o.id === 'string' && typeof o.accountId === 'number' && (o.kind === 'report' || o.kind === 'mail')
        && typeof o.label === 'string' && !!o.payload && typeof o.payload === 'object'
        && typeof o.createdAt === 'number' && typeof o.attempts === 'number' && typeof o.nextAt === 'number';
    });
  } catch {
    return [];
  }
}
