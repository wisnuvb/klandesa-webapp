import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { birthCutoff, parsePollInput, pollStatus } from "../lib/polls/service";

const NOW = new Date("2026-11-01T03:00:00Z");
const ok = { title: "Setuju pembangunan jalan?", options: ["Setuju", "Tidak setuju"], closesAt: "2026-11-08T10:00:00Z" };

describe("parsePollInput", () => {
  it("menerima isian minimal dengan nilai bawaan (umur 17, hasil tampil setelah ditutup)", () => {
    const r = parsePollInput(ok, NOW);
    assert.ok(r.ok && r.value.minAge === 17 && r.value.showLive === false && r.value.opensAt === null);
  });
  it("pilihan: 2-10, tak kosong, tak ganda (tanpa peduli huruf besar), tiap pilihan dibatasi", () => {
    assert.ok(!parsePollInput({ ...ok, options: ["Satu"] }, NOW).ok);
    assert.ok(!parsePollInput({ ...ok, options: Array.from({ length: 11 }, (_, i) => `P${i}`) }, NOW).ok);
    assert.ok(!parsePollInput({ ...ok, options: ["Ya", "ya"] }, NOW).ok);
    assert.ok(!parsePollInput({ ...ok, options: ["Ya", "x".repeat(101)] }, NOW).ok);
    assert.ok(!parsePollInput({ ...ok, options: "Ya,Tidak" }, NOW).ok);
    assert.ok(!parsePollInput({ ...ok, options: ["Ya", ""] }, NOW).ok, "pilihan kosong tak dihitung");
    assert.ok(parsePollInput({ ...ok, options: ["Ya", "  Tidak  ", "Ragu"] }, NOW).ok);
  });
  it("waktu: penutupan di masa depan, setelah mulai, maksimal 90 hari", () => {
    assert.ok(!parsePollInput({ ...ok, closesAt: "2026-10-31T10:00:00Z" }, NOW).ok);
    assert.ok(!parsePollInput({ ...ok, opensAt: "2026-11-09T10:00:00Z" }, NOW).ok);
    assert.ok(!parsePollInput({ ...ok, closesAt: "2027-03-01T10:00:00Z" }, NOW).ok);
    assert.ok(!parsePollInput({ ...ok, closesAt: "bukan-tanggal" }, NOW).ok);
    assert.ok(parsePollInput({ ...ok, opensAt: "2026-11-03T08:00:00Z" }, NOW).ok);
  });
  it("umur minimum 0-100 bulat; showLive harus boolean; bukan objek ditolak", () => {
    assert.ok(!parsePollInput({ ...ok, minAge: -1 }, NOW).ok);
    assert.ok(!parsePollInput({ ...ok, minAge: 17.5 }, NOW).ok);
    assert.ok(!parsePollInput({ ...ok, showLive: "ya" }, NOW).ok);
    assert.ok(!parsePollInput(null, NOW).ok);
    assert.ok(parsePollInput({ ...ok, minAge: 0, showLive: true }, NOW).ok);
  });
});

describe("pollStatus dan batas umur", () => {
  const base = { publishedAt: new Date("2026-11-01T00:00:00Z"), opensAt: new Date("2026-11-01T00:00:00Z"), closesAt: new Date("2026-11-05T00:00:00Z"), closedAt: null };
  it("DRAFT → SCHEDULED → OPEN → CLOSED, ditutup lebih awal menang", () => {
    assert.equal(pollStatus({ ...base, publishedAt: null }, NOW), "DRAFT");
    assert.equal(pollStatus({ ...base, opensAt: new Date("2026-11-02T00:00:00Z") }, NOW), "SCHEDULED");
    assert.equal(pollStatus(base, NOW), "OPEN");
    assert.equal(pollStatus({ ...base, closesAt: new Date("2026-11-01T03:00:00Z") }, NOW), "CLOSED", "tepat pada waktu tutup sudah tertutup");
    assert.equal(pollStatus({ ...base, closedAt: new Date("2026-11-01T02:00:00Z") }, NOW), "CLOSED");
  });
  it("batas lahir: yang genap 17 tahun hari ini boleh, besok belum", () => {
    const cutoff = birthCutoff(17, NOW);
    assert.equal(cutoff.toISOString().slice(0, 10), "2009-11-01");
    assert.ok(new Date("2009-11-01T00:00:00Z").getTime() <= cutoff.getTime());
    assert.ok(new Date("2009-11-02T00:00:00Z").getTime() > cutoff.getTime());
  });
});
