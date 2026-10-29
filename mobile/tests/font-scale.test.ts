import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseFontScale, scaleOf, scaledTextStyle } from '../src/lib/font-scale.ts';

describe('ukuran huruf', () => {
  it('nilai tersimpan yang tidak dikenal kembali ke normal', () => {
    assert.equal(parseFontScale('besar'), 'besar');
    for (const bad of ['', 'huge', null, undefined, 3]) assert.equal(parseFontScale(bad), 'normal');
    assert.equal(scaleOf('sangat-besar'), 1.3);
    assert.equal(scaleOf('normal'), 1);
  });
  it('skala 1 tidak mengubah apa pun', () => {
    assert.equal(scaledTextStyle({ fontSize: 16 }, 1, false), null);
  });
  it('memperbesar fontSize dan lineHeight', () => {
    assert.deepEqual(scaledTextStyle({ fontSize: 16, lineHeight: 24 }, 1.25, false), { fontSize: 20, lineHeight: 30 });
    assert.deepEqual(scaledTextStyle({ fontSize: 17 }, 1.15, false), { fontSize: 19.5 });
  });
  it('Text tingkat atas tanpa fontSize memakai 14 bawaan RN', () => {
    assert.deepEqual(scaledTextStyle({}, 1.3, false), { fontSize: 18.2 });
    assert.deepEqual(scaledTextStyle(undefined, 1.3, false), { fontSize: 18.2 });
  });
  it('Text bersarang tanpa fontSize mewarisi induk (tidak diperbesar dua kali)', () => {
    assert.equal(scaledTextStyle({ fontWeight: '700' } as never, 1.3, true), null);
    assert.deepEqual(scaledTextStyle({ fontSize: 12 }, 1.3, true), { fontSize: 15.6 });
  });
});
