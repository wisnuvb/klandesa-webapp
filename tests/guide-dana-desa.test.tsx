import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BLT_FIELD_IDS, BLT_GUIDE, DANA_DESA_FIELD_IDS, DANA_DESA_GUIDE, DANA_DESA_GUIDE_ENTRIES, bltFieldHelp, danaDesaFieldHelp, type BltFieldKey, type DanaDesaFieldKey } from "../lib/guides/dana-desa.ts";
import { validateFieldHelp, validateGuide, type GuideBlock, type PageGuide } from "../lib/guides/types.ts";
import { FieldHelpBlock } from "../components/app/guide/PageGuide.tsx";

const h = React.createElement;
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const DD = "app/(app)/dana-desa/_components/";
const BLT = "app/(app)/blt/_components/";

const text = (g: PageGuide): string[] =>
  g.tabs.map((t) =>
    t.blocks
      .map((b: GuideBlock) => {
        switch (b.type) {
          case "steps": return b.items.map((i) => `${i.title} ${i.body}`).join(" ");
          case "list": return b.items.join(" ");
          case "split": return [...b.left.items, ...b.right.items].join(" ");
          case "cards": return b.items.map((i) => `${i.title} ${i.body} ${(i.facts ?? []).map((f) => f.value).join(" ")}`).join(" ");
          case "glossary": return b.items.map((i) => `${i.term} ${i.meaning}`).join(" ");
          case "note": return b.text;
        }
      })
      .join(" "),
  );

