import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isValidCronAuth } from "../lib/regional-news/cron-auth.ts";
import { buildAuditEntry } from "../lib/mobile/audit-actor.ts";

describe("otorisasi cron", () => {
  it("menerima Bearer yang tepat (spasi tepi diabaikan)", () => {
    assert.equal(isValidCronAuth("Bearer rahasia-123", "rahasia-123"), true);
    assert.equal(isValidCronAuth("  Bearer rahasia-123 ", "rahasia-123"), true);
  });
  it("menolak salah, kosong, beda panjang, dan tanpa secret", () => {
    for (const h of ["Bearer salah", "rahasia-123", "Bearer rahasia-1234", "Bearer ", "", null, undefined]) {
      assert.equal(isValidCronAuth(h as string | null, "rahasia-123"), false, String(h));
    }
    assert.equal(isValidCronAuth("Bearer x", null), false);
    assert.equal(isValidCronAuth("Bearer ", ""), false);
  });
});

describe("entri audit pelaku RT/staf", () => {
  const hdr = { forwardedFor: " 1.2.3.4 , 10.0.0.1", userAgent: "ua" };
  it("staf: userId terisi, tanpa actor", () => {
    const e = buildAuditEntry(7, { type: "staff", userId: 42 }, hdr, "x", "fee_payments", 5n, { n: 1n });
    assert.equal(e.userId, 42);
    assert.equal(e.entityId, "5");
    assert.deepEqual(e.changes, { n: "1" });
    assert.equal(e.ipAddress, "1.2.3.4");
    assert.deepEqual(e.metadata, { via: "mobile" });
  });
  it("RT: userId kosong, pelaku di metadata.actor", () => {
    const e = buildAuditEntry(7, { type: "rt", residentId: 9, name: "Pak RT", rt: "3", rw: "1" }, {}, "rt_approve", "mail_requests", 11);
    assert.equal(e.userId, null);
    assert.deepEqual(e.metadata, { via: "mobile", actor: { type: "rt", residentId: 9, name: "Pak RT", rt: "3", rw: "1" } });
    assert.equal(e.ipAddress, null);
    assert.equal(e.changes, undefined);
  });
});
