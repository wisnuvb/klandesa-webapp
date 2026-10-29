/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSchema } from "@tiptap/core";
import {
  CATEGORY_ORDER,
  ZOOM_MAX,
  ZOOM_MIN,
  appendItem,
  blockLabel,
  blockSummary,
  buildFieldOptions,
  clampZoom,
  describeCondition,
  filterFieldOptions,
  getTextSlots,
  groupPresets,
  insertItemAfter,
  isTextEditable,
  issuesByBlock,
  locateBlock,
  mmToPx,
  normalizeSearch,
  pageGuides,
  paperPx,
  paperScale,
  refLabel,
  removeItem,
  resolveIcon,
  setTextSlot,
  slashTrigger,
} from "../components/letters/editor/canvas/helpers.ts";
import { createInlineExtensions } from "../components/letters/editor/canvas/extensions.ts";
import { BLOCK_PRESETS, inlinesToTiptap, tiptapToInlines } from "../lib/letters/editor/index.ts";
import { updateBlockById, walkBlocks } from "../lib/letters/editor/ops.ts";
import { validateDocument } from "../lib/letters/document/validate.ts";
import { parseRef } from "../lib/letters/registry.ts";
import type { Block, Inline, LetterDocument } from "../lib/letters/document/schema.ts";
import { FIXTURES, f, t } from "./letters-fixtures.ts";

function deepFreeze<T>(v: T): T {
  if (v && typeof v === "object" && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const k of Object.keys(v as object)) deepFreeze((v as any)[k]);
  }
  return v;
}

const base = (extra: Partial<LetterDocument> = {}): LetterDocument => {
  const r = validateDocument({
    schemaVersion: 2,
    people: [{ id: "pemohon", label: "Pemohon" }],
    fields: [{ id: "luas_tanah", label: "Luas tanah", type: "number" }],
    body: [{ id: "p1", type: "paragraph", content: [t("Halo")] }],
    ...extra,
  });
  assert.ok(r.ok, JSON.stringify(!r.ok && r.issues));
  return r.doc;
};

describe("refLabel", () => {
  const doc = base({ people: [{ id: "pemohon", label: "Pemohon", required: true, allowManual: true }, { id: "pihak1", label: "Pihak 1", required: true, allowManual: true }] });
  it("memberi label awam untuk tiap jenis rujukan", () => {
    assert.equal(refLabel("pemohon.nama", doc), "Nama lengkap pemohon");
    assert.equal(refLabel("pihak1.nik", doc), "NIK pihak 1");
    assert.equal(refLabel("desa.nama", doc), "Nama desa");
    assert.equal(refLabel("pejabat.kades.nama", doc), "Nama Kepala Desa");
    assert.equal(refLabel("pejabat.sekdes.nip", doc), "NIP Sekretaris Desa");
    assert.equal(refLabel("surat.nomor", doc), "Nomor surat");
    assert.equal(refLabel("isian.luas_tanah", doc), "Luas tanah");
  });
  it("tidak melempar untuk rujukan tak dikenal", () => {
    assert.equal(refLabel("ngawur", doc), "ngawur");
    assert.equal(refLabel("isian.hilang", doc), "hilang");
    assert.equal(refLabel("orang_lain.nama", doc), "Nama lengkap orang_lain"); // peran tak ada di dokumen: pakai id-nya
  });
});

describe("pilihan isian", () => {
  const doc = base();
  const groups = buildFieldOptions(doc);
  const all = groups.flatMap((g) => g.options);

  it("memuat orang, isian tambahan, pejabat, desa, dan surat", () => {
    assert.deepEqual(groups.map((g) => g.id), ["orang:pemohon", "isian", "pejabat", "desa", "surat"]);
    assert.equal(groups.find((g) => g.id === "pejabat")!.options.length, 9);
  });
  it("semua rujukan sah menurut registry dan unik", () => {
    for (const o of all) assert.ok(parseRef(o.ref), o.ref);
    assert.equal(new Set(all.map((o) => o.ref)).size, all.length);
  });
  it("tanpa isian tambahan, kelompok itu tidak muncul", () => {
    assert.ok(!buildFieldOptions(base({ fields: [] })).some((g) => g.id === "isian"));
  });
  it("pencarian toleran huruf besar dan banyak kata, kelompok kosong dibuang", () => {
    assert.ok(filterFieldOptions(groups, "NIK").flatMap((g) => g.options).some((o) => o.ref === "pemohon.nik"));
    assert.deepEqual(
      filterFieldOptions(groups, "nama kepala desa").flatMap((g) => g.options.map((o) => o.ref)),
      ["pejabat.kades.nama"],
    );
    assert.deepEqual(filterFieldOptions(groups, "zzzxx"), []);
    assert.equal(filterFieldOptions(groups, "   "), groups);
    assert.ok(filterFieldOptions(groups, "luas").every((g) => g.options.length > 0));
  });
  it("normalizeSearch membuang diakritik dan merapatkan spasi", () => {
    assert.equal(normalizeSearch("  Ákte   LAHIR "), "akte lahir");
  });
});

