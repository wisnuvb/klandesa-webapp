import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, diffIsEmpty, fieldKeyFor, KEY_PATTERN, LIMITS, planSchemaChange, slugify, SLUG_PATTERN, toCsv, validateRecord, validateTableInput, type FieldDef } from "../lib/custom-data/schema.ts";

const F = (o: Partial<FieldDef> & Pick<FieldDef, "key" | "type">): FieldDef => ({ label: o.key, required: false, options: null, piiClass: "NONE", position: 0, isArchived: false, ...o });

test("slug: huruf kecil, tanpa aksen/simbol, tidak berujung strip, lolos pola", () => {
  assert.equal(slugify("Penerima Bantuan Beras!"), "penerima-bantuan-beras");
  assert.equal(slugify("  Écoles & Café  "), "ecoles-cafe");
  assert.equal(slugify("***"), "");
  assert.equal(slugify("a".repeat(100)).length, 60);
  assert.ok(SLUG_PATTERN.test(slugify("Data Lansia RT 03")));
});

test("kunci kolom: unik, lolos pola, bukan kata cadangan, selalu diawali huruf", () => {
  const taken = new Set<string>();
  const keys = ["Jumlah Anggota", "Jumlah anggota", "ID", "123 Angka", "Tanggal Lahir!!", "___", "created_at"].map((l) => {
    const k = fieldKeyFor(l, taken);
    taken.add(k);
    return k;
  });
  assert.equal(new Set(keys).size, keys.length);
  for (const k of keys) assert.ok(KEY_PATTERN.test(k), k);
  assert.equal(keys[0], "jumlah_anggota");
  assert.equal(keys[1], "jumlah_anggota_2");
  assert.ok(!["id", "created_at"].includes(keys[2]) && !["id", "created_at"].includes(keys[6]));
});

test("validateTableInput: menerima tabel sah dan menghasilkan slug + kunci kolom", () => {
  const r = validateTableInput({
    name: "Penerima Bantuan",
    fields: [
      { label: "Jenis Bantuan", type: "select", options: ["Beras", "Uang", "Beras"], required: true },
      { label: "Jumlah", type: "number", options: { min: 0, max: 100, unit: "kg" } },
      { label: "Catatan", type: "longtext", piiClass: "PERSONAL" },
    ],
    linkResident: true,
  });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.slug, "penerima-bantuan");
    assert.deepEqual(r.value.fields.map((f) => f.key), ["jenis_bantuan", "jumlah", "catatan"]);
    assert.deepEqual(r.value.fields[0].options, ["Beras", "Uang"], "duplikat dibuang");
    assert.equal(r.value.fields[2].piiClass, "PERSONAL");
    assert.equal(r.value.linkResident, true);
  }
});

test("validateTableInput: menolak masukan tidak sah dengan pesan awam", () => {
  const bad = (i: object) => {
    const r = validateTableInput(i);
    assert.ok(!r.ok);
    return r.ok ? [] : r.errors;
  };
  assert.ok(bad({}).length >= 2);
  assert.ok(bad({ name: "***", fields: [{ label: "A", type: "text" }] }).some((e) => /huruf atau angka/.test(e)));
  assert.ok(bad({ name: "T", fields: [{ label: "A", type: "aneh" }] }).some((e) => /jenis isian/.test(e)));
  assert.ok(bad({ name: "T", fields: [{ label: "A", type: "select", options: ["satu"] }] }).some((e) => /minimal 2 pilihan/.test(e)));
  assert.ok(bad({ name: "T", fields: [{ label: "A", type: "text", piiClass: "RAHASIA" }] }).some((e) => /kelas data/.test(e)));
  assert.ok(bad({ name: "T", fields: [{ label: "A", type: "text" }, { label: "a", type: "text" }] }).some((e) => /nama yang sama/.test(e)));
  assert.ok(bad({ name: "T", fields: [{ label: "A", type: "number", options: { min: 5, max: 1 } }] }).some((e) => /batas bawah/.test(e)));
  assert.ok(bad({ name: "T", fields: Array.from({ length: LIMITS.activeFieldsPerTable + 1 }, (_, i) => ({ label: `K${i}`, type: "text" })) }).some((e) => /Maksimal/.test(e)));
  assert.ok(bad({ name: "x".repeat(101), fields: [{ label: "A", type: "text" }] }).some((e) => /maksimal 100/.test(e)));
});

