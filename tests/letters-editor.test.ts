/* eslint-disable @typescript-eslint/no-explicit-any -- tes memutasi dokumen JSON mentah */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { DocumentSchema, InlineSchema, LIMITS, type Block, type LetterDocument } from "../lib/letters/document/schema.ts";
import { validateDocument } from "../lib/letters/document/validate.ts";
import {
  addCustomField, addGroupDef, addPersonRole, allBlockIds, cloneWithNewIds, duplicateBlockById, findBlock,
  insertBlockAt, moveBlockByDelta, moveBlockTo, patchField, patchGroup, patchNumbering, patchPage, patchPerson,
  removeBlockById, updateBlockById, walkBlocks,
} from "../lib/letters/editor/ops.ts";
import { newBlockId, slugId } from "../lib/letters/editor/ids.ts";
import {
  fieldUsage, groupUsage, personUsage, removeFieldFromDoc, removeGroupFromDoc, removePersonFromDoc,
} from "../lib/letters/editor/usage.ts";
import { BLOCK_PRESETS, createFromPreset } from "../lib/letters/editor/presets.ts";
import { inlinesToTiptap, tiptapToInlines } from "../lib/letters/editor/inline-tiptap.ts";
import {
  COALESCE_MS, HISTORY_LIMIT, createEditorState, editorReducer, isDirty, type EditorState,
} from "../lib/letters/editor/history.ts";
import { blockIdFromPath, useDocumentEditor } from "../lib/letters/editor/useDocumentEditor.ts";
import type { PresetId } from "../lib/letters/editor/types.ts";
import { FIXTURES, f, t } from "./letters-fixtures.ts";

// ------------------------------------------------------------------ pembantu

function deepFreeze<T>(v: T): T {
  if (v && typeof v === "object" && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v as object)) deepFreeze((v as any)[k]);
  }
  return v;
}
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const mk = (extra: object = {}): LetterDocument =>
  DocumentSchema.parse({
    schemaVersion: 2, kind: "keterangan", audience: "warga",
    people: [{ id: "pemohon", label: "Pemohon" }], body: [], ...extra,
  });
const para = (id: string): Block => ({ id, type: "paragraph", align: "justify", indentFirst: false, spaceAfterMm: 3, content: [t("x")] }) as Block;
const spacer = (id: string): Block => ({ id, type: "spacer", heightMm: 5 }) as Block;
const columns = (id: string, kids: Block[][] = [[], []]): Block => ({ id, type: "columns", ratios: kids.map(() => 1), children: kids }) as Block;
const cond = (id: string, kids: Block[] = []): Block =>
  ({ id, type: "conditional", when: { ref: "isian.x", op: "eq", value: "Ya" }, children: kids }) as Block;
const ids = (doc: LetterDocument) => [...allBlockIds(doc)];
const must = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r as Extract<T, { ok: true }>;
};

const fixtureDocs: Array<[string, LetterDocument]> = Object.entries(FIXTURES).map(([name, input]) => {
  const r = validateDocument(input);
  assert.ok(r.ok, `fixture ${name}: ${JSON.stringify(!r.ok && r.issues)}`);
  return [name, r.doc];
});

// ----------------------------------------------------------------------- ids

describe("ids", () => {
  it("newBlockId: format b_<8 hex> dan tidak bentrok", () => {
    const taken = new Set(["b_00000000"]);
    const id = newBlockId(taken, () => 0); // 0 → b_00000000 sudah dipakai → penghitung
    assert.match(id, /^b_[0-9a-f]{8,}/);
    assert.ok(!taken.has(id));
    assert.match(newBlockId(new Set()), /^b_[0-9a-f]{8}$/);
  });
  it("slugId: aksen, kosong, awalan angka, panjang, unik, dan nama dipesan", () => {
    assert.equal(slugId("Tempat Lahir Ayah", []), "tempat_lahir_ayah");
    assert.equal(slugId("Pekerjaan Ibu Rumah Tangga & Wiraswasta", []), "pekerjaan_ibu_rumah_tangga_wira".slice(0, 30));
    assert.equal(slugId("Café Édition Ñandú", []), "cafe_edition_nandu");
    assert.equal(slugId("", []), "item");
    assert.equal(slugId("   ---  ", []), "item");
    assert.equal(slugId("2 Anak", []), "i_2_anak");
    assert.equal(slugId("日本語", []), "item");
    assert.equal(slugId("isian", []), "isian_2");
    assert.equal(slugId("A", ["a"]), "a_2");
    assert.equal(slugId("A", ["a", "a_2"]), "a_3");
    assert.equal(slugId("desa", []), "desa_2");
    assert.equal(slugId("Surat", []), "surat_2");
    assert.equal(slugId("pemohon", [], ["pemohon"]), "pemohon_2");
    const long = slugId("x".repeat(100), ["x".repeat(30)]);
    assert.ok(long.length <= 30 && /^[a-z][a-z0-9_]{0,29}$/.test(long), long);
    assert.notEqual(long, "x".repeat(30));
  });
});