describe("pemicu slash", () => {
  it("hanya di awal baris atau setelah spasi", () => {
    assert.equal(slashTrigger(""), true);
    assert.equal(slashTrigger("Yang bertanda tangan "), true);
    assert.equal(slashTrigger("baris\n"), true);
    assert.equal(slashTrigger("dan"), false);
    assert.equal(slashTrigger("RT 02"), false);
    assert.equal(slashTrigger("￼"), false); // tepat setelah chip isian
  });
});

describe("skala kertas", () => {
  it("F4 potret ≈ 215×330 mm dan lanskap menukar sisi", () => {
    const p = paperPx({ size: "F4", orientation: "portrait" });
    assert.ok(Math.abs(p.width - mmToPx(215)) < 0.01 && Math.abs(p.height - mmToPx(330)) < 0.01);
    const l = paperPx({ size: "F4", orientation: "landscape" });
    assert.equal(l.width, p.height);
  });
  it("diperkecil agar muat, tidak pernah diperbesar otomatis", () => {
    const w = paperPx({ size: "F4", orientation: "portrait" }).width;
    assert.ok(paperScale(500, w) < 1);
    assert.equal(paperScale(3000, w), 1);
    assert.equal(paperScale(0, w), 1);
    assert.equal(paperScale(500, 0), 1);
    assert.ok(paperScale(100, w) >= 0.2);
  });
  it("zoom mengalikan skala dan dibatasi", () => {
    const w = paperPx({ size: "A4", orientation: "portrait" }).width;
    assert.equal(paperScale(3000, w, 1.5), 1.5);
    assert.equal(clampZoom(9), ZOOM_MAX);
    assert.equal(clampZoom(0), ZOOM_MIN);
    assert.equal(clampZoom(Number.NaN), 1);
  });
  it("batas halaman perkiraan: urut naik, tanpa batas bila isi pendek, dibatasi jumlahnya", () => {
    const page = { size: "F4", orientation: "portrait", margin: { top: 20, right: 20, bottom: 20, left: 25 } } as const;
    assert.deepEqual(pageGuides(500, page), []);
    const g = pageGuides(paperPx(page).height * 3, page);
    assert.equal(g.length, 3);
    assert.ok(g.every((y, i) => i === 0 || y > g[i - 1]));
    assert.equal(pageGuides(1e9, page, 5).length, 5);
  });
});

describe("preset", () => {
  it("semua preset terkelompok dalam urutan kategori", () => {
    const groups = groupPresets(BLOCK_PRESETS, "");
    assert.equal(groups.flatMap((g) => g.presets).length, BLOCK_PRESETS.length);
    const order = groups.map((g) => CATEGORY_ORDER.indexOf(g.category));
    assert.deepEqual(order, [...order].sort((a, b) => a - b));
  });
  it("pencarian memakai label dan deskripsi", () => {
    const ids = groupPresets(BLOCK_PRESETS, "tanda tangan").flatMap((g) => g.presets.map((p) => p.id));
    assert.ok(ids.includes("tanda_tangan_kades") && ids.includes("tanda_tangan_mengetahui"));
    assert.deepEqual(groupPresets(BLOCK_PRESETS, "zzzxx"), []);
  });
  it("resolveIcon memakai cadangan untuk nama tak dikenal (termasuk 'constructor')", () => {
    const icons = { Type: 1 } as Record<string, number>;
    assert.equal(resolveIcon<number>(icons, "Type", 0), 1);
    assert.equal(resolveIcon<number>(icons, "Nope", 0), 0);
    assert.equal(resolveIcon<number>(icons, "constructor", 0), 0);
  });
  it("setiap ikon preset terdaftar di peta ikon InsertMenu", () => {
    const src = readFileSync(new URL("../components/letters/editor/canvas/InsertMenu.tsx", import.meta.url), "utf8");
    const block = src.slice(src.indexOf("const ICONS"), src.indexOf("};", src.indexOf("const ICONS")));
    for (const p of BLOCK_PRESETS) {
      assert.ok(new RegExp(`\\b${p.icon}\\b`).test(block), `ikon ${p.icon} (${p.id}) belum terdaftar`);
    }
  });
});

