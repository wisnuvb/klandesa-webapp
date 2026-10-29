/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LetterPaper, diktumOrdinal, letterPrintCss } from "../components/letters/LetterPaper.tsx";
import { renderLetterHtml, renderLetterHtmlDocument } from "../lib/letters/render-html.tsx";
import { validateDocument } from "../lib/letters/document/validate.ts";
import type { LetterDocument } from "../lib/letters/document/schema.ts";
import { emptyLetterValues, sampleLetterValues, type LetterValues } from "../lib/letters/values.ts";
import { FIXTURES, f, para, t } from "./letters-fixtures.ts";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function docOf(input: unknown): LetterDocument {
  const r = validateDocument(input);
  assert.ok(r.ok, r.ok ? "" : JSON.stringify(r.issues));
  return r.doc;
}

function html(doc: LetterDocument, values: LetterValues, mode: "preview" | "print" = "print", extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(createElement(LetterPaper, { doc, values, mode, ...extra }));
}

const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("renderer: semua fixture dapat dirender", () => {
  const keyText: Record<string, string[]> = {
    keteranganDomisili: ["SURAT KETERANGAN DOMISILI", "Yang bertanda tangan"],
    ahliWaris: ["SURAT KETERANGAN AHLI WARIS", "AHLI WARIS", "Mengetahui,"],
    kematian: ["SURAT KETERANGAN KEMATIAN", "Penyebab kematian"],
    penghasilan: ["SURAT KETERANGAN PENGHASILAN", "Rp 2.500.000", "dua juta lima ratus ribu rupiah"],
    jualBeliTanah: ["JUAL BELI TANAH", "Pihak Pertama,", "Berbatasan dengan"],
    pengantarNikah: ["SURAT PENGANTAR NIKAH"],
    undangan: ["Sifat", "Tembusan :", "a.n. Kepala Desa"],
    keputusanKades: ["KEPUTUSAN KEPALA DESA", "MEMUTUSKAN:", "KESATU", "Ditetapkan di"],
    beritaAcara: ["BERITA ACARA MUSYAWARAH DESA", "DAFTAR HADIR", "Ketua BPD"],
  };

  for (const [name, fixture] of Object.entries(FIXTURES)) {
    it(`fixture ${name} (preview & print) tanpa error dan memuat teks kunci`, () => {
      const doc = docOf(fixture);
      const values = sampleLetterValues(doc);
      values.surat.nomor = "001/475/X/2026";
      for (const mode of ["preview", "print"] as const) {
        const out = html(doc, values, mode);
        assert.ok(out.length > 200);
        for (const k of keyText[name] ?? []) assert.ok(out.includes(k), `${name}/${mode}: tidak memuat "${k}"`);
      }
    });
  }

  it("fixture yang ditambahkan nanti tetap tercakup", () => {
    assert.deepEqual(Object.keys(keyText).sort(), Object.keys(FIXTURES).sort());
  });
});

