/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LetterPaper } from "../components/letters/LetterPaper.tsx";
import { validateDocument } from "../lib/letters/document/validate.ts";
import type { LetterDocument } from "../lib/letters/document/schema.ts";
import { deriveFormSpec } from "../lib/letters/document/form-spec.ts";
import { applyOfficialOverrides, parseLetterInput } from "../lib/letters/server/input.ts";
import { emptyLetterValues, sampleLetterValues } from "../lib/letters/values.ts";
import { OFFICIAL_FIELDS, officialJabatan } from "../lib/letters/registry.ts";
import { mergeMailSectionIntoVillageSettings, parseMailSettings } from "../lib/mail/letterFormSnapshot.ts";
import { applyDraft, draftFromContext, patchFromDraft } from "../lib/letters/letterhead-draft.ts";
import { getCatalogV2 } from "../lib/letters/catalog/index.ts";
import { createFromPreset } from "../lib/letters/editor/presets.ts";
import { flattenBlocks } from "../lib/letters/document/validate.ts";
import { f, para, t } from "./letters-fixtures.ts";

function docWithSlot(slot: Record<string, unknown>): LetterDocument {
  const r = validateDocument({
    schemaVersion: 2,
    kind: "keterangan",
    audience: "internal",
    body: [
      para("p1", t("Isi surat.")),
      { id: "ttd", type: "signature", dateline: [f("desa.nama"), t(", "), f("surat.tanggal", "tanggal")], slots: [{ id: "camat", who: { kind: "pejabat", official: "camat" }, caption: [t("Mengetahui, Camat")], ...slot }] },
    ],
  });
  assert.ok(r.ok, r.ok ? "" : JSON.stringify(r.issues));
  return r.doc;
}

function render(doc: LetterDocument, camat: Record<string, string>, mode: "preview" | "print" = "print") {
  const v = emptyLetterValues();
  v.pejabat.camat = { jabatan: "Camat", nama: "", nip: "", ...camat };
  return renderToStaticMarkup(createElement(LetterPaper, { doc, values: v, mode }));
}

/** Jumlah baris bantalan (div tersembunyi berisi spasi tak terputus) di markup. */
const pads = (html: string) => (html.match(/<div aria-hidden="true">\u00a0<\/div>/g) ?? []).length;

