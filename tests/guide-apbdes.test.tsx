import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { APBDES_GUIDE, APBDES_GUIDE_ENTRIES, APBDES_GUIDE_ENTRY, APBDES_HELP_KEYS, apbdesFieldHelp } from "../lib/guides/apbdes.ts";
import { validateFieldHelp, validateGuide, type GuideBlock } from "../lib/guides/types.ts";
import { FieldHelpBlock, GuideDialog } from "../components/app/guide/PageGuide.tsx";

const h = React.createElement;
const DIR = path.join(process.cwd(), "app/(app)/apbdes/_components");
const sources = fs.readdirSync(DIR).filter((f) => f.endsWith(".tsx")).map((f) => ({ f, text: fs.readFileSync(path.join(DIR, f), "utf8") }));
const all = sources.map((s) => s.text).join("\n");

/** Semua teks satu blok, untuk menghitung kata. */
function blockText(b: GuideBlock): string {
  switch (b.type) {
    case "steps": return [b.title ?? "", ...b.items.flatMap((i) => [i.title, i.body])].join(" ");
    case "list": return [b.title ?? "", ...b.items].join(" ");
    case "split": return [b.left, b.right].flatMap((c) => [c.title, ...c.items]).join(" ");
    case "cards": return [b.title ?? "", ...b.items.flatMap((c) => [c.title, c.body, ...(c.facts ?? []).flatMap((f) => [f.label, f.value])])].join(" ");
    case "glossary": return [b.title ?? "", ...b.items.flatMap((g) => [g.term, g.meaning])].join(" ");
    case "note": return b.text;
  }
}
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

describe("panduan APBDes", () => {
  it("lolos validasi struktur, id unik berawalan apbdes, dan terdaftar di katalog", () => {
    assert.deepEqual(validateGuide(APBDES_GUIDE), []);
    const ids = APBDES_GUIDE_ENTRIES.map((e) => e.guide.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.ok(id.startsWith("apbdes"), id);
    assert.ok(APBDES_GUIDE_ENTRIES.includes(APBDES_GUIDE_ENTRY));
    assert.equal(APBDES_GUIDE_ENTRY.href, "/apbdes");
    assert.ok(APBDES_GUIDE_ENTRY.summary.trim().length > 20);
    for (const e of APBDES_GUIDE_ENTRIES) assert.deepEqual(validateGuide(e.guide), []);
  });

  it("tiap tab tidak lebih dari sekitar 600 kata dan labelnya pendek", () => {
    for (const t of APBDES_GUIDE.tabs) {
      const n = words(t.blocks.map(blockText).join(" "));
      assert.ok(n <= 650, `${t.id}: ${n} kata`);
      assert.ok(t.label.length <= 18, t.label);
    }
  });

  it("setiap petunjuk kolom lolos validasi, contoh memakai tempat isian, rujukan hanya ke Permendagri 20/2018", () => {
    assert.ok(APBDES_HELP_KEYS.length >= 10);
    for (const k of APBDES_HELP_KEYS) {
      const help = apbdesFieldHelp(k)!;
      assert.deepEqual(validateFieldHelp(k, help), []);
      if (help.example) assert.ok(help.example.includes("…"), `${k}: contoh harus memakai … sebagai tempat isian`);
      if (help.ref) assert.match(help.ref, /^Permendagri 20\/2018 Pasal \d+/, k);
    }
    assert.equal(apbdesFieldHelp("tidak-ada"), undefined);
  });

  it("kunci petunjuk benar-benar ada di kode: label, Hint, dan aria-describedby", () => {
    for (const key of APBDES_HELP_KEYS) {
      const dyn = /^(rkk|sk)-(.+)$/.exec(key);
      if (dyn) {
        const [, prefix, name] = dyn;
        assert.ok(all.includes(`<Hint id={\`${prefix}-\${k}\`} />`), `${key}: Hint dinamis tidak ditemukan`);
        assert.ok(all.includes(`describedBy(\`${prefix}-\${k}\``), `${key}: aria-describedby dinamis tidak ditemukan`);
        assert.ok(all.includes(`htmlFor={\`${prefix}-\${k}\`}`), `${key}: label dinamis tidak ditemukan`);
        assert.ok(all.includes(`"${name}"`), `${key}: nama kolom ${name} tidak ada di daftar kolom`);
      } else {
        assert.ok(all.includes(`htmlFor="${key}"`), `${key}: <label htmlFor> tidak ditemukan`);
        assert.ok(all.includes(`<Hint id="${key}" />`), `${key}: <Hint> tidak terpasang`);
        assert.ok(all.includes(`describedBy("${key}"`), `${key}: aria-describedby tidak terpasang`);
      }
    }
  });

  it("setiap Hint yang terpasang punya isi petunjuk (tidak ada yang diam-diam kosong)", () => {
    for (const m of all.matchAll(/<Hint id="([^"]+)" \/>/g)) assert.ok(apbdesFieldHelp(m[1]!), `Hint ${m[1]} tidak punya petunjuk`);
  });

  it("tombol, banner, dan modal terpasang di halaman", () => {
    const view = sources.find((s) => s.f === "ApbdesView.tsx")!.text;
    assert.match(view, /<GuideButton guide=\{APBDES_GUIDE\} \/>/);
    assert.match(view, /<FirstVisitBanner guide=\{APBDES_GUIDE\} \/>/);
  });

  it("blok petunjuk menautkan id petunjuk ke kolom dan menyembunyikan contoh sampai dibuka", () => {
    const html = renderToStaticMarkup(h(FieldHelpBlock, { id: "ln-account", help: apbdesFieldHelp("ln-account")! }));
    assert.match(html, /id="ln-account-hint"/);
    assert.match(html, /Lihat contoh isian/);
    assert.match(html, /aria-expanded="false"/);
    const noExample = renderToStaticMarkup(h(FieldHelpBlock, { id: "ln-fund", help: apbdesFieldHelp("ln-fund")! }));
    assert.match(noExample, /id="ln-fund-hint"/);
    assert.doesNotMatch(noExample, /Lihat contoh isian/);
  });

  it("modal tidak merender apa pun saat tertutup", () => {
    assert.equal(renderToStaticMarkup(h(GuideDialog, { guide: APBDES_GUIDE, open: false, onOpenChange: () => undefined })), "");
  });

  it("tidak ada angka ambang yang tidak ada di kode atau peraturan (10 hari kerja, tanggal 10, minggu kedua Juli, 3 bulan)", () => {
    const text = APBDES_GUIDE.tabs.flatMap((t) => t.blocks.map(blockText)).join(" ");
    // Semua klaim ambang di panduan harus berasal dari DEADLINES/SPP_LIMITS di kode dan teks Permendagri 20/2018.
    const catalog = fs.readFileSync(path.join(process.cwd(), "lib/apbdes/catalog.ts"), "utf8");
    const spp = fs.readFileSync(path.join(process.cwd(), "lib/apbdes/spp.ts"), "utf8");
    assert.match(catalog, /bkuToSecretaryDay: 10/);
    assert.match(catalog, /minggu kedua bulan Juli/);
    assert.match(catalog, /3 bulan setelah akhir tahun anggaran/);
    assert.match(spp, /workDays: 10/);
    assert.match(text, /tanggal 10 bulan berikutnya/);
    assert.match(text, /10 hari kerja/);
    assert.match(text, /minggu kedua bulan Juli/);
    assert.match(text, /3 bulan setelah akhir tahun anggaran/);
  });
});