// ----------------------------------------------------------------------- ops

describe("ops: penyisipan", () => {
  it("menyisip di akhir, sebelum, sesudah, dan ke dalam kolom/bersyarat", () => {
    let doc = mk({ body: [para("a"), columns("c"), cond("k")] });
    deepFreeze(doc);
    doc = must(insertBlockAt(doc, para("z"))).doc;
    assert.deepEqual(doc.body.map((b) => b.id), ["a", "c", "k", "z"]);
    doc = must(insertBlockAt(doc, para("b"), { before: "c" })).doc;
    doc = must(insertBlockAt(doc, para("d"), { after: "a" })).doc;
    assert.deepEqual(doc.body.map((b) => b.id), ["a", "d", "b", "c", "k", "z"]);
    doc = must(insertBlockAt(doc, para("in1"), { container: "c", column: 1 })).doc;
    doc = must(insertBlockAt(doc, para("in0"), { container: "c", column: 1, index: 0 })).doc;
    doc = must(insertBlockAt(doc, para("ck"), { container: "k" })).doc;
    const col = doc.body.find((b) => b.id === "c") as any;
    assert.deepEqual(col.children[1].map((b: Block) => b.id), ["in0", "in1"]);
    assert.deepEqual((doc.body.find((b) => b.id === "k") as any).children.map((b: Block) => b.id), ["ck"]);
    must(insertBlockAt(doc, para("sib"), { after: "in1" })); // sesudah anak → dalam kolom yang sama
  });
  it("menolak: id ganda, wadah di dalam wadah, acuan/kolom tak ada, bukan wadah", () => {
    const doc = deepFreeze(mk({ body: [para("a"), columns("c")] }));
    assert.equal(insertBlockAt(doc, para("a")).ok, false);
    assert.equal(insertBlockAt(doc, columns("n"), { container: "c" }).ok, false);
    assert.equal(insertBlockAt(doc, cond("n"), { container: "c", column: 0 }).ok, false);
    assert.equal(insertBlockAt(doc, para("n"), { before: "nope" }).ok, false);
    assert.equal(insertBlockAt(doc, para("n"), { container: "c", column: 5 }).ok, false);
    assert.equal(insertBlockAt(doc, para("n"), { container: "a" }).ok, false);
    const r = insertBlockAt(doc, columns("n2"), { after: "a" });
    assert.equal(r.ok, true); // wadah di tingkat atas boleh
  });
});

