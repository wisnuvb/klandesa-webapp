import assert from "node:assert/strict";
import test from "node:test";
import { SUGGESTION_CATEGORIES, SUGGESTION_POOL, pickSuggestions } from "../lib/ai/suggestions";

/** Pembangkit acak deterministik (mulberry32) agar tes stabil. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("kumpulan: teks unik dan tiap kategori punya minimal 2 butir", () => {
  const texts = SUGGESTION_POOL.map((s) => s.text);
  assert.equal(new Set(texts).size, texts.length);
  for (const cat of Object.keys(SUGGESTION_CATEGORIES)) {
    assert.ok(SUGGESTION_POOL.filter((s) => s.category === cat).length >= 2, `kategori ${cat} < 2 butir`);
  }
});

test("pickSuggestions: jumlah sesuai, kategori berbeda, berasal dari kumpulan", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const picked = pickSuggestions({ count: 4, rng: seeded(seed) });
    assert.equal(picked.length, 4);
    assert.equal(new Set(picked.map((p) => p.category)).size, 4);
    for (const p of picked) assert.ok(SUGGESTION_POOL.includes(p));
  }
});

test("pickSuggestions: seed sama menghasilkan pilihan sama; seed berbeda bervariasi", () => {
  const a = pickSuggestions({ rng: seeded(7) }).map((p) => p.text);
  const b = pickSuggestions({ rng: seeded(7) }).map((p) => p.text);
  assert.deepEqual(a, b);
  const variants = new Set<string>();
  for (let seed = 1; seed <= 30; seed++) variants.add(pickSuggestions({ rng: seeded(seed) }).map((p) => p.text).join("|"));
  assert.ok(variants.size > 10, "pilihan terlalu seragam");
});

test("pickSuggestions: exclude dihindari karena tiap kategori punya alternatif", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const first = pickSuggestions({ rng: seeded(seed) }).map((p) => p.text);
    const next = pickSuggestions({ rng: seeded(seed + 1000), exclude: first }).map((p) => p.text);
    for (const t of next) assert.ok(!first.includes(t), `"${t}" diulang`);
  }
});

test("pickSuggestions: count melebihi jumlah kategori dibatasi", () => {
  const picked = pickSuggestions({ count: 99, rng: seeded(3) });
  assert.equal(picked.length, Object.keys(SUGGESTION_CATEGORIES).length);
});
