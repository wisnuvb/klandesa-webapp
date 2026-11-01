import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  contactLinks, createdMessage, formatPhone, formatPriceInput, isFormDirty, priceLabel, quotaLabel, statusLook, UKM_LIMITS, validateUkmForm,
  type UkmFormValues,
} from '../src/lib/ukm-logic.ts';

const base: UkmFormValues = { name: 'Keripik Singkong', description: 'Keripik singkong renyah, tanpa pengawet.', priceText: '15.000', unit: 'bungkus', category: 'Makanan', stockText: '20', contactText: '', showContact: false };
const ctx = { categories: ['Makanan', 'Kerajinan'], photos: ['https://cdn/x/1.jpg'], maxPhotos: 4 };

describe('validateUkmForm', () => {
  it('formulir lengkap: payload bersih (angka, trim)', () => {
    const r = validateUkmForm({ ...base, name: '  Keripik Singkong ' }, ctx);
    assert.ok(r.ok);
    assert.deepEqual(r.payload, {
      name: 'Keripik Singkong', description: 'Keripik singkong renyah, tanpa pengawet.', price: 15000, unit: 'bungkus',
      category: 'Makanan', stock: 20, photos: ['https://cdn/x/1.jpg'], contactPhone: null, showContact: false,
    });
  });

  it('hanya nama dan deskripsi yang wajib; sisanya boleh kosong', () => {
    const r = validateUkmForm({ ...base, priceText: '', unit: '', category: null, stockText: '' }, { ...ctx, photos: [] });
    assert.ok(r.ok);
    assert.equal(r.payload.price, null);
    assert.equal(r.payload.stock, null);
    assert.equal(r.payload.category, null);
    assert.deepEqual(r.payload.photos, []);
  });

  it('nama: terlalu pendek, terlalu panjang, dan tepat di batas', () => {
    assert.match(String((validateUkmForm({ ...base, name: 'ab' }, ctx) as { errors: { name?: string } }).errors.name), /minimal 3/);
    assert.match(String((validateUkmForm({ ...base, name: 'a'.repeat(101) }, ctx) as { errors: { name?: string } }).errors.name), /maksimal 100/);
    assert.ok(validateUkmForm({ ...base, name: 'abc' }, ctx).ok);
    assert.ok(validateUkmForm({ ...base, name: 'a'.repeat(UKM_LIMITS.nameMax) }, ctx).ok);
  });

  it('nama hanya spasi dianggap kosong', () => {
    const r = validateUkmForm({ ...base, name: '     ' }, ctx);
    assert.ok(!r.ok);
    assert.ok(r.errors.name);
  });

  it('deskripsi: pendek, panjang, dan batas', () => {
    assert.match(String((validateUkmForm({ ...base, description: 'pendek' }, ctx) as { errors: { description?: string } }).errors.description), /minimal 10/);
    assert.match(String((validateUkmForm({ ...base, description: 'x'.repeat(1001) }, ctx) as { errors: { description?: string } }).errors.description), /maksimal 1000/);
    assert.ok(validateUkmForm({ ...base, description: 'x'.repeat(10) }, ctx).ok);
    assert.ok(validateUkmForm({ ...base, description: 'x'.repeat(1000) }, ctx).ok);
  });

  it('harga: titik ribuan dan "Rp" diterima; nol diterima; huruf murni ditolak; terlalu besar ditolak', () => {
    const ok = (priceText: string) => {
      const r = validateUkmForm({ ...base, priceText }, ctx);
      assert.ok(r.ok, priceText);
      return r.payload.price;
    };
    assert.equal(ok('Rp 15.000'), 15000);
    assert.equal(ok('0'), 0);
    assert.equal(ok('  '), null);
    const letters = validateUkmForm({ ...base, priceText: 'gratis' }, ctx);
    assert.ok(!letters.ok);
    assert.match(letters.errors.price!, /angka/);
    const huge = validateUkmForm({ ...base, priceText: '12345678901' }, ctx);
    assert.ok(!huge.ok);
    assert.match(huge.errors.price!, /terlalu besar/);
  });

  it('satuan: maksimal 20 huruf', () => {
    assert.ok(validateUkmForm({ ...base, unit: 'x'.repeat(20) }, ctx).ok);
    const r = validateUkmForm({ ...base, unit: 'x'.repeat(21) }, ctx);
    assert.ok(!r.ok);
    assert.match(r.errors.unit!, /maksimal 20/);
  });

  it('kategori: harus dari daftar, atau kosong', () => {
    const r = validateUkmForm({ ...base, category: 'Buatan Sendiri' }, ctx);
    assert.ok(!r.ok);
    assert.ok(r.errors.category);
    assert.ok(validateUkmForm({ ...base, category: 'Kerajinan' }, ctx).ok);
    assert.ok(validateUkmForm({ ...base, category: null }, ctx).ok);
  });

  it('stok: bulat 0–999999, bukan desimal/negatif/huruf', () => {
    assert.equal((validateUkmForm({ ...base, stockText: '0' }, ctx) as { payload: { stock: number } }).payload.stock, 0);
    assert.ok(validateUkmForm({ ...base, stockText: '999999' }, ctx).ok);
    for (const bad of ['1,5', '-3', 'banyak', '1000000']) {
      const r = validateUkmForm({ ...base, stockText: bad }, ctx);
      assert.ok(!r.ok, bad);
      assert.ok(r.errors.stock, bad);
    }
  });

  it('foto: melebihi batas ditolak', () => {
    const many = ['a', 'b', 'c', 'd', 'e'];
    const r = validateUkmForm(base, { ...ctx, photos: many });
    assert.ok(!r.ok);
    assert.match(r.errors.photos!, /Maksimal 4 foto/);
    assert.ok(validateUkmForm(base, { ...ctx, photos: many.slice(0, 4) }).ok);
  });

  it('beberapa galat sekaligus dilaporkan bersama', () => {
    const r = validateUkmForm({ ...base, name: '', description: '', stockText: 'x' }, ctx);
    assert.ok(!r.ok);
    assert.deepEqual(Object.keys(r.errors).sort(), ['description', 'name', 'stock']);
  });
});