describe("tanda tangan pejabat: pangkat/golongan dan nomor register", () => {
  it("registry memuat isian golongan di antara nama dan NIP", () => {
    assert.deepEqual(OFFICIAL_FIELDS.map((x) => x.key), ["nama", "golongan", "nip", "jabatan"]);
  });

  it("urutan cetak: nama, golongan, lalu NIP", () => {
    const doc = docWithSlot({ showNip: true, showGolongan: true });
    const out = render(doc, { nama: "Drs. Hadi", golongan: "Pembina Tk. I (IV/b)", nip: "197001012000031001" });
    const i = (s: string) => out.indexOf(s);
    assert.ok(i("Drs. Hadi") > 0 && i("Pembina Tk. I (IV/b)") > i("Drs. Hadi") && i("NIP. 19700101 200003 1 001") > i("Pembina Tk. I (IV/b)"));
  });

  it("bawaan mati: golongan tidak tampil walau terisi; kosong tidak menyisakan baris", () => {
    assert.ok(!render(docWithSlot({}), { nama: "X", golongan: "Penata (III/c)" }).includes("Penata (III/c)"));
    const out = render(docWithSlot({ showGolongan: true, showNip: true }), { nama: "X" });
    assert.ok(!out.includes("NIP."));
  });

  it("nomor register: baris bertitik-titik di bawah jabatan, sebelum ruang tanda tangan, juga saat cetak", () => {
    const doc = docWithSlot({ showRegister: true });
    for (const mode of ["print", "preview"] as const) {
      const out = render(doc, { nama: "Drs. Hadi" }, mode);
      assert.ok(out.includes("No. Register :"), mode);
      assert.ok(out.includes("border-bottom:1px dotted #000"), mode);
      assert.ok(out.indexOf("Mengetahui, Camat") < out.indexOf("No. Register :"));
      assert.ok(out.indexOf("No. Register :") < out.indexOf("Drs. Hadi"));
    }
    assert.ok(!render(docWithSlot({}), { nama: "X" }).includes("No. Register"));
  });

  it("penanda tangan berdampingan: jumlah baris di bawah nama disamakan agar nama sejajar", () => {
    const r = validateDocument({
      schemaVersion: 2, kind: "keterangan", audience: "internal",
      body: [{ id: "ttd", type: "signature", slots: [
        { id: "kades", who: { kind: "pejabat", official: "kades" } },
        { id: "camat", who: { kind: "pejabat", official: "camat" }, showNip: true, showGolongan: true },
      ] }],
    });
    assert.ok(r.ok);
    const v = emptyLetterValues();
    v.pejabat.kades = { jabatan: "Kepala Desa", nama: "Slamet", nip: "" };
    v.pejabat.camat = { jabatan: "Camat", nama: "Hadi", nip: "197001", golongan: "IV/b" };
    const out = renderToStaticMarkup(createElement(LetterPaper, { doc: r.doc, values: v, mode: "print" }));
    assert.equal(pads(out), 2, "Kades butuh 2 baris bantalan (golongan + NIP), Camat 0");
    // Satu penanda tangan tidak diberi bantalan.
    const single = docWithSlot({ showNip: true, showGolongan: true });
    assert.equal(pads(render(single, { nama: "X", golongan: "IV/b", nip: "1" })), 0);
  });

  it("dokumen lama tanpa bidang baru tetap sah (bawaan false)", () => {
    const slot = docWithSlot({}).body.find((b) => b.type === "signature") as any;
    assert.equal(slot.slots[0].showGolongan, false);
    assert.equal(slot.slots[0].showRegister, false);
  });

  it("contoh pratinjau memuat golongan", () => {
    assert.equal(sampleLetterValues(docWithSlot({})).pejabat.camat.golongan, OFFICIAL_FIELDS.find((x) => x.key === "golongan")!.example);
  });

  it("setiap blok Camat di katalog menyalakan NIP, golongan, dan nomor register", () => {
    let found = 0;
    for (const e of getCatalogV2()) {
      for (const b of flattenBlocks(e.document.body as any)) {
        if (b.type !== "signature") continue;
        for (const slot of b.slots) {
          if (slot.who.kind === "pejabat" && slot.who.official === "camat") {
            found++;
            assert.ok(slot.showNip && slot.showGolongan && slot.showRegister, `${e.catalogKey}: slot camat belum lengkap`);
          }
        }
      }
    }
    assert.ok(found >= 1, "tidak ada slot camat di katalog");
  });

  it("preset 'Tanda tangan + Mengetahui Camat' menyalakan NIP, golongan, dan nomor register; Kades tetap sederhana", () => {
    const base = docWithSlot({});
    const r = createFromPreset({ ...base, body: [] }, "tanda_tangan_mengetahui");
    const sig = r.doc.body.find((b) => b.id === r.blockId) as any;
    const camat = sig.slots.find((x: any) => x.id === "camat");
    const kades = sig.slots.find((x: any) => x.id === "kades");
    assert.ok(camat.showNip && camat.showGolongan && camat.showRegister);
    assert.ok(!kades.showGolongan && !kades.showRegister);
  });
});

describe("penimpaan per surat: golongan", () => {
  const doc = docWithSlot({});
  const spec = deriveFormSpec(doc);
  const base = {};
  const pejabat = {
    kades: { nama: "A", nip: "", jabatan: "Kepala Desa" },
    sekdes: { nama: "", nip: "", jabatan: "Sekretaris Desa" },
    camat: { nama: "Camat Lama", nip: "111", golongan: "Penata (III/c)", jabatan: "Camat" },
  };
  const parse = (officials: unknown) => parseLetterInput({ ...base, officials }, doc, spec, "completed");

  it("diterima, ditimpa, dan yang kosong tetap bawaan desa", () => {
    const p = parse({ camat: { golongan: "  Pembina (IV/a) ", nip: "" } });
    assert.ok(p.ok, JSON.stringify(p));
    const out = applyOfficialOverrides(pejabat, p.value.officials);
    assert.equal(out.camat.golongan, "Pembina (IV/a)");
    assert.equal(out.camat.nip, "111");
    assert.equal(out.camat.nama, "Camat Lama");
    assert.equal(pejabat.camat.golongan, "Penata (III/c)");
  });

  it("batas panjang 80 dan harus teks", () => {
    assert.equal(parse({ camat: { golongan: "x".repeat(81) } }).ok, false);
    assert.equal(parse({ camat: { golongan: 5 } }).ok, false);
    assert.equal(parse({ camat: { golongan: "x".repeat(80) } }).ok, true);
  });
});