describe("nama & ringkasan bagian", () => {
  const doc = base();
  it("setiap jenis bagian di fixture punya nama awam", () => {
    for (const fx of Object.values(FIXTURES)) {
      const v = validateDocument(fx);
      if (!v.ok) continue;
      walkBlocks(v.doc, (b) => assert.ok(blockLabel(b).length > 0, b.type));
    }
  });
  it("ringkasan menampilkan teks dan chip, memotong yang panjang, jatuh ke nama bagian bila kosong", () => {
    const p: Block = { id: "x", type: "paragraph", align: "left", indentFirst: false, spaceAfterMm: 3, content: [t("Nama: "), f("pemohon.nama")] };
    assert.equal(blockSummary(p, doc), "Nama: «Nama lengkap pemohon»");
    assert.equal(blockSummary({ ...p, content: [] }, doc), "Paragraf");
    const long = blockSummary({ ...p, content: [t("a".repeat(200))] }, doc, 20);
    assert.equal(long.length, 20);
    assert.ok(long.endsWith("…"));
  });
  it("describeCondition untuk keempat operator", () => {
    assert.match(describeCondition({ ref: "pemohon.umur", op: "filled" }, doc), /terisi/);
    assert.match(describeCondition({ ref: "pemohon.umur", op: "empty" }, doc), /kosong/);
    assert.match(describeCondition({ ref: "isian.luas_tanah", op: "eq", value: "5" }, doc), /berisi “5”/);
    assert.match(describeCondition({ ref: "isian.luas_tanah", op: "neq", value: "5" }, doc), /bukan “5”/);
  });
  it("issuesByBlock menggabungkan pesan dan mengabaikan yang tanpa bagian", () => {
    const m = issuesByBlock([{ blockId: "a", message: "x" }, { blockId: "a", message: "y" }, { blockId: "a", message: "x" }, { message: "z" }]);
    assert.equal(m.get("a"), "x; y");
    assert.equal(m.size, 1);
  });
});

describe("letak bagian", () => {
  const doc = base({
    body: [
      { id: "a", type: "paragraph", content: [] },
      { id: "kol", type: "columns", ratios: [1, 1], children: [[{ id: "k1", type: "paragraph", content: [] }, { id: "k2", type: "paragraph", content: [] }], []] },
      { id: "cond", type: "conditional", when: { ref: "pemohon.umur", op: "filled" }, children: [{ id: "c1", type: "paragraph", content: [] }] },
    ] as any,
  });
  it("menemukan bagian tingkat atas dan bersarang", () => {
    assert.deepEqual(locateBlock(doc, "a") && { i: locateBlock(doc, "a")!.index, n: locateBlock(doc, "a")!.count, t: locateBlock(doc, "a")!.topId }, { i: 0, n: 3, t: "a" });
    const k2 = locateBlock(doc, "k2")!;
    assert.deepEqual({ i: k2.index, n: k2.count, t: k2.topId, nested: k2.nested }, { i: 1, n: 2, t: "kol", nested: true });
    const c1 = locateBlock(doc, "c1")!;
    assert.deepEqual({ i: c1.index, n: c1.count, t: c1.topId }, { i: 0, n: 1, t: "cond" });
  });
  it("id kosong atau tak dikenal → null", () => {
    assert.equal(locateBlock(doc, null), null);
    assert.equal(locateBlock(doc, "hilang"), null);
  });
});