describe('kontak penjual', () => {
  const run = (contactText: string, showContact: boolean) => validateUkmForm({ ...base, contactText, showContact }, ctx);

  it('kontak opsional; nomor dirapikan dan pilihan tampil ikut terkirim', () => {
    const r = run('0812-3456 7890', true);
    assert.ok(r.ok);
    assert.deepEqual([r.payload.contactPhone, r.payload.showContact], ['081234567890', true]);
    const off = run('+62 812 3456 7890', false);
    assert.ok(off.ok);
    assert.deepEqual([off.payload.contactPhone, off.payload.showContact], ['+6281234567890', false]);
  });

  it('nomor kosong: tidak ada kontak, pilihan tampil otomatis mati', () => {
    const r = run('  ', false);
    assert.ok(r.ok);
    assert.deepEqual([r.payload.contactPhone, r.payload.showContact], [null, false]);
  });

  it('menampilkan kontak tanpa nomor ditolak dengan pesan jelas', () => {
    const r = run('', true);
    assert.ok(!r.ok);
    assert.match(r.errors.contact!, /Isi nomor/);
  });

  it('nomor tidak valid: huruf, terlalu pendek, terlalu panjang', () => {
    for (const bad of ['abc', '0812abc', '1234567', '1'.repeat(16), '++6281234567']) {
      const r = run(bad, false);
      assert.ok(!r.ok, bad);
      assert.match(r.errors.contact!, /tidak valid/, bad);
    }
    assert.ok(run('12345678', false).ok);
    assert.ok(run('1'.repeat(15), false).ok);
  });

  it('tautan: WhatsApp memakai awalan 62, telepon memakai nomor asli', () => {
    assert.deepEqual(contactLinks('081234567890'), { tel: 'tel:081234567890', whatsapp: 'https://wa.me/6281234567890' });
    assert.deepEqual(contactLinks('+6281234567890'), { tel: 'tel:+6281234567890', whatsapp: 'https://wa.me/6281234567890' });
    assert.deepEqual(contactLinks('6281234567890'), { tel: 'tel:6281234567890', whatsapp: 'https://wa.me/6281234567890' });
  });

  it('tampilan nomor dikelompokkan; nomor pendek apa adanya', () => {
    assert.equal(formatPhone('081234567890'), '0812 3456 7890');
    assert.equal(formatPhone('+6281234567890'), '+6281 2345 6789 0');
    assert.equal(formatPhone('12345678'), '12345678');
  });

  it('teks setelah kirim: langsung tayang vs menunggu persetujuan', () => {
    assert.match(createdMessage('active').title, /sudah tayang/);
    assert.match(createdMessage('pending').title, /menunggu persetujuan/);
  });
});

