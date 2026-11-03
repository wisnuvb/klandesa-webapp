import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateSkew, flattenBackground, prepareForOcr, rotateGray, stretchContrast, type Gray } from "../lib/kependudukan/kk-ocr/image-ops.ts";

/** Halaman putih dengan baris teks berupa garis tebal horizontal, dimiringkan `deg` derajat searah jarum jam. */
function page(width: number, height: number, deg: number, shade = false): Gray {
  const data = new Uint8ClampedArray(width * height).fill(235);
  const rad = (deg * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // koordinat dalam halaman tegak (putar balik)
      const dx = x - cx;
      const dy = y - cy;
      const py = -dx * Math.sin(rad) + dy * Math.cos(rad) + cy;
      const px = dx * Math.cos(rad) + dy * Math.sin(rad) + cx;
      const onLine = px > 60 && px < width - 60 && Math.floor(py / 28) % 2 === 0 && py > 40 && py < height - 40 && py % 28 < 12;
      let v = onLine ? 40 : 235;
      if (shade) v *= 0.55 + 0.45 * (x / width);
      data[y * width + x] = v;
    }
  }
  return { data, width, height };
}

describe("citra: kemiringan", () => {
  it("memperkirakan sudut kemiringan baris teks", () => {
    for (const deg of [0, 2, -3, 4.5]) {
      const est = estimateSkew(page(900, 600, deg));
      assert.ok(Math.abs(est - deg) <= 0.75, `sudut ${deg} terbaca ${est}`);
    }
  });
  it("halaman hampir kosong dianggap lurus", () => {
    assert.equal(estimateSkew({ data: new Uint8ClampedArray(400 * 300).fill(240), width: 400, height: 300 }), 0);
  });
  it("memutar balik hingga baris kembali datar", () => {
    const tilted = page(900, 600, 3);
    const fixed = rotateGray(tilted, -estimateSkew(tilted));
    assert.ok(Math.abs(estimateSkew(fixed)) <= 0.5);
    assert.equal(fixed.width, tilted.width);
  });
});

describe("citra: bayangan dan kontras", () => {
  it("meratakan gradien bayangan sehingga latar kertas seragam", () => {
    const shaded = page(900, 600, 0, true);
    const flat = flattenBackground(shaded);
    const sample = (g: Gray, x: number) => g.data[10 * g.width + x]; // baris tepi atas: kertas kosong
    assert.ok(Math.abs(sample(shaded, 100) - sample(shaded, 800)) > 60, "sebelum: gradien kuat");
    assert.ok(Math.abs(sample(flat, 100) - sample(flat, 800)) < 25, "sesudah: gradien hilang");
  });
  it("regangan kontras memakai rentang penuh dan tidak mengubah citra datar", () => {
    const low = new Uint8ClampedArray(1000).map((_, i) => 100 + (i % 50));
    const s = stretchContrast({ data: low, width: 100, height: 10 });
    assert.ok(Math.max(...s.data) >= 250 && Math.min(...s.data) <= 5);
    const flat = { data: new Uint8ClampedArray(100).fill(128), width: 10, height: 10 };
    assert.equal(stretchContrast(flat), flat);
  });
  it("rangkaian lengkap mengembalikan ukuran sama dan sudut koreksi", () => {
    const r = prepareForOcr(page(900, 600, -2.5, true));
    assert.equal(r.gray.width, 900);
    assert.ok(Math.abs(r.skew - -2.5) <= 0.75);
  });
});
