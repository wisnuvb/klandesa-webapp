import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATEGORIES, CATEGORY_KEYS, isCategory, isStrategic } from "../lib/aset-desa/catalog";
import { parseDisposalInput, parseIsoDate, parseItemInput } from "../lib/aset-desa/schema";
import { acquiredLabel, bookCsv, BOOK_HEADER } from "../lib/aset-desa/book";
import type { ItemView } from "../lib/aset-desa/service";

const NOW = new Date("2026-11-01T03:00:00Z");
const valid = { name: "Komputer PC", category: "KOMPUTER_ELEKTRONIK", origin: "APBDES", acquiredYear: 2024, quantity: 2 };

describe("katalog aset desa", () => {
  it("kekayaan asli desa (Pasal 2 ayat 2) semuanya strategis, aset kantor tidak", () => {
    for (const k of CATEGORY_KEYS) assert.equal(CATEGORIES[k].strategic, CATEGORIES[k].group === "ASLI", k);
    assert.equal(isStrategic("TANAH_KAS_DESA"), true);
    assert.equal(isStrategic("KOMPUTER_ELEKTRONIK"), false);
    assert.equal(isStrategic("TIDAK_ADA"), false);
  });
  it("isCategory menolak kunci prototipe", () => {
    assert.equal(isCategory("constructor"), false);
    assert.equal(isCategory("__proto__"), false);
    assert.equal(isCategory("PASAR_DESA"), true);
  });
});

describe("parseItemInput", () => {
  it("menerima isian minimal dan memberi nilai bawaan", () => {
    const r = parseItemInput({ ...valid, quantity: undefined }, NOW);
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.value.quantity, 1);
      assert.equal(r.value.condition, "BAIK");
      assert.equal(r.value.itemCode, null);
      assert.equal(r.value.acquisitionValue, null);
    }
  });
  it("menolak isian kosong dengan pesan per kolom", () => {
    const r = parseItemInput({}, NOW);
    assert.ok(!r.ok);
    if (!r.ok) assert.deepEqual(Object.keys(r.fieldErrors).sort(), ["acquiredYear", "category", "name", "origin"]);
  });
  it("menolak bukan objek, array, dan tipe salah", () => {
    for (const bad of [null, "x", 5, [], undefined]) assert.ok(!parseItemInput(bad, NOW).ok);
    assert.ok(!parseItemInput({ ...valid, name: 123 }, NOW).ok);
    assert.ok(!parseItemInput({ ...valid, itemCode: { a: 1 } }, NOW).ok);
  });
  it("jumlah: bulat >= 1", () => {
    for (const q of [0, -1, 1.5, "abc", 1_000_001]) assert.ok(!parseItemInput({ ...valid, quantity: q }, NOW).ok, String(q));
    assert.ok(parseItemInput({ ...valid, quantity: "3" }, NOW).ok);
  });
  it("tahun perolehan: 1900 sampai tahun ini", () => {
    assert.ok(!parseItemInput({ ...valid, acquiredYear: 1899 }, NOW).ok);
    assert.ok(!parseItemInput({ ...valid, acquiredYear: 2027 }, NOW).ok);
    assert.ok(parseItemInput({ ...valid, acquiredYear: 2026 }, NOW).ok);
  });
  it("tanggal perolehan harus nyata, tak di masa depan, dan sesuai tahun", () => {
    assert.ok(parseItemInput({ ...valid, acquiredAt: "2024-03-05" }, NOW).ok);
    assert.ok(!parseItemInput({ ...valid, acquiredAt: "2024-02-30" }, NOW).ok);
    assert.ok(!parseItemInput({ ...valid, acquiredAt: "05/03/2024" }, NOW).ok);
    assert.ok(!parseItemInput({ ...valid, acquiredAt: "2023-03-05" }, NOW).ok, "tahun tak cocok");
    assert.ok(!parseItemInput({ ...valid, acquiredYear: 2026, acquiredAt: "2026-12-30" }, NOW).ok, "masa depan");
  });
  it("nilai: angka rupiah tak negatif, dua desimal dipertahankan", () => {
    const r = parseItemInput({ ...valid, acquisitionValue: "1500000.5" }, NOW);
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.value.acquisitionValue, "1500000.50");
    for (const v of [-1, "abc", "1e9", "1,5", 1e20, Number.NaN]) assert.ok(!parseItemInput({ ...valid, acquisitionValue: v }, NOW).ok, String(v));
  });
  it("kekayaan asli desa harus berasal ASLI_DESA, dan sebaliknya", () => {
    assert.ok(!parseItemInput({ ...valid, category: "PASAR_DESA", origin: "APBDES" }, NOW).ok);
    assert.ok(parseItemInput({ ...valid, category: "PASAR_DESA", origin: "ASLI_DESA" }, NOW).ok);
    assert.ok(!parseItemInput({ ...valid, origin: "ASLI_DESA" }, NOW).ok);
  });
  it("merapikan spasi dan membatasi panjang", () => {
    const r = parseItemInput({ ...valid, name: "  Meja   kerja \n kayu " }, NOW);
    assert.ok(r.ok && r.value.name === "Meja kerja kayu");
    assert.ok(!parseItemInput({ ...valid, name: "x".repeat(201) }, NOW).ok);
    assert.ok(!parseItemInput({ ...valid, notes: "x".repeat(1001) }, NOW).ok);
  });
  it("kategori/kondisi/asal tak dikenal ditolak, kunci prototipe juga", () => {
    assert.ok(!parseItemInput({ ...valid, category: "constructor" }, NOW).ok);
    assert.ok(!parseItemInput({ ...valid, condition: "HANCUR" }, NOW).ok);
    assert.ok(!parseItemInput({ ...valid, origin: "toString" }, NOW).ok);
  });
});

