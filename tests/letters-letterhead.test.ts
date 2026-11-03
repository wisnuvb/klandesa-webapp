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
  kopAddressLines,
  kopHeadingLines,
  mergeLetterheadStyleIntoSettings,
  normalizeLetterheadStyle,
  parseLetterheadStyle,
  parseRegency,
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
  kop: DEFAULT_LETTERHEAD_STYLE,
};

function render(doc: LetterDocument, values: LetterValues, mode: "preview" | "print" = "print", extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(createElement(LetterPaper, { doc, values, mode, ...extra }));
}

describe("gaya kop: normalisasi & penyimpanan", () => {
  it("nilai tak dikenal jatuh ke bawaan; tidak pernah melempar", () => {
    assert.deepEqual(normalizeLetterheadStyle(undefined), DEFAULT_LETTERHEAD_STYLE);
    assert.deepEqual(normalizeLetterheadStyle("x"), DEFAULT_LETTERHEAD_STYLE);
    assert.deepEqual(normalizeLetterheadStyle({ layout: "melayang", rule: 3, logoSize: null }), DEFAULT_LETTERHEAD_STYLE);
    assert.deepEqual(normalizeLetterheadStyle({ layout: "atas", rule: "tanpa" }), { ...DEFAULT_LETTERHEAD_STYLE, layout: "atas", rule: "tanpa" });
  });

  it("merge menjaga kunci settings lain dan hanya mengubah yang dikirim", () => {
    const merged = mergeLetterheadStyleIntoSettings({ mail: { kepalaDesaNama: "A" }, integrations: { x: 1 } }, { layout: "atas" });
    assert.deepEqual(merged.mail, { kepalaDesaNama: "A" });
    assert.deepEqual(merged.integrations, { x: 1 });
    assert.deepEqual(parseLetterheadStyle(merged), { ...DEFAULT_LETTERHEAD_STYLE, layout: "atas" });
    const again = mergeLetterheadStyleIntoSettings(merged, { rule: "tunggal" });
    assert.deepEqual(parseLetterheadStyle(again), { ...DEFAULT_LETTERHEAD_STYLE, layout: "atas", rule: "tunggal" });
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
    const out = render(doc, { ...base, kop: { ...DEFAULT_LETTERHEAD_STYLE, layout: "atas", rule: "tunggal", logoSize: "besar" } });
    assert.ok(out.includes('data-kop-layout="atas"'));
    assert.ok(out.includes("flex-direction:column"));
    assert.ok(out.indexOf("<img") < out.indexOf("DESA YOSOWILANGUN LOR"));
    assert.ok(out.includes("border-bottom:2px solid #000"));
    assert.ok(out.includes(`width:${LOGO_SIZE_MM.besar}mm`));
  });

  it("logo di kanan: teks lebih dulu, logo sesudahnya", () => {
    const out = render(doc, { ...base, kop: { ...DEFAULT_LETTERHEAD_STYLE, layout: "kanan", rule: "tanpa", logoSize: "kecil" } });
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

describe("gaya kop: ukuran huruf, nama, tata alamat", () => {
  it("ukuran huruf dibatasi 8–24 pt, dibulatkan 0,5; nilai rusak jatuh ke bawaan; patch sebagian tidak menghapus kunci lain", () => {
    const n = normalizeLetterheadStyle({ fontSizes: { instansi: 99, desa: "17,3", alamat: "x" } });
    assert.deepEqual(n.fontSizes, { instansi: 24, desa: 17.5, alamat: DEFAULT_LETTERHEAD_STYLE.fontSizes.alamat });
    assert.equal(normalizeLetterheadStyle({ fontSizes: { desa: 1 } }).fontSizes.desa, 8);
    const merged = mergeLetterheadStyleIntoSettings({}, { fontSizes: { desa: 18 }, names: { desa: "DESA X" } });
    const again = parseLetterheadStyle(mergeLetterheadStyleIntoSettings(merged, { fontSizes: { alamat: 9 } }));
    assert.deepEqual(again.fontSizes, { instansi: 13, desa: 18, alamat: 9 });
    assert.equal(again.names.desa, "DESA X");
  });

  it("nama pengganti dirapikan (spasi, karakter kontrol, panjang)", () => {
    const n = normalizeLetterheadStyle({ names: { pemerintah: "  PEMKAB \n  X\u0000Y ", kecamatan: 5, desa: "a".repeat(500) } });
    assert.equal(n.names.pemerintah, "PEMKAB X Y");
    assert.equal(n.names.kecamatan, "");
    assert.equal(n.names.desa.length, 120);
  });

  it("'Kab.' di data tidak menggandakan 'Kabupaten' di kop; Kota memakai PEMERINTAH KOTA", () => {
    for (const raw of ["Kab. Kutai Kartanegara", "Kabupaten Kutai Kartanegara", "Kab Kutai Kartanegara", "Kutai Kartanegara"]) {
      assert.deepEqual(parseRegency(raw), { jenis: "KABUPATEN", nama: "Kutai Kartanegara" }, raw);
    }
    assert.deepEqual(parseRegency("Kota Balikpapan"), { jenis: "KOTA", nama: "Balikpapan" });
    assert.deepEqual(parseRegency("Kota Administrasi Jakarta Barat"), { jenis: "KOTA ADMINISTRASI", nama: "Jakarta Barat" });
    const lines = kopHeadingLines({ nama: "Desa Sumber Sari", kecamatan: "Kec. Loa Kulu", kabupaten: "Kab. Kutai Kartanegara" }, DEFAULT_LETTERHEAD_STYLE.names);
    assert.deepEqual(lines.map((l) => l.text), ["PEMERINTAH KABUPATEN KUTAI KARTANEGARA", "KECAMATAN LOA KULU", "DESA SUMBER SARI"]);
  });

  it("nama pengganti menggantikan seluruh barisnya; kosong tetap otomatis", () => {
    const lines = kopHeadingLines(
      { nama: "Sumber Sari", kecamatan: "Loa Kulu", kabupaten: "Kab. Kutai Kartanegara" },
      { pemerintah: "Pemerintah Kabupaten Kukar", kecamatan: "", desa: "" },
    );
    assert.equal(lines[0].text, "PEMERINTAH KABUPATEN KUKAR");
    assert.equal(lines[1].text, "KECAMATAN LOA KULU");
  });

  const D = { alamat: "Jl. Mawar 5", kode_pos: "75571", telepon: "0823", email: "a@b.id" };
  const flat = (l: ReturnType<typeof kopAddressLines>) => l.map((x) => x.map((s) => s.text));

  it("tata alamat: mengalir (urutan lama), dua baris, satu per baris; bagian kosong dilewati", () => {
    assert.deepEqual(flat(kopAddressLines(D, "alir")), [["Jl. Mawar 5", "Telp. 0823", "Email: a@b.id", "Kode Pos 75571"]]);
    assert.deepEqual(flat(kopAddressLines(D, "dua")), [["Jl. Mawar 5", "Kode Pos 75571"], ["Telp. 0823", "Email: a@b.id"]]);
    assert.deepEqual(flat(kopAddressLines(D, "per")), [["Jl. Mawar 5"], ["Kode Pos 75571"], ["Telp. 0823"], ["Email: a@b.id"]]);
    assert.deepEqual(flat(kopAddressLines({ alamat: "X", telepon: "", email: "" }, "dua")), [["X"]]);
    assert.deepEqual(kopAddressLines({}, "per"), []);
  });

  const doc = docOf(FIXTURES.keteranganDomisili);
  const base = withVillageContext(sampleLetterValues(doc), CTX);

  it("kertas memakai ukuran huruf kop dari gaya; kontak tidak dipatahkan di tengah", () => {
    const out = render(doc, { ...base, kop: normalizeLetterheadStyle({ fontSizes: { instansi: 14, desa: 18, alamat: 9 } }) });
    assert.ok(out.includes("font-size:18pt"));
    assert.ok(out.includes("font-size:9pt"));
    assert.ok(out.includes("white-space:nowrap"));
  });

  it("gaya khusus surat (doc.letterheadStyle) menggantikan gaya desa; tanpa itu ikut desa", () => {
    const own = { ...doc, letterheadStyle: normalizeLetterheadStyle({ layout: "kanan", names: { desa: "Desa Kustom" } }) } as LetterDocument;
    const out = render(own, base);
    assert.ok(out.includes('data-kop-layout="kanan"'));
    assert.ok(out.includes("DESA KUSTOM"));
    assert.ok(render(doc, base).includes('data-kop-layout="kiri"'));
  });

  it("dokumen: letterheadStyle opsional, dirapikan saat divalidasi, dan tidak muncul bila kosong", () => {
    assert.equal(docOf(FIXTURES.keteranganDomisili).letterheadStyle, undefined);
    const withStyle = docOf({ ...(FIXTURES.keteranganDomisili as any), letterheadStyle: { layout: "atas", fontSizes: { desa: 99 } } });
    assert.equal(withStyle.letterheadStyle?.layout, "atas");
    assert.equal(withStyle.letterheadStyle?.fontSizes.desa, 24);
  });

  it("kop Garuda tidak menggandakan 'Kab.'", () => {
    const g = docOf({ ...(FIXTURES.keteranganDomisili as any), letterhead: "garuda" });
    const out = render(g, { ...base, desa: { ...base.desa, kabupaten: "Kab. Kutai Kartanegara" } });
    assert.ok(out.includes("KABUPATEN KUTAI KARTANEGARA"));
    assert.ok(!out.includes("KAB. KUTAI"));
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
      style: { ...DEFAULT_LETTERHEAD_STYLE, layout: "atas" },
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