describe("ops: ubah, pindah, duplikat, hapus", () => {
  it("updateBlockById menggabung patch, menjaga id/jenis, dan menormalkan kolom", () => {
    const doc = deepFreeze(mk({ body: [columns("c", [[para("p1")], [para("p2")], [para("p3")]])] }));
    const r = must(updateBlockById(doc, "c", { ratios: [1, 2], id: "hack" } as any)).doc;
    const c = r.body[0] as any;
    assert.equal(c.id, "c");
    assert.deepEqual(c.ratios, [1, 2]);
    assert.deepEqual(c.children.map((col: Block[]) => col.map((b) => b.id)), [["p1"], ["p2", "p3"]]);
    const more = must(updateBlockById(r, "c", { ratios: [1, 1, 1] } as any)).doc.body[0] as any;
    assert.equal(more.children.length, 3);
    assert.equal(updateBlockById(doc, "c", (b) => ({ ...b, type: "paragraph" }) as any).ok, false);
    assert.equal(updateBlockById(doc, "nope", {}).ok, false);
    const viaFn = must(updateBlockById(mk({ body: [para("a")] }), "a", (b) => ({ ...(b as any), align: "center" }))).doc;
    assert.equal((viaFn.body[0] as any).align, "center");
  });
  it("updateBlockById juga mengubah anak di dalam kolom", () => {
    const doc = deepFreeze(mk({ body: [columns("c", [[para("p1")], []])] }));
    const r = must(updateBlockById(doc, "p1", { align: "right" } as any)).doc;
    assert.equal(((r.body[0] as any).children[0][0]).align, "right");
  });
  it("moveBlockTo: ke posisi lain, antar-kolom, ke diri sendiri, nesting", () => {
    const doc = deepFreeze(mk({ body: [para("a"), para("b"), columns("c", [[para("x")], []])] }));
    const toEnd = must(moveBlockTo(doc, "a", { after: "b" })).doc;
    assert.deepEqual(toEnd.body.map((b) => b.id), ["b", "a", "c"]);
    const into = must(moveBlockTo(doc, "a", { container: "c", column: 1 })).doc;
    assert.deepEqual(into.body.map((b) => b.id), ["b", "c"]);
    assert.deepEqual((into.body[1] as any).children[1].map((b: Block) => b.id), ["a"]);
    const out = must(moveBlockTo(into, "a", { before: "b" })).doc;
    assert.deepEqual(out.body.map((b) => b.id), ["a", "b", "c"]);
    assert.equal(moveBlockTo(doc, "c", { container: "c", column: 0 }).ok, false);
    assert.equal(moveBlockTo(doc, "c", { container: "c" }).ok, false);
    const noop = must(moveBlockTo(doc, "a", { before: "a" }));
    assert.equal(noop.doc, doc);
    const two = deepFreeze(mk({ body: [columns("c1"), columns("c2")] }));
    assert.equal(moveBlockTo(two, "c1", { container: "c2", column: 0 }).ok, false);
    assert.equal(moveBlockTo(doc, "nope", { after: "a" }).ok, false);
    assert.equal(moveBlockTo(doc, "a", { after: "nope" }).ok, false);
  });
  it("moveBlockByDelta bergerak dalam wadah induknya dan menolak di tepi", () => {
    const doc = deepFreeze(mk({ body: [para("a"), para("b"), columns("c", [[para("x"), para("y")], []])] }));
    assert.deepEqual(must(moveBlockByDelta(doc, "b", -1)).doc.body.map((b) => b.id), ["b", "a", "c"]);
    assert.equal(moveBlockByDelta(doc, "a", -1).ok, false);
    assert.equal(moveBlockByDelta(doc, "c", 1).ok, false);
    const r = must(moveBlockByDelta(doc, "x", 1)).doc;
    assert.deepEqual(((r.body[2] as any).children[0]).map((b: Block) => b.id), ["y", "x"]);
    assert.equal(moveBlockByDelta(doc, "y", 1).ok, false);
  });
  it("duplicateBlockById: id baru untuk blok dan anak, disisip sesudah asli", () => {
    const doc = deepFreeze(mk({ body: [para("a"), columns("c", [[para("x")], [para("y")]])] }));
    const r = must(duplicateBlockById(doc, "c"));
    assert.equal(r.doc.body.length, 3);
    const copy = r.doc.body[2] as any;
    assert.equal(copy.id, r.newId);
    assert.notEqual(copy.id, "c");
    const all = ids(r.doc);
    assert.equal(all.length, new Set(all).size);
    assert.equal(all.length, 1 + 3 + 3);
    assert.notEqual(copy.children[0][0].id, "x");
    assert.equal(copy.children[0][0].type, "paragraph");
    const inner = must(duplicateBlockById(doc, "x"));
    assert.equal(((inner.doc.body[1] as any).children[0]).length, 2);
    assert.equal(duplicateBlockById(doc, "nope").ok, false);
    assert.ok(validateDocument(r.doc).ok);
    const c2 = cloneWithNewIds(doc.body[1], new Set(["c"]));
    assert.notEqual(c2.id, "c");
  });
  it("removeBlockById menghapus blok biasa, wadah (beserta isinya), dan anak", () => {
    const doc = deepFreeze(mk({ body: [para("a"), columns("c", [[para("x")], [para("y")]])] }));
    assert.deepEqual(ids(must(removeBlockById(doc, "c")).doc), ["a"]);
    assert.deepEqual(ids(must(removeBlockById(doc, "x")).doc), ["a", "c", "y"]);
    assert.equal(removeBlockById(doc, "nope").ok, false);
  });
  it("findBlock & walkBlocks: urutan dan induk", () => {
    const doc = mk({ body: [para("a"), columns("c", [[para("x")], [para("y")]]), cond("k", [spacer("s")])] });
    const order: string[] = [];
    walkBlocks(doc, (b) => order.push(b.id));
    assert.deepEqual(order, ["a", "c", "x", "y", "k", "s"]);
    assert.deepEqual(findBlock(doc, "y")?.parent, { kind: "columns", id: "c", column: 1 });
    assert.deepEqual(findBlock(doc, "s")?.parent, { kind: "conditional", id: "k" });
    assert.equal(findBlock(doc, "nope"), null);
  });
});

