import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { dialNumber, formatDateId, formatRupiahShort, greetingId, timeAgoId } from '../src/lib/format.ts';

describe('format tanggal & waktu', () => {
  it('tanggal Indonesia', () => {
    assert.equal(formatDateId(new Date(2026, 9, 20, 12)), '20 Oktober 2026');
  });
  it('waktu relatif', () => {
    const now = new Date(2026, 9, 22, 12, 0, 0).getTime();
    assert.equal(timeAgoId(new Date(now - 10_000), now), 'baru saja');
    assert.equal(timeAgoId(new Date(now - 5 * 60_000), now), '5 menit lalu');
    assert.equal(timeAgoId(new Date(now - 3 * 3_600_000), now), '3 jam lalu');
    assert.equal(timeAgoId(new Date(now - 30 * 3_600_000), now), 'kemarin');
    assert.equal(timeAgoId(new Date(now - 3 * 86_400_000), now), '3 hari lalu');
    assert.equal(timeAgoId(new Date(2026, 8, 1, 12), now), '1 September 2026');
  });
  it('sapaan', () => {
    assert.equal(greetingId(7), 'Selamat pagi');
    assert.equal(greetingId(13), 'Selamat siang');
    assert.equal(greetingId(16), 'Selamat sore');
    assert.equal(greetingId(20), 'Selamat malam');
  });
});

describe('format rupiah & telepon', () => {
  it('rupiah ringkas', () => {
    assert.equal(formatRupiahShort(0), 'Rp 0');
    assert.equal(formatRupiahShort(850), 'Rp 850');
    assert.equal(formatRupiahShort(850_000), 'Rp 850 ribu');
    assert.equal(formatRupiahShort(1_240_000), 'Rp 1,2 juta');
    assert.equal(formatRupiahShort(3_450_000_000), 'Rp 3,5 miliar');
    assert.equal(formatRupiahShort(-5), 'Rp 0');
    assert.equal(formatRupiahShort(Number.NaN), 'Rp 0');
  });
  it('nomor telepon', () => {
    assert.equal(dialNumber(' (0334) 123-456 '), '0334123456');
    assert.equal(dialNumber('+62 812-3456'), '+628123456');
    assert.equal(dialNumber('12'), null);
    assert.equal(dialNumber(null), null);
  });
});
