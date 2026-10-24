import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { letterVerifyUrl, maskPersonName, parseLetterToken, signLetterToken } from "../lib/mobile/letter-verify.ts";

const KEYS = ["AUTH_SECRET", "NEXTAUTH_SECRET", "NODE_ENV"] as const;
const env = process.env as Record<string, string | undefined>;
const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const k of KEYS) saved[k] = env[k];
  process.env.AUTH_SECRET = "x".repeat(40);
  delete process.env.NEXTAUTH_SECRET;
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete env[k];
    else env[k] = saved[k];
  }
});

describe("token verifikasi surat", () => {
  it("bolak-balik: token sah mengembalikan id yang sama", () => {
    for (const id of [1, 42, 123456789]) assert.equal(parseLetterToken(signLetterToken(id)), BigInt(id));
  });
  it("token berbeda untuk surat berbeda dan konsisten untuk surat yang sama", () => {
    assert.notEqual(signLetterToken(1), signLetterToken(2));
    assert.equal(signLetterToken(7), signLetterToken(7));
  });
  it("menolak id yang diganti, tanda tangan rusak, dan bentuk tak wajar", () => {
    const [id, sig] = signLetterToken(10).split(".");
    for (const bad of [`${(11).toString(36)}.${sig}`, `${id}.${"A".repeat(22)}`, `${id}.${sig}x`, id, "", ".", "0.AAAAAAAAAAAAAAAAAAAAAA", "x".repeat(100), 5, null, undefined]) {
      assert.equal(parseLetterToken(bad), null, String(bad));
    }
  });
  it("kunci rahasia berbeda membuat token lama tidak sah", () => {
    const t = signLetterToken(5);
    process.env.AUTH_SECRET = "y".repeat(40);
    assert.equal(parseLetterToken(t), null);
  });
  it("tanpa AUTH_SECRET: gagal tertutup (tidak pernah menerima token)", () => {
    const t = signLetterToken(5);
    delete process.env.AUTH_SECRET;
    env.NODE_ENV = "production";
    assert.throws(() => signLetterToken(5), /AUTH_SECRET/);
    assert.equal(parseLetterToken(t), null);
  });
  it("URL verifikasi mengarah ke situs utama", () => {
    assert.match(letterVerifyUrl("abc.def"), /^https?:\/\/[^/]+\/verifikasi-surat\/abc\.def$/);
  });
});

describe("samarkan nama pemohon", () => {
  it("hanya inisial per kata", () => {
    assert.equal(maskPersonName("Siti Aminah"), "S*** A***");
    assert.equal(maskPersonName("  budi  "), "B***");
    assert.equal(maskPersonName(""), "");
    assert.equal(maskPersonName("a b c d e f"), "A*** B*** C*** D***");
  });
});
