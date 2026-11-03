/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LetterPaper } from "../components/letters/LetterPaper.tsx";
import { RichTextInput } from "../components/app/RichTextInput.tsx";
import { validateDocument } from "../lib/letters/document/validate.ts";
import type { LetterDocument } from "../lib/letters/document/schema.ts";
import { normalizeRichTags, parseInline, parseRich, richToPlain, RICH_MAX_LENGTH } from "../lib/letters/rich.ts";
import { UNDERLINE, toggleList, toggleWrap } from "../lib/letters/rich-edit.ts";
import { displayValue, emptyLetterValues } from "../lib/letters/values.ts";
import { normalizeFieldValue } from "../lib/letters/server/input.ts";
import { getCatalogV2 } from "../lib/letters/catalog/index.ts";
import { f, para, t } from "./letters-fixtures.ts";

const NOTA = `1. Rujukan / Dasar:
Sehubungan dengan program kerja Pemerintah Desa.

2. Maksud dan Tujuan:
Memohon persetujuan, dengan rincian:
- Hari / Tanggal : Senin
- Waktu : **09.00 WIB**

Demikian *disampaikan*.`;

describe("parser teks berformat", () => {
  it("paragraf, daftar bernomor, daftar berpoin, dan baris lanjutan", () => {
    const b = parseRich(NOTA);
    // butir 1 (+ baris lanjutan) · butir 2 (+ baris lanjutan) · daftar berpoin · paragraf penutup
    assert.deepEqual(b.map((x) => x.type), ["ol", "ol", "ul", "p"]);
    const first = b[0] as any;
    assert.equal(first.start, 1);
    assert.equal(first.items.length, 1);
    assert.equal(first.items[0].length, 2, "baris lanjutan menempel ke butir 1");
    const second = b[1] as any;
    assert.equal(second.start, 2);
    assert.equal(second.items[0].length, 2, "baris lanjutan menempel ke butir 2");
    assert.equal((b[2] as any).items.length, 2);
  });

  it("nomor daftar mengikuti angka pertama; baris baru dalam paragraf = pindah baris", () => {
    const b = parseRich("4. Penutup:\nDemikian.");
    assert.equal((b[0] as any).start, 4);
    const p = parseRich("baris satu\nbaris dua")[0] as any;
    assert.equal(p.type, "p");
    assert.equal(p.lines.length, 2);
  });

  it("tebal, miring, dan tebal berisi miring", () => {
    assert.deepEqual(parseInline("a **b** *c* d"), [{ text: "a " }, { text: "b", bold: true }, { text: " " }, { text: "c", italic: true }, { text: " d" }]);
    assert.deepEqual(parseInline("**x *y* z**").map((r) => [r.text, !!r.bold, !!r.italic]), [["x ", true, false], ["y", true, true], [" z", true, false]]);
  });

  it("penanda yang tidak lazim dibiarkan polos (2 * 3 * 4, ** tak tertutup)", () => {
    assert.equal(richToPlain("2 * 3 * 4"), "2 * 3 * 4");
    assert.equal(richToPlain("**belum ditutup"), "**belum ditutup");
  });

  it("teks polos: penanda dibuang, daftar tetap bernomor/berpoin", () => {
    assert.equal(richToPlain("1. satu\n2. **dua**\n\n- a\n- b"), "1. satu\n2. dua\n\n• a\n• b");
    assert.equal(richToPlain(""), "");
  });
});

describe("operasi bilah format", () => {
  it("tebal: bungkus seleksi, lepas bila sudah terbungkus (di luar atau ikut terseleksi)", () => {
    let e = toggleWrap("halo dunia", 5, 10, "**");
    assert.equal(e.value, "halo **dunia**");
    assert.equal(e.value.slice(e.start, e.end), "dunia");
    e = toggleWrap(e.value, e.start, e.end, "**");
    assert.equal(e.value, "halo dunia");
    assert.equal(toggleWrap("**dunia**", 0, 9, "**").value, "dunia");
  });

  it("tanpa seleksi: menyisipkan contoh yang terseleksi", () => {
    const e = toggleWrap("ab", 1, 1, "*");
    assert.equal(e.value, "a*teks*b");
    assert.equal(e.value.slice(e.start, e.end), "teks");
  });

  it("miring tidak merusak tebal", () => {
    // seleksi "x" di dalam **x**: miring harus MEMBUNGKUS (***x***), bukan melepas satu bintang tebal
    assert.equal(toggleWrap("**x**", 2, 3, "*").value, "***x***");
  });

  it("daftar: nomori baris terseleksi, lepas bila semuanya sudah daftar sejenis, ganti jenis", () => {
    const v = "satu\ndua\n\ntiga";
    const on = toggleList(v, 0, v.length, "ol");
    assert.equal(on.value, "1. satu\n2. dua\n\n3. tiga");
    assert.equal(toggleList(on.value, on.start, on.end, "ol").value, v);
    assert.equal(toggleList(on.value, on.start, on.end, "ul").value, "- satu\n- dua\n\n- tiga");
  });

  it("daftar: hanya baris yang tersentuh seleksi/kursor yang berubah", () => {
    const v = "a\nb\nc";
    assert.equal(toggleList(v, 2, 2, "ul").value, "a\n- b\nc");
  });
});

