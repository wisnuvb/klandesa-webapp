import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ACCOUNTS, accountOf, APBDES_CAPITAL_ACCOUNT, APBDES_PROFIT_SHARE_ACCOUNT, EQUITY_VILLAGE_CAPITAL, EQUITY_VILLAGE_PROFIT_SHARE, REGISTRATION_WORKDAYS, TERM_YEARS } from "../lib/bumdes/catalog.ts";
import { BUMDES_FIELD_HELP, BUMDES_GUIDE, BUMDES_GUIDE_ENTRY, bumdesFieldHelp, NAME_APPROVAL_WORKDAYS, type BumdesFieldKey } from "../lib/guides/bumdes.ts";
import { validateFieldHelp, validateGuide, type GuideBlock } from "../lib/guides/types.ts";
import { FieldHelpBlock, GuideDialog } from "../components/app/guide/PageGuide.tsx";

const h = React.createElement;
const dir = "app/(app)/bumdes/_components/";
const src = (f: string) => readFileSync(dir + f, "utf8");
const all = ["BumdesView.tsx", "LegalTab.tsx", "DanaDesaTab.tsx", "JurnalTab.tsx", "KasTab.tsx"].map(src).join("\n");

function words(b: GuideBlock): number {
  const n = (s: string) => s.split(/\s+/).filter(Boolean).length;
  switch (b.type) {
    case "steps": return n(b.title ?? "") + b.items.reduce((t, i) => t + n(i.title) + n(i.body), 0);
    case "list": return n(b.title ?? "") + b.items.reduce((t, i) => t + n(i), 0);
    case "split": return [b.left, b.right].reduce((t, c) => t + n(c.title) + c.items.reduce((u, i) => u + n(i), 0), 0);
    case "cards": return n(b.title ?? "") + b.items.reduce((t, i) => t + n(i.title) + n(i.body) + (i.facts ?? []).reduce((u, f) => u + n(f.label) + n(f.value), 0), 0);
    case "glossary": return n(b.title ?? "") + b.items.reduce((t, i) => t + n(i.term) + n(i.meaning), 0);
    case "note": return n(b.text);
  }
}

