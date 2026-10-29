/* eslint-disable @typescript-eslint/no-explicit-any -- tes memakai dokumen JSON mentah */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LIMITS, type Block, type LetterDocument } from "../lib/letters/document/schema.ts";
import { validateDocument } from "../lib/letters/document/validate.ts";
import { updateBlockById, walkBlocks } from "../lib/letters/editor/ops.ts";
import { BLOCK_PRESETS } from "../lib/letters/editor/presets.ts";
import { NUMBERING_TOKENS, validateNumberPattern } from "../lib/letters/numbering.ts";
import { MARGIN_PRESETS } from "../lib/letters/paper.ts";
import * as H from "../components/letters/editor/panels/helpers.ts";
import { FIXTURES } from "./letters-fixtures.ts";

const parsed = (key: string): LetterDocument => {
  const v = validateDocument(FIXTURES[key]);
  assert.ok(v.ok, `fixture ${key} harus valid`);
  return v.doc;
};

/** Terapkan pembuat patch pada bagian dan pastikan dokumen hasilnya tetap lolos validasi. */
function applyAndValidate(doc: LetterDocument, id: string, fn: (b: Block) => Block): LetterDocument {
  const r = updateBlockById(doc, id, fn);
  assert.ok(r.ok, "updateBlockById harus berhasil");
  const v = validateDocument(r.doc);
  assert.ok(v.ok, `dokumen harus tetap valid: ${v.ok ? "" : JSON.stringify(v.issues)}`);
  return v.doc;
}

const blocksOf = (doc: LetterDocument): Block[] => {
  const out: Block[] = [];
  walkBlocks(doc, (b) => out.push(b));
  return out;
};

describe("patch bagian selalu menghasilkan dokumen valid", () => {
  for (const key of Object.keys(FIXTURES)) {
    it(`fixture ${key}`, () => {
      const doc = parsed(key);
      for (const block of blocksOf(doc)) {
        const id = block.id;
        // nilai ekstrem untuk angka: harus dibatasi
        applyAndValidate(doc, id, (b) => H.patchBlock(b, { spaceAfterMm: 999, heightMm: -5, sizeMm: 1000, widthMm: 0, gapMm: 1, labelWidthMm: 500 } as any));
        applyAndValidate(doc, id, (b) => H.patchBlock(b, { align: "right", underline: true, indentFirst: true, numberPrefix: "x".repeat(99), separator: "abcdef" } as any));
        switch (block.type) {
          case "personData": {
            const b = block;
            applyAndValidate(doc, id, (x) => H.togglePersonField(x as any, "umur", true));
            applyAndValidate(doc, id, (x) => H.togglePersonField(x as any, b.fields[0], false));
            applyAndValidate(doc, id, (x) => H.movePersonField(x as any, b.fields[0], 1));
            break;
          }
          case "repeatTable": {
            const g = doc.groups.find((x) => x.id === block.group);
            assert.ok(g);
            applyAndValidate(doc, id, (x) => H.addRepeatColumn(x as any, g));
            applyAndValidate(doc, id, (x) => H.removeRepeatColumn(x as any, 0));
            applyAndValidate(doc, id, (x) => H.setRepeatColumn(x as any, 0, { label: "  Kolom Baru  ", align: "center" }, g));
            applyAndValidate(doc, id, (x) => H.setRepeatColumn(x as any, 0, { field: "tidak_ada" }, g));
            for (const other of doc.groups) applyAndValidate(doc, id, (x) => H.setRepeatGroup(x as any, other));
            break;
          }
          case "table":
            applyAndValidate(doc, id, (x) => H.addTableRow(x as any));
            applyAndValidate(doc, id, (x) => H.addTableColumn(x as any));
            applyAndValidate(doc, id, (x) => H.removeTableColumn(x as any, 0));
            applyAndValidate(doc, id, (x) => H.removeTableRow(x as any, 0));
            applyAndValidate(doc, id, (x) => H.setTableCell(x as any, 0, 0, "Isi\nbaris dua"));
            applyAndValidate(doc, id, (x) => H.setTableHeader(x as any, 0, "Judul"));
            break;
          case "memo":
            applyAndValidate(doc, id, (x) => H.addMemoRow(x as any));
            applyAndValidate(doc, id, (x) => H.removeMemoRow(x as any, 0));
            applyAndValidate(doc, id, (x) => H.setMemoRow(x as any, 0, { label: "Hal", valueText: "Undangan" }));
            break;
          case "signature":
            for (const slot of block.slots) {
              applyAndValidate(doc, id, (x) => H.setSlot(x as any, slot.id, { gapMm: 999, prefix: "plt", stamp: true, materai: true, showNip: true, align: "left" }));
              applyAndValidate(doc, id, (x) => H.setSlot(x as any, slot.id, { gapMm: -4 }));
              applyAndValidate(doc, id, (x) => H.moveSlot(x as any, slot.id, 1));
              applyAndValidate(doc, id, (x) => H.removeSlot(x as any, slot.id));
            }
            applyAndValidate(doc, id, (x) => H.addSlot(x as any));
            applyAndValidate(doc, id, (x) => H.addSlot(H.addSlot(x as any), { kind: "pejabat", official: "camat" }));
            break;
          case "columns":
            for (const p of H.COLUMN_RATIO_PRESETS) applyAndValidate(doc, id, (x) => H.setColumnRatios(x as any, p.ratios));
            break;
          case "conditional": {
            const opts = H.conditionRefOptions(doc, block.when.ref);
            for (const o of opts) {
              applyAndValidate(doc, id, (x) => H.setCondition(x as any, { ref: o.ref, op: "filled" }));
            }
            applyAndValidate(doc, id, (x) => H.setCondition(x as any, { op: "neq", value: "Ya" }));
            break;
          }
          case "image":
            applyAndValidate(doc, id, (x) => H.patchBlock(x as any, { src: "/logo.png", alt: "Logo", widthMm: 70 } as any));
            break;
          default:
            break;
        }
      }
    });
  }

  it("kondisi tanpa nilai membuang nilai lama", () => {
    const doc = parsed("ahliWaris");
    const cond = { id: "c1", type: "conditional", when: { ref: "isian.keperluan", op: "eq", value: "x" }, children: [] } as Extract<Block, { type: "conditional" }>;
    const next = H.setCondition(cond, { op: "filled" });
    assert.equal(next.when.value, undefined);
    assert.ok(doc);
  });
});

