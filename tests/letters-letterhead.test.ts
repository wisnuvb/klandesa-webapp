/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LetterPaper } from "../components/letters/LetterPaper.tsx";
import { validateDocument } from "../lib/letters/document/validate.ts";
import type { LetterDocument } from "../lib/letters/document/schema.ts";
import {
  DEFAULT_LETTERHEAD_STYLE,
  LOGO_SIZE_MM,
  mergeLetterheadStyleIntoSettings,
  normalizeLetterheadStyle,
  parseLetterheadStyle,
} from "../lib/letters/letterhead.ts";
import { applyDraft, draftFromContext, isDirty, patchFromDraft, validateDraft } from "../lib/letters/letterhead-draft.ts";
import { sampleLetterValues, withVillageContext, type LetterValues, type VillagePreviewContext } from "../lib/letters/values.ts";
import { SelectField } from "../components/letters/editor/panels/ui.tsx";
import { FIXTURES } from "./letters-fixtures.ts";

function docOf(input: unknown): LetterDocument {
  const r = validateDocument(input);
  assert.ok(r.ok, r.ok ? "" : JSON.stringify(r.issues));
  return r.doc;
}

const CTX: VillagePreviewContext = {
  desa: {
    nama: "Yosowilangun Lor", kecamatan: "Kecamatan Karanganyar", kabupaten: "Kabupaten Pasuruan", provinsi: "Jawa Timur",
    alamat: "Jl. Mawar No. 5", kode_pos: "67123", telepon: "", email: "", kode: "35.14.01.2001",
  },
  pejabat: {
    kades: { nama: "Slamet Riyadi", nip: "", jabatan: "Kepala Desa" },
    sekdes: { nama: "", nip: "", jabatan: "Sekretaris Desa" },
    camat: { nama: "Drs. Hadi", nip: "", jabatan: "Camat" },
  },
  logoUrl: "https://cdn.example.com/logo.png",
  kop: { layout: "kiri", rule: "ganda", logoSize: "sedang" },
};

function render(doc: LetterDocument, values: LetterValues, mode: "preview" | "print" = "print", extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(createElement(LetterPaper, { doc, values, mode, ...extra }));
}

describe("gaya kop: normalisasi & penyimpanan", () => {
  it("nilai tak dikenal jatuh ke bawaan; tidak pernah melempar", () => {
    assert.deepEqual(normalizeLetterheadStyle(undefined), DEFAULT_LETTERHEAD_STYLE);
    assert.deepEqual(normalizeLetterheadStyle("x"), DEFAULT_LETTERHEAD_STYLE);
    assert.deepEqual(normalizeLetterheadStyle({ layout: "melayang", rule: 3, logoSize: null }), DEFAULT_LETTERHEAD_STYLE);
    assert.deepEqual(normalizeLetterheadStyle({ layout: "atas", rule: "tanpa" }), { layout: "atas", rule: "tanpa", logoSize: "sedang" });
  });

  it("merge menjaga kunci settings lain dan hanya mengubah yang dikirim", () => {
    const merged = mergeLetterheadStyleIntoSettings({ mail: { kepalaDesaNama: "A" }, integrations: { x: 1 } }, { layout: "atas" });
    assert.deepEqual(merged.mail, { kepalaDesaNama: "A" });
    assert.deepEqual(merged.integrations, { x: 1 });
    assert.deepEqual(parseLetterheadStyle(merged), { layout: "atas", rule: "ganda", logoSize: "sedang" });
    const again = mergeLetterheadStyleIntoSettings(merged, { rule: "tunggal" });
    assert.deepEqual(parseLetterheadStyle(again), { layout: "atas", rule: "tunggal", logoSize: "sedang" });
    assert.deepEqual(parseLetterheadStyle(null), DEFAULT_LETTERHEAD_STYLE);
  });
});

describe("kop di kertas", () => {
  const doc = docOf(FIXTURES.keteranganDomisili);
  const base = withVillageContext(sampleLetterValues(doc), CTX);

  it("logo di kiri: logo muncul sebelum teks, ada penyeimbang di kanan", () => {
    const out = render(doc, base);
    assert.ok(out.includes('data-kop-layout="kiri"'));
    assert.ok(out.indexOf("<img") < out.indexOf("DESA YOSOWILANGUN LOR"));
    assert.ok(out.includes("border-bottom:3px double #000"));
  });

  it("logo di atas: kolom, teks di bawah logo", () => {
    const out = render(doc, { ...base, kop: { layout: "atas", rule: "tunggal", logoSize: "besar" } });
    assert.ok(out.includes('data-kop-layout="atas"'));
    assert.ok(out.includes("flex-direction:column"));
    assert.ok(out.indexOf("<img") < out.indexOf("DESA YOSOWILANGUN LOR"));
    assert.ok(out.includes("border-bottom:2px solid #000"));
    assert.ok(out.includes(`width:${LOGO_SIZE_MM.besar}mm`));
  });

  it("logo di kanan: teks lebih dulu, logo sesudahnya", () => {
    const out = render(doc, { ...base, kop: { layout: "kanan", rule: "tanpa", logoSize: "kecil" } });
    assert.ok(out.includes('data-kop-layout="kanan"'));
    assert.ok(out.indexOf("DESA YOSOWILANGUN LOR") < out.indexOf("<img"));
    assert.ok(out.includes("border-bottom:none"));
  });

  it("tanpa gaya tersimpan memakai bawaan (logo kiri, garis ganda)", () => {
    const out = render(doc, { ...base, kop: undefined });
    assert.ok(out.includes('data-kop-layout="kiri"'));
  });

  it("cetak tanpa logo tidak menyisakan kotak; pratinjau menampilkan kotak putus-putus yang hilang saat cetak", () => {
    const noLogo = { ...base, logoUrl: undefined };
    assert.ok(!render(doc, noLogo, "print").includes("Logo</div>"));
    const prev = render(doc, noLogo, "preview");
    assert.ok(prev.includes("Logo</div>"));
    assert.ok(prev.includes("lp-deco"));
  });

  it("klik kop hanya aktif di pratinjau dan dapat dijangkau papan ketik", () => {
    const prev = render(doc, base, "preview", { onKopClick: () => {} });
    assert.ok(prev.includes('role="button"'));
    assert.ok(prev.includes("Kop surat. Tekan Enter"));
    const print = render(doc, base, "print", { onKopClick: () => {} });
    assert.ok(!print.includes("Kop surat. Tekan Enter"));
  });

  it("kop tanpa kop / garuda tidak terpengaruh gaya desa", () => {
    const none = docOf({ ...(FIXTURES.keteranganDomisili as any), letterhead: "none" });
    assert.ok(!render(none, base).includes("data-kop-layout"));
  });
});