describe("ops: halaman, orang, isian, daftar", () => {
  it("patchPage/patchNumbering/patch orang-isian-daftar bersifat imutabel", () => {
    const doc = deepFreeze(mk());
    assert.equal(patchPage(doc, { size: "A4" }).page.size, "A4");
    assert.equal(doc.page.size, "F4");
    assert.equal(patchNumbering(doc, { mode: "none" }).numbering.mode, "none");
    const p = addPersonRole(doc, "Ahli Waris");
    assert.equal(p.id, "ahli_waris");
    assert.equal(patchPerson(p.doc, "ahli_waris", { label: "Waris" }).people[1].label, "Waris");
    const fld = addCustomField(doc, "Luas Tanah", "number");
    assert.deepEqual([fld.id, fld.doc.fields[0].type], ["luas_tanah", "number"]);
    assert.equal(patchField(fld.doc, "luas_tanah", { required: false }).fields[0].required, false);
    const grp = addGroupDef(doc, "Daftar Hadir");
    assert.equal(grp.id, "daftar_hadir");
    assert.equal(grp.doc.groups[0].fields.length, 2);
    assert.equal(patchGroup(grp.doc, "daftar_hadir", { max: 3 }).groups[0].max, 3);
    assert.equal(addPersonRole(p.doc, "Ahli Waris").id, "ahli_waris_2");
  });
});

// --------------------------------------------------------------------- usage

describe("usage: pemakaian dan penolakan hapus", () => {
  const doc = deepFreeze(validateDocument(FIXTURES.ahliWaris).ok ? (validateDocument(FIXTURES.ahliWaris) as any).doc as LetterDocument : mk());

  it("menghitung pemakaian peran, isian, dan daftar", () => {
    assert.ok(personUsage(doc, "almarhum").count >= 1);
    assert.deepEqual(fieldUsage(doc, "keperluan").blockIds, ["p2"]);
    assert.deepEqual(groupUsage(doc, "ahli_waris").blockIds, ["tabel"]);
    assert.deepEqual(groupUsage(doc, "saksi").blockIds, ["ttd"]);
    assert.equal(fieldUsage(doc, "tidak_ada").count, 0);
  });
  it("menghitung rujukan lewat kondisi dan tanda tangan peran", () => {
    const nikah = (validateDocument(FIXTURES.pengantarNikah) as any).doc as LetterDocument;
    assert.deepEqual(fieldUsage(nikah, "di_bawah_21").blockIds, ["izin"]);
    assert.ok(personUsage(nikah, "ortu").blockIds.includes("izin_p"));
    const jb = (validateDocument(FIXTURES.jualBeliTanah) as any).doc as LetterDocument;
    assert.ok(personUsage(jb, "pihak1").blockIds.includes("ttd"));
  });
  it("menolak hapus yang masih dipakai, mengizinkan yang tidak dipakai", () => {
    const a = removePersonFromDoc(doc, "almarhum");
    assert.equal(a.ok, false);
    assert.match((a as any).error, /Masih dipakai di \d+ bagian/);
    assert.equal(removeFieldFromDoc(doc, "keperluan").ok, false);
    assert.equal(removeGroupFromDoc(doc, "saksi").ok, false);
    assert.equal(removePersonFromDoc(doc, "pemohon").ok, false);

    const free = addCustomField(addGroupDef(addPersonRole(doc, "Wali").doc, "Cadangan").doc, "Catatan");
    const p = must(removePersonFromDoc(free.doc, "wali")).doc;
    assert.ok(!p.people.some((x) => x.id === "wali"));
    assert.ok(!must(removeFieldFromDoc(free.doc, "catatan")).doc.fields.some((x) => x.id === "catatan"));
    assert.ok(!must(removeGroupFromDoc(free.doc, "cadangan")).doc.groups.some((x) => x.id === "cadangan"));
    assert.equal(removePersonFromDoc(doc, "nope").ok, false);
  });
  it("pemohon pada dokumen internal boleh dihapus bila tidak dipakai", () => {
    const d = mk({ audience: "internal", people: [{ id: "pemohon", label: "Pemohon" }] });
    assert.equal(removePersonFromDoc(d, "pemohon").ok, true);
  });
});

// ------------------------------------------------------------------- presets