describe("panduan Dana Desa dan BLT", () => {
  it("kedua panduan lolos validasi struktur dan id-nya unik", () => {
    assert.deepEqual(validateGuide(DANA_DESA_GUIDE), []);
    assert.deepEqual(validateGuide(BLT_GUIDE), []);
    assert.equal(DANA_DESA_GUIDE.id, "dana-desa");
    assert.equal(BLT_GUIDE.id, "blt");
  });

  it("katalog /bantuan: dua entri dengan rute yang ada", () => {
    assert.deepEqual(DANA_DESA_GUIDE_ENTRIES.map((e) => e.href), ["/dana-desa", "/blt"]);
    for (const e of DANA_DESA_GUIDE_ENTRIES) assert.ok(e.summary.length > 20);
    assert.equal(DANA_DESA_GUIDE_ENTRIES[0]!.guide, DANA_DESA_GUIDE);
    assert.equal(DANA_DESA_GUIDE_ENTRIES[1]!.guide, BLT_GUIDE);
    for (const e of DANA_DESA_GUIDE_ENTRIES) assert.ok(read(`app/(app)${e.href}/page.tsx`).length > 0);
  });

  it("tiap tab tidak lebih dari ±600 kata", () => {
    for (const g of [DANA_DESA_GUIDE, BLT_GUIDE]) {
      text(g).forEach((t, i) => assert.ok(t.split(/\s+/).length <= 600, `${g.id}/${g.tabs[i]!.id}`));
    }
  });

  it("tidak menulis angka besaran/persen/tahap/pasal (berubah tiap tahun, sumbernya katalog aturan)", () => {
    for (const g of [DANA_DESA_GUIDE, BLT_GUIDE]) {
      for (const t of text(g)) {
        assert.doesNotMatch(t, /\d+\s*%/, `${g.id}: persen`);
        assert.doesNotMatch(t, /Rp\s*\d/, `${g.id}: nominal`);
        assert.doesNotMatch(t, /Pasal\s+\d/i, `${g.id}: pasal`);
      }
    }
    for (const k of Object.keys(DANA_DESA_FIELD_IDS) as DanaDesaFieldKey[]) assert.equal(danaDesaFieldHelp(k).ref, undefined);
    for (const k of Object.keys(BLT_FIELD_IDS) as BltFieldKey[]) assert.equal(bltFieldHelp(k).ref, undefined);
  });

  it("petunjuk kolom Dana Desa valid, dan id kolom benar-benar ada di kode beserta aria-describedby", () => {
    const src = { regular: read(`${DD}SummaryTab.tsx`), kdmp: read(`${DD}SummaryTab.tsx`), location: read(`${DD}PublicationTab.tsx`) } satisfies Record<DanaDesaFieldKey, string>;
    for (const k of Object.keys(DANA_DESA_FIELD_IDS) as DanaDesaFieldKey[]) {
      const id = DANA_DESA_FIELD_IDS[k];
      assert.deepEqual(validateFieldHelp(k, danaDesaFieldHelp(k)), []);
      assert.match(src[k], new RegExp(`<Label htmlFor="${id}"`), `${id}: label`);
      assert.match(src[k], new RegExp(`id="${id}"[^>]*aria-describedby="${id}-hint"`), `${id}: aria-describedby`);
      assert.match(src[k], new RegExp(`FieldHelpBlock id=\\{DANA_DESA_FIELD_IDS\\.${k}\\}`), `${id}: FieldHelpBlock`);
    }
  });

  it("petunjuk kolom BLT valid, dan id kolom benar-benar ada di kode beserta aria-describedby", () => {
    const where: Record<BltFieldKey, { file: string; id: string; templ?: boolean }> = {
      meeting: { file: "ProgramTab.tsx", id: "pr-meeting" },
      decreeNumber: { file: "ProgramTab.tsx", id: "pr-no" },
      reported: { file: "ProgramTab.tsx", id: "pr-rep" },
      source: { file: "CandidatePicker.tsx", id: "${idPrefix}-src", templ: true },
      category: { file: "CandidatePicker.tsx", id: "${idPrefix}-cat", templ: true },
      replaceReason: { file: "BeneficiariesTab.tsx", id: "rp-reason" },
    };
    for (const k of Object.keys(BLT_FIELD_IDS) as BltFieldKey[]) {
      const { file, id, templ } = where[k];
      assert.deepEqual(validateFieldHelp(k, bltFieldHelp(k)), []);
      const s = read(BLT + file);
      const q = templ ? "\\{`" + id.replace(/[${}]/g, "\\$&") + "`\\}" : `"${id}"`;
      const hintQ = templ ? "\\{`" + id.replace(/[${}]/g, "\\$&") + "-hint`\\}" : `"${id}-hint"`;
      assert.match(s, new RegExp(`htmlFor=${q}`), `${id}: label`);
      assert.match(s, new RegExp(`FieldHelpBlock id=${templ ? q : `\\{?${q}\\}?`}`), `${id}: FieldHelpBlock`);
      assert.match(s, new RegExp(`id=${q}\\s+aria-describedby=${templ ? hintQ : `${hintQ}`}`), `${id}: aria-describedby`);
    }
  });

  it("blok petunjuk menautkan id petunjuk ke kolom dan menyembunyikan contoh sampai dibuka", () => {
    const html = renderToStaticMarkup(h(FieldHelpBlock, { id: "pr-no", help: bltFieldHelp("decreeNumber") }));
    assert.match(html, /id="pr-no-hint"/);
    assert.match(html, /Lihat contoh isian/);
    assert.match(html, /aria-expanded="false"/);
  });

  it("contoh isian memakai … sebagai tempat isian, tanpa angka nyata", () => {
    const all = [...(Object.keys(DANA_DESA_FIELD_IDS) as DanaDesaFieldKey[]).map(danaDesaFieldHelp), ...(Object.keys(BLT_FIELD_IDS) as BltFieldKey[]).map(bltFieldHelp)];
    for (const f of all) if (f.example) { assert.match(f.example, /…/); assert.doesNotMatch(f.example, /\d{3,}/); }
  });

  it("panduan terpasang di halaman: tombol di header dan banner, daftar BLT dan detail BLT", () => {
    for (const [file, guide] of [[`${DD}DanaDesaView.tsx`, "DANA_DESA_GUIDE"], [`${BLT}BltView.tsx`, "BLT_GUIDE"], [`${BLT}BltDetail.tsx`, "BLT_GUIDE"]] as const) {
      const s = read(file);
      assert.match(s, new RegExp(`<GuideButton guide=\\{${guide}\\} />`), file);
      assert.match(s, new RegExp(`<FirstVisitBanner guide=\\{${guide}\\} />`), file);
    }
  });
});