const fields: FieldDef[] = [
  F({ key: "nama", type: "text", required: true }),
  F({ key: "jumlah", type: "number", options: { min: 0, max: 10 } }),
  F({ key: "tgl", type: "date" }),
  F({ key: "aktif", type: "boolean" }),
  F({ key: "jenis", type: "select", options: ["A", "B"] }),
  F({ key: "lama", type: "text", isArchived: true }),
];

test("validateRecord: nilai sah dinormalkan (trim, angka dari teks)", () => {
  const r = validateRecord(fields, { nama: "  Budi ", jumlah: "7", tgl: "2026-02-28", aktif: true, jenis: "B" });
  assert.deepEqual(r, { ok: true, data: { nama: "Budi", jumlah: 7, tgl: "2026-02-28", aktif: true, jenis: "B" } });
});

test("validateRecord: setiap jenis menolak nilai salah dengan pesan per kolom", () => {
  const r = validateRecord(fields, { nama: "", jumlah: "abc", tgl: "2026-02-30", aktif: "ya", jenis: "C" });
  assert.ok(!r.ok);
  if (!r.ok) {
    assert.equal(r.errors.nama, "Wajib diisi.");
    assert.match(r.errors.jumlah, /angka/);
    assert.match(r.errors.tgl, /Tanggal tidak valid/);
    assert.match(r.errors.aktif, /Ya atau Tidak/);
    assert.match(r.errors.jenis, /daftar/);
  }
  assert.ok(!validateRecord(fields, { nama: "x", jumlah: 11 }).ok, "melebihi batas atas");
  assert.ok(!validateRecord(fields, { nama: "x", jumlah: -1 }).ok, "di bawah batas bawah");
  assert.ok(!validateRecord(fields, { nama: "x".repeat(256) }).ok, "teks terlalu panjang");
  assert.ok(!validateRecord(fields, { nama: "x", jumlah: Infinity }).ok);
  assert.ok(!validateRecord(fields, { nama: "x", jumlah: "1e3" }).ok, "notasi ilmiah ditolak");
});

test("validateRecord: kolom tak dikenal atau diarsipkan ditolak; masukan bukan objek ditolak", () => {
  const r = validateRecord(fields, { nama: "x", lama: "y", asing: 1 });
  assert.ok(!r.ok);
  if (!r.ok) assert.ok(r.errors.lama && r.errors.asing);
  for (const bad of [null, "x", 5, [], undefined]) assert.ok(!validateRecord(fields, bad).ok);
  const proto = JSON.parse('{"nama":"x","__proto__":{"admin":true}}');
  assert.ok(!validateRecord(fields, proto).ok, "kunci __proto__ dianggap kolom tak dikenal");
  const res = validateRecord(fields, { nama: "x" });
  assert.ok(res.ok && !("admin" in res.data));
});

test("validateRecord update: menggabung dengan nilai lama; kosong menghapus kolom opsional; wajib tetap wajib", () => {
  const existing = { nama: "Budi", jumlah: 3, jenis: "A" };
  const ok = validateRecord(fields, { jumlah: "" }, existing, "update");
  assert.deepEqual(ok, { ok: true, data: { nama: "Budi", jenis: "A" } });
  const keep = validateRecord(fields, { aktif: false }, existing, "update");
  assert.deepEqual(keep, { ok: true, data: { nama: "Budi", jumlah: 3, jenis: "A", aktif: false } });
  const miss = validateRecord(fields, { nama: "" }, existing, "update");
  assert.ok(!miss.ok);
  // nilai lama yang tak lagi valid terhadap skema baru tidak memblokir suntingan kolom lain
  const old = validateRecord(fields, { tgl: "2026-01-01" }, { nama: "Budi", jenis: "Z-hapus" }, "update");
  assert.ok(old.ok);
});

