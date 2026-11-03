import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { validateFieldHelp, validateGuide } from "../lib/guides/types.ts";
import { KEPATUHAN_FIELD_IDS, KEPATUHAN_GUIDE, PENGADAAN_FIELD_IDS, PENGADAAN_GUIDE, PENGADAAN_GUIDE_ENTRIES, kepatuhanFieldHelp, pengadaanFieldHelp } from "../lib/guides/pengadaan.ts";
import { FieldHelpBlock, GuideDialog } from "../components/app/guide/PageGuide.tsx";

const h = React.createElement;

function sourceOf(dir: string): string {
  let out = "";
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out += sourceOf(p);
    else if (/\.tsx?$/.test(name)) out += readFileSync(p, "utf8");
  }
  return out;
}
const pengadaanSrc = sourceOf("app/(app)/pengadaan");
const kepatuhanSrc = sourceOf("app/(app)/kepatuhan");

describe("panduan Pengadaan dan Kepatuhan", () => {
  it("struktur kedua panduan sehat dan id unik", () => {
    assert.deepEqual(validateGuide(PENGADAAN_GUIDE), []);
    assert.deepEqual(validateGuide(KEPATUHAN_GUIDE), []);
    assert.equal(PENGADAAN_GUIDE.id, "pengadaan");
    assert.equal(KEPATUHAN_GUIDE.id, "kepatuhan");
  });

  it("setiap tab tidak melebihi sekitar 600 kata", () => {
    for (const g of [PENGADAAN_GUIDE, KEPATUHAN_GUIDE]) {
      for (const t of g.tabs) assert.ok(JSON.stringify(t.blocks).split(/\s+/).length <= 650, `${g.id}/${t.id}`);
    }
  });

  it("entri katalog /bantuan menunjuk rute yang ada", () => {
    assert.deepEqual(PENGADAAN_GUIDE_ENTRIES.map((e) => e.href), ["/pengadaan", "/kepatuhan"]);
    assert.deepEqual(PENGADAAN_GUIDE_ENTRIES.map((e) => e.guide.id), ["pengadaan", "kepatuhan"]);
    for (const e of PENGADAAN_GUIDE_ENTRIES) assert.ok(e.summary.length > 20);
    assert.match(readFileSync("app/(app)/pengadaan/page.tsx", "utf8"), /PengadaanView/);
    assert.match(readFileSync("app/(app)/kepatuhan/page.tsx", "utf8"), /KepatuhanView/);
  });

  it("petunjuk kolom lolos validasi dan kuncinya benar-benar ada di kode", () => {
    for (const id of PENGADAAN_FIELD_IDS) {
      assert.deepEqual(validateFieldHelp(id, pengadaanFieldHelp(id)), []);
      assert.ok(pengadaanSrc.includes(`id="${id}"`), `kolom ${id} tidak ada`);
      assert.ok(pengadaanSrc.includes(`<FieldHelpBlock id="${id}"`), `${id} belum dipasang`);
      assert.ok(pengadaanSrc.includes(`aria-describedby="${id}-hint"`), `${id} tanpa aria-describedby`);
      assert.ok(new RegExp(`htmlFor="${id}"`).test(pengadaanSrc), `${id} tanpa label`);
    }
    for (const id of KEPATUHAN_FIELD_IDS) {
      assert.deepEqual(validateFieldHelp(id, kepatuhanFieldHelp(id)), []);
      assert.ok(kepatuhanSrc.includes(`id="${id}"`), `kolom ${id} tidak ada`);
      assert.ok(kepatuhanSrc.includes(`<FieldHelpBlock id="${id}"`), `${id} belum dipasang`);
      assert.ok(new RegExp(`aria-describedby=[^\\n]*${id}-hint`).test(kepatuhanSrc), `${id} tanpa aria-describedby`);
      assert.ok(new RegExp(`htmlFor="${id}"`).test(kepatuhanSrc), `${id} tanpa label`);
    }
  });

  it("tombol panduan dan banner terpasang di halaman", () => {
    assert.match(readFileSync("app/(app)/pengadaan/_components/PengadaanView.tsx", "utf8"), /<GuideButton guide=\{PENGADAAN_GUIDE\}[\s\S]*<FirstVisitBanner guide=\{PENGADAAN_GUIDE\}/);
    assert.match(readFileSync("app/(app)/kepatuhan/_components/KepatuhanView.tsx", "utf8"), /<GuideButton guide=\{KEPATUHAN_GUIDE\}[\s\S]*<FirstVisitBanner guide=\{KEPATUHAN_GUIDE\}/);
  });

  it("contoh isian tidak memuat angka tampak nyata (hanya tempat isian …)", () => {
    for (const hlp of [...PENGADAAN_FIELD_IDS.map(pengadaanFieldHelp), ...KEPATUHAN_FIELD_IDS.map(kepatuhanFieldHelp)]) {
      if (hlp.example) assert.ok(!/\d/.test(hlp.example), hlp.example);
    }
  });

  it("panduan tidak menanam angka ambang, persen, atau tanggal tenggat", () => {
    const text = JSON.stringify([PENGADAAN_GUIDE, KEPATUHAN_GUIDE]);
    assert.ok(!/Rp\s?\d/.test(text));
    assert.ok(!/\d+\s?%/.test(text));
    assert.ok(!/\b\d{1,2} (Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\b/.test(text));
  });

  it("blok petunjuk menautkan id dan menyembunyikan contoh sampai dibuka", () => {
    const html = renderToStaticMarkup(h(FieldHelpBlock, { id: "pg-hps", help: pengadaanFieldHelp("pg-hps") }));
    assert.match(html, /id="pg-hps-hint"/);
    assert.match(html, /Lihat contoh isian/);
    assert.match(html, /aria-expanded="false"/);
  });

  it("modal tertutup tidak merender apa pun", () => {
    assert.equal(renderToStaticMarkup(h(GuideDialog, { guide: PENGADAAN_GUIDE, open: false, onOpenChange: () => undefined })), "");
  });
});