describe("presets", () => {
  const presetIds = BLOCK_PRESETS.map((p) => p.id);

  it("daftar preset lengkap, unik, dan berbahasa awam", () => {
    const expected: PresetId[] = [
      "paragraf", "judul", "judul_surat", "kepala_surat", "data_orang", "daftar_berulang", "tabel", "daftar_butir",
      "menimbang", "mengingat", "menetapkan", "diktum", "tanda_tangan_kades", "tanda_tangan_an_sekdes",
      "tanda_tangan_mengetahui", "tanda_tangan_pemohon_saksi", "dua_kolom", "bersyarat", "garis", "spasi",
      "halaman_baru", "gambar", "kode_qr", "tembusan",
    ];
    assert.deepEqual([...presetIds].sort(), [...expected].sort());
    for (const p of BLOCK_PRESETS) {
      assert.ok(p.label && p.description && p.icon, p.id);
      assert.ok(!/blok|variabel|template/i.test(p.label + p.description), p.id);
    }
  });

  const bases: Array<[string, LetterDocument]> = [
    ["dokumen kosong (warga)", mk()],
    ["dokumen kosong (internal, tanpa orang)", mk({ audience: "internal", people: [] })],
    ...fixtureDocs,
  ];
  for (const [name, base] of bases) {
    it(`semua preset menghasilkan dokumen valid dari: ${name}`, () => {
      const frozen = deepFreeze(clone(base));
      for (const preset of presetIds) {
        const r = createFromPreset(frozen, preset);
        const v = validateDocument(r.doc);
        assert.ok(v.ok, `${preset}: ${JSON.stringify(!v.ok && v.issues)}`);
        assert.ok(findBlock(r.doc, r.blockId), `${preset}: blok tidak ada`);
        assert.equal(r.doc.body.length, frozen.body.length + 1, preset);
      }
    });
  }

  it("preset berantai (semua preset berturut-turut pada satu dokumen) tetap valid dan id unik", () => {
    let doc = mk();
    for (const preset of presetIds) doc = createFromPreset(doc, preset).doc;
    for (const preset of presetIds) doc = createFromPreset(doc, preset).doc;
    assert.ok(validateDocument(doc).ok);
    const all = ids(doc);
    assert.equal(all.length, new Set(all).size);
  });

  it("menyiapkan dependensi: peran, isian, daftar", () => {
    const internal = mk({ audience: "internal", people: [] });
    assert.deepEqual(createFromPreset(internal, "data_orang").doc.people.map((p) => p.id), ["pemohon"]);
    assert.deepEqual(createFromPreset(internal, "kepala_surat").doc.fields.map((x) => x.id), ["perihal", "tujuan"]);
    const twice = createFromPreset(createFromPreset(internal, "kepala_surat").doc, "kepala_surat").doc;
    assert.equal(twice.fields.length, 2, "tidak menggandakan isian");
    const ttd = createFromPreset(mk(), "tanda_tangan_pemohon_saksi").doc;
    assert.deepEqual(ttd.groups.map((g) => [g.id, g.min, g.max, g.personRows]), [["saksi", 2, 2, true]]);
    const syarat = createFromPreset(mk(), "bersyarat").doc;
    assert.equal(syarat.fields[0].type, "choice");
    assert.deepEqual(syarat.fields[0].options, ["Ya", "Tidak"]);
    const daftar = createFromPreset(mk(), "daftar_berulang").doc;
    assert.equal(daftar.groups.length, 1);
    const withChoice = fixtureDocs.find(([n]) => n === "kematian")![1];
    assert.equal(createFromPreset(withChoice, "bersyarat").doc.fields.length, withChoice.fields.length, "memakai pilihan yang ada");
  });

  it("menyisip di tujuan; tujuan tak valid jatuh ke akhir isi surat", () => {
    const base = mk({ body: [para("a"), columns("c")] });
    const before = createFromPreset(base, "garis", { before: "a" });
    assert.equal(before.doc.body[0].id, before.blockId);
    const inCol = createFromPreset(base, "paragraf", { container: "c", column: 0 });
    assert.equal(findBlock(inCol.doc, inCol.blockId)?.parent.kind, "columns");
    const fallback = createFromPreset(base, "dua_kolom", { container: "c", column: 0 });
    assert.equal(fallback.doc.body[fallback.doc.body.length - 1].id, fallback.blockId);
    assert.ok(validateDocument(fallback.doc).ok);
  });

  it("judul surat menyesuaikan mode penomoran", () => {
    const none = createFromPreset(mk({ numbering: { mode: "none" } }), "judul_surat");
    assert.equal((findBlock(none.doc, none.blockId)!.block as any).showNumber, false);
  });
});

