import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createCrashGate, errorParts } from '../src/lib/crash-logic.ts';

describe('pembatas laporan crash', () => {
  it('pesan yang sama hanya sekali', () => {
    const g = createCrashGate(5);
    assert.equal(g('boom'), true);
    assert.equal(g('boom'), false);
    assert.equal(g('lain'), true);
  });
  it('maksimal sesuai batas per peluncuran', () => {
    const g = createCrashGate(2);
    assert.deepEqual(['a', 'b', 'c', 'd'].map(g), [true, true, false, false]);
  });
});

describe('isi error', () => {
  it('Error, string, objek, dan nilai aneh', () => {
    assert.equal(errorParts(new Error('x')).message, 'x');
    assert.equal(errorParts('teks').message, 'teks');
    assert.equal(errorParts({ a: 1 }).message, '{"a":1}');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    assert.equal(errorParts(circular).message, 'Error tidak dikenal');
    assert.equal(errorParts(undefined).message, 'Error tidak dikenal');
  });
});