function docOf(type: "richtext" | "longtext", body?: unknown[]): LetterDocument {
  const r = validateDocument({
    schemaVersion: 2, kind: "surat_biasa", audience: "internal",
    fields: [{ id: "isi", label: "Isi nota", type }],
    body: body ?? [para("p1", f("isian.isi"))],
  });
  assert.ok(r.ok, r.ok ? "" : JSON.stringify(r.issues));
  return r.doc;
}
const render = (doc: LetterDocument, isi: string, mode: "preview" | "print" = "print") => {
  const v = emptyLetterValues();
  v.fields.isi = isi;
  return renderToStaticMarkup(createElement(LetterPaper, { doc, values: v, mode }));
};

describe("kertas: isian teks berformat", () => {
  const doc = docOf("richtext");

  it("dirender sebagai paragraf, daftar bernomor (mulai dari angka pertama), berpoin, tebal, dan miring", () => {
    const out = render(doc, NOTA);
    assert.ok(out.includes('<ol start="1"'));
    assert.ok(out.includes('<ol start="2"'));
    assert.ok(out.includes("<ul"));
    assert.ok(out.includes("<strong>09.00 WIB</strong>"));
    assert.ok(out.includes("<em>disampaikan</em>"));
    assert.equal(out.split("<li>").length - 1, 4); // 2 butir bernomor + 2 butir berpoin
    // Preflight Tailwind menghapus list-style; penanda daftar harus eksplisit agar angka dan titik tetap tampil.
    assert.ok(out.includes("list-style-type:decimal") && out.includes("list-style-type:disc"));
  });

  it("HTML/skrip di dalam isian tidak pernah menjadi markup", () => {
    const out = render(doc, '<script>alert(1)</script> <img src=x onerror=alert(1)>\n- <b>x</b>');
    assert.ok(!out.includes("<script"));
    assert.ok(!out.includes("<img"));
    assert.ok(!out.includes("<b>"));
    assert.ok(out.includes("&lt;script&gt;"));
  });

  it("kosong: tetap isian kuning (pratinjau) dan tidak membuat blok daftar", () => {
    const out = render(doc, "", "preview");
    assert.ok(out.includes("lp-ph"));
    assert.ok(!out.includes("<ol"));
  });

  it("di tengah kalimat: format inline tetap tampil, daftar diratakan jadi baris (tanpa blok <ol>)", () => {
    const mixed = docOf("richtext", [para("p1", t("Isi: "), f("isian.isi"), t(" selesai."))]);
    const out = render(mixed, "1. satu\n2. **dua** dan <u>tiga</u>");
    assert.ok(!out.includes("<ol"));
    assert.ok(out.replace(/<[^>]+>/g, "").includes("1. satu"));
    assert.ok(out.includes("<strong>dua</strong>") && out.includes("<u>tiga</u>"));
    assert.ok(out.includes("<br/>"));
  });

  it("isian teks panjang biasa: baris barunya kini terlihat (pre-line) alih-alih melebur", () => {
    const out = render(docOf("longtext"), "baris satu\nbaris dua");
    assert.ok(out.includes("white-space:pre-line"));
    assert.ok(out.includes("baris satu\nbaris dua"));
  });

  it("displayValue untuk richtext = teks polos tanpa penanda", () => {
    const d = docOf("richtext");
    const v = emptyLetterValues();
    v.fields.isi = "**tebal** dan *miring*";
    assert.equal(displayValue("isian.isi", v, d), "tebal dan miring");
  });
});