// -------------------------------------------------------------------- tiptap

describe("tiptap ↔ inline", () => {
  const sample = [
    t("Halo ", ["b"]), f("pemohon.nama", "upper"), { type: "br" as const },
    t("miring tebal", ["b", "i"]), t(" polos"), f("isian.x"),
  ];

  it("round-trip menjaga isi", () => {
    const doc = inlinesToTiptap(sample as any);
    assert.deepEqual(tiptapToInlines(doc), sample);
  });
  it("kosong → satu paragraf kosong → kosong", () => {
    const doc = inlinesToTiptap([]);
    assert.equal(doc.content.length, 1);
    assert.deepEqual(tiptapToInlines(doc), []);
    assert.deepEqual(tiptapToInlines(undefined), []);
    assert.deepEqual(tiptapToInlines("bukan objek"), []);
  });
  it("menggabung teks bertetangga bermark sama dan menghormati urutan mark", () => {
    const out = tiptapToInlines({
      type: "doc",
      content: [{ type: "paragraph", content: [
        { type: "text", text: "a", marks: [{ type: "underline" }, { type: "bold" }] },
        { type: "text", text: "b", marks: [{ type: "bold" }, { type: "underline" }] },
        { type: "text", text: "c" },
      ] }],
    });
    assert.deepEqual(out, [{ type: "text", text: "ab", marks: ["b", "u"] }, { type: "text", text: "c" }]);
  });
  it("beberapa paragraf (Enter) menjadi satu br; br di ujung belakang dibuang", () => {
    const out = tiptapToInlines({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "satu" }] },
        { type: "paragraph", content: [{ type: "text", text: "dua" }] },
        { type: "paragraph" },
        { type: "paragraph" },
      ],
    });
    assert.deepEqual(out, [{ type: "text", text: "satu" }, { type: "br" }, { type: "text", text: "dua" }]);
  });
  it("baris baru dalam teks menjadi br", () => {
    assert.deepEqual(
      tiptapToInlines({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a\nb" }] }] }),
      [{ type: "text", text: "a" }, { type: "br" }, { type: "text", text: "b" }],
    );
  });
  it("masukan jahat: node/mark tak dikenal dibuang, teks berbahaya tetap teks", () => {
    const out = tiptapToInlines({
      type: "doc",
      content: [
        { type: "script", content: [{ type: "text", text: "alert(1)" }] },
        { type: "paragraph", content: [
          { type: "text", text: "javascript:alert(1)" },
          { type: "text", text: "<img src=x onerror=alert(1)>", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }, { type: "bold" }] },
          { type: "image", attrs: { src: "javascript:alert(1)" } },
          { type: "script", content: [{ type: "text", text: "x" }] },
          { type: "field", attrs: { ref: "javascript:alert(1)" } },
          { type: "field", attrs: { ref: "../etc/passwd" } },
          { type: "field", attrs: { ref: "pemohon.nama", format: "<script>", fallback: 5 } },
          { type: "field", attrs: { ref: "isian.x", format: "tanggal", fallback: "-" } },
        ] },
      ],
    });
    assert.deepEqual(out, [
      { type: "text", text: "javascript:alert(1)" },
      { type: "text", text: "<img src=x onerror=alert(1)>", marks: ["b"] },
      { type: "field", ref: "pemohon.nama" },
      { type: "field", ref: "isian.x", format: "tanggal", fallback: "-" },
    ]);
  });
  it("batas: teks dipotong, jumlah inline dibatasi, hasil selalu lolos skema", () => {
    const huge = tiptapToInlines({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(LIMITS.textLength + 500) }] }] });
    assert.equal((huge[0] as any).text.length, LIMITS.textLength);
    const many = tiptapToInlines({
      type: "doc",
      content: [{ type: "paragraph", content: Array.from({ length: 1000 }, (_, i) => ({ type: "field", attrs: { ref: `isian.k${i % 9}` } })) }],
    });
    assert.equal(many.length, LIMITS.inlinePerText);
    for (const n of [...huge, ...many]) assert.ok(InlineSchema.safeParse(n).success);
    const deepNoise = tiptapToInlines({ type: "doc", content: Array.from({ length: 5000 }, () => ({ type: "paragraph", content: [{ type: "text", text: "a" }] })) });
    assert.ok(deepNoise.length <= LIMITS.inlinePerText);
  });
  it("tidak memutasi masukan", () => {
    const input = deepFreeze(inlinesToTiptap(sample as any));
    assert.ok(tiptapToInlines(input).length > 0);
    deepFreeze(sample);
    inlinesToTiptap(sample as any);
  });
});