describe("pembatasan nilai", () => {
  const para = { id: "p", type: "paragraph", align: "justify", indentFirst: false, spaceAfterMm: 3, content: [] } as Extract<Block, { type: "paragraph" }>;
  it("angka dijepit, NaN diabaikan", () => {
    assert.equal(H.patchBlock(para, { spaceAfterMm: 99 }).spaceAfterMm, 20);
    assert.equal(H.patchBlock(para, { spaceAfterMm: -3 }).spaceAfterMm, 0);
    assert.equal(H.patchBlock(para, { spaceAfterMm: Number.NaN }).spaceAfterMm, 3);
  });
  it("jenis dan id tidak bisa diubah lewat patch", () => {
    const r = H.patchBlock(para, { id: "lain", type: "heading" } as any);
    assert.equal(r.id, "p");
    assert.equal(r.type, "paragraph");
  });
  it("alamat gambar tidak aman diabaikan", () => {
    const img = { id: "i", type: "image", src: "/a.png", alt: "", widthMm: 40, align: "center" } as Extract<Block, { type: "image" }>;
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.com/x.png", "http://x.com/a.png", ""]) {
      assert.equal(H.patchBlock(img, { src: bad }).src, "/a.png", bad);
      assert.ok(H.validateImageSrc(bad), bad);
    }
    assert.equal(H.patchBlock(img, { src: " https://x.id/a.png " }).src, "https://x.id/a.png");
    assert.equal(H.validateImageSrc("/uploads/logo.png"), null);
    assert.ok(H.validateAlt("  "));
    assert.equal(H.validateAlt("Logo desa"), null);
  });
  it("kolom terakhir/slot terakhir/isian terakhir tidak bisa dihapus", () => {
    const pd = { id: "d", type: "personData", role: "pemohon", fields: ["nama"], labelWidthMm: 45, separator: ":" } as Extract<Block, { type: "personData" }>;
    assert.deepEqual(H.togglePersonField(pd, "nama", false).fields, ["nama"]);
    assert.deepEqual(H.togglePersonField(pd, "nik", true).fields, ["nama", "nik"]);
    assert.equal(H.togglePersonField(pd, "nik", true).fields.length, 2);
    const sig = parsed("keteranganDomisili").body.find((b) => b.type === "signature") as Extract<Block, { type: "signature" }>;
    assert.equal(H.removeSlot(sig, sig.slots[0].id).slots.length, 1);
    const added = H.addSlot(sig);
    assert.equal(added.slots.length, 2);
    assert.equal(new Set(added.slots.map((s) => s.id)).size, 2);
    let many = sig;
    for (let i = 0; i < 20; i++) many = H.addSlot(many);
    assert.equal(many.slots.length, LIMITS.signatureSlots);
  });
  it("tabel menghormati batas baris/kolom dan sel berisian tidak ditimpa", () => {
    let tb = { id: "t", type: "table", bordered: true, columns: [{ label: "A" }], rows: [[[{ type: "field", ref: "desa.nama" }]]] } as Extract<Block, { type: "table" }>;
    assert.equal(H.setTableCell(tb, 0, 0, "ganti"), tb);
    for (let i = 0; i < 20; i++) tb = H.addTableColumn(tb);
    assert.equal(tb.columns.length, LIMITS.tableColumns);
    assert.ok(tb.rows.every((r) => r.length === tb.columns.length));
    for (let i = 0; i < 20; i++) tb = H.removeTableColumn(tb, 0);
    assert.equal(tb.columns.length, 1);
  });
  it("kolom digabung ke kolom terakhir saat jumlah kolom berkurang", () => {
    const cols = {
      id: "k", type: "columns", ratios: [1, 1, 1],
      children: [[{ id: "a", type: "divider", style: "single" }], [{ id: "b", type: "divider", style: "single" }], [{ id: "c", type: "divider", style: "single" }]],
    } as Extract<Block, { type: "columns" }>;
    const r = H.setColumnRatios(cols, [1, 2]);
    assert.deepEqual(r.ratios, [1, 2]);
    assert.deepEqual(r.children.map((c) => c.map((x) => x.id)), [["a"], ["b", "c"]]);
    const back = H.setColumnRatios(r, [1, 1, 1]);
    assert.equal(back.children.length, 3);
    assert.equal(H.canSetColumnRatios(cols, [1, 1]), null);
  });
  it("rentang baris daftar menjaga min ≤ maks", () => {
    assert.deepEqual(H.groupRangePatch({ min: 1, max: 5 }, { min: 8 }), { min: 8, max: 8 });
    assert.deepEqual(H.groupRangePatch({ min: 3, max: 5 }, { max: 2 }), { min: 2, max: 2 });
    assert.deepEqual(H.groupRangePatch({ min: 1, max: 5 }, { max: 9999 }), { min: 1, max: LIMITS.groupRows });
    assert.deepEqual(H.groupRangePatch({ min: 1, max: 5 }, { min: -3 }), { min: 0, max: 5 });
  });
});

