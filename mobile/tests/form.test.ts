import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { dateInputToIso, digitsOnly, formatCodeInput, formatDateInput } from '../src/lib/form.ts';

describe('input tanggal', () => {
  it('memformat saat diketik', () => {
    assert.equal(formatDateInput('2'), '2');
    assert.equal(formatDateInput('2802'), '28/02');
    assert.equal(formatDateInput('28021990'), '28/02/1990');
    assert.equal(formatDateInput('28/02/1990999'), '28/02/1990');
  });
  it('mengubah ke ISO dan menolak tanggal mustahil', () => {
    assert.equal(dateInputToIso('28/02/1990'), '1990-02-28');
    assert.equal(dateInputToIso('31/02/1990'), null);
    assert.equal(dateInputToIso('28/02'), null);
    assert.equal(dateInputToIso('01/01/1850'), null);
  });
});

describe('input lain', () => {
  it('digitsOnly dan kode desa', () => {
    assert.equal(digitsOnly('32 01-0a1', 16), '320101');
    assert.equal(digitsOnly('1234567890', 4), '1234');
    assert.equal(formatCodeInput('ab3dk7mn'), 'AB3D-K7MN');
    assert.equal(formatCodeInput('ab 3d'), 'AB3D');
  });
});
