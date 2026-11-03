import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MUSDES_GUIDE, MUSDES_GUIDE_ENTRY, MUSDES_HELP_FIELD_IDS, musdesFieldHelp } from "../lib/guides/musdes.ts";
import { validateFieldHelp, validateGuide } from "../lib/guides/types.ts";
import { KINDS, STATUS } from "../lib/musdes/catalog.ts";
import { FieldHelpBlock, GuideDialog } from "../components/app/guide/PageGuide.tsx";

const h = React.createElement;
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const DETAIL = read("app/(app)/musdes/_components/MeetingDetail.tsx");
const FORM = read("app/(app)/musdes/_components/MeetingFormDialog.tsx");
const LIST = read("app/(app)/musdes/_components/MusdesView.tsx");

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
function tabText(t: (typeof MUSDES_GUIDE.tabs)[number]): string {
  return t.blocks.map((b) => JSON.stringify(b).replace(/"[a-zA-Z]+":/g, " ")).join(" ");
}

describe("panduan Musyawarah Desa", () => {
  it("struktur panduan sehat, id unik berawalan musdes, dan tiap tab tidak melebihi ±600 kata", () => {
    assert.deepEqual(validateGuide(MUSDES_GUIDE), []);
    assert.ok(MUSDES_GUIDE.id.startsWith("musdes"));
    assert.equal(MUSDES_GUIDE_ENTRY.guide, MUSDES_GUIDE);
    assert.equal(MUSDES_GUIDE_ENTRY.href, "/musdes");
    assert.ok(MUSDES_GUIDE_ENTRY.summary.length > 20);
    for (const t of MUSDES_GUIDE.tabs) assert.ok(words(tabText(t)) <= 600, `${t.id}: ${words(tabText(t))} kata`);
  });

  it("petunjuk kolom valid dan contoh memakai '…' sebagai tempat isian", () => {
    assert.ok(MUSDES_HELP_FIELD_IDS.length > 0);
    for (const id of MUSDES_HELP_FIELD_IDS) {
      const help = musdesFieldHelp(id)!;
      assert.deepEqual(validateFieldHelp(id, help), []);
      if (help.example) assert.match(help.example, /…/, id);
      assert.equal(help.ref, undefined, `${id}: ref hanya bila terverifikasi`);
    }
  });

  it("setiap kolom yang diberi petunjuk benar-benar ada di kode dan dihubungkan lewat aria-describedby", () => {
    for (const id of MUSDES_HELP_FIELD_IDS) {
      assert.match(id, /^(md|pa|ba|dec)-/);
      if (id.startsWith("md-")) {
        const key = id.slice(3);
        assert.match(FORM, new RegExp(`<Label htmlFor="${id}"`), `${id}: label`);
        assert.match(FORM, new RegExp(`<FieldHelpBlock id="${id}" help=\\{help\\("${key}"\\)!\\}`), `${id}: blok petunjuk`);
        assert.match(FORM, new RegExp(`${key}: "`), `${id}: field Form`);
        assert.match(FORM, /md-\$\{k\}-hint/, "describedby memuat -hint");
      } else {
        assert.match(DETAIL, new RegExp(`<Label htmlFor="${id}"`), `${id}: label`);
        assert.match(DETAIL, new RegExp(`<FieldHelpBlock id="${id}" help=\\{musdesFieldHelp\\("${id}"\\)!\\}`), `${id}: blok petunjuk`);
        assert.match(DETAIL, new RegExp(`id="${id}" aria-describedby="${id}-hint"`), `${id}: aria-describedby`);
      }
    }
  });

  it("tombol dan banner terpasang di daftar dan rincian dengan panduan yang sama", () => {
    for (const src of [LIST, DETAIL]) {
      assert.match(src, /<GuideButton guide=\{MUSDES_GUIDE\} \/>/);
      assert.match(src, /<FirstVisitBanner guide=\{MUSDES_GUIDE\} \/>/);
    }
  });

  it("blok petunjuk menautkan id -hint dan menyembunyikan contoh sampai dibuka", () => {
    const html = renderToStaticMarkup(h(FieldHelpBlock, { id: "ba-text", help: musdesFieldHelp("ba-text")! }));
    assert.match(html, /id="ba-text-hint"/);
    assert.match(html, /Lihat contoh isian/);
    assert.match(html, /aria-expanded="false"/);
  });

  it("modal tidak merender apa pun saat tertutup", () => {
    assert.equal(renderToStaticMarkup(h(GuideDialog, { guide: MUSDES_GUIDE, open: false, onOpenChange: () => undefined })), "");
  });

  it("panduan menjelaskan semua status di katalog dan menyebut batas yang dikunci kode", () => {
    const cards = MUSDES_GUIDE.tabs.find((t) => t.id === "status")!.blocks.find((b) => b.type === "cards");
    assert.ok(cards && cards.type === "cards");
    assert.equal(cards.items.length, Object.keys(STATUS).length);
    const titles = cards.items.map((c) => c.title);
    for (const label of Object.values(STATUS)) assert.ok(titles.some((t) => t.startsWith(label.split(" (")[0])), label);
    const all = JSON.stringify(MUSDES_GUIDE);
    assert.match(all, /minimal 20 huruf/); // service.ts: minutesText.trim().length < 20
    assert.match(all, /minimal 5 huruf/); // service.ts: reason.length < 5
    assert.match(all, /paling banyak 100 nama/); // LIMITS.bulkAttendees
    assert.equal(Object.keys(KINDS).length > 0, true);
  });
});
