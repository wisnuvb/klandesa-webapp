import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getSubscriptionDaysRemaining,
  getSubscriptionPhaseInfo,
  isVillageSubscriptionReadable,
  isVillageSubscriptionWritable,
  resolveSubscriptionPhase,
} from "../lib/subscription.ts";

const MS_DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 5, 18, 12, 0, 0);

describe("subscription phase machine", () => {
  it("trial aktif → readable & writable", () => {
    const village = {
      subscriptionStatus: "trial",
      subscriptionExpiry: new Date(now + 5 * MS_DAY),
    };
    assert.equal(resolveSubscriptionPhase(village, now), "trial");
    assert.equal(isVillageSubscriptionReadable(village, now), true);
    assert.equal(isVillageSubscriptionWritable(village, now), true);
  });

  it("trial expired → grace phase", () => {
    const village = {
      subscriptionStatus: "trial",
      subscriptionExpiry: new Date(now - 1),
    };
    assert.equal(resolveSubscriptionPhase(village, now), "grace");
    assert.equal(isVillageSubscriptionReadable(village, now), true);
    assert.equal(isVillageSubscriptionWritable(village, now), false);
  });

  it("grace expired → inactive", () => {
    const village = {
      subscriptionStatus: "grace",
      subscriptionExpiry: new Date(now - 1),
    };
    assert.equal(resolveSubscriptionPhase(village, now), "inactive");
    assert.equal(isVillageSubscriptionReadable(village, now), false);
  });

  it("active paid → readable & writable", () => {
    const village = {
      subscriptionStatus: "active",
      subscriptionExpiry: new Date(now + 30 * MS_DAY),
    };
    const info = getSubscriptionPhaseInfo(village, now);
    assert.equal(info.phase, "active");
    assert.equal(info.writable, true);
    assert.equal(getSubscriptionDaysRemaining(village, now), 30);
  });
});