describe("parseIsoDate", () => {
  it("hanya tanggal kalender yang ada", () => {
    assert.ok(parseIsoDate("2024-02-29"));
    assert.equal(parseIsoDate("2023-02-29"), null);
    assert.equal(parseIsoDate("2024-13-01"), null);
    assert.equal(parseIsoDate("2024-1-1"), null);
    assert.equal(parseIsoDate(20240101), null);
  });
});

describe("parseDisposalInput", () => {
  const ok = { reason: "PEMUSNAHAN", disposedAt: "2026-10-01", decree: "Kep. Kades 12/2026" };
  it("menerima isian lengkap untuk aset biasa", () => assert.ok(parseDisposalInput(ok, "KOMPUTER_ELEKTRONIK", NOW).ok));
  it("nomor SK wajib (Pasal 23)", () => {
    const r = parseDisposalInput({ ...ok, decree: "  " }, "KOMPUTER_ELEKTRONIK", NOW);
    assert.ok(!r.ok);
    if (!r.ok) assert.ok(r.fieldErrors.decree);
  });
  it("aset strategis butuh pernyataan persetujuan Bupati/Wali Kota (Pasal 22)", () => {
    const r = parseDisposalInput(ok, "PASAR_DESA", NOW);
    assert.ok(!r.ok);
    if (!r.ok) assert.ok(r.fieldErrors.regencyApproved);
    assert.ok(parseDisposalInput({ ...ok, regencyApproved: true }, "PASAR_DESA", NOW).ok);
    assert.ok(!parseDisposalInput({ ...ok, regencyApproved: "true" }, "PASAR_DESA", NOW).ok, "harus boolean sungguhan");
  });
  it("alasan asing dan tanggal masa depan ditolak", () => {
    assert.ok(!parseDisposalInput({ ...ok, reason: "DICURI_ALIEN" }, "TANAH", NOW).ok);
    assert.ok(!parseDisposalInput({ ...ok, disposedAt: "2027-01-01" }, "TANAH", NOW).ok);
  });
});

const item = (over: Partial<ItemView> = {}): ItemView => ({
  id: 1, mapAssetId: null, name: "Laptop", category: "KOMPUTER_ELEKTRONIK", strategic: false, itemCode: null, identity: "Asus 14 inci", quantity: 1, origin: "APBDES",
  acquiredYear: 2024, acquiredAt: "2024-03-05", acquisitionValue: "8000000.00", condition: "BAIK", location: "Kantor desa", notes: null, status: "ACTIVE",
  disposedAt: null, disposalReason: null, disposalDecree: null, disposalNote: null, updatedAt: NOW.toISOString(), ...over,
});

describe("buku inventaris (CSV)", () => {
  it("memetakan asal usul ke kolom 5-7 Lampiran C", () => {
    const rows = bookCsv([item(), item({ origin: "PEROLEHAN_LAIN" }), item({ origin: "ASLI_DESA", category: "PASAR_DESA" })])
      .replace("﻿", "")
      .split("\r\n")
      .map((l) => l.split('","').map((c) => c.replace(/^"|"$/g, "")));
    assert.equal(rows[0].length, BOOK_HEADER.length);
    assert.deepEqual(rows.slice(1).map((r) => r.slice(6, 9)), [["v", "", ""], ["", "v", ""], ["", "", "v"]]);
  });
  it("tanggal diketahui ditulis lengkap, bila tidak hanya tahun", () => {
    assert.equal(acquiredLabel({ acquiredAt: "2024-03-05", acquiredYear: 2024 }), "5 Maret 2024");
    assert.equal(acquiredLabel({ acquiredAt: null, acquiredYear: 1998 }), "1998");
  });
  it("menetralkan rumus spreadsheet di nama barang", () => {
    const csv = bookCsv([item({ name: "=HYPERLINK(\"http://x\")", location: "+cmd" })]);
    assert.ok(csv.includes('"\'=HYPERLINK'));
    assert.ok(csv.includes('"\'+cmd"'));
  });
});
