import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildReminderContent,
  pickArsipReminder,
  pickBucket,
  pickSubscriptionReminder,
} from "../lib/billing/reminders.ts";

const DAY = 86_400_000;
const now = new Date("2026-11-10T03:00:00.000Z");
const inDays = (d: number) => new Date(now.getTime() + d * DAY);

describe("pemilihan bucket", () => {
  it("memilih bucket terkecil yang masih mencakup sisa hari", () => {
    assert.equal(pickBucket(5, [1, 7, 30]), 7);
    assert.equal(pickBucket(7, [1, 7, 30]), 7);
    assert.equal(pickBucket(8, [1, 7, 30]), 30);
    assert.equal(pickBucket(1, [1, 7, 30]), 1);
    assert.equal(pickBucket(31, [1, 7, 30]), null);
  });
});

describe("pengingat langganan desa", () => {
  it("trial: 7/3/1 hari, lalu satu pemberitahuan berakhir", () => {
    assert.equal(pickSubscriptionReminder({ status: "trial", expiry: inDays(10), now }), null);
    assert.equal(pickSubscriptionReminder({ status: "trial", expiry: inDays(6.5), now })?.sourceKey, "trial-d7");
    assert.equal(pickSubscriptionReminder({ status: "trial", expiry: inDays(3), now })?.sourceKey, "trial-d3");
    assert.equal(pickSubscriptionReminder({ status: "trial", expiry: inDays(0.4), now })?.sourceKey, "trial-d1");
    assert.equal(pickSubscriptionReminder({ status: "trial", expiry: inDays(-1), now })?.sourceKey, "trial-ended");
    assert.equal(pickSubscriptionReminder({ status: "trial", expiry: inDays(-10), now }), null);
    assert.equal(pickSubscriptionReminder({ status: "grace", expiry: inDays(4), now })?.sourceKey, "trial-ended");
  });
  it("berbayar: 30/7/1 hari dengan tanggal berakhir di kunci agar tiap siklus perpanjangan dikirim ulang", () => {
    const a = pickSubscriptionReminder({ status: "active", expiry: inDays(29), now });
    assert.equal(a?.audience, "paid");
    assert.match(a!.sourceKey, /^paid-d30-2026-12-09$/);
    assert.match(pickSubscriptionReminder({ status: "active", expiry: inDays(5), now })!.sourceKey, /^paid-d7-/);
    assert.equal(pickSubscriptionReminder({ status: "active", expiry: inDays(40), now }), null);
    // Setahun kemudian (siklus berikutnya) bucket yang sama harus punya kunci berbeda, supaya tetap dikirim.
    const nextYear = new Date(now.getTime() + 365 * DAY);
    const first = pickSubscriptionReminder({ status: "active", expiry: inDays(5), now })!;
    const second = pickSubscriptionReminder({ status: "active", expiry: new Date(nextYear.getTime() + 5 * DAY), now: nextYear })!;
    assert.match(first.sourceKey, /^paid-d7-/);
    assert.match(second.sourceKey, /^paid-d7-/);
    assert.notEqual(first.sourceKey, second.sourceKey);
  });
  it("berbayar yang baru berakhir (maks 3 hari) diberi tahu sekali; yang sudah lama tidak", () => {
    assert.match(pickSubscriptionReminder({ status: "inactive", expiry: inDays(-2), now })!.sourceKey, /^paid-ended-/);
    assert.match(pickSubscriptionReminder({ status: "active", expiry: inDays(-1), now })!.sourceKey, /^paid-ended-/);
    assert.equal(pickSubscriptionReminder({ status: "inactive", expiry: inDays(-4), now }), null);
  });
  it("tanpa masa berlaku atau status lain: tidak ada pengingat", () => {
    assert.equal(pickSubscriptionReminder({ status: "active", expiry: null, now }), null);
    assert.equal(pickSubscriptionReminder({ status: "cancelled", expiry: inDays(3), now }), null);
    assert.equal(pickSubscriptionReminder({ status: "inactive", expiry: null, now }), null);
  });
});

describe("pengingat add-on arsip", () => {
  it("7 dan 1 hari sebelum berakhir, lalu pemberitahuan berakhir", () => {
    assert.match(pickArsipReminder({ expiry: inDays(6), now })!.sourceKey, /^arsip-d7-/);
    assert.match(pickArsipReminder({ expiry: inDays(0.5), now })!.sourceKey, /^arsip-d1-/);
    assert.equal(pickArsipReminder({ expiry: inDays(20), now }), null);
    assert.match(pickArsipReminder({ expiry: inDays(-1), now })!.sourceKey, /^arsip-ended-/);
    assert.equal(pickArsipReminder({ expiry: inDays(-9), now }), null);
  });
});

describe("isi pengingat", () => {
  const url = "https://klandesa.com/billing";
  it("Paket Lengkap menyebut harga perpanjangan; paket lama tidak mengarang harga", () => {
    const plan = pickSubscriptionReminder({ status: "active", expiry: inDays(6), now })!;
    const lengkap = buildReminderContent({ plan, villageName: "Karanganyar", subscriptionPlan: "lengkap", billingUrl: url });
    assert.match(lengkap.body, /Rp\s?100\.000/);
    assert.match(lengkap.subject, /Karanganyar/);
    const lama = buildReminderContent({ plan, villageName: "Karanganyar", subscriptionPlan: "starter", billingUrl: url });
    assert.doesNotMatch(lama.body, /Rp\s?100\.000/);
  });
  it("trial menyebut harga paket dan 12 bulan pertama", () => {
    const plan = pickSubscriptionReminder({ status: "trial", expiry: inDays(0.4), now })!;
    const c = buildReminderContent({ plan, villageName: "X", subscriptionPlan: "lengkap", billingUrl: url });
    assert.match(c.title, /besok/);
    assert.match(c.body, /Rp\s?3\.500\.000/);
    assert.match(c.body, /12 bulan/);
  });
  it("arsip menyebut kapasitas, kuota dasar, dan bahwa file tidak dihapus", () => {
    const plan = pickArsipReminder({ expiry: inDays(6), now })!;
    const c = buildReminderContent({ plan, villageName: "X", subscriptionPlan: "lengkap", billingUrl: url, arsipGb: 20, arsipBaseGb: 5 });
    assert.match(c.body, /20 GB/);
    assert.match(c.body, /5 GB/);
    assert.match(c.body, /tidak dihapus/);
  });
  it("nama desa di-escape pada HTML (tidak bisa menyisipkan markup)", () => {
    const plan = pickSubscriptionReminder({ status: "active", expiry: inDays(6), now })!;
    const c = buildReminderContent({ plan, villageName: '<script>alert(1)</script>"', subscriptionPlan: "lengkap", billingUrl: url });
    assert.doesNotMatch(c.html, /<script>/);
    assert.match(c.html, /&lt;script&gt;/);
    assert.match(c.html, new RegExp(url.replace(/[/.]/g, "\\$&")));
  });
});