// ------------------------------------------------------------------- reducer

describe("editorReducer: riwayat", () => {
  const d0 = deepFreeze(mk({ body: [para("a")] }));
  const edit = (s: EditorState, text: string, now: number, key?: string): EditorState => {
    const next = clone(s.doc) as LetterDocument;
    (next.body[0] as any).content = [t(text)];
    return editorReducer(s, { type: "apply", next, now, coalesceKey: key });
  };

  it("undo/redo bolak-balik, redo dibuang setelah perubahan baru", () => {
    let s = createEditorState(d0);
    s = edit(s, "1", 0);
    s = edit(s, "2", 10);
    assert.equal(s.past.length, 2);
    s = editorReducer(s, { type: "undo" });
    assert.equal(((s.doc.body[0] as any).content[0]).text, "1");
    s = editorReducer(s, { type: "undo" });
    assert.equal(s.doc, d0);
    assert.equal(editorReducer(s, { type: "undo" }), s);
    s = editorReducer(s, { type: "redo" });
    assert.equal(((s.doc.body[0] as any).content[0]).text, "1");
    s = edit(s, "baru", 20);
    assert.equal(s.future.length, 0);
    assert.equal(editorReducer(s, { type: "redo" }), s);
  });
  it("perubahan beruntun berkunci sama dalam 1000 ms digabung; di luar jendela atau beda kunci tidak", () => {
    let s = createEditorState(d0);
    s = edit(s, "a", 0, "block:a");
    s = edit(s, "ab", 400, "block:a");
    s = edit(s, "abc", 400 + COALESCE_MS, "block:a");
    assert.equal(s.past.length, 1, "tiga ketikan = satu langkah");
    s = edit(s, "abcd", 400 + COALESCE_MS + COALESCE_MS + 1, "block:a");
    assert.equal(s.past.length, 2, "di luar jendela");
    s = edit(s, "abcde", 400 + 2 * COALESCE_MS + 5, "block:lain");
    assert.equal(s.past.length, 3, "beda kunci");
    s = edit(s, "tanpa kunci 1", 5000);
    s = edit(s, "tanpa kunci 2", 5001);
    assert.equal(s.past.length, 5, "tanpa kunci tidak pernah digabung");
    const undone = editorReducer(editorReducer(s, { type: "undo" }), { type: "undo" });
    assert.equal(((undone.doc.body[0] as any).content[0]).text, "abcde");
  });
  it("undo memutus penggabungan berikutnya", () => {
    let s = createEditorState(d0);
    s = edit(s, "a", 0, "k");
    s = editorReducer(s, { type: "undo" });
    s = edit(s, "b", 10, "k");
    s = edit(s, "bc", 20, "k");
    assert.equal(s.past.length, 1);
  });
  it("batas riwayat 100 langkah", () => {
    let s = createEditorState(d0);
    for (let i = 0; i < HISTORY_LIMIT + 30; i++) s = edit(s, `v${i}`, i * 5000);
    assert.equal(s.past.length, HISTORY_LIMIT);
    for (let i = 0; i < 500; i++) s = editorReducer(s, { type: "undo" });
    assert.equal(s.future.length, HISTORY_LIMIT);
    assert.equal(((s.doc.body[0] as any).content[0]).text, "v29");
  });
  it("perubahan yang tidak mengubah apa pun tidak menambah riwayat atau revision", () => {
    let s = createEditorState(d0);
    s = edit(s, "a", 0);
    const same = editorReducer(s, { type: "apply", next: clone(s.doc), now: 1 });
    assert.equal(same, s);
    assert.equal(s.revision, 1);
  });
  it("revision naik tiap dokumen berubah (termasuk undo/redo), bukan tiap seleksi", () => {
    let s = createEditorState(d0);
    s = editorReducer(s, { type: "select", id: "a" });
    assert.equal(s.revision, 0);
    s = edit(s, "ubah", 0);
    assert.equal(s.revision, 1);
    s = editorReducer(s, { type: "undo" });
    assert.equal(s.revision, 2);
    s = editorReducer(s, { type: "redo" });
    assert.equal(s.revision, 3);
    const sel = editorReducer(s, { type: "select", id: "a" });
    assert.equal(sel, s);
  });
  it("dirty/markSaved, termasuk kembali ke titik tersimpan lewat undo", () => {
    let s = createEditorState(d0);
    assert.equal(isDirty(s), false);
    s = edit(s, "ubah", 0);
    assert.equal(isDirty(s), true);
    s = editorReducer(s, { type: "markSaved" });
    assert.equal(isDirty(s), false);
    s = edit(s, "lagi", 5000);
    assert.equal(isDirty(s), true);
    s = editorReducer(s, { type: "undo" });
    assert.equal(isDirty(s), false);
    s = editorReducer(s, { type: "undo" });
    assert.equal(isDirty(s), true);
  });
  it("seleksi yang bloknya hilang dibatalkan (hapus, undo, redo)", () => {
    const withB = deepFreeze(mk({ body: [para("a"), para("b")] }));
    let s = createEditorState(withB);
    s = editorReducer(s, { type: "select", id: "b" });
    assert.equal(s.selectedId, "b");
    assert.equal(editorReducer(s, { type: "select", id: "nope" }).selectedId, null);
    const removed = must(removeBlockById(s.doc, "b")).doc;
    s = editorReducer(s, { type: "apply", next: removed, now: 0 });
    assert.equal(s.selectedId, null);
    s = editorReducer(s, { type: "undo" });
    assert.equal(s.selectedId, null);

    // blok baru dipilih lewat selectId, lalu undo membatalkan seleksi
    const added = createFromPreset(s.doc, "garis");
    s = editorReducer(s, { type: "apply", next: added.doc, now: 10, selectId: added.blockId });
    assert.equal(s.selectedId, added.blockId);
    s = editorReducer(s, { type: "undo" });
    assert.equal(s.selectedId, null);
    s = editorReducer(s, { type: "redo" });
    assert.equal(s.selectedId, null);
  });
});

