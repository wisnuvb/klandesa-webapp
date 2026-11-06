import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskEmail, maskNik, maskPhone, maskedEmailChange } from "../lib/platform/accounts/mask";
import {
  auditRef, isFullNik, parseAccountKind, parseAccountSearch, parseAiCreditsInput, parseId, parseReason, parseResidentSearch,
} from "../lib/platform/accounts/validate";

const sp = (q: string) => new URLSearchParams(q);

describe("Penyamaran data pribadi (Pusat Akun)", () => {
  it("email: huruf pertama + bintang + domain; format aneh tidak bocor", () => {
    assert.equal(maskEmail("budi@desa.id"), "b***@desa.id");
    assert.equal(maskEmail("a@x.id"), "a**@x.id");
    assert.ok(!maskEmail("budisantoso@desa.id").includes("udisantoso"));
    assert.equal(maskEmail("tanpa-at"), "***");
    assert.equal(maskEmail("@x.id"), "***");
    assert.equal(maskEmail(null), "");
  });
  it("telepon: dua digit awal + tiga akhir; pendek -> bintang semua", () => {
    assert.equal(maskPhone("081234567890"), "08*******890");
    assert.equal(maskPhone("0812 3456 7890"), "08*******890");
    assert.equal(maskPhone("12345"), "*****");
    assert.equal(maskPhone(null), "");
  });
  it("NIK: hanya 4 digit terakhir", () => {
    const m = maskNik("3201234567890123");
    assert.equal(m, "************0123");
    assert.equal(m.length, 16);
    assert.ok(!m.includes("3201"));
    assert.equal(maskNik(""), "");
  });
  it("perubahan email di jejak audit: kedua sisi tersamar", () => {
    const s = maskedEmailChange("lama.sekali@desa.id", "baru.sekali@desa.id");
    assert.ok(!s.includes("lama.sekali") && !s.includes("baru.sekali"));
    assert.match(s, /^l\*+@desa\.id -> b\*+@desa\.id$/);
  });
});

describe("Validasi input Pusat Akun", () => {
  it("id & jenis akun", () => {
    assert.equal(parseId("12"), 12);
    for (const bad of ["0", "-1", "1.5", "abc", "", "99999999999", "1e3", " 1"]) assert.equal(parseId(bad), null, bad);
    assert.equal(parseAccountKind("staff"), "staff");
    assert.equal(parseAccountKind("citizen"), "citizen");
    assert.equal(parseAccountKind("residents"), null);
  });
  it("alasan 5-300 karakter setelah trim", () => {
    assert.equal(parseReason("   ").ok, false);
    assert.equal(parseReason("abcd").ok, false);
    assert.deepEqual(parseReason("  tiket 123  "), { ok: true, value: "tiket 123" });
    assert.equal(parseReason("x".repeat(301)).ok, false);
    assert.equal(parseReason("x".repeat(300)).ok, true);
    assert.equal(parseReason(42).ok, false);
  });
  it("pencarian akun: bawaan, enum, halaman, desa", () => {
    const d = parseAccountSearch(sp(""));
    assert.ok(d.ok && d.value.type === "all" && d.value.page === 1 && d.value.q === "" && d.value.villageId === null);
    const ok = parseAccountSearch(sp("q=%20budi%20&type=staff&villageId=5&status=inactive&page=3"));
    assert.ok(ok.ok && ok.value.q === "budi" && ok.value.type === "staff" && ok.value.villageId === 5 && ok.value.status === "inactive" && ok.value.page === 3);
    for (const bad of ["type=admin", "status=banned", "villageId=x", "villageId=0", "page=0", "page=abc", "page=99999"]) {
      assert.equal(parseAccountSearch(sp(bad)).ok, false, bad);
    }
    const long = parseAccountSearch(sp(`q=${"a".repeat(500)}`));
    assert.ok(long.ok && long.value.q.length === 100);
  });
  it("pencarian warga: NIK hanya persis 16 digit; nama min. 3 huruf; angka sebagian ditolak", () => {
    const nik = parseResidentSearch(sp("q=3201234567890123"));
    assert.ok(nik.ok && nik.value.mode === "nik");
    const name = parseResidentSearch(sp("q=Budi&villageId=2"));
    assert.ok(name.ok && name.value.mode === "name" && name.value.villageId === 2);
    for (const bad of ["q=", "q=bu", "q=32012345", "q=320123456789012", "q=32012345678901234", "villageId=x&q=Budi"]) {
      assert.equal(parseResidentSearch(sp(bad)).ok, false, bad);
    }
    assert.ok(isFullNik("3201234567890123") && !isFullNik("320123456789012"));
  });
  it("kredit AI: set/delta, kontrak rute lama, batas", () => {
    assert.deepEqual(parseAiCreditsInput({ set: 10.9 }), { ok: true, value: { kind: "set", value: 10 } });
    assert.deepEqual(parseAiCreditsInput({ set: -5 }), { ok: true, value: { kind: "set", value: 0 } });
    assert.deepEqual(parseAiCreditsInput({ delta: "-3.5" }), { ok: true, value: { kind: "delta", value: -4 } });
    assert.deepEqual(parseAiCreditsInput({ set: "", delta: 7 }), { ok: true, value: { kind: "delta", value: 7 } });
    assert.equal(parseAiCreditsInput({}).ok, false);
    assert.equal(parseAiCreditsInput(null).ok, false);
    assert.equal(parseAiCreditsInput({ set: "abc" }).ok, false);
    assert.equal(parseAiCreditsInput({ delta: {} }).ok, false);
    assert.equal(parseAiCreditsInput({ set: 1e12 }).ok, false);
    assert.equal(parseAiCreditsInput({ delta: -1e12 }).ok, false);
  });
  it("referensi audit: staf = id polos, warga = citizen:<id>", () => {
    assert.deepEqual(auditRef("staff", 7), { targetType: "user", targetId: "7" });
    assert.deepEqual(auditRef("citizen", 7), { targetType: "user", targetId: "citizen:7" });
  });
});
