import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { validateFieldHelp, validateGuide, type GuideBlock } from "../lib/guides/types.ts";
import { RPJMDES_FIELD_HELP, RPJMDES_GUIDE, RPJM_FIELD_HELP, RPJM_GUIDE, RPJM_GUIDE_ENTRIES, rpjmFieldHelp, rpjmdesFieldHelp } from "../lib/guides/rpjm.ts";
import { FieldHelpBlock } from "../components/app/guide/PageGuide.tsx";

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const CONTENT = src("app/(app)/rpjm/_components/ContentTab.tsx");
const PROGRAMS = src("app/(app)/rpjm/_components/ProgramsTab.tsx");
const LEGACY = src("app/(app)/rpjmdes/page.tsx");

function words(blocks: GuideBlock[]): number {
  const t: string[] = [];
  for (const b of blocks) {
    if ("title" in b && b.title) t.push(b.title);
    if (b.type === "steps") b.items.forEach((i) => t.push(i.title, i.body));
    if (b.type === "list") t.push(...b.items);
    if (b.type === "split") t.push(...b.left.items, ...b.right.items);
    if (b.type === "cards") b.items.forEach((i) => t.push(i.title, i.body, ...(i.facts ?? []).flatMap((f) => [f.label, f.value])));
    if (b.type === "glossary") b.items.forEach((i) => t.push(i.term, i.meaning));
    if (b.type === "note") t.push(b.text);
  }
  return t.join(" ").split(/\s+/).filter(Boolean).length;
}

describe("panduan RPJM Desa dan RPJMDes", () => {
  it("struktur panduan sehat dan tab tidak melebihi ±600 kata", () => {
    for (const g of [RPJM_GUIDE, RPJMDES_GUIDE]) {
      assert.deepEqual(validateGuide(g), []);
      for (const t of g.tabs) assert.ok(words(t.blocks) <= 600, `${g.id}/${t.id}: ${words(t.blocks)} kata`);
    }
  });

  it("katalog /bantuan: id unik berawalan rpjm, href sesuai rute, ringkasan satu kalimat", () => {
    assert.deepEqual(RPJM_GUIDE_ENTRIES.map((e) => e.href), ["/rpjm", "/rpjmdes"]);
    const ids = RPJM_GUIDE_ENTRIES.map((e) => e.guide.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const e of RPJM_GUIDE_ENTRIES) {
      assert.ok(e.guide.id.startsWith("rpjm"));
      assert.ok(e.summary.trim().length > 20);
    }
  });

  it("petunjuk kolom lolos validasi, contoh memakai '…', dan tanpa rujukan pasal yang belum diverifikasi", () => {
    const all = [...Object.entries(RPJM_FIELD_HELP), ...Object.entries(RPJMDES_FIELD_HELP)];
    for (const [k, h] of all) {
      assert.deepEqual(validateFieldHelp(k, h), []);
      if ("example" in h) assert.match(h.example, /…/, `${k}: contoh harus memakai …`);
      assert.equal("ref" in h, false, `${k}: ref belum diverifikasi`);
    }
  });

  it("kunci kolom Tahapan RPJM Desa benar-benar ada di kode (kolom yang diganti nama tidak boleh yatim)", () => {
    for (const k of ["vision", "mission", "policyDirection", "reviewSummary"]) {
      assert.match(CONTENT, new RegExp(`area\\("${k}"`), `ContentTab: ${k}`);
      assert.ok(rpjmFieldHelp(k));
    }
    for (const k of ["activityCode", "budget", "method", "benefit"]) {
      assert.match(PROGRAMS, new RegExp(`\\b${k}: "`), `ProgramsTab LABELS: ${k}`);
      assert.match(PROGRAMS, new RegExp(`(common|hint|text)\\("${k}"`), `ProgramsTab kolom: ${k}`);
      assert.ok(rpjmFieldHelp(k));
    }
    assert.equal(rpjmFieldHelp("tidakAda"), undefined);
    assert.equal(Object.keys(RPJM_FIELD_HELP).length, 8);
  });

  it("kolom RPJMDes lama: id petunjuk, aria-describedby, dan label terhubung ada di halaman", () => {
    assert.match(LEGACY, /htmlFor="rpjmdes-periodEnd"/);
    assert.match(LEGACY, /id="rpjmdes-periodEnd"/);
    assert.match(LEGACY, /aria-describedby="rpjmdes-periodEnd-hint"/);
    for (const id of ["act-sdg", "prop-sdg"]) {
      assert.match(LEGACY, new RegExp(`aria-labelledby="${id}-label"`));
      assert.match(LEGACY, new RegExp(`aria-describedby="${id}-hint"`));
      assert.match(LEGACY, new RegExp(`<FieldHelpBlock id="${id}"`));
    }
    assert.ok(rpjmdesFieldHelp("sdgTags") && rpjmdesFieldHelp("periodEnd"));
  });

  it("pemasangan: tombol dan banner ada di tiap halaman", () => {
    for (const p of ["app/(app)/rpjm/_components/RpjmView.tsx", "app/(app)/rpjm/_components/RpjmDetail.tsx"]) {
      const s = src(p);
      assert.match(s, /<GuideButton guide=\{RPJM_GUIDE\}/, p);
      assert.match(s, /<FirstVisitBanner guide=\{RPJM_GUIDE\}/, p);
    }
    assert.match(LEGACY, /<GuideButton guide=\{RPJMDES_GUIDE\}/);
    assert.match(LEGACY, /<FirstVisitBanner guide=\{RPJMDES_GUIDE\}/);
  });

  it("FieldHelpBlock menautkan tip ke kolom dan menyembunyikan contoh sampai dibuka", () => {
    const html = renderToStaticMarkup(React.createElement(FieldHelpBlock, { id: "ct-vision", help: rpjmFieldHelp("vision")! }));
    assert.match(html, /id="ct-vision-hint"/);
    assert.match(html, /Lihat contoh isian/);
    assert.match(html, /aria-expanded="false"/);
  });
});
