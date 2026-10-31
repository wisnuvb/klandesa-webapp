import assert from "node:assert/strict";
import test from "node:test";
import { HARD_MAX_DIMENSION, baseCropSize, cropRect, fitWithin, frameSize } from "../lib/digitalArchive/image-edit";

test("baseCropSize: tanpa rasio = seluruh gambar", () => {
  assert.deepEqual(baseCropSize(4000, 3000, null), { w: 4000, h: 3000 });
});

test("baseCropSize: persegi dari gambar landscape memakai sisi pendek", () => {
  assert.deepEqual(baseCropSize(4000, 3000, 1), { w: 3000, h: 3000 });
});

test("baseCropSize: 16:9 dari gambar portrait dibatasi lebar", () => {
  const r = baseCropSize(1000, 2000, 16 / 9);
  assert.equal(r.w, 1000);
  assert.ok(Math.abs(r.h - 562.5) < 1e-9);
});

test("cropRect: zoom 1 di tengah menutup area dasar", () => {
  const r = cropRect({ imgW: 4000, imgH: 3000, aspect: 1, zoom: 1, cx: 2000, cy: 1500 });
  assert.deepEqual(r, { x: 500, y: 0, w: 3000, h: 3000 });
});

test("cropRect: zoom 2 memperkecil area separuh", () => {
  const r = cropRect({ imgW: 4000, imgH: 3000, aspect: null, zoom: 2, cx: 2000, cy: 1500 });
  assert.deepEqual(r, { x: 1000, y: 750, w: 2000, h: 1500 });
});

test("cropRect: titik tengah dijepit agar area tidak keluar gambar", () => {
  const r = cropRect({ imgW: 4000, imgH: 3000, aspect: null, zoom: 2, cx: -500, cy: 99999 });
  assert.equal(r.x, 0);
  assert.equal(r.y + r.h, 3000);
  const r2 = cropRect({ imgW: 4000, imgH: 3000, aspect: null, zoom: 2, cx: 99999, cy: -5 });
  assert.equal(r2.x + r2.w, 4000);
  assert.equal(r2.y, 0);
});

test("cropRect: zoom di bawah 1 diperlakukan sebagai 1", () => {
  const r = cropRect({ imgW: 1000, imgH: 500, aspect: null, zoom: 0.2, cx: 500, cy: 250 });
  assert.deepEqual(r, { x: 0, y: 0, w: 1000, h: 500 });
});

test("fitWithin: memperkecil mempertahankan rasio dan tidak pernah membesarkan", () => {
  assert.deepEqual(fitWithin(4000, 3000, 1280), { w: 1280, h: 960 });
  assert.deepEqual(fitWithin(600, 400, 1280), { w: 600, h: 400 });
});

test("fitWithin: tanpa batas tetap dijepit HARD_MAX_DIMENSION", () => {
  const r = fitWithin(8000, 4000, null);
  assert.equal(r.w, HARD_MAX_DIMENSION);
  assert.equal(r.h, HARD_MAX_DIMENSION / 2);
});

test("fitWithin: minimal 1px", () => {
  assert.deepEqual(fitWithin(1, 10000, 100), { w: 1, h: 100 });
});

test("frameSize: dibatasi lebar yang tersedia, lalu tinggi maksimum", () => {
  assert.deepEqual(frameSize(400, 300, 2), { w: 400, h: 200 });
  assert.deepEqual(frameSize(800, 300, 1), { w: 300, h: 300 });
});
