import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getCatalogV2 } from "../lib/letters/catalog/index.ts";
import {
  LETTER_GUIDES,
  REVIEWED_LETTER_KEYS,
  getPublicLetter,
  isLetterHubIndexable,
  letterSlug,
  listIndexableLetterPaths,
  listPublicLetters,
  publicSampleValues,
} from "../lib/letters/public-catalog.ts";
import { fitScale, initialScaleCss } from "../app/(landing)/contoh-surat/SampleLetterFrame.tsx";
import { LetterPaper } from "../components/letters/LetterPaper.tsx";

describe("katalog surat publik (Contoh Surat)", () => {
  const letters = listPublicLetters();
  const catalog = getCatalogV2();

  it("memuat semua surat katalog dan semua dokumennya valid", () => {
    assert.equal(letters.length, catalog.length);
    assert.deepEqual(letters.map((l) => l.catalogKey), catalog.map((e) => e.catalogKey));
  });

  it("slug unik, URL-aman, dan stabil", () => {
    const slugs = letters.map((l) => l.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const s of slugs) assert.match(s, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, s);
    assert.equal(letterSlug("Surat Keterangan Tidak Mampu (SKTM)"), "surat-keterangan-tidak-mampu");
    assert.equal(letterSlug("Surat Keterangan Beda Nama / Identitas"), "surat-keterangan-beda-nama-identitas");
    assert.equal(getPublicLetter("surat-keterangan-domisili")?.catalogKey, "cat_sk_domisili");
    assert.equal(getPublicLetter("tidak-ada"), null);
  });

  it("setiap surat bisa dirender dengan data contoh fiktif (tanpa desa sungguhan)", () => {
    for (const l of letters) {
      const html = renderToStaticMarkup(createElement(LetterPaper, { doc: l.doc, values: publicSampleValues(l.doc), mode: "preview" }));
      assert.ok(html.length > 200, l.catalogKey);
      assert.ok(!html.includes("Brambang") && !html.includes("Gondangwetan"), `${l.catalogKey} memuat nama desa contoh sungguhan`);
    }
  });

  it("ringkasan data yang disiapkan terisi: ada data warga atau isian untuk surat berbasis warga", () => {
    const domisili = getPublicLetter("surat-keterangan-domisili")!;
    assert.ok(domisili.summary.people.some((p) => p.fields.includes("Nama lengkap")));
    assert.ok(domisili.summary.isian.includes("Keperluan"));
  });

  it("naskah hanya untuk kunci katalog yang nyata, dan kunci tinjauan tidak menunjuk ke naskah yang tak ada", () => {
    const keys = new Set(catalog.map((e) => e.catalogKey));
    for (const k of Object.keys(LETTER_GUIDES)) assert.ok(keys.has(k), `naskah untuk kunci tak dikenal: ${k}`);
    for (const k of REVIEWED_LETTER_KEYS) assert.ok(LETTER_GUIDES[k], `kunci ditinjau tanpa naskah: ${k}`);
  });

  it("PAGAR INDEKS: tanpa peninjauan, tidak ada yang indexable dan sitemap kosong", () => {
    // Bila pemilik mulai menambah REVIEWED_LETTER_KEYS, tes ini diperbarui sesuai: hanya yang ditinjau yang boleh true.
    for (const l of letters) assert.equal(l.indexable, REVIEWED_LETTER_KEYS.has(l.catalogKey) && !!LETTER_GUIDES[l.catalogKey], l.catalogKey);
    assert.equal(isLetterHubIndexable(), REVIEWED_LETTER_KEYS.size > 0);
    const paths = listIndexableLetterPaths();
    assert.equal(paths.length === 0, REVIEWED_LETTER_KEYS.size === 0);
    if (paths.length) assert.equal(paths[0], "/contoh-surat");
  });
});

describe("bingkai kertas surat (anti-CLS)", () => {
  const paperPx = (215 / 25.4) * 96;

  it("fitScale: tidak memperbesar, minimal 0,3, proporsional", () => {
    assert.equal(fitScale(2000, paperPx), 1);
    assert.equal(fitScale(50, paperPx), 0.3);
    const s = fitScale(400, paperPx);
    assert.ok(s > 0.45 && s < 0.5, String(s));
  });

  it("CSS skala awal: tebakan server tidak pernah lebih besar dari skala ukur (kertas tak meluap) dan selisih kecil", () => {
    const css = initialScaleCss(paperPx, ".x");
    const rules = [...css.matchAll(/@media \(min-width:(\d+)px\)\{\.x\{zoom:([\d.]+)\}\}/g)].map((m) => ({ vw: Number(m[1]), z: Number(m[2]) }));
    assert.ok(rules.length > 10);
    for (const { vw, z } of rules) {
      for (const probe of [vw, vw + 39]) {
        const gutter = probe >= 640 ? 48 : 32;
        const box = Math.min(probe, 896 + gutter) - gutter - 18;
        const real = fitScale(box, paperPx);
        assert.ok(z <= real + 0.001, `vw ${probe}: tebakan ${z} > ukur ${real}`);
        assert.ok(real - z < 0.06, `vw ${probe}: selisih ${(real - z).toFixed(3)} terlalu besar`);
      }
    }
  });
});