describe("pratinjau memakai data desa nyata, bukan contoh", () => {
  const doc = docOf(FIXTURES.keteranganDomisili);

  it("kop dan tanda tangan tidak lagi memuat data contoh registry", () => {
    const out = render(doc, withVillageContext(sampleLetterValues(doc), CTX), "preview");
    assert.ok(out.includes("YOSOWILANGUN LOR"));
    assert.ok(out.includes("KARANGANYAR"));
    for (const dummy of ["BRAMBANG", "Moh. Sofwan Hadi", "Gondangwetan", "pemdes@desa.id", "(0343) 123456"]) {
      assert.ok(!out.toUpperCase().includes(dummy.toUpperCase()), `masih memuat data contoh: ${dummy}`);
    }
  });

  it("kolom desa yang belum diisi tetap kosong (bukan diisi contoh); nomor memakai kode desa asli", () => {
    const v = withVillageContext(sampleLetterValues(doc), CTX);
    assert.equal(v.desa.telepon, "");
    assert.equal(v.desa.email, "");
    assert.equal(v.pejabat.sekdes.nama, "");
    assert.equal(v.surat.tempat, "Yosowilangun Lor");
    assert.ok(v.surat.nomor.includes("35.14.01.2001"));
    assert.ok(!v.surat.nomor.includes("424.304.2.02"));
  });
});

describe("draf kop: validasi & perubahan", () => {
  const saved = draftFromContext(CTX);

  it("tanpa perubahan → tidak kotor, tidak ada badan PATCH", () => {
    assert.equal(patchFromDraft(saved, { ...saved }), null);
    assert.equal(isDirty(saved, { ...saved, alamat: `  ${saved.alamat}  ` }), false);
  });

  it("PATCH hanya memuat yang berubah", () => {
    const next = { ...saved, telepon: "(0343) 555 123", kadesNama: "Budi", style: { ...saved.style, layout: "atas" as const } };
    assert.deepEqual(patchFromDraft(saved, next), {
      phone: "(0343) 555 123",
      officials: { kepalaDesaNama: "Budi" },
      style: { layout: "atas", rule: "ganda", logoSize: "sedang" },
    });
    assert.deepEqual(patchFromDraft(saved, { ...saved, logoUrl: "" }), { logoUrl: "" });
  });

  it("validasi: alamat wajib, kode pos 5 angka, telepon/email/logo sah", () => {
    assert.deepEqual(validateDraft(saved), {});
    const e = validateDraft({ ...saved, alamat: " ", kodePos: "123", telepon: "abc", email: "x@", logoUrl: "javascript:alert(1)" });
    assert.deepEqual(Object.keys(e).sort(), ["alamat", "email", "kodePos", "logoUrl", "telepon"]);
  });

  it("applyDraft mengisi pratinjau dengan draf; logo berbahaya tidak dipakai", () => {
    const ctx = applyDraft(CTX, { ...saved, alamat: "Alamat baru", logoUrl: "javascript:x", kadesNama: "Budi" });
    assert.equal(ctx.desa.alamat, "Alamat baru");
    assert.equal(ctx.pejabat.kades.nama, "Budi");
    assert.equal(ctx.logoUrl, null);
    assert.equal(ctx.desa.nama, "Yosowilangun Lor");
  });
});

describe("panel samping", () => {
  it("kontainer scroll tab panel berposisi (relative) agar elemen sr-only tidak memanjangkan halaman", () => {
    const src = readFileSync("components/letters/editor/panels/SidePanel.tsx", "utf8");
    const m = src.match(/role="tabpanel"[\s\S]*?className="([^"]*)"/);
    assert.ok(m, "tabpanel tidak ditemukan");
    const classes = m[1].split(/\s+/);
    assert.ok(classes.includes("relative") && classes.includes("overflow-y-auto"));
  });

  it("dropdown di panel tidak memakai display:block yang menimpa flex tombol (ikon panah turun ke bawah teks)", () => {
    const html = renderToStaticMarkup(
      createElement(SelectField, { label: "Ukuran kertas", value: "a", options: [{ value: "a", label: "F4 / Folio" }], onChange: () => {} }),
    );
    const trigger = html.match(/<button[^>]*data-slot="select-trigger"[^>]*>/)?.[0];
    assert.ok(trigger, "tombol dropdown tidak ditemukan");
    const classes = (trigger.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/);
    assert.ok(classes.includes("flex") && classes.includes("justify-between"));
    assert.ok(!classes.includes("block"));
  });
});
