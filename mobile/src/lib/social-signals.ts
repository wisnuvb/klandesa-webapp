import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { post } from './api';
import { batches, enqueue, type FeedSrc, type SignalEvent } from './social-signals-logic';

/**
 * Pencatat sinyal Warga (Fase 0): postingan yang tampil dan berapa lama, dibuka, dibagikan, atau "kurangi yang seperti
 * ini". Dikirim berkelompok dan boleh hilang di jalan; kegagalan tidak pernah mengganggu warga. Server menolak mencatat
 * akun yang memilih tidak dipelajari, dan di sini pun dimatikan (`setSignalsEnabled`) supaya tidak ada lalu lintas sia-sia.
 */
type Viewable = { item?: unknown; isViewable: boolean };

const FLUSH_MS = 15_000;
let queue: SignalEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let enabled = true;

export function setSignalsEnabled(on: boolean) {
  enabled = on;
  if (!on) queue = [];
}

export async function flushSignals() {
  if (timer) { clearTimeout(timer); timer = null; }
  const pending = queue;
  queue = [];
  for (const events of batches(pending)) {
    try { await post('/social/signals', { events }); } catch { /* tambahan saja; tidak diulang */ }
  }
}

function track(e: SignalEvent) {
  if (!enabled) return;
  const before = queue.length;
  queue = enqueue(queue, e);
  if (queue.length > before && !timer) timer = setTimeout(() => void flushSignals(), FLUSH_MS);
}

export const trackOpen = (postId: number, src: FeedSrc) => track({ postId, type: 'open', src });
export const trackShare = (postId: number, src: FeedSrc) => track({ postId, type: 'share', src });
export const trackHide = (postId: number, src: FeedSrc, hide: boolean) => {
  track({ postId, type: hide ? 'hide' : 'unhide', src });
  void flushSignals(); // pilihan eksplisit warga: kirim segera
};

// Kirim sisa antrean saat aplikasi ke latar belakang (satu kali, tingkat modul).
AppState.addEventListener('change', (s) => { if (s !== 'active') void flushSignals(); });

/**
 * Pasang pada FlatList feed: mengukur berapa lama tiap postingan benar-benar terlihat (>= 60% layar) lalu mencatatnya
 * saat postingan keluar layar, tab berganti, layar ditinggalkan, atau komponen dilepas.
 */
export function useFeedTracking(src: FeedSrc) {
  // Nilai stabil lewat useState lazy (bukan useRef(...).current) agar tidak mengakses ref saat render.
  const [visible] = useState(() => new Map<number, number>());
  const [srcRef] = useState(() => ({ current: src }));
  useEffect(() => { srcRef.current = src; }, [src, srcRef]);

  const finalize = useCallback((as: FeedSrc) => {
    const now = Date.now();
    for (const [id, t] of visible) track({ postId: id, type: 'seen', src: as, ms: now - t });
    visible.clear();
  }, [visible]);

  const [onViewableItemsChanged] = useState(() => ({ changed }: { changed: Viewable[] }) => {
    const now = Date.now();
    for (const c of changed) {
      const id = (c.item as { id?: number } | undefined)?.id;
      if (typeof id !== 'number') continue;
      if (c.isViewable) visible.set(id, now);
      else {
        const t = visible.get(id);
        visible.delete(id);
        if (t) track({ postId: id, type: 'seen', src: srcRef.current, ms: now - t });
      }
    }
  });
  const [viewabilityConfig] = useState(() => ({ itemVisiblePercentThreshold: 60, minimumViewTime: 300 }));

  // Ganti tab: postingan yang sedang terlihat dicatat ke tab lamanya.
  useEffect(() => { const old = src; return () => finalize(old); }, [src, finalize]);
  // Pindah ke tab lain di bawah / tutup layar.
  useFocusEffect(useCallback(() => () => { finalize(srcRef.current); void flushSignals(); }, [finalize, srcRef]));

  return { onViewableItemsChanged, viewabilityConfig };
}