describe("renderer: keamanan", () => {
  const XSS = `<script>alert(1)</script>"><img src=x onerror=alert(1)>`;

  it("nilai isian orang, isian tambahan, desa, pejabat, surat dan grup di-escape", () => {
    const doc = docOf(FIXTURES.ahliWaris);
    const v = sampleLetterValues(doc);
    v.people.almarhum.nama = XSS;
    v.fields.keperluan = XSS;
    v.desa.nama = XSS;
    v.desa.alamat = XSS;
    v.pejabat.kades.nama = XSS;
    v.surat.nomor = XSS;
    v.groups.ahli_waris[0].nama = XSS;
    v.groups.saksi[0].nama = XSS;
    for (const mode of ["preview", "print"] as const) {
      const out = html(doc, v, mode);
      assert.ok(!out.includes("<script"), `${mode}: <script lolos`);
      assert.ok(!out.includes("<img src=x"), `${mode}: <img sisipan lolos`);
      assert.ok(!out.includes('onerror=alert(1)>'), `${mode}: atribut lolos`);
      assert.ok(out.includes("&lt;script&gt;"));
    }
  });

  it("teks di dokumen (judul, paragraf) juga di-escape", () => {
    const d = clone(FIXTURES.keteranganDomisili) as any;
    d.body.push(para("x", t("<b onclick=1>hai</b>")));
    const out = html(docOf(d), sampleLetterValues(docOf(d)));
    assert.ok(!out.includes("<b onclick"));
    assert.ok(out.includes("&lt;b onclick=1&gt;"));
  });

  it("src gambar berbahaya tidak dirender sebagai <img>", () => {
    const doc = docOf(FIXTURES.keteranganDomisili);
    // Dokumen tervalidasi menolak src ini; renderer tetap pertahanan kedua bila lolos.
    const bad = clone(doc) as any;
    bad.body.push({ id: "img", type: "image", src: "javascript:alert(1)", alt: "x", widthMm: 40, align: "center" });
    bad.body.push({ id: "img2", type: "image", src: "//evil.example/x.png", alt: "y", widthMm: 40, align: "center" });
    const out = html(bad, sampleLetterValues(doc));
    assert.ok(!out.includes("javascript:"));
    assert.ok(!out.includes("evil.example"));
    assert.equal(count(out, "<img"), 0);

    const ok = clone(doc) as any;
    ok.body.push({ id: "img", type: "image", src: "/uploads/logo.png", alt: "Logo", widthMm: 40, align: "center" });
    assert.equal(count(html(ok, sampleLetterValues(doc)), 'src="/uploads/logo.png"'), 1);
  });

  it("logo kop berbahaya diabaikan; logo aman dipakai", () => {
    const doc = docOf(FIXTURES.keteranganDomisili);
    const v = sampleLetterValues(doc);
    v.logoUrl = "javascript:alert(1)";
    assert.ok(!html(doc, v).includes("javascript:"));
    assert.equal(count(html(doc, v), "<img"), 0);
    v.logoUrl = "https://cdn.example.com/logo.png";
    assert.equal(count(html(doc, v), 'src="https://cdn.example.com/logo.png"'), 1);
  });

  it("qrSrc hanya menerima data URL png/svg atau path aman", () => {
    const d = clone(FIXTURES.keteranganDomisili) as any;
    d.body.push({ id: "qr", type: "qr", sizeMm: 22, align: "right" });
    const doc = docOf(d);
    const v = sampleLetterValues(doc);
    assert.equal(count(html(doc, v, "print", { qrSrc: 'javascript:alert(1)' }), "<img"), 0);
    assert.equal(count(html(doc, v, "print", { qrSrc: 'data:text/html;base64,AAAA' }), "<img"), 0);
    assert.equal(count(html(doc, v, "print", { qrSrc: "data:image/png;base64,iVBORw0KGgo=" }), 'src="data:image/png;base64,iVBORw0KGgo="'), 1);
  });

  it("tidak ada dangerouslySetInnerHTML di komponen & render-html", () => {
    const files = readdirSync("components/letters").map((n) => `components/letters/${n}`);
    files.push("lib/letters/render-html.tsx");
    assert.ok(files.length >= 2);
    for (const file of files) {
      assert.ok(!readFileSync(file, "utf8").includes("dangerouslySetInnerHTML"), file);
    }
  });

  it("keluaran render-html tidak memuat <script> walau nilai berniat jahat", async () => {
    const doc = docOf(FIXTURES.keteranganDomisili);
    const v = sampleLetterValues(doc);
    v.people.pemohon.nama = XSS;
    v.fields.keperluan = XSS;
    for (const out of [await renderLetterHtml({ doc, values: v }), await renderLetterHtmlDocument({ doc, values: v })]) {
      assert.ok(!/<script/i.test(out));
      assert.ok(!/onerror=alert\(1\)>/.test(out));
    }
  });
});