describe("pengaturan desa: NIP & golongan Camat", () => {
  it("parse/merge menjaga kunci lain dan tidak menghapus nilai bila tidak dikirim", () => {
    const merged = mergeMailSectionIntoVillageSettings({ other: 1, mail: { camatNama: "C", camatNip: "9" } }, { camatGolongan: "IV/a" });
    assert.equal((merged as any).other, 1);
    assert.deepEqual(parseMailSettings(merged), { kepalaDesaNama: "", kepalaDesaNip: "", sekretarisNama: "", camatNama: "C", camatNip: "9", camatGolongan: "IV/a" });
    assert.equal(parseMailSettings(null).camatNip, "");
  });

  it("draf kop: perubahan camat masuk PATCH dan pratinjau", () => {
    const ctx: any = {
      desa: { nama: "D", alamat: "Jl", kode_pos: "", telepon: "", email: "" },
      pejabat: { kades: { nama: "K", nip: "", jabatan: "Kepala Desa" }, sekdes: { nama: "", nip: "", jabatan: "Sekretaris Desa" }, camat: { nama: "C", nip: "", jabatan: "Camat" } },
      logoUrl: null,
    };
    const saved = draftFromContext(ctx);
    assert.equal(patchFromDraft(saved, { ...saved }), null);
    const next = { ...saved, camatGolongan: "Pembina (IV/a)", camatNip: "1970" };
    assert.deepEqual(patchFromDraft(saved, next), { officials: { camatGolongan: "Pembina (IV/a)", camatNip: "1970" } });
    const pv = applyDraft(ctx, next);
    assert.equal(pv.pejabat.camat.golongan, "Pembina (IV/a)");
    assert.equal(pv.pejabat.camat.nip, "1970");
  });
});

describe("pratinjau pembuat surat", () => {
  it("pembungkus kertas hanya menggulir mendatar: overflow-y-hidden mencegah scrollbar vertikal kedua di dalam panel", () => {
    const src = readFileSync("app/(app)/layanan-surat/buat/_components/ScaledPaper.tsx", "utf8");
    const m = src.match(/<div ref=\{host\} className="([^"]*)"/);
    assert.ok(m, "pembungkus kertas tidak ditemukan");
    const classes = m[1].split(/\s+/);
    assert.ok(classes.includes("overflow-x-auto") && classes.includes("overflow-y-hidden"));
    // tinggi dibulatkan ke atas agar isi tidak pernah melebihi pembungkus
    assert.ok(src.includes("Math.ceil(innerH * scale)"));
  });
});

describe("jabatan Camat memuat nama kecamatan", () => {
  it("awalan Kecamatan/Kec. dibuang; tanpa kecamatan tetap 'Camat'; pejabat lain tidak berubah", () => {
    assert.equal(officialJabatan("camat", "Kecamatan Sawangan"), "Camat Sawangan");
    assert.equal(officialJabatan("camat", "kecamatan  Sawangan Baru "), "Camat Sawangan Baru");
    assert.equal(officialJabatan("camat", "Kec. Cinere"), "Camat Cinere");
    assert.equal(officialJabatan("camat", "Sawangan"), "Camat Sawangan");
    assert.equal(officialJabatan("camat", ""), "Camat");
    assert.equal(officialJabatan("camat", null), "Camat");
    assert.equal(officialJabatan("camat"), "Camat");
    assert.equal(officialJabatan("kades", "Kecamatan Sawangan"), "Kepala Desa");
    assert.equal(officialJabatan("sekdes", "Sawangan"), "Sekretaris Desa");
  });
});
