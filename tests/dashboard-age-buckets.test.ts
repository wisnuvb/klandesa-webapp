import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AGE_BUCKETS, ageBucketRanges } from "../lib/dashboard/age-buckets.ts";
import { calculateAge } from "../utils/date-utils.tsx";

/** Pengelompokan lama: usia dari calculateAge. */
function bucketByAge(birth: Date): string | null {
  const age = calculateAge(birth);
  return AGE_BUCKETS.find((b) => age >= b.min && age <= b.max)?.name ?? null;
}

/** Pengelompokan baru: rentang tanggal lahir (yang dipakai di SQL). */
function bucketByRange(birth: Date, now: Date): string | null {
  return ageBucketRanges(now).find((r) => birth <= r.bornOnOrBefore && birth > r.bornAfter)?.name ?? null;
}

describe("kelompok usia dashboard (SQL) setara dengan calculateAge", () => {
  it("sama untuk tanggal lahir di sekitar batas tiap kelompok, termasuk hari ulang tahun", () => {
    const now = new Date();
    const births: Date[] = [];
    for (const years of [0, 1, 17, 18, 19, 30, 31, 45, 46, 60, 61, 90, 120]) {
      for (const dayOffset of [-2, -1, 0, 1, 2]) {
        // Tanggal lahir disimpan tanpa jam (tengah malam).
        births.push(new Date(now.getFullYear() - years, now.getMonth(), now.getDate() + dayOffset));
      }
    }
    for (const b of births) {
      assert.equal(bucketByRange(b, now), bucketByAge(b), b.toISOString());
    }
  });

  it("tanggal lahir di masa depan tidak masuk kelompok mana pun", () => {
    const now = new Date();
    const future = new Date(now.getFullYear() + 1, 0, 1);
    assert.equal(bucketByRange(future, now), null);
    assert.equal(bucketByAge(future), null);
  });

  it("rentang tidak saling tumpang tindih", () => {
    const now = new Date();
    for (let y = 0; y < 100; y++) {
      const birth = new Date(now.getFullYear() - y, 5, 15);
      const hits = ageBucketRanges(now).filter((r) => birth <= r.bornOnOrBefore && birth > r.bornAfter);
      assert.ok(hits.length <= 1, `usia ${y}`);
    }
  });
});
