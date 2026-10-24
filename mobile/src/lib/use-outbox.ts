import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { flushOutbox, listOutbox, subscribeOutbox } from './outbox';

/** Jumlah kiriman yang menunggu sinyal untuk akun ini. */
export function useOutboxCount(accountId: number | undefined): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (accountId == null) return;
    let alive = true;
    const read = () => void listOutbox(accountId).then((l) => alive && setN(l.length));
    read();
    const off = subscribeOutbox(read);
    return () => { alive = false; off(); };
  }, [accountId]);
  return n;
}

/** Mencoba mengirim antrean saat app dibuka/kembali aktif dan tiap menit selama aktif. */
export function useOutboxFlusher(accountId: number | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (accountId == null) return;
    const run = () => void flushOutbox(accountId).then((sent) => {
      if (sent > 0) {
        void qc.invalidateQueries({ queryKey: ['reports'] });
        void qc.invalidateQueries({ queryKey: ['mail-requests'] });
        void qc.invalidateQueries({ queryKey: ['home'] });
      }
    });
    run();
    const timer = setInterval(run, 60_000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') run(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [accountId, qc]);
}