describe("slot teks", () => {
  it("jenis non-teks tidak punya slot", () => {
    for (const type of ["divider", "spacer", "pageBreak", "image", "qr", "personData", "repeatTable", "columns", "conditional"]) {
      assert.equal(getTextSlots({ type, id: "x" } as any).length, 0, type);
    }
    assert.equal(isTextEditable({ id: "x", type: "divider", style: "single" }), false);
  });

  it("setiap slot di semua fixture bisa diganti dan dokumen tetap lolos validasi, tanpa mengubah masukan", () => {
    const fresh: Inline[] = [t("Teks baru ", ["b"]), f("surat.nomor"), { type: "br" }, t("akhir")];
    let checked = 0;
    for (const [name, fx] of Object.entries(FIXTURES)) {
      const v = validateDocument(fx);
      if (!v.ok) continue;
      const doc = deepFreeze(v.doc);
      walkBlocks(doc, (b) => {
        for (const slot of getTextSlots(b)) {
          const next = setTextSlot(b, slot.key, fresh);
          assert.notEqual(next, b, `${name}/${b.id}/${slot.key} tidak berubah`);
          const again = getTextSlots(next).find((s) => s.key === slot.key)!;
          assert.deepEqual(again.inlines, fresh, `${name}/${b.id}/${slot.key}`);
          const res = updateBlockById(doc, b.id, () => next);
          assert.ok(res.ok);
          if (res.ok) {
            const check = validateDocument(res.doc);
            assert.ok(check.ok, `${name}/${b.id}/${slot.key}: ${JSON.stringify(!check.ok && check.issues)}`);
          }
          checked++;
        }
      });
    }
    assert.ok(checked > 40, `hanya ${checked} slot teruji`);
  });

  it("kunci tak dikenal membiarkan bagian apa adanya", () => {
    const p: Block = { id: "p", type: "paragraph", align: "left", indentFirst: false, spaceAfterMm: 3, content: [] };
    assert.equal(setTextSlot(p, "item.0", [t("x")]), p);
    assert.equal(setTextSlot({ id: "l", type: "list", style: "number", items: [[]] }, "item.9", [t("x")]).type, "list");
    const list: Block = { id: "l", type: "list", style: "number", items: [[t("a")]] };
    assert.equal(setTextSlot(list, "item.9", [t("x")]), list);
  });

  it("sel tabel yang kurang dilengkapi saat diisi", () => {
    const tbl: Block = { id: "t", type: "table", bordered: true, columns: [{ label: "A" }, { label: "B" }], rows: [[[t("1")]]] };
    const next = setTextSlot(tbl, "cell.0.1", [t("2")]) as Extract<Block, { type: "table" }>;
    assert.deepEqual(next.rows[0], [[t("1")], [t("2")]]);
  });
});

describe("butir daftar", () => {
  const list: Block = { id: "l", type: "list", style: "number", items: [[t("a")], [t("b")]] };
  it("menyisipkan butir kosong setelah butir yang aktif dan menunjuk fokus ke sana", () => {
    const r = insertItemAfter(list, "item.0")!;
    assert.equal(r.focusKey, "item.1");
    assert.deepEqual((r.block as any).items, [[t("a")], [], [t("b")]]);
  });
  it("menghapus butir, minimal satu tersisa, fokus ke butir sebelumnya", () => {
    const r = removeItem(list, "item.1")!;
    assert.equal(r.focusKey, "item.0");
    assert.equal((r.block as any).items.length, 1);
    assert.equal(removeItem(r.block, "item.0"), null);
    assert.equal(removeItem(list, "item.7"), null);
  });
  it("menghormati batas jumlah butir dan jenis yang tidak punya butir", () => {
    const cc: Block = { id: "c", type: "cc", label: "Tembusan :", items: Array.from({ length: 10 }, () => []) };
    assert.equal(insertItemAfter(cc, "item.0"), null);
    assert.equal(appendItem(cc), null);
    assert.equal(insertItemAfter({ id: "p", type: "paragraph", content: [] } as any, "item.0"), null);
    assert.equal((appendItem(list)!.block as any).items.length, 3);
    assert.equal(appendItem({ ...list, items: [] } as any)!.focusKey, "item.0");
  });
  it("tidak mengubah masukan", () => {
    const frozen = deepFreeze(JSON.parse(JSON.stringify(list)));
    insertItemAfter(frozen, "item.0");
    removeItem(frozen, "item.0");
    appendItem(frozen);
  });
});

describe("ekstensi Tiptap", () => {
  const schema = getSchema(createInlineExtensions((r) => r));
  it("dibatasi persis ke doc, paragraph, text, hardBreak, field + bold, italic, underline", () => {
    assert.deepEqual(Object.keys(schema.nodes).sort(), ["doc", "field", "hardBreak", "paragraph", "text"]);
    assert.deepEqual(Object.keys(schema.marks).sort(), ["bold", "italic", "underline"]);
  });
  it("node field adalah atom sebaris dengan atribut ref/format/fallback", () => {
    const n = schema.nodes.field;
    assert.ok(n.isAtom && n.isInline);
    assert.deepEqual(Object.keys(n.spec.attrs ?? {}).sort(), ["fallback", "format", "label", "ref"]);
  });
  it("Inline → dokumen Tiptap valid menurut skema → Inline kembali", () => {
    const inl: Inline[] = [
      t("Yang bertanda tangan ", ["b", "u"]),
      f("pemohon.nama", "upper"),
      { type: "br" },
      { type: "field", ref: "isian.luas_tanah", fallback: "-" },
      t(" selesai", ["i"]),
    ];
    const doc = schema.nodeFromJSON(inlinesToTiptap(inl));
    doc.check();
    assert.deepEqual(tiptapToInlines(doc.toJSON()), inl);
  });
});