describe("tanda tangan", () => {
  it("nilai pilihan 'siapa' bolak-balik dan menolak masukan aneh", () => {
    for (const who of [
      { kind: "pejabat", official: "sekdes" }, { kind: "peran", role: "pemohon" },
      { kind: "grup", group: "saksi" }, { kind: "teks", text: "" },
    ] as const) {
      const back = H.valueToWho(H.whoToValue(who));
      assert.equal(back?.kind, who.kind);
    }
    assert.equal(H.valueToWho("pejabat:presiden"), null);
    assert.equal(H.valueToWho("peran:Bad Id"), null);
    assert.equal(H.valueToWho("sembarang"), null);
  });
  it("susunan siap pakai tanpa dependensi lolos validasi; yang butuh dependensi ditolak", () => {
    const doc = parsed("keteranganDomisili");
    const sig = doc.body.find((b) => b.type === "signature")!;
    for (const p of H.SIGNATURE_SLOT_PRESETS) {
      const slots = H.slotsFromPreset(doc, p.id);
      assert.ok(slots && slots.length >= 1, p.id);
      applyAndValidate(doc, sig.id, (b) => H.applySignatureSlots(b as any, slots));
    }
    assert.equal(H.slotsFromPreset(doc, "tanda_tangan_pemohon_saksi"), null);
  });
});