// ---------------------------------------------------------------------- hook

/** Render sekali di server dan tangkap API editor lewat callback prop. */
function captureEditor(doc: LetterDocument): ReturnType<typeof useDocumentEditor> {
  const box: Array<ReturnType<typeof useDocumentEditor>> = [];
  function Probe({ onApi }: { onApi: (a: ReturnType<typeof useDocumentEditor>) => void }) {
    onApi(useDocumentEditor(doc));
    return createElement("div");
  }
  renderToStaticMarkup(createElement(Probe, { onApi: (a) => box.push(a) }));
  return box[0];
}

describe("useDocumentEditor (SSR)", () => {
  it("render awal: dokumen, riwayat kosong, tidak kotor, tanpa kesalahan untuk dokumen valid", () => {
    const doc = (validateDocument(FIXTURES.keteranganDomisili) as any).doc as LetterDocument;
    const api = captureEditor(doc);
    assert.ok(api);
    assert.equal(api.doc, doc);
    assert.deepEqual([api.canUndo, api.canRedo, api.dirty, api.revision, api.selectedId], [false, false, false, 0, null]);
    assert.deepEqual(api.issues, []);
    assert.ok(Array.isArray(api.hints));
    // mengembalikan id/hasil secara sinkron
    const id = api.addBlock("garis");
    assert.match(id, /^b_/);
    assert.equal(api.moveBlockBy("tidak-ada", 1).ok, false);
    assert.equal(api.removePerson("pemohon").ok, false);
    assert.equal(api.addField("Luas Tanah"), "luas_tanah");
  });
  it("dokumen tidak valid: galat dipetakan ke id bagian", () => {
    const bad = clone((validateDocument(FIXTURES.keteranganDomisili) as any).doc) as LetterDocument;
    (bad.body[1] as any).content.push(f("wali.nama"));
    const api = captureEditor(bad);
    const issue = api.issues.find((i) => /wali/.test(i.message));
    assert.ok(issue, JSON.stringify(api.issues));
    assert.equal(issue!.blockId, "p1");
    assert.deepEqual(api.hints, []);
  });
  it("blockIdFromPath: id langsung, indeks, anak kolom dan kondisional", () => {
    const doc = mk({ body: [para("a"), columns("c", [[para("x")], [para("y")]]), cond("k", [spacer("s")])] });
    assert.equal(blockIdFromPath(doc, "body.a.content"), "a");
    assert.equal(blockIdFromPath(doc, "body.0.content"), "a");
    assert.equal(blockIdFromPath(doc, "body.1.children.1.0.content"), "y");
    assert.equal(blockIdFromPath(doc, "body.2.children.0.heightMm"), "s");
    assert.equal(blockIdFromPath(doc, "body.9.content"), undefined);
    assert.equal(blockIdFromPath(doc, "people"), undefined);
    assert.equal(blockIdFromPath(doc, "body.nope"), undefined);
  });
});