describe("skema, batas, katalog, dan kolom isian", () => {
  it("jenis richtext sah di skema; nilai dibatasi RICH_MAX_LENGTH dan baris barunya terjaga", () => {
    const field = { label: "Isi", type: "richtext" as const };
    const ok = normalizeFieldValue(field, "a\nb\n\n- c");
    assert.deepEqual(ok, { ok: true, value: "a\nb\n\n- c" });
    assert.equal(normalizeFieldValue(field, "x".repeat(RICH_MAX_LENGTH + 1)).ok, false);
    assert.equal(normalizeFieldValue(field, "x".repeat(RICH_MAX_LENGTH)).ok, true);
  });

  it("Nota Dinas di katalog memakai teks berformat", () => {
    const nota = getCatalogV2().find((e) => e.catalogKey === "cat_adm_nota_dinas")!;
    assert.equal((nota.document.fields as any[]).find((x) => x.id === "isi").type, "richtext");
  });

  it("kolom isian: bilah format tersedia dengan nama yang jelas", () => {
    const out = renderToStaticMarkup(createElement(RichTextInput, { id: "x", value: "", onChange: () => {} }));
    for (const label of ["Tebal", "Miring", "Garis bawah", "Daftar bernomor", "Daftar berpoin"]) assert.ok(out.includes(`aria-label="${label}"`), label);
    assert.ok(out.includes('role="toolbar"'));
    assert.ok(out.includes("<textarea"));
  });
});

describe("tag HTML kecil yang diizinkan", () => {
  it("<br> dan <p> menjadi pindah-baris dan paragraf", () => {
    const b = parseRich("satu<br/>dua<BR>tiga<p>paragraf baru</p><p>lagi</p>");
    assert.deepEqual(b.map((x) => x.type), ["p", "p", "p"]);
    assert.equal((b[0] as any).lines.length, 3);
    assert.equal(richToPlain("a<br />b"), "a\nb");
  });

  it("<b>/<strong>, <i>/<em>, <u> menjadi tebal, miring, garis bawah (tumpang tindih boleh)", () => {
    const runs = parseInline("<b>tebal</b> <em>miring</em> <u>bawah</u> <u><b>dua</b></u>");
    const by = (text: string) => runs.find((r) => r.text === text)!;
    assert.equal(by("bawah").underline, true);
    const norm = parseRich("<b>tebal</b> <em>miring</em>")[0] as any;
    assert.ok(norm.lines[0].some((r: any) => r.text === "tebal" && r.bold));
    assert.ok(norm.lines[0].some((r: any) => r.text === "miring" && r.italic));
    const nested = parseRich("<u><b>dua</b></u>")[0] as any;
    assert.ok(nested.lines[0].some((r: any) => r.text === "dua" && r.bold && r.underline));
  });

  it("<ul>/<ol>/<li> menjadi daftar; nomor dihitung", () => {
    const b = parseRich("<ol><li>satu</li><li>dua</li></ol><ul><li>x</li></ul>");
    assert.deepEqual(b.map((x) => x.type), ["ol", "ul"]);
    assert.equal((b[0] as any).items.length, 2);
  });

  it("tag lain tidak diproses: <script>/<img> tetap teks dan lolos dari markup saat dirender", () => {
    assert.equal(normalizeRichTags("<script>x</script>"), "<script>x</script>");
    const d = docOf("richtext");
    const out = render(d, "<script>alert(1)</script><img src=x onerror=alert(1)><b>ok</b>");
    assert.ok(!out.includes("<script") && !out.includes("<img src=x"));
    assert.ok(out.includes("&lt;script&gt;") && out.includes("<strong>ok</strong>"));
  });

  it("perbandingan biasa ('a < b') tidak terganggu", () => {
    assert.equal(richToPlain("nilai a < b dan c > d"), "nilai a < b dan c > d");
  });

  it("bilah: garis bawah membungkus/melepas dengan <u>", () => {
    let e = toggleWrap("halo dunia", 5, 10, UNDERLINE);
    assert.equal(e.value, "halo <u>dunia</u>");
    e = toggleWrap(e.value, e.start, e.end, UNDERLINE);
    assert.equal(e.value, "halo dunia");
  });

  it("katalog: isian prosa panjang memakai teks berformat", () => {
    const find = (key: string, id: string) => (getCatalogV2().find((e) => e.catalogKey === key)!.document.fields as any[]).find((x) => x.id === id);
    assert.equal(find("cat_adm_berita_acara", "uraian")?.type, "richtext");
  });
});
