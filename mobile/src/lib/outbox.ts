import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';

import { ApiError, post } from './api';
import {
  dueItems, enqueue, isRetryable, markFailed, parseOutbox, prune, removeItem, type OutboxItem, type OutboxKind,
} from './outbox-logic';

const FILE = new File(Paths.document, 'kd-outbox.json');
const ENDPOINT: Record<OutboxKind, string> = { report: '/reports', mail: '/mail/requests' };

let listeners = new Set<() => void>();
let cache: OutboxItem[] | null = null;

async function load(): Promise<OutboxItem[]> {
  if (cache) return cache;
  try {
    cache = FILE.exists ? prune(parseOutbox(await FILE.text()), Date.now()) : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function save(items: OutboxItem[]): Promise<void> {
  cache = items;
  try {
    if (!FILE.exists) FILE.create();
    FILE.write(JSON.stringify(items));
  } catch {
    // Tulis gagal: antrean tetap ada di memori selama app hidup.
  }
  listeners.forEach((l) => l());
}

export function subscribeOutbox(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function listOutbox(accountId: number): Promise<OutboxItem[]> {
  return (await load()).filter((i) => i.accountId === accountId);
}

/** Simpan permintaan untuk dikirim otomatis nanti. false bila antrean penuh. */
export async function addToOutbox(accountId: number, kind: OutboxKind, label: string, payload: Record<string, unknown>): Promise<boolean> {
  const now = Date.now();
  const item: OutboxItem = { id: Crypto.randomUUID(), accountId, kind, label, payload, createdAt: now, attempts: 0, nextAt: now + 30_000 };
  const r = enqueue(await load(), item, now);
  if (r.ok) await save(r.items);
  return r.ok;
}

/** Hapus seluruh antrean (dipanggil saat keluar/akun berganti agar data tidak terkirim ke akun lain). */
export async function clearOutbox(): Promise<void> {
  await save([]);
}

let flushing = false;

/** Kirim item yang sudah jatuh tempo. Mengembalikan jumlah yang berhasil. Berhenti di kegagalan jaringan pertama. */
export async function flushOutbox(accountId: number): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const item of dueItems(await load(), accountId, Date.now())) {
      try {
        await post(ENDPOINT[item.kind], item.payload);
        await save(removeItem(await load(), item.id));
        sent += 1;
      } catch (e) {
        const retry = e instanceof ApiError ? isRetryable(e.code, e.status) : true;
        if (retry) {
          await save(markFailed(await load(), item.id, Date.now()));
          break; // kemungkinan masih tanpa sinyal; jangan menghabiskan baterai
        }
        await save(removeItem(await load(), item.id)); // ditolak server: tidak akan berhasil bila diulang
      }
    }
  } finally {
    flushing = false;
  }
  return sent;
}