describe("panduan BUMDes", () => {
  it("struktur panduan sah dan entri katalog mengarah ke /bumdes", () => {
    assert.deepEqual(validateGuide(BUMDES_GUIDE), []);
    assert.equal(BUMDES_GUIDE_ENTRY.href, "/bumdes");
    assert.equal(BUMDES_GUIDE_ENTRY.guide, BUMDES_GUIDE);
    assert.ok(BUMDES_GUIDE_ENTRY.summary.length > 20);
    assert.ok(BUMDES_GUIDE.id.startsWith("bumdes"));
  });

  it("tiap tab tidak lebih dari ±600 kata", () => {
    for (const t of BUMDES_GUIDE.tabs) {
      const total = t.blocks.reduce((s, b) => s + words(b), 0);
      assert.ok(total <= 650, `${t.id}: ${total} kata`);
    }
  });

  it("setiap petunjuk kolom lolos validasi", () => {
    for (const [k, v] of Object.entries(BUMDES_FIELD_HELP)) assert.deepEqual(validateFieldHelp(k, v), []);
  });

  it("setiap petunjuk kolom benar-benar dipasang di kode halaman", () => {
    for (const k of Object.keys(BUMDES_FIELD_HELP) as BumdesFieldKey[]) {
      assert.ok(all.includes(`"${k}"`), `petunjuk ${k} tidak dipakai di komponen`);
    }
  });

  it("kunci kolom Legalitas ada di formulir dan di state-nya", () => {
    const legal = src("LegalTab.tsx");
    for (const k of ["perdesNumber", "artNumber", "nameApprovalNo", "certificateNo"] as const) {
      assert.match(legal, new RegExp(`k="${k}"[^>]*help="${k}"`), k);
      assert.match(legal, new RegExp(`${k}: p\\.${k}`), `${k} tidak ada di state formulir`);
    }
    assert.match(legal, /id="lg-status"[^>]*aria-describedby="lg-status-hint"/);
    assert.match(legal, /<FieldHelpBlock id="lg-status"/);
    assert.match(legal, /id="lg-cap"[^\n]*aria-describedby="lg-cap-hint"/);
    assert.match(legal, /<FieldHelpBlock id="lg-cap"/);
    assert.match(legal, /<Label htmlFor="lg-status">/);
    assert.match(legal, /<Label htmlFor="lg-cap">/);
    assert.match(legal, /initialCapital: p\.initialCapital/);
    assert.match(legal, /legalStatus: p\.legalStatus/);
  });

  it("kolom Dana Desa, Jurnal, dan Kas: label, id petunjuk, dan aria-describedby saling cocok", () => {
    const pairs: [string, string, string][] = [
      ["DanaDesaTab.tsx", "fl-ch", "villageChannel"],
      ["DanaDesaTab.tsx", "rs-amt", "resolutionAmount"],
      ["DanaDesaTab.tsx", "rs-fy", "resolutionFiscalYear"],
      ["KasTab.tsx", "bd-tx-acc", "txAccount"],
    ];
    for (const [f, id, key] of pairs) {
      const s = src(f);
      assert.ok(s.includes(`<FieldHelpBlock id="${id}" help={bumdesFieldHelp("${key}")} />`), `${id}: blok petunjuk`);
      assert.ok(s.includes(`htmlFor="${id}"`), `${id}: label`);
      assert.ok(s.includes(`id="${id}"`), `${id}: kolom`);
      assert.ok(s.includes(`${id}-hint`), `${id}: aria-describedby`);
    }
    const j = src("JurnalTab.tsx");
    assert.ok(j.includes('<FieldHelpBlock id="jm-lines" help={bumdesFieldHelp("journalLines")} />'));
    assert.ok(j.includes('aria-describedby="jm-lines-hint"'));
    assert.ok(!j.includes('id="jm-lines-help"'), "id lama jangan tersisa");
  });

  it("kode akun dan angka dalam isi panduan cocok dengan katalog dan aturan layanan", () => {
    const text = JSON.stringify([BUMDES_GUIDE, BUMDES_FIELD_HELP]);
    for (const code of [APBDES_CAPITAL_ACCOUNT, APBDES_PROFIT_SHARE_ACCOUNT, EQUITY_VILLAGE_CAPITAL, EQUITY_VILLAGE_PROFIT_SHARE, "4.1.04.03", "6.1.04.01", "1.1.99.01", "3.8.01.01"]) {
      assert.ok(text.includes(code), code);
    }
    for (const code of ["4.1.04.03", "6.1.04.01", "1.1.99.01", "3.8.01.01", EQUITY_VILLAGE_CAPITAL, EQUITY_VILLAGE_PROFIT_SHARE]) assert.ok(accountOf(code), `akun ${code} tidak ada di katalog`);
    assert.match(accountOf("4.1.04.03")!.name, /Sewa Gedung/);
    assert.match(accountOf("6.1.04.01")!.name, /Listrik/);
    assert.ok(text.includes(`${REGISTRATION_WORKDAYS} hari kerja`));
    assert.ok(text.includes(`${TERM_YEARS} tahun`));
    assert.equal(NAME_APPROVAL_WORKDAYS, 40);
    assert.ok(ACCOUNTS.length > 0);
    // penyertaan modal/bagi hasil bukan akun yang bisa dipilih: panduan tidak boleh menyuruh memilihnya di transaksi kas
    assert.ok(!BUMDES_FIELD_HELP.txAccount.example!.includes(EQUITY_VILLAGE_CAPITAL));
  });

  it("angka batas di layanan (persetujuan nama 40 hari kerja) sama dengan panduan", () => {
    assert.match(readFileSync("lib/bumdes/service.ts", "utf8"), new RegExp(`addWorkdays\\(p\\.nameApprovalDate, ${NAME_APPROVAL_WORKDAYS}\\)`));
  });

  it("blok petunjuk menautkan id petunjuk ke kolom dan menyembunyikan contoh sampai dibuka", () => {
    const html = renderToStaticMarkup(h(FieldHelpBlock, { id: "lg-perdesNumber", help: bumdesFieldHelp("perdesNumber") }));
    assert.match(html, /id="lg-perdesNumber-hint"/);
    assert.match(html, /Lihat contoh isian/);
    assert.match(html, /aria-expanded="false"/);
    const noExample = renderToStaticMarkup(h(FieldHelpBlock, { id: "fl-ch", help: bumdesFieldHelp("villageChannel") }));
    assert.match(noExample, /id="fl-ch-hint"/);
    assert.doesNotMatch(noExample, /Lihat contoh isian/);
  });

  it("modal tidak merender apa pun saat tertutup", () => {
    assert.equal(renderToStaticMarkup(h(GuideDialog, { guide: BUMDES_GUIDE, open: false, onOpenChange: () => undefined })), "");
  });

  it("tombol dan banner dipasang di header halaman tanpa ikon-saja", () => {
    const v = src("BumdesView.tsx");
    assert.match(v, /<GuideButton guide=\{BUMDES_GUIDE\} \/>/);
    assert.match(v, /<FirstVisitBanner guide=\{BUMDES_GUIDE\} \/>/);
  });
});