describe("tambah bagian", () => {
  it("pengelompokan menjaga urutan kategori dan semua preset muncul tepat sekali", () => {
    const groups = H.groupPresets(BLOCK_PRESETS);
    assert.deepEqual(groups.map((g) => g.category), ["teks", "data", "tanda_tangan", "tata_letak", "lainnya"]);
    assert.equal(groups.flatMap((g) => g.items).length, BLOCK_PRESETS.length);
  });
  it("pencarian memeriksa nama dan keterangan, tanpa peka huruf besar", () => {
    const hit = H.groupPresets(BLOCK_PRESETS, "  TANDA tangan ").flatMap((g) => g.items.map((i) => i.id));
    assert.ok(hit.includes("tanda_tangan_kades"));
    assert.deepEqual(H.groupPresets(BLOCK_PRESETS, "zzzzqq"), []);
    assert.ok(H.groupPresets(BLOCK_PRESETS, "ahli waris").flatMap((g) => g.items).some((i) => i.id === "daftar_berulang"));
  });
  it("tujuan sisip: sesudah bagian terpilih, atau sesudah wadahnya", () => {
    const doc = parsed("ahliWaris");
    assert.equal(H.insertTargetFor(doc, null), undefined);
    assert.equal(H.insertTargetFor(doc, "tidak-ada"), undefined);
    const top = doc.body[0];
    assert.deepEqual(H.insertTargetFor(doc, top.id), { after: top.id });
    let nested: { child: string; parent: string } | null = null;
    for (const b of doc.body) {
      if (b.type === "columns" && b.children[0]?.[0]) nested = { child: b.children[0][0].id, parent: b.id };
      if (b.type === "conditional" && b.children[0]) nested = { child: b.children[0].id, parent: b.id };
    }
    if (nested) assert.deepEqual(H.insertTargetFor(doc, nested.child), { after: nested.parent });
  });
});

describe("cek surat", () => {
  it("ringkasan hitungan dan label", () => {
    assert.deepEqual(H.checkSummary({ issues: [], hints: [] }), { errors: 0, hints: 0, total: 0, ok: true, label: "Surat siap dipakai" });
    const s = H.checkSummary({ issues: [{ path: "p", message: "m" }], hints: [{ code: "x", message: "y" }, { code: "z", message: "w" }] });
    assert.equal(s.errors, 1);
    assert.equal(s.hints, 2);
    assert.equal(s.total, 3);
    assert.equal(s.ok, false);
    assert.match(s.label, /1 hal perlu diperbaiki, 2 saran/);
    assert.equal(H.checkSummary({ issues: [], hints: [{ code: "x", message: "y" }] }).label, "1 saran");
  });
});

describe("penomoran", () => {
  const date = new Date(2026, 9, 29);
  it("pratinjau memakai pola, padding, klasifikasi", () => {
    assert.equal(
      H.previewNumber({ pattern: "{URUT}/{KLASIFIKASI}/{KODE_DESA}/{BULAN_ROMAWI}/{TAHUN}", padding: 3, klasifikasi: "470" }, { urut: 7, date, kodeDesa: "DS" }),
      "007/470/DS/X/2026",
    );
    assert.equal(H.previewNumber({ pattern: "{URUT}/{BULAN}/{TAHUN}", padding: 0 }, { urut: 7, date }), "7/10/2026");
    // klasifikasi kosong tidak meninggalkan "//"
    assert.ok(!H.previewNumber({ pattern: "{URUT}/{KLASIFIKASI}/{TAHUN}", padding: 2 }, { date }).includes("//"));
  });
  it("menyisipkan token pada kursor dan semua token menghasilkan pola valid", () => {
    assert.deepEqual(H.insertTokenAt("ab/cd", "TAHUN", 2, 2), { value: "ab{TAHUN}/cd", caret: 9 });
    assert.deepEqual(H.insertTokenAt("ab/cd", "BULAN", 0, 2), { value: "{BULAN}/cd", caret: 7 });
    assert.equal(H.insertTokenAt("x", "URUT", 99, 99).value, "x{URUT}");
    for (const tok of NUMBERING_TOKENS) {
      const { value } = H.insertTokenAt("{URUT}/", tok);
      assert.equal(validateNumberPattern(value, "auto"), null, value);
      assert.ok(H.TOKEN_INFO[tok].label);
    }
    assert.ok(H.validatePatternInput("{TAHUN}", "auto"));
    assert.ok(H.validatePatternInput("{ASING}/{URUT}", "auto"));
    assert.equal(H.validatePatternInput("{TAHUN}", "manual"), null);
  });
  it("kunci penghitung divalidasi", () => {
    assert.equal(H.validateCounterKey("umum"), null);
    assert.ok(H.validateCounterKey("Umum"));
    assert.ok(H.validateCounterKey("1abc"));
    assert.ok(H.validateCounterKey("a".repeat(41)));
  });
});

