import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MAX_BATCH, batches, enqueue, type SignalEvent } from '../src/lib/social-signals-logic.ts';

const ev = (postId: number, over: Partial<SignalEvent> = {}): SignalEvent => ({ postId, type: 'open', src: 'forYou', ...over });

describe('antrean sinyal Warga', () => {
  it('membuang "tampil" yang terlalu singkat (sekadar lewat saat menggulir)', () => {
    assert.deepEqual(enqueue([], ev(1, { type: 'seen', ms: 400 })), []);
    assert.equal(enqueue([], ev(1, { type: 'seen', ms: 1500 })).length, 1);
    assert.equal(enqueue([], ev(1, { type: 'open' })).length, 1);
  });
  it('antrean dibatasi; yang terlama dibuang', () => {
    let q: SignalEvent[] = [];
    for (let i = 1; i <= 10; i++) q = enqueue(q, ev(i), 5);
    assert.deepEqual(q.map((e) => e.postId), [6, 7, 8, 9, 10]);
  });
  it('dipecah sesuai batas paket server', () => {
    const q = Array.from({ length: MAX_BATCH * 2 + 3 }, (_, i) => ev(i + 1));
    const b = batches(q);
    assert.deepEqual(b.map((x) => x.length), [MAX_BATCH, MAX_BATCH, 3]);
    assert.deepEqual(batches([]), []);
  });
});
