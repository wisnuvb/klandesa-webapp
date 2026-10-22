import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatDateId, greetingId, timeAgoId } from '../src/lib/format.ts';

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