describe("renderer: perilaku blok", () => {
  it("konten bersyarat tersembunyi/tampil sesuai nilai", () => {
    const doc = docOf(FIXTURES.pengantarNikah);
    const v = sampleLetterValues(doc);
    v.fields.di_bawah_21 = "Tidak";
    assert.ok(!html(doc, v).includes("Dengan izin orang tua/wali"));
    v.fields.di_bawah_21 = "Ya";
    assert.ok(html(doc, v).includes("Dengan izin orang tua/wali"));
  });

  it("jumlah baris repeatTable = jumlah baris grup", () => {
    const doc = docOf(FIXTURES.ahliWaris);
    for (const n of [1, 3, 7]) {
      const v = sampleLetterValues(doc);
      v.groups.ahli_waris = Array.from({ length: n }, (_, i) => ({ nama: `Ahli ${i + 1}`, ttl: "x", nik: "y", pekerjaan: "z", alamat: "a" }));
      const out = html(doc, v, "print");
      const table = out.slice(out.indexOf('data-group="ahli_waris"'));
      const body = table.slice(table.indexOf("<tbody>"), table.indexOf("</tbody>"));
      assert.equal(count(body, "<tr"), n, `n=${n}`);
      assert.ok(body.includes(`Ahli ${n}`));
    }
  });

  it("repeatTable kosong: print tanpa baris, preview satu baris penanda", () => {
    const doc = docOf(FIXTURES.ahliWaris);
    const v = sampleLetterValues(doc);
    v.groups.ahli_waris = [];
    const body = (s: string) => {
      const i = s.indexOf('data-group="ahli_waris"');
      const x = s.slice(i);
      return x.slice(x.indexOf("<tbody>"), x.indexOf("</tbody>"));
    };
    assert.equal(count(body(html(doc, v, "print")), "<tr"), 0);
    assert.equal(count(body(html(doc, v, "preview")), "<tr"), 1);
  });

  it("slot tanda tangan 'grup' menghasilkan satu kolom per baris", () => {
    const doc = docOf(FIXTURES.ahliWaris);
    for (const n of [2, 4]) {
      const v = sampleLetterValues(doc);
      v.groups.saksi = Array.from({ length: n }, (_, i) => ({ nama: `Saksi ke-${i + 1}`, nik: "1" }));
      const out = html(doc, v);
      assert.equal(count(out, 'data-slot="saksi"'), n);
      for (let i = 1; i <= n; i++) assert.ok(out.includes(`Saksi ke-${i}`));
      // + Kades + Camat
      assert.equal(count(out, "data-slot="), n + 2);
    }
  });

  it("diktum KESATU, KEDUA, … dan fallback KE-N", () => {
    const doc = docOf(FIXTURES.keputusanKades);
    const out = html(doc, sampleLetterValues(doc));
    assert.ok(out.includes("KESATU") && out.includes("KEDUA") && out.includes("KETIGA"));
    assert.equal(diktumOrdinal(1), "KESATU");
    assert.equal(diktumOrdinal(10), "KESEPULUH");
    assert.equal(diktumOrdinal(20), "KEDUAPULUH");
    assert.equal(diktumOrdinal(21), "KE-21");
  });

  it("prefix a.n./Plt./Pj./u.b. pada tanda tangan", () => {
    const base = clone(FIXTURES.keteranganDomisili) as any;
    const sig = base.body.find((b: any) => b.type === "signature");
    const cases: Array<[string, string]> = [["an", "a.n."], ["plt", "Plt."], ["pj", "Pj."], ["ub", "u.b."]];
    for (const [prefix, text] of cases) {
      sig.slots[0].prefix = prefix;
      const doc = docOf(base);
      const out = html(doc, sampleLetterValues(doc));
      assert.ok(out.includes(`${text} Kepala Desa`), prefix);
    }
  });

  it("stempel dan materai: kotak penanda di preview, transparan di print", () => {
    const doc = docOf(FIXTURES.jualBeliTanah);
    const v = sampleLetterValues(doc);
    const preview = html(doc, v, "preview");
    assert.ok(preview.includes("Materai") && preview.includes("Stempel"));
    const print = html(doc, v, "print");
    assert.ok(!print.includes(">Materai<") && !print.includes(">Stempel<"));
  });

  it("isian kosong: preview = penanda berlabel; print = kosong/fallback", () => {
    const d = clone(FIXTURES.keteranganDomisili) as any;
    d.body.push(para("fb", t("NIP: "), { type: "field", ref: "pejabat.kades.nip", fallback: "-" }));
    const doc = docOf(d);
    const v = emptyLetterValues();
    v.people.pemohon = {};
    const preview = html(doc, v, "preview");
    assert.ok(preview.includes("«Nama lengkap»"));
    assert.ok(preview.includes('class="lp-ph"'));
    assert.ok(preview.includes('data-ref="pemohon.nama"'));
    assert.ok(preview.includes('data-empty="true"'));
    const print = html(doc, v, "print");
    assert.ok(!print.includes("«"));
    assert.ok(!print.includes("lp-ph"));
    assert.ok(print.includes("NIP: ") && print.includes('data-ref="pejabat.kades.nip" data-empty="true"') && print.includes(">-</span>"));
  });

  it("isian terisi: data-empty=false dan nilai diformat (tanggal Indonesia otomatis)", () => {
    const doc = docOf(FIXTURES.kematian);
    const v = sampleLetterValues(doc);
    v.people.almarhum.tanggal_meninggal = "2026-10-10";
    v.surat.tanggal = "2026-10-29";
    const out = html(doc, v);
    assert.ok(out.includes("10 Oktober 2026"));
    assert.ok(out.includes("29 Oktober 2026"));
    assert.ok(out.includes('data-ref="almarhum.nama" data-empty="false"'));
  });

  it("klik isian: hanya aktif di preview dan bila onFieldClick diberikan", () => {
    const doc = docOf(FIXTURES.keteranganDomisili);
    const v = sampleLetterValues(doc);
    const withClick = html(doc, v, "preview", { onFieldClick: () => {} });
    assert.ok(withClick.includes('role="button"') && withClick.includes('tabindex="0"'));
    assert.ok(!html(doc, v, "preview").includes('role="button"'));
    assert.ok(!html(doc, v, "print", { onFieldClick: () => {} }).includes('role="button"'));
  });

  it("kop: desa (standar Perbup), garuda, none", () => {
    const base = clone(FIXTURES.keteranganDomisili) as any;
    const v = (d: LetterDocument) => {
      const x = sampleLetterValues(d);
      x.desa = { nama: "Desa Brambang", kecamatan: "Kecamatan Gondangwetan", kabupaten: "Kabupaten Pasuruan", alamat: "Jl. Raya 1", kode_pos: "67174", email: "a@b.id", telepon: "" };
      return x;
    };
    const d1 = docOf(base);
    const o1 = html(d1, v(d1));
    assert.ok(o1.includes("PEMERINTAH KABUPATEN PASURUAN"));
    assert.ok(o1.includes("KECAMATAN GONDANGWETAN"));
    assert.ok(o1.includes("DESA BRAMBANG"));
    assert.ok(!o1.includes("DESA DESA") && !o1.includes("KABUPATEN KABUPATEN"));
    assert.ok(o1.includes("Jl. Raya 1, Email: a@b.id, Kode Pos 67174"));
    assert.ok(!o1.includes("Telp."));

    base.letterhead = "garuda";
    const d2 = docOf(base);
    const o2 = html(d2, v(d2));
    assert.ok(o2.includes("KEPALA DESA BRAMBANG") && o2.includes("KABUPATEN PASURUAN"));
    assert.ok(!o2.includes("PEMERINTAH KABUPATEN"));

    base.letterhead = "none";
    const d3 = docOf(base);
    assert.ok(!html(d3, v(d3)).includes("lp-kop"));
  });

  it("kolom, tabel statis, daftar, cc dirender", () => {
    const d = clone(FIXTURES.keteranganDomisili) as any;
    d.body.push(
      { id: "kol", type: "columns", ratios: [2, 1], children: [[para("k1", t("Kiri"))], [para("k2", t("Kanan"))]] },
      { id: "lst", type: "list", style: "alpha", items: [[t("satu")], [t("dua")]] },
      { id: "bul", type: "list", style: "bullet", items: [[t("x")]] },
      { id: "cc", type: "cc", label: "Tembusan :", items: [[t("Camat")], [t("Arsip")]] },
      { id: "tb", type: "table", bordered: true, columns: [{ label: "A" }, { label: "B" }], rows: [[[t("a1")], [f("desa.nama")]]] },
    );
    const doc = docOf(d);
    const out = html(doc, sampleLetterValues(doc));
    assert.ok(out.includes("Kiri") && out.includes("Kanan"));
    assert.ok(out.includes('type="a"') && out.includes("<ul"));
    assert.ok(out.includes("Tembusan :") && out.includes("Arsip"));
    assert.ok(out.includes("a1"));
  });

  it("title: nomor tampil bila ada; preview menandai nomor kosong, print menyembunyikan", () => {
    const doc = docOf(FIXTURES.keteranganDomisili);
    const v = sampleLetterValues(doc);
    v.surat.nomor = "";
    assert.ok(html(doc, v, "preview").includes("«Nomor surat»"));
    assert.ok(!html(doc, v, "print").includes("Nomor :"));
    v.surat.nomor = "012/2026";
    assert.ok(html(doc, v, "print").includes("Nomor : <span"));
    assert.ok(html(doc, v, "print").includes("012/2026"));
  });

  it("marks tebal/miring/garis bawah", () => {
    const d = clone(FIXTURES.keteranganDomisili) as any;
    d.body.push(para("m", t("tebal", ["b"]), t("miring", ["i"]), t("garis", ["u"])));
    const doc = docOf(d);
    const out = html(doc, sampleLetterValues(doc));
    assert.ok(out.includes("<strong>tebal</strong>") && out.includes("<em>miring</em>") && out.includes("<u>garis</u>"));
  });

  it("pageBreak memakai break-after: page", () => {
    const doc = docOf(FIXTURES.beritaAcara);
    assert.ok(html(doc, sampleLetterValues(doc)).includes("break-after:page"));
  });
});

