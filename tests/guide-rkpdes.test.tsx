import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RKPDES_FIELD_HELP, RKPDES_GUIDE, RKPDES_GUIDE_ENTRY, STEP_DEADLINE_TEXT, rkpdesFieldHelp } from "../lib/guides/rkpdes.ts";
import { validateFieldHelp, validateGuide } from "../lib/guides/types.ts";
import { buildSteps, type StepInput } from "../lib/rkpdes/steps.ts";
import { FieldHelpBlock, GuideDialog } from "../components/app/guide/PageGuide.tsx";

const DIR = "app/(app)/rkpdes/_components";
const src = Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith(".tsx")).map((f) => [f, readFileSync(`${DIR}/${f}`, "utf8")]));
const all = Object.values(src).join("\n");
const empty = (revision = 0): StepInput => ({ year: 2031, revision, musdesHeldOn: null, teamFormedAt: null, paguReceivedAt: null, draftReadyAt: null, draftApprovedAt: null, musrenbangHeldOn: null, perdesEnactedOn: null, usulanSubmittedAt: null });
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

describe("panduan RKP Desa", () => {
  it("struktur panduan sah dan entri katalog menunjuk /rkpdes", () => {
    assert.deepEqual(validateGuide(RKPDES_GUIDE), []);
    assert.equal(RKPDES_GUIDE_ENTRY.href, "/rkpdes");
    assert.equal(RKPDES_GUIDE_ENTRY.guide, RKPDES_GUIDE);
    assert.ok(RKPDES_GUIDE_ENTRY.summary.length > 20);
    assert.ok(RKPDES_GUIDE.tabs.length >= 2 && RKPDES_GUIDE.tabs.length <= 4);
  });

  it("tiap tab tidak lebih dari ±600 kata", () => {
    for (const t of RKPDES_GUIDE.tabs) assert.ok(words(JSON.stringify(t.blocks)) <= 650, t.id);
  });

  it("setiap petunjuk kolom sah", () => {
    for (const [k, h] of Object.entries(RKPDES_FIELD_HELP)) assert.deepEqual(validateFieldHelp(k, h), []);
  });

  it("tenggat di panduan sama dengan yang dihitung buildSteps", () => {
    const steps = buildSteps(empty(), new Date("2030-01-01T00:00:00Z"));
    for (const s of steps) {
      const text = STEP_DEADLINE_TEXT[s.key];
      if (s.due === null) { assert.equal(text, null, s.key); continue; }
      const [, m, d] = s.due.split("-").map(Number);
      assert.equal(text, `${d} ${BULAN[m! - 1]}`, s.key);
    }
    assert.deepEqual(Object.keys(STEP_DEADLINE_TEXT).sort(), steps.map((s) => s.key).sort());
    // Tenggat yang disebut di judul langkah muncul di teks panduan
    const stepTitles = JSON.stringify(RKPDES_GUIDE.tabs[0]!.blocks[0]);
    for (const t of Object.values(STEP_DEADLINE_TEXT)) if (t) assert.ok(stepTitles.includes(t), t);
  });

  it("kunci petunjuk kolom ada di kode halaman, dan setiap pemanggilan punya petunjuk", () => {
    const stepKeys = new Set(buildSteps(empty(), new Date()).map((s) => s.key));
    const labels = /const LABELS[^{]*\{([\s\S]*?)\n\};/.exec(src["ActivitiesTab.tsx"]!)![1]!;
    for (const key of Object.keys(RKPDES_FIELD_HELP)) {
      const ac = /^ac-(\w+)$/.exec(key);
      const st = /^st-(\w+)-(\w+)$/.exec(key);
      if (ac) {
        assert.match(labels, new RegExp(`\\b${ac[1]}:`), key);
        assert.match(src["ActivitiesTab.tsx"]!, new RegExp(`(common|text)\\("${ac[1]}"`), key);
      } else if (st) {
        assert.ok(stepKeys.has(st[1] as never), key);
        assert.match(src["RkpdesDetail.tsx"]!, new RegExp(`dateField\\("${st[2]}"`), key);
        assert.ok(src["RkpdesDetail.tsx"]!.includes("rkpdesFieldHelp(`st-${step.key}-${k}`)"), key);
      } else {
        assert.ok(all.includes(`id="${key}"`), key);
        assert.ok(all.includes(`rkpdesFieldHelp("${key}")`), `${key}: tidak dipanggil`);
      }
    }
    // Pemanggil statis tidak boleh menunjuk kunci yang tak ada
    for (const m of all.matchAll(/rkpdesFieldHelp\("([^"]+)"\)/g)) assert.ok(rkpdesFieldHelp(m[1]!), m[1]);
  });

  it("kolom berpetunjuk menautkan aria-describedby ke -hint dan tetap punya label", () => {
    for (const key of ["rk-year", "pg-src", "tm-role", "ev-text"]) {
      const file = Object.values(src).find((s) => s.includes(`id="${key}"`))!;
      assert.match(file, new RegExp(`htmlFor="${key}"`), key);
      assert.match(file, new RegExp(`"${key}-hint"`), key);
    }
    assert.ok(src["ActivitiesTab.tsx"]!.includes("-hint"));
    const html = renderToStaticMarkup(React.createElement(FieldHelpBlock, { id: "ac-outputName", help: rkpdesFieldHelp("ac-outputName")! }));
    assert.match(html, /id="ac-outputName-hint"/);
    assert.match(html, /aria-expanded="false"/);
  });

  it("tombol dan banner terpasang di halaman daftar dan rincian; modal tertutup tidak merender apa pun", () => {
    for (const f of ["RkpdesView.tsx", "RkpdesDetail.tsx"]) {
      assert.match(src[f]!, /<GuideButton guide=\{RKPDES_GUIDE\}/, f);
      assert.match(src[f]!, /<FirstVisitBanner guide=\{RKPDES_GUIDE\}/, f);
    }
    assert.equal(renderToStaticMarkup(React.createElement(GuideDialog, { guide: RKPDES_GUIDE, open: false, onOpenChange: () => undefined })), "");
  });
});