describe("halaman", () => {
  it("preset margin dikenali dan margin kustom terdeteksi", () => {
    for (const [id, p] of Object.entries(MARGIN_PRESETS)) assert.equal(H.marginPresetOf(p.margin), id);
    assert.equal(H.marginPresetOf({ top: 21, right: 20, bottom: 20, left: 25 }), "custom");
    assert.equal(H.clampMargin(1), 5);
    assert.equal(H.clampMargin(500), 60);
  });
  it("pergantian audiens", () => {
    const warga = parsed("keteranganDomisili");
    assert.deepEqual(H.audienceChange(warga, "warga"), { needsPemohon: false, warning: null });
    assert.ok(H.audienceChange(warga, "internal").warning);
    const internal = { audience: "internal" as const, people: [] };
    assert.equal(H.audienceChange(internal, "warga").needsPemohon, true);
    assert.equal(H.audienceChange({ audience: "internal", people: [{ id: "pemohon", label: "P", required: true, allowManual: true }] }, "warga").needsPemohon, false);
  });
});

describe("teks polos ↔ inline", () => {
  it("bolak-balik teks sederhana dan menandai isian/gaya sebagai tidak sederhana", () => {
    assert.deepEqual(H.plainText(H.textToInlines("a\nb")), { text: "a\nb", simple: true });
    assert.deepEqual(H.textToInlines(""), []);
    assert.equal(H.plainText([{ type: "field", ref: "desa.nama" }]).simple, false);
    assert.equal(H.plainText([{ type: "text", text: "x", marks: ["b"] }]).simple, false);
  });
});

describe("orang, isian, daftar", () => {
  it("opsi pilihan dirapikan dan dibatasi", () => {
    assert.deepEqual(H.parseOptions(" Ya \n\nTidak\nYa\n"), ["Ya", "Tidak"]);
    assert.equal(H.parseOptions(Array.from({ length: 80 }, (_, i) => `o${i}`).join("\n")).length, LIMITS.options);
    assert.equal(H.optionsToText(["a", "b"]), "a\nb");
  });
  it("isian pilihan butuh minimal dua opsi; ganti jenis membuang opsi", () => {
    const f = { id: "x", label: "X", type: "text" as const, required: true, sensitive: false };
    const toChoice = H.fieldPatchForType(f, "choice");
    assert.deepEqual(toChoice.options, ["Ya", "Tidak"]);
    assert.equal(H.optionsError({ type: "choice", options: ["a"] }) !== null, true);
    assert.equal(H.optionsError({ type: "choice", options: ["a", "b"] }), null);
    assert.equal(H.fieldPatchForType({ ...f, type: "choice", options: ["a", "b"] }, "text").options, undefined);
  });
  it("kolom daftar: tambah unik, hapus ditolak bila dipakai tabel atau tinggal satu", () => {
    const doc = parsed("ahliWaris");
    const group = doc.groups.find((g) => g.id === "ahli_waris")!;
    const grown = H.addGroupField(group, "Nama", "text");
    assert.equal(grown.fields.length, group.fields.length + 1);
    assert.equal(new Set(grown.fields.map((x) => x.id)).size, grown.fields.length);
    const used = group.fields.find((fl) => H.groupFieldUsedBy(doc, group.id, fl.id).length > 0);
    assert.ok(used, "fixture punya kolom yang dipakai tabel");
    const refused = H.removeGroupField(doc, group, used.id);
    assert.equal(refused.ok, false);
    const single = { ...group, fields: [group.fields[0]] };
    assert.equal(H.removeGroupField(doc, single, single.fields[0].id).ok, false);
    const patched = H.patchGroupField(grown, grown.fields[0].id, { label: "Baru", required: false });
    assert.equal(patched.fields[0].label, "Baru");
    assert.equal(patched.fields[0].id, grown.fields[0].id);
    let big = group;
    for (let i = 0; i < 30; i++) big = H.addGroupField(big, `K${i}`);
    assert.equal(big.fields.length, LIMITS.groupFields);
  });
  it("syarat bersyarat: opsi rujukan memuat isian dan tidak menggandakan rujukan sekarang", () => {
    const doc = parsed("ahliWaris");
    const opts = H.conditionRefOptions(doc, "isian.keperluan");
    assert.equal(opts.filter((o) => o.ref === "isian.keperluan").length, 1);
    assert.ok(opts.some((o) => o.ref === "pemohon.umur"));
    assert.equal(H.conditionRefOptions(doc, "isian.hilang")[0].ref, "isian.hilang");
  });
});