describe("kertas & CSS cetak", () => {
  it("F4 bawaan: lebar 215mm; A4 landscape menukar sisi", () => {
    const d = clone(FIXTURES.keteranganDomisili) as any;
    const doc = docOf(d);
    const out = html(doc, sampleLetterValues(doc));
    assert.ok(out.includes("width:215mm") && out.includes("min-height:330mm"));
    assert.ok(out.includes("padding:20mm 20mm 20mm 25mm"));
    assert.ok(out.includes("Times New Roman"));

    d.page = { size: "A4", orientation: "landscape", font: "arial", fontSizePt: 11, lineHeight: 1.5 };
    const doc2 = docOf(d);
    const out2 = html(doc2, sampleLetterValues(doc2));
    assert.ok(out2.includes("width:297mm") && out2.includes("min-height:210mm"));
    assert.ok(out2.includes("font-size:11pt") && out2.includes("line-height:1.5") && out2.includes("Arial"));
  });

  it("letterPrintCss: @page, margin, dan aturan hindari-potong", () => {
    const doc = docOf(FIXTURES.keteranganDomisili);
    const css = letterPrintCss(doc);
    assert.ok(css.startsWith("@page{size:215mm 330mm;margin:20mm 20mm 20mm 25mm}"));
    assert.ok(css.includes("break-inside:avoid"));
    assert.ok(css.includes(".lp-no-print{display:none!important}"));
    assert.ok(!/[<>"']/.test(css), "CSS tidak boleh memuat karakter HTML");
  });

  it("render-html: fragmen memuat <style> + kertas; dokumen penuh valid", async () => {
    const doc = docOf(FIXTURES.keteranganDomisili);
    const v = sampleLetterValues(doc);
    const frag = await renderLetterHtml({ doc, values: v });
    assert.ok(frag.startsWith("<style>@page{size:215mm 330mm"));
    assert.ok(frag.includes('data-letter-paper=""'));
    assert.ok(frag.includes('data-mode="print"'));
    const full = await renderLetterHtmlDocument({ doc, values: v });
    assert.ok(full.startsWith("<!doctype html>"));
    assert.ok(full.includes('<meta charset="utf-8">') && full.includes('name="viewport"'));
    assert.ok(full.includes(frag));
    assert.ok(full.trimEnd().endsWith("</html>"));
  });

  it("keluaran print deterministik (sama untuk masukan sama)", async () => {
    const doc = docOf(FIXTURES.ahliWaris);
    const v = sampleLetterValues(doc);
    assert.equal(await renderLetterHtml({ doc, values: v }), await renderLetterHtml({ doc, values: clone(v) }));
  });
});
