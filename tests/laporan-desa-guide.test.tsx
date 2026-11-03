import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KINDS, SECTIONS, type ReportKind } from "../lib/laporan-desa/catalog.ts";
import { AUTO, KIND_GUIDE, laporanFieldHelp, laporanGuide, sectionHelp, sectionsWithoutHelp } from "../lib/laporan-desa/guide.ts";
import { validateGuide } from "../lib/guides/types.ts";
import { FieldHelpBlock, GuideDialog } from "../components/app/guide/PageGuide.tsx";

const h = React.createElement;
const kinds = Object.keys(KINDS) as ReportKind[];

describe("panduan Laporan Kepala Desa", () => {
  it("setiap bagian di katalog punya petunjuk dan contoh (katalog baru tidak boleh lupa panduan)", () => {
    assert.deepEqual(sectionsWithoutHelp(), []);
    for (const k of kinds) for (const s of SECTIONS[k]) {
      const g = sectionHelp(s.id);
      assert.ok(g && g.tip.length > 20 && g.example.length > 20, `${k}:${s.id}`);
    }
  });

  it("setiap jenis laporan punya ringkasan, tenggat, dan daftar otomatis/manual", () => {
    for (const k of kinds) {
      assert.ok(KIND_GUIDE[k].when && KIND_GUIDE[k].audience && KIND_GUIDE[k].deadline, k);
      assert.ok(AUTO[k].manual.length > 0, k);
    }
  });

  it("blok petunjuk menautkan id petunjuk ke kolom dan menyembunyikan contoh sampai dibuka", () => {
    const html = renderToStaticMarkup(h(FieldHelpBlock, { id: "ld-tujuan", help: laporanFieldHelp("tujuan", "Pasal 3 ayat 3 huruf a.")! }));
    assert.match(html, /id="ld-tujuan-hint"/);
    assert.match(html, /Lihat contoh isian/);
    assert.match(html, /aria-expanded="false"/);
  });

  it("modal tidak merender apa pun saat tertutup (tidak menambah beban halaman)", () => {
    assert.equal(renderToStaticMarkup(h(GuideDialog, { guide: laporanGuide("LKPPD"), open: false, onOpenChange: () => undefined })), "");
  });

  it("panduan tiap jenis lolos validasi struktur dan menandai jenis yang sedang dibuka", () => {
    for (const k of kinds) {
      assert.deepEqual(validateGuide(laporanGuide(k)), []);
      const cards = laporanGuide(k).tabs.find((t) => t.id === "jenis")!.blocks.find((b) => b.type === "cards");
      assert.ok(cards && cards.type === "cards" && cards.items.filter((i) => i.highlight).length === 1);
    }
  });
});
