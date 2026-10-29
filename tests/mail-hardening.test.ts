import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../lib/html-escape.ts";
import { readJsonBody } from "../lib/http/read-json.ts";
import { villageTemplateScope } from "../lib/mail/template-access.ts";
import { TEMPLATE_LIMITS, checkJsonShape, validateTemplateInput } from "../lib/mail/template-guard.ts";
import {
  LETTER_LIMITS,
  cleanLine,
  parseLetterDate,
  parseLetterStatus,
  parseSignerRole,
  sanitizeFormData,
} from "../lib/mail/letter-input.ts";

describe("escapeHtml", () => {
  it("menetralkan karakter HTML berbahaya", () => {
    assert.equal(escapeHtml(`<img src=x onerror="alert('x')">&`), "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;");
  });
  it("null/undefined menjadi string kosong", () => {
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
  });
});

describe("readJsonBody", () => {
  const post = (body: string, headers: Record<string, string> = {}) =>
    new Request("http://x.test/", { method: "POST", body, headers });

  it("menerima JSON sah", async () => {
    const r = await readJsonBody(post('{"a":1}'), 100);
    assert.deepEqual(r, { ok: true, body: { a: 1 } });
  });
  it("menolak body melebihi batas (413)", async () => {
    const r = await readJsonBody(post(JSON.stringify({ a: "x".repeat(200) })), 100);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 413);
  });
  it("menolak berdasarkan Content-Length sebelum membaca", async () => {
    const r = await readJsonBody(post("{}", { "content-length": "999999" }), 100);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 413);
  });
  it("menolak JSON rusak (400)", async () => {
    const r = await readJsonBody(post("{oops"), 100);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 400);
  });
});

describe("villageTemplateScope", () => {
  it("hanya desa sendiri atau katalog global tanpa villageId", () => {
    assert.deepEqual(villageTemplateScope(7), { OR: [{ villageId: 7 }, { isGlobal: true, villageId: null }] });
  });
});

describe("validateTemplateInput", () => {
  const ok = { name: "  SK Usaha  ", category: "Keterangan", templateStructure: { blocks: [] } };

  it("create: merapikan nama dan menerima payload sah", () => {
    const r = validateTemplateInput(ok, "create");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.name, "SK Usaha");
  });
  it("create: wajib name, category, templateStructure", () => {
    assert.equal(validateTemplateInput({ ...ok, name: "  " }, "create").ok, false);
    assert.equal(validateTemplateInput({ ...ok, category: undefined }, "create").ok, false);
    assert.equal(validateTemplateInput({ name: "a", category: "b" }, "create").ok, false);
  });
  it("update: hanya memeriksa field yang dikirim", () => {
    const r = validateTemplateInput({ isActive: false }, "update");
    assert.deepEqual(r, { ok: true, value: { isActive: false } });
    assert.equal(validateTemplateInput({ name: "" }, "update").ok, false);
  });
  it("menolak nama/kategori/deskripsi terlalu panjang", () => {
    assert.equal(validateTemplateInput({ ...ok, name: "a".repeat(TEMPLATE_LIMITS.nameLength + 1) }, "create").ok, false);
    assert.equal(validateTemplateInput({ ...ok, category: "a".repeat(TEMPLATE_LIMITS.categoryLength + 1) }, "create").ok, false);
    assert.equal(validateTemplateInput({ ...ok, description: "a".repeat(TEMPLATE_LIMITS.descriptionLength + 1) }, "create").ok, false);
  });
  it("menolak templateStructure bukan objek", () => {
    assert.equal(validateTemplateInput({ ...ok, templateStructure: [] }, "create").ok, false);
    assert.equal(validateTemplateInput({ ...ok, templateStructure: "x" }, "create").ok, false);
  });
  it("menolak struktur terlalu dalam, terlalu besar, atau berkunci berbahaya", () => {
    let deep: unknown = "x";
    for (let i = 0; i < TEMPLATE_LIMITS.maxDepth + 3; i++) deep = { n: deep };
    assert.equal(validateTemplateInput({ ...ok, templateStructure: deep }, "create").ok, false);

    const big = { blocks: [{ content: "x".repeat(TEMPLATE_LIMITS.maxStringLength + 1) }] };
    assert.equal(validateTemplateInput({ ...ok, templateStructure: big }, "create").ok, false);

    const huge = { blocks: Array.from({ length: 30 }, () => ({ content: "y".repeat(TEMPLATE_LIMITS.maxStringLength - 1) })) };
    assert.equal(validateTemplateInput({ ...ok, templateStructure: huge }, "create").ok, false);

    const polluted = JSON.parse('{"blocks":[{"__proto__":{"admin":true}}]}');
    assert.equal(validateTemplateInput({ ...ok, templateStructure: polluted }, "create").ok, false);
  });
  it("menolak jumlah node berlebih", () => {
    const wide = { items: Array.from({ length: TEMPLATE_LIMITS.maxNodes + 1 }, () => 1) };
    assert.notEqual(checkJsonShape(wide), null);
  });
  it("menolak isActive bukan boolean dan body bukan objek", () => {
    assert.equal(validateTemplateInput({ isActive: "ya" }, "update").ok, false);
    assert.equal(validateTemplateInput(null, "create").ok, false);
    assert.equal(validateTemplateInput([], "create").ok, false);
  });
});

