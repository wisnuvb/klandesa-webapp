import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasNoAdult,
  isElderAlone,
  kkFlags,
  maskDigits,
  needsAttention,
  normalizeUnit,
  parseKkKey,
  parseKkQuery,
  spacedDigits,
  toKkListRow,
  type KkAggRow,
} from "../lib/kependudukan/kk-list.ts";

const row = (o: Partial<KkAggRow> = {}): KkAggRow => ({
  kk: "3508070101100021",
  ref: 7,
  activeCount: 3,
  inactiveCount: 0,
  headCount: 1,
  badNik: 0,
  balita: 0,
  lansia: 0,
  dewasa: 2,
  hamil: 0,
  disabilitas: 0,
  stunting: 0,
  headName: "Budi",
  address: "Jl. Mawar 1",
  rt: "01",
  rw: "02",
  hamlet: "Karangsari",
  ...o,
});

describe("parseKkQuery", () => {
  const q = (s: string) => parseKkQuery(new URLSearchParams(s));

  it("memberi nilai bawaan yang aman", () => {
    const r = q("");
    assert.equal(r.page, 1);
    assert.equal(r.pageSize, 10);
    assert.equal(r.sortKey, "family_card_number");
    assert.equal(r.sortOrder, "asc");
    assert.equal(r.full, false);
    assert.equal(r.preset, null);
  });

  it("membatasi ukuran halaman dan membuang angka sampah", () => {
    assert.equal(q("pageSize=100000").pageSize, 100);
    assert.equal(q("pageSize=-5").pageSize, 10);
    assert.equal(q("page=abc").page, 1);
    assert.equal(q("page=0").page, 1);
  });

  it("membuang nilai di luar daftar putih (kunci urut, preset, ukuran, ada)", () => {
    const r = q("sortKey=kk;DROP TABLE residents&preset=hack&size=9&has=nik&sortOrder=sideways");
    assert.equal(r.sortKey, "family_card_number");
    assert.equal(r.preset, null);
    assert.equal(r.size, null);
    assert.equal(r.has, null);
    assert.equal(r.sortOrder, "asc");
  });

  it("menerima nilai sah dan merapikan teks", () => {
    const r = q("sortKey=rt_rw&sortOrder=desc&preset=lansia_sendiri&size=2-4&has=hamil&dusun=%20%20Karang%20%20sari%20&full=1");
    assert.equal(r.sortKey, "rt_rw");
    assert.equal(r.sortOrder, "desc");
    assert.equal(r.preset, "lansia_sendiri");
    assert.equal(r.size, "2-4");
    assert.equal(r.has, "hamil");
    assert.equal(r.dusun, "Karang sari");
    assert.equal(r.full, true);
  });

  it("memotong teks cari yang kepanjangan", () => {
    assert.equal(q(`search=${"a".repeat(500)}`).search.length, 100);
  });
});

describe("penyamaran", () => {
  it("hanya 4 angka terakhir yang terlihat", () => {
    assert.equal(maskDigits("3508070101100021"), "•••• •••• •••• 0021");
    assert.equal(maskDigits(" 3508 0701 0110 0021 "), "•••• •••• •••• 0021");
    assert.equal(maskDigits(""), "");
    assert.equal(maskDigits(null), "");
  });

  it("hasil tersamar tidak memuat 12 angka depan", () => {
    const m = maskDigits("3508070101100021");
    assert.ok(!m.includes("350807"));
    assert.ok(!m.includes("0101"));
  });

  it("spacedDigits memberi spasi tiap 4 angka", () => {
    assert.equal(spacedDigits("3508070101100021"), "3508 0701 0110 0021");
  });

  it("baris daftar tidak memuat nomor KK lengkap kecuali diminta", () => {
    const masked = toKkListRow(row(), { full: false });
    assert.equal(masked.kk, null);
    assert.equal(masked.kkMasked, "•••• •••• •••• 0021");
    assert.ok(!JSON.stringify(masked).includes("3508070101100021"));

    const full = toKkListRow(row(), { full: true });
    assert.equal(full.kk, "3508070101100021");
  });
});

describe("lencana masalah data", () => {
  it("KK sehat tanpa lencana", () => {
    assert.deepEqual(kkFlags(row()), []);
  });
  it("tanpa kepala keluarga aktif", () => {
    assert.deepEqual(kkFlags(row({ headCount: 0 })), ["NO_HEAD"]);
  });
  it("kepala keluarga lebih dari satu", () => {
    assert.deepEqual(kkFlags(row({ headCount: 2 })), ["MULTIPLE_HEADS"]);
  });
  it("NIK bukan 16 angka", () => {
    assert.deepEqual(kkFlags(row({ badNik: 1 })), ["BAD_NIK"]);
  });
  it("tanpa anggota aktif: bukan 'tanpa kepala', dan tidak memicu perhatian", () => {
    const f = kkFlags(row({ activeCount: 0, headCount: 0 }));
    assert.deepEqual(f, ["NO_ACTIVE"]);
    assert.equal(needsAttention(f), false);
  });
  it("beberapa masalah terurut tetap", () => {
    assert.deepEqual(kkFlags(row({ headCount: 0, badNik: 2 })), ["NO_HEAD", "BAD_NIK"]);
    assert.equal(needsAttention(["NO_HEAD", "BAD_NIK"]), true);
  });
});

describe("preset", () => {
  it("lansia tinggal sendiri: satu anggota aktif dan ia lansia", () => {
    assert.equal(isElderAlone({ activeCount: 1, lansia: 1 }), true);
    assert.equal(isElderAlone({ activeCount: 2, lansia: 1 }), false);
    assert.equal(isElderAlone({ activeCount: 1, lansia: 0 }), false);
  });
  it("tanpa dewasa: ada orang aktif tetapi tak seorang pun dewasa", () => {
    assert.equal(hasNoAdult({ activeCount: 2, dewasa: 0 }), true);
    assert.equal(hasNoAdult({ activeCount: 2, dewasa: 1 }), false);
    assert.equal(hasNoAdult({ activeCount: 0, dewasa: 0 }), false);
  });
});

describe("normalizeUnit", () => {
  it("'01' sama dengan '1'; kosong dan '-' kosong; '0' tetap", () => {
    assert.equal(normalizeUnit("01"), "1");
    assert.equal(normalizeUnit("001"), "1");
    assert.equal(normalizeUnit(" 2 "), "2");
    assert.equal(normalizeUnit("-"), "");
    assert.equal(normalizeUnit(null), "");
    assert.equal(normalizeUnit("00"), "0");
  });
});

describe("parseKkKey", () => {
  it("angka pendek = ref (id anggota)", () => {
    assert.deepEqual(parseKkKey("42"), { type: "ref", id: 42 });
  });
  it("16 angka = nomor KK (rute lama tetap jalan)", () => {
    assert.deepEqual(parseKkKey("3508070101100021"), { type: "kk", kk: "3508070101100021" });
  });
  it("nol dan kosong ditolak", () => {
    assert.equal(parseKkKey("0"), null);
    assert.equal(parseKkKey(""), null);
  });
});
