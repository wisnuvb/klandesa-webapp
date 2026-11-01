import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ORDER_LIMITS, noteProblem, orderLook, parseQuantity, placedMessage, stepQuantity } from '../src/lib/ukm-order-logic.ts';

describe('parseQuantity', () => {
  it('menerima bilangan bulat 1-999', () => {
    assert.equal(parseQuantity('1'), 1);
    assert.equal(parseQuantity(' 12 '), 12);
    assert.equal(parseQuantity('999'), 999);
  });
  it('menolak yang lain', () => {
    for (const bad of ['', '0', '1000', '-1', '1.5', 'abc', '1e2', '12345']) assert.equal(parseQuantity(bad), null, bad);
  });
});

describe('stepQuantity', () => {
  it('tidak keluar dari 1 dan dibatasi stok', () => {
    assert.equal(stepQuantity(1, -1, null), 1);
    assert.equal(stepQuantity(3, 1, 3), 3);
    assert.equal(stepQuantity(2, 1, 3), 3);
    assert.equal(stepQuantity(5, 1, null), 6);
    assert.equal(stepQuantity(ORDER_LIMITS.maxQuantity, 1, null), ORDER_LIMITS.maxQuantity);
    assert.equal(stepQuantity(5, 1, 0), 6, 'stok 0 tidak membatasi di sini; server menolak');
  });
});

describe('orderLook dan teks', () => {
  it('status punya teks dan ikon; nilai asing dianggap dibatalkan', () => {
    assert.equal(orderLook('DIMINTA').label, 'Menunggu penjual');
    assert.equal(orderLook('SELESAI').tone, 'green');
    assert.equal(orderLook('ASING').label, 'Dibatalkan');
    for (const s of ['DIMINTA', 'DIKONFIRMASI', 'SELESAI', 'DIBATALKAN']) assert.ok(orderLook(s).icon);
  });
  it('alasan wajib hanya untuk penjual yang membatalkan', () => {
    assert.ok(noteProblem('batal', 'PENJUAL', ''));
    assert.ok(noteProblem('batal', 'PENJUAL', 'ab'));
    assert.equal(noteProblem('batal', 'PENJUAL', 'Stok habis'), null);
    assert.equal(noteProblem('batal', 'PEMBELI', ''), null);
    assert.equal(noteProblem('konfirmasi', 'PENJUAL', ''), null);
    assert.ok(noteProblem('batal', 'PEMBELI', 'x'.repeat(301)));
  });
  it('teks setelah memesan menyebut pembayaran langsung dan membedakan ada/tiadanya WhatsApp', () => {
    assert.match(placedMessage(true).body, /WhatsApp/);
    assert.match(placedMessage(false).body, /kantor desa/);
    assert.match(placedMessage(true).body, /langsung dengan penjual/);
    assert.match(placedMessage(false).body, /langsung dengan penjual/);
  });
});