describe("sanitizeFormData", () => {
  it("menerima objek datar dan mengubah angka/boolean jadi string", () => {
    const r = sanitizeFormData({ NAMA: "Budi", UMUR: 30, AKTIF: true, KOSONG: null });
    assert.deepEqual(r, { ok: true, value: { NAMA: "Budi", UMUR: "30", AKTIF: "true", KOSONG: "" } });
  });
  it("menolak bukan objek, array, dan nilai objek/array", () => {
    for (const bad of [null, [], "x", 5]) assert.equal(sanitizeFormData(bad).ok, false);
    assert.equal(sanitizeFormData({ A: { b: 1 } }).ok, false);
    assert.equal(sanitizeFormData({ A: ["x"] }).ok, false);
  });
  it("menolak nama isian tidak valid dan kunci berbahaya", () => {
    assert.equal(sanitizeFormData({ "NAMA LENGKAP": "x" }).ok, false);
    assert.equal(sanitizeFormData({ "a-b": "x" }).ok, false);
    assert.equal(sanitizeFormData(JSON.parse('{"__proto__":"x"}')).ok, false);
    assert.equal(sanitizeFormData({ ["A".repeat(LETTER_LIMITS.formKeyLength + 1)]: "x" }).ok, false);
  });
  it("membatasi jumlah isian dan panjang nilai", () => {
    const many = Object.fromEntries(Array.from({ length: LETTER_LIMITS.formKeys + 1 }, (_, i) => [`K${i}`, "x"]));
    assert.equal(sanitizeFormData(many).ok, false);
    assert.equal(sanitizeFormData({ A: "x".repeat(LETTER_LIMITS.formValueLength + 1) }).ok, false);
  });
  it("membatasi total ukuran data", () => {
    const n = Math.ceil(LETTER_LIMITS.formTotalChars / LETTER_LIMITS.formValueLength) + 2;
    const big = Object.fromEntries(Array.from({ length: n }, (_, i) => [`K${i}`, "x".repeat(LETTER_LIMITS.formValueLength)]));
    assert.equal(sanitizeFormData(big).ok, false);
  });
  it("membuang karakter kontrol tetapi mempertahankan baris baru", () => {
    const r = sanitizeFormData({ A: "a\u0000b\nc\u0007" });
    assert.deepEqual(r, { ok: true, value: { A: "ab\nc" } });
  });
  it("tidak membawa tanda HTML apa adanya ke luar kontrak: nilai tetap string mentah (escape dilakukan saat render)", () => {
    const r = sanitizeFormData({ A: "<b>x</b>" });
    assert.deepEqual(r, { ok: true, value: { A: "<b>x</b>" } });
  });
});

describe("parser kecil surat", () => {
  it("cleanLine: merapikan, membatasi, menolak non-string", () => {
    assert.equal(cleanLine("  Budi \u0000", 10), "Budi");
    assert.equal(cleanLine("x".repeat(11), 10), null);
    assert.equal(cleanLine(5, 10), null);
  });
  it("parseLetterDate menolak tanggal tidak valid", () => {
    assert.equal(parseLetterDate("bukan tanggal"), null);
    assert.equal(parseLetterDate({}), null);
    assert.ok(parseLetterDate("2026-10-29T12:00:00.000Z") instanceof Date);
  });
  it("parseLetterStatus & parseSignerRole memakai allowlist/pola", () => {
    assert.equal(parseLetterStatus("completed"), "completed");
    assert.equal(parseLetterStatus("hacked"), null);
    assert.equal(parseSignerRole("kepala_desa"), "kepala_desa");
    assert.equal(parseSignerRole("Kepala Desa; DROP"), null);
  });
});