describe('formatPriceInput & priceLabel', () => {
  it('titik ribuan saat mengetik, buang selain angka dan nol di depan', () => {
    assert.equal(formatPriceInput('15000'), '15.000');
    assert.equal(formatPriceInput('Rp 1500000'), '1.500.000');
    assert.equal(formatPriceInput('007'), '7');
    assert.equal(formatPriceInput(''), '');
    assert.equal(formatPriceInput('abc'), '');
    assert.equal(formatPriceInput('123456789012'), '1.234.567.890');
  });
  it('label harga dengan satuan, tanpa satuan, dan tanpa harga', () => {
    assert.equal(priceLabel(15000, 'kg'), 'Rp15.000 / kg');
    assert.equal(priceLabel(15000, '  '), 'Rp15.000');
    assert.equal(priceLabel(15000, null), 'Rp15.000');
    assert.equal(priceLabel(0, null), 'Rp0');
    assert.equal(priceLabel(null, 'kg'), 'Harga belum diisi');
  });
});

describe('statusLook', () => {
  it('setiap status punya teks, nada, dan ikon berbeda', () => {
    const all = (['active', 'pending', 'hidden', 'inactive'] as const).map((s) => statusLook(s));
    assert.deepEqual(all.map((a) => a.tone), ['green', 'gold', 'muted', 'red']);
    assert.equal(new Set(all.map((a) => a.icon)).size, 4);
    assert.equal(new Set(all.map((a) => a.label)).size, 4);
  });
  it('label dari server dipakai bila ada; status tak dikenal jatuh ke "menunggu"', () => {
    assert.equal(statusLook('active', 'Sedang tayang').label, 'Sedang tayang');
    assert.equal(statusLook('active', null).label, 'Tayang');
    assert.equal(statusLook('aneh' as never).tone, 'gold');
  });
});

describe('isFormDirty & quotaLabel', () => {
  const a = { ...base, photos: ['x'] };
  it('sama = tidak berubah; spasi dan format harga tidak dihitung', () => {
    assert.equal(isFormDirty(a, { ...a, name: ' Keripik Singkong ', priceText: '15000' }), false);
  });
  it('perubahan di bidang mana pun terdeteksi', () => {
    assert.equal(isFormDirty(a, { ...a, name: 'Lain' }), true);
    assert.equal(isFormDirty(a, { ...a, description: 'Lain lagi ya' }), true);
    assert.equal(isFormDirty(a, { ...a, priceText: '16.000' }), true);
    assert.equal(isFormDirty(a, { ...a, unit: 'kg' }), true);
    assert.equal(isFormDirty(a, { ...a, category: null }), true);
    assert.equal(isFormDirty(a, { ...a, stockText: '' }), true);
    assert.equal(isFormDirty(a, { ...a, contactText: '0812' }), true);
    assert.equal(isFormDirty(a, { ...a, showContact: true }), true);
    assert.equal(isFormDirty(a, { ...a, photos: [] }), true);
    assert.equal(isFormDirty(a, { ...a, photos: ['y'] }), true);
  });
  it('label kuota', () => {
    assert.equal(quotaLabel(3, 20), '3 dari 20 produk');
  });
});
