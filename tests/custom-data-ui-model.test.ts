import { test } from "node:test";
import assert from "node:assert/strict";
import { describeDiff, diffWarnings, formatCell, fieldPayload, newFieldForm, parseOptionsText, summarizeNewTable, TEMPLATES, templateFields } from "../lib/custom-data/ui-model.ts";
import { planSchemaChange, validateTableInput, type FieldDef } from "../lib/custom-data/schema.ts";

test("opsi pilihan: satu per baris, rapikan spasi dan baris kosong", () => {
  assert.deepEqual(parseOptionsText(" Beras \r\n\r\nUang\n  \nSembako "), ["Beras", "Uang", "Sembako"]);
});

test("payload kolom: pilihan dan batas angka hanya dikirim bila relevan", () => {
  const sel = fieldPayload(newFieldForm({ label: " Jenis ", type: "select", optionsText: "A\nB", required: true }));
  assert.deepEqual(sel, { label: "Jenis", type: "select", required: true, piiClass: "NONE", options: ["A", "B"] });
  const num = fieldPayload(newFieldForm({ label: "Jumlah", type: "number", min: "0", max: "", unit: " kg " }));
  assert.deepEqual(num.options, { min: 0, unit: "kg" });
  assert.equal("options" in fieldPayload(newFieldForm({ label: "T", type: "text", optionsText: "x" })), false);
  assert.equal("options" in fieldPayload(newFieldForm({ label: "N", type: "number" })), false);
});

test("setiap templat lolos validasi server dan menandai kolom pribadi", () => {
  for (const t of TEMPLATES) {
    const r = validateTableInput({ name: t.name, description: t.description, linkResident: t.linkResident, fields: templateFields(t).map(fieldPayload) });
    assert.ok(r.ok, `${t.id}: ${r.ok ? "" : r.errors.join("; ")}`);
  }
  const lansia = TEMPLATES.find((t) => t.id === "lansia")!;
  assert.ok(lansia.fields.some((f) => f.piiClass === "SENSITIVE"), "data kesehatan ditandai sensitif");
  assert.ok(new Set(TEMPLATES.map((t) => t.id)).size === TEMPLATES.length);
});

test("uid kolom unik", () => {
  assert.notEqual(newFieldForm().uid, newFieldForm().uid);
});

const fields: FieldDef[] = [
  { key: "nama", label: "Nama", type: "text", required: true, options: null, piiClass: "NONE", position: 0, isArchived: false },
  { key: "rahasia", label: "Rahasia", type: "text", required: false, options: null, piiClass: "PERSONAL", position: 1, isArchived: false },
  { key: "jenis", label: "Jenis", type: "select", required: false, options: ["A", "B"], piiClass: "NONE", position: 2, isArchived: false },
];

test("ringkasan perubahan dalam kalimat awam, termasuk peringatan membuka kolom pribadi", () => {
  const p = planSchemaChange(fields, { name: "Baru", addFields: [{ label: "Alamat", type: "text", required: false }], renameFields: { nama: "Nama Lengkap" }, archiveFields: ["jenis"], setPii: { rahasia: "NONE" } }, true);
  assert.ok(p.ok);
  if (p.ok) {
    const lines = describeDiff(p.diff, fields).join("\n");
    assert.match(lines, /Nama tabel menjadi "Baru"/);
    assert.match(lines, /Kolom baru "Alamat"/);
    assert.match(lines, /"Nama" diganti namanya menjadi "Nama Lengkap"/);
    assert.match(lines, /"Jenis" diarsipkan: disembunyikan, tetapi isinya tidak dihapus/);
    assert.match(lines, /"Rahasia": data pribadi → bukan data pribadi/);
    const warn = diffWarnings(p.diff, fields);
    assert.equal(warn.length, 1);
    assert.match(warn[0], /bisa dibaca aplikasi lain lewat API/);
  }
});

test("ringkasan tabel baru memisahkan kolom yang tertutup dan yang terbuka untuk API", () => {
  const s = summarizeNewTable([{ label: "A", piiClass: "NONE" }, { label: " B ", piiClass: "PERSONAL" }, { label: "C", piiClass: "SENSITIVE" }]);
  assert.deepEqual(s, { total: 3, closed: ["B", "C"], open: ["A"] });
});

test("format sel: Ya/Tidak, tanggal Indonesia, angka berpemisah dan satuan, kosong", () => {
  assert.equal(formatCell(true, { type: "boolean", options: null }), "Ya");
  assert.equal(formatCell(false, { type: "boolean", options: null }), "Tidak");
  assert.equal(formatCell("2026-08-17", { type: "date", options: null }), "17 Agustus 2026");
  assert.equal(formatCell(1234.5, { type: "number", options: { unit: "kg" } }), "1.234,5 kg");
  assert.equal(formatCell(7, { type: "number", options: null }), "7");
  assert.equal(formatCell(null, { type: "text", options: null }), "");
  assert.equal(formatCell("", { type: "text", options: null }), "");
  assert.equal(formatCell("halo", { type: "select", options: ["halo"] }), "halo");
  assert.equal(formatCell("bukan-tanggal", { type: "date", options: null }), "bukan-tanggal");
});
