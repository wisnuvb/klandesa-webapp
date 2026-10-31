import assert from "node:assert/strict";
import test from "node:test";
import { groupThreadsByRecency, threadGroupKey } from "../lib/ai/thread-groups";

const NOW = new Date(2026, 10, 1, 12, 0, 0); // 1 Nov 2026, siang, waktu lokal
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h).toISOString();

test("threadGroupKey: hari yang sama, termasuk dini hari, = today", () => {
  assert.equal(threadGroupKey(at(2026, 10, 1, 0), NOW), "today");
  assert.equal(threadGroupKey(at(2026, 10, 1, 11), NOW), "today");
});

test("threadGroupKey: kemarin dihitung per hari kalender, bukan 24 jam", () => {
  assert.equal(threadGroupKey(at(2026, 9, 31, 23), NOW), "yesterday");
  assert.equal(threadGroupKey(at(2026, 9, 31, 1), NOW), "yesterday");
});

test("threadGroupKey: 2–7 hari = week, lebih dari itu = older", () => {
  assert.equal(threadGroupKey(at(2026, 9, 30), NOW), "week");
  assert.equal(threadGroupKey(at(2026, 9, 25), NOW), "week");
  assert.equal(threadGroupKey(at(2026, 9, 24), NOW), "older");
});

test("threadGroupKey: tanggal di masa depan dan tanggal rusak aman", () => {
  assert.equal(threadGroupKey(at(2026, 10, 3), NOW), "today");
  assert.equal(threadGroupKey("bukan-tanggal", NOW), "older");
});

test("groupThreadsByRecency: membuang kelompok kosong dan menjaga urutan", () => {
  const rows = [
    { id: 1, updatedAt: at(2026, 10, 1, 10) },
    { id: 2, updatedAt: at(2026, 10, 1, 8) },
    { id: 3, updatedAt: at(2026, 9, 1) },
  ];
  const groups = groupThreadsByRecency(rows, NOW);
  assert.deepEqual(groups.map((g) => g.label), ["Hari ini", "Lebih lama"]);
  assert.deepEqual(groups[0].items.map((r) => r.id), [1, 2]);
  assert.deepEqual(groupThreadsByRecency([], NOW), []);
});