test("evolusi skema: tambah kolom, ganti nama, arsip, tambah pilihan, ubah kelas data", () => {
  const p = planSchemaChange(
    fields,
    { addFields: [{ label: "Catatan", type: "text" }], renameFields: { nama: "Nama Lengkap" }, archiveFields: ["tgl"], addOptions: { jenis: ["C", "A"] }, setPii: { jumlah: "SENSITIVE" } },
    true,
  );
  assert.ok(p.ok);
  if (p.ok) {
    assert.equal(p.diff.added[0].key, "catatan");
    assert.deepEqual(p.diff.renamed, [{ key: "nama", label: "Nama Lengkap" }]);
    assert.deepEqual(p.diff.archived, ["tgl"]);
    assert.deepEqual(p.diff.optionsAdded, [{ key: "jenis", options: ["C"] }], "pilihan lama tidak diduplikasi");
    assert.deepEqual(p.diff.piiChanged, [{ key: "jumlah", from: "NONE", to: "SENSITIVE" }]);
    assert.equal(diffIsEmpty(p.diff), false);
  }
});

test("evolusi skema: aturan yang menjaga data lama", () => {
  const err = (c: object, hasRecords = true) => {
    const p = planSchemaChange(fields, c, hasRecords);
    assert.ok(!p.ok, JSON.stringify(c));
    return p.ok ? [] : p.errors;
  };
  assert.ok(err({ addFields: [{ label: "Baru", type: "text", required: true }] }).some((e) => /sudah berisi data/.test(e)));
  assert.ok(planSchemaChange(fields, { addFields: [{ label: "Baru", type: "text", required: true }] }, false).ok, "tabel kosong boleh wajib");
  assert.ok(err({ archiveFields: ["nama", "jumlah", "tgl", "aktif", "jenis"] }).some((e) => /minimal satu kolom/.test(e)));
  assert.ok(err({ archiveFields: ["lama"] }).some((e) => /sudah diarsipkan/.test(e)));
  assert.ok(err({ archiveFields: ["tidak-ada"] }).some((e) => /tidak ditemukan/.test(e)));
  assert.ok(err({ addOptions: { nama: ["x"] } }).some((e) => /bukan kolom pilihan/.test(e)));
  assert.ok(err({ setPii: { nama: "RAHASIA" } }).some((e) => /tidak dikenal/.test(e)));
  assert.ok(err({ addFields: [{ label: "Nama", type: "text" }] }).some((e) => /Sudah ada kolom/.test(e)));
  assert.ok(err({ renameFields: { hantu: "X" } }).some((e) => /tidak ditemukan/.test(e)));
  assert.ok(err({ addFields: [{ label: "X", type: "boolean", piiClass: "?" }] }).length > 0);
});

test("evolusi skema: membuka kolom pribadi ke NONE diberi tanda exposesMore; tak ada perubahan = kosong", () => {
  const pf = [...fields.slice(0, 1), F({ key: "rahasia", type: "text", piiClass: "PERSONAL" })];
  const p = planSchemaChange(pf, { setPii: { rahasia: "NONE" } }, true);
  assert.ok(p.ok && p.diff.exposesMore.includes("rahasia"));
  const nothing = planSchemaChange(fields, {}, true);
  assert.ok(nothing.ok && diffIsEmpty(nothing.diff));
  const same = planSchemaChange(fields, { renameFields: { nama: "nama" }, setPii: { nama: "NONE" } }, true);
  assert.ok(same.ok && diffIsEmpty(same.diff));
});

test("CSV: rumus dinetralkan, tanda kutip digandakan, angka negatif tetap angka, BOM untuk Excel", () => {
  assert.equal(csvCell("=HYPERLINK(\"x\")"), `"'=HYPERLINK(""x"")"`);
  for (const f of ["+1", "-1", "@cmd", "\tx"]) assert.ok(csvCell(f).startsWith(`"'`), f);
  assert.equal(csvCell(-5), `"-5"`);
  assert.equal(csvCell(true), `"Ya"`);
  assert.equal(csvCell(null), `""`);
  assert.equal(csvCell('a"b'), `"a""b"`);
  const csv = toCsv(["A", "B"], [["x", 1]]);
  assert.ok(csv.startsWith("﻿"));
  assert.ok(csv.includes("\r\n"));
});
