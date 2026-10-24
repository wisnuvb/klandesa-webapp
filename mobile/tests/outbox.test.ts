import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  backoffMs, dueItems, enqueue, isRetryable, markFailed, OUTBOX_MAX_AGE_MS, OUTBOX_MAX_ITEMS, parseOutbox, prune, removeItem, type OutboxItem,
} from '../src/lib/outbox-logic.ts';

const NOW = 1_000_000_000_000;
const mk = (id: string, over: Partial<OutboxItem> = {}): OutboxItem => ({
  id, accountId: 1, kind: 'report', label: 'Laporan', payload: { a: 1 }, createdAt: NOW, attempts: 0, nextAt: NOW, ...over,
});

describe('antrean offline', () => {
  it('hanya gagal jaringan/server yang diulang; penolakan data tidak', () => {
    assert.equal(isRetryable('NETWORK', 0), true);
    assert.equal(isRetryable('SERVER', 500), true);
    assert.equal(isRetryable('RATE_LIMITED', 429), true);
    assert.equal(isRetryable('INVALID_REQUEST', 400), false);
    assert.equal(isRetryable('FORBIDDEN', 403), false);
    assert.equal(isRetryable('VILLAGE_INACTIVE', 403), false);
  });
  it('jeda coba ulang naik dua kali lipat dan dibatasi 30 menit', () => {
    assert.equal(backoffMs(0), 30_000);
    assert.equal(backoffMs(1), 60_000);
    assert.equal(backoffMs(3), 240_000);
    assert.equal(backoffMs(50), 30 * 60_000);
  });
  it('antrean penuh menolak item baru dan item basi dibuang', () => {
    let items: OutboxItem[] = [];
    for (let i = 0; i < OUTBOX_MAX_ITEMS; i++) items = enqueue(items, mk(`i${i}`), NOW).items;
    assert.equal(enqueue(items, mk('x'), NOW).ok, false);
    const later = NOW + OUTBOX_MAX_AGE_MS + 1;
    assert.equal(prune(items, later).length, 0);
    assert.equal(enqueue(items, mk('new', { createdAt: later }), later).ok, true);
  });
  it('item jatuh tempo: hanya akun ini, urut dari yang paling lama, menghormati nextAt', () => {
    const items = [mk('b', { createdAt: NOW + 2 }), mk('a', { createdAt: NOW + 1 }), mk('other', { accountId: 2 }), mk('later', { nextAt: NOW + 5000 })];
    assert.deepEqual(dueItems(items, 1, NOW + 10).map((i) => i.id), ['a', 'b']);
    assert.deepEqual(dueItems(items, 1, NOW + 6000).map((i) => i.id), ['a', 'b', 'later'].sort((x, y) => items.find((i) => i.id === x)!.createdAt - items.find((i) => i.id === y)!.createdAt));
  });
  it('gagal menambah percobaan dan menunda; berhasil menghapus', () => {
    const items = markFailed([mk('a')], 'a', NOW);
    assert.equal(items[0].attempts, 1);
    assert.equal(items[0].nextAt, NOW + 60_000);
    assert.deepEqual(removeItem(items, 'a'), []);
  });
  it('data tersimpan yang rusak tidak membuat crash', () => {
    assert.deepEqual(parseOutbox(null), []);
    assert.deepEqual(parseOutbox('{bukan json'), []);
    assert.deepEqual(parseOutbox('{"a":1}'), []);
    assert.deepEqual(parseOutbox(JSON.stringify([mk('ok'), { id: 'x' }, null, 5])).map((i) => i.id), ['ok']);
  });
});
