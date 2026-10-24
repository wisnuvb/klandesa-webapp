import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildAnnouncementShare, PLAY_STORE_URL } from '../src/lib/share.ts';

describe('teks bagikan kabar', () => {
  it('memuat judul tebal, isi, nama desa, dan tautan unduh', () => {
    const t = buildAnnouncementShare({ title: ' Kerja bakti ', content: 'Minggu  07.00\nbawa cangkul' }, 'Karanganyar');
    assert.ok(t.startsWith('*Kerja bakti*\nMinggu 07.00 bawa cangkul'));
    assert.ok(t.includes('Desa Karanganyar'));
    assert.ok(t.endsWith(PLAY_STORE_URL));
  });
  it('memotong isi panjang dan tidak membuat baris kosong ganda saat isi kosong', () => {
    const long = buildAnnouncementShare({ title: 'T', content: 'a'.repeat(1000) }, 'X');
    assert.ok(long.length < 700);
    assert.ok(long.includes('…'));
    const empty = buildAnnouncementShare({ title: 'T', content: '   ' }, 'X');
    assert.ok(!empty.includes('\n\n\n'));
  });
});
