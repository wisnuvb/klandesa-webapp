import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLegalInput, isLegalType } from "../lib/tata-kelola/legal";
import { parseRegisterInput } from "../lib/tata-kelola/register";
import { parseInstitutionInput, parseMemberInput, serializeInstitution } from "../lib/tata-kelola/institutions";
import { cleanText, parseIsoDate } from "../lib/form-input";

const NOW = new Date("2026-11-01T03:00:00Z");

describe("form-input", () => {
  it("cleanText merapikan dan menandai tipe/panjang", () => {
    assert.deepEqual(cleanText("  a   b ", 10), { value: "a b", tooLong: false, bad: false });
    assert.equal(cleanText("", 5).value, null);
    assert.equal(cleanText(5, 5).bad, true);
    assert.equal(cleanText("abcdef", 5).tooLong, true);
  });
  it("parseIsoDate hanya tanggal yang ada", () => {
    assert.ok(parseIsoDate("2024-02-29"));
    assert.equal(parseIsoDate("2025-02-29"), null);
  });
});

describe("produk hukum", () => {
  const ok = { type: "PERDES", number: "3", title: "APBDesa 2026", enactedAt: "2026-01-10" };
  it("menerima isian minimal dan menurunkan tahun dari tanggal ditetapkan", () => {
    const r = parseLegalInput(ok, NOW);
    assert.ok(r.ok && r.value.year === 2026);
  });
  it("menolak jenis asing dan kunci prototipe", () => {
    assert.ok(!parseLegalInput({ ...ok, type: "constructor" }, NOW).ok);
    assert.equal(isLegalType("__proto__"), false);
  });
  it("urutan tanggal: diundangkan/disampaikan tak boleh sebelum ditetapkan atau di masa depan", () => {
    assert.ok(parseLegalInput({ ...ok, promulgatedAt: "2026-01-12", submittedAt: "2026-01-15" }, NOW).ok);
    assert.ok(!parseLegalInput({ ...ok, promulgatedAt: "2026-01-09" }, NOW).ok);
    assert.ok(!parseLegalInput({ ...ok, submittedAt: "2027-01-01" }, NOW).ok);
    assert.ok(!parseLegalInput({ ...ok, enactedAt: "2027-01-01" }, NOW).ok);
  });
  it("kolom wajib", () => {
    const r = parseLegalInput({}, NOW);
    assert.ok(!r.ok);
    if (!r.ok) assert.deepEqual(Object.keys(r.fieldErrors).sort(), ["enactedAt", "number", "title", "type"]);
    assert.ok(!parseLegalInput(null, NOW).ok);
  });
});

describe("register surat", () => {
  const ok = { direction: "IN", letterDate: "2026-10-01", registeredAt: "2026-10-03", party: "Kecamatan", subject: "Undangan rapat" };
  it("menerima surat masuk minimal, sifat bawaan BIASA", () => {
    const r = parseRegisterInput(ok, NOW);
    assert.ok(r.ok && r.value.nature === "BIASA");
  });
  it("tanggal diterima tak boleh sebelum tanggal surat atau di masa depan", () => {
    assert.ok(!parseRegisterInput({ ...ok, registeredAt: "2026-09-30" }, NOW).ok);
    assert.ok(!parseRegisterInput({ ...ok, registeredAt: "2026-12-01" }, NOW).ok);
  });
  it("pesan kolom mengikuti arah (asal vs tujuan)", () => {
    const inn = parseRegisterInput({ ...ok, party: "" }, NOW);
    const out = parseRegisterInput({ ...ok, direction: "OUT", party: "" }, NOW);
    assert.ok(!inn.ok && !out.ok);
    if (!inn.ok && !out.ok) {
      assert.match(inn.fieldErrors.party, /asal/);
      assert.match(out.fieldErrors.party, /tujuan/);
    }
  });
  it("arah, sifat tak dikenal ditolak", () => {
    assert.ok(!parseRegisterInput({ ...ok, direction: "SIDEWAYS" }, NOW).ok);
    assert.ok(!parseRegisterInput({ ...ok, nature: "toString" }, NOW).ok);
  });
});

describe("lembaga desa", () => {
  it("lembaga: masa jabatan berakhir harus setelah awal; SK tak di masa depan", () => {
    const base = { type: "BPD", name: "BPD Desa X" };
    assert.ok(parseInstitutionInput({ ...base, periodStart: "2023-01-01", periodEnd: "2029-01-01" }, NOW).ok);
    assert.ok(!parseInstitutionInput({ ...base, periodStart: "2023-01-01", periodEnd: "2023-01-01" }, NOW).ok);
    assert.ok(!parseInstitutionInput({ ...base, decreeDate: "2027-01-01" }, NOW).ok);
    assert.ok(!parseInstitutionInput({ type: "constructor", name: "x" }, NOW).ok);
  });
  it("anggota: butuh nama atau warga; jabatan terbatas pada daftar", () => {
    assert.ok(!parseMemberInput({ role: "KETUA" }).ok);
    assert.ok(parseMemberInput({ role: "KETUA", residentId: 5 }).ok);
    assert.ok(parseMemberInput({ role: "ANGGOTA", name: "Budi" }).ok);
    assert.ok(!parseMemberInput({ role: "RAJA", name: "Budi" }).ok);
    assert.ok(!parseMemberInput({ role: "ANGGOTA", name: "Budi", startsAt: "2025-01-01", endsAt: "2024-01-01" }).ok);
  });
  it("serialisasi: urut Ketua dulu, yang sudah berakhir di belakang, penanda masa jabatan lewat", () => {
    const d = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null);
    const m = (id: number, name: string, role: string, endsAt: string | null) => ({ id, villageId: 1, institutionId: 1, residentId: null, name, role, division: null, startsAt: null, endsAt: d(endsAt), createdAt: NOW, updatedAt: NOW });
    const v = serializeInstitution(
      { id: 1, villageId: 1, type: "BPD", name: "BPD", decreeNumber: null, decreeDate: null, periodStart: d("2018-01-01"), periodEnd: d("2024-01-01"), description: null, createdById: null, createdAt: NOW, updatedAt: NOW, members: [m(1, "Zed", "ANGGOTA", null), m(2, "Lama", "KETUA", "2020-01-01"), m(3, "Ani", "KETUA", null), m(4, "Budi", "SEKRETARIS", null)] },
      NOW,
    );
    assert.deepEqual(v.members.map((x) => x.name), ["Ani", "Budi", "Zed", "Lama"]);
    assert.equal(v.members[3].active, false);
    assert.equal(v.periodEnded, true);
  });
});
