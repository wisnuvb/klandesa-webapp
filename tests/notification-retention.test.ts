import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NOTIFICATION_RETENTION, notificationCutoffs } from "../lib/notifications/retention-policy.ts";
import { resolveApiPermission } from "../lib/permissions/api-route-map.ts";
import { roleCan } from "../lib/permissions/matrix.ts";
import { isSubscriptionExemptPath } from "../lib/subscription.ts";

const DAY = 24 * 60 * 60 * 1000;

describe("batas simpan notifikasi", () => {
  const now = new Date("2026-10-30T00:00:00Z");
  it("jendela tampil lebih pendek dari batas hapus permanen", () => {
    const c = notificationCutoffs(now);
    assert.equal(now.getTime() - c.visibleSince.getTime(), NOTIFICATION_RETENTION.VISIBLE_DAYS * DAY);
    assert.equal(now.getTime() - c.purgeBefore.getTime(), NOTIFICATION_RETENTION.PURGE_DAYS * DAY);
    assert.ok(c.purgeBefore < c.visibleSince, "yang dihapus permanen harus sudah tidak tampil");
    assert.ok(c.mobileReadPurgeBefore >= c.purgeBefore, "yang sudah dibaca tidak disimpan lebih lama dari yang belum");
  });
});

describe("izin tandai notifikasi dibaca", () => {
  it("POST /read hanya butuh izin baca statistik, bukan create", () => {
    assert.deepEqual(resolveApiPermission("/api/notifications/read", "POST"), { resource: "statistics", action: "read" });
    assert.deepEqual(resolveApiPermission("/api/notifications", "GET"), { resource: "statistics", action: "read" });
  });
  it("semua peran desa yang bisa membaca statistik lolos", () => {
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) {
      assert.equal(roleCan("statistics", "read", role), true, role);
    }
  });
  it("tidak dibatasi mode baca saja (trial/grace)", () => {
    assert.equal(isSubscriptionExemptPath("/api/notifications/read"), true);
    assert.equal(isSubscriptionExemptPath("/api/notifications"), false);
  });
});
