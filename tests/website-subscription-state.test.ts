import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isWebsiteSubscriptionLive,
  nextWebsiteExpiry,
} from "@/lib/website-engine/subscription-state";

const NOW = new Date("2026-10-30T00:00:00.000Z");

test("langganan aktif dan belum berakhir = tayang", () => {
  assert.equal(
    isWebsiteSubscriptionLive({ isActive: true, expiryDate: new Date("2026-11-01") }, NOW),
    true,
  );
});

test("langganan yang sudah melewati tanggal berakhir tidak tayang", () => {
  assert.equal(
    isWebsiteSubscriptionLive({ isActive: true, expiryDate: new Date("2026-10-29") }, NOW),
    false,
  );
});

test("tepat di waktu berakhir dianggap tidak tayang", () => {
  assert.equal(isWebsiteSubscriptionLive({ isActive: true, expiryDate: NOW }, NOW), false);
});

test("langganan dinonaktifkan atau tidak ada = tidak tayang", () => {
  assert.equal(
    isWebsiteSubscriptionLive({ isActive: false, expiryDate: new Date("2027-01-01") }, NOW),
    false,
  );
  assert.equal(isWebsiteSubscriptionLive(null, NOW), false);
});

test("perpanjangan template sama menyambung sisa masa aktif", () => {
  const e = nextWebsiteExpiry({ now: NOW, currentExpiry: new Date("2026-12-15T00:00:00.000Z"), sameTemplate: true });
  assert.equal(e.toISOString(), "2027-12-15T00:00:00.000Z");
});

test("perpanjangan setelah kedaluwarsa dihitung dari hari pembayaran", () => {
  const e = nextWebsiteExpiry({ now: NOW, currentExpiry: new Date("2026-09-01T00:00:00.000Z"), sameTemplate: true });
  assert.equal(e.toISOString(), "2027-10-30T00:00:00.000Z");
});

test("ganti template atau aktivasi baru selalu 1 tahun dari sekarang", () => {
  const e = nextWebsiteExpiry({ now: NOW, currentExpiry: new Date("2026-12-15T00:00:00.000Z"), sameTemplate: false });
  assert.equal(e.toISOString(), "2027-10-30T00:00:00.000Z");
  const f = nextWebsiteExpiry({ now: NOW, currentExpiry: null, sameTemplate: false });
  assert.equal(f.toISOString(), "2027-10-30T00:00:00.000Z");
});

test("nextWebsiteExpiry tidak mengubah objek tanggal masukan", () => {
  const cur = new Date("2026-12-15T00:00:00.000Z");
  nextWebsiteExpiry({ now: NOW, currentExpiry: cur, sameTemplate: true });
  assert.equal(cur.toISOString(), "2026-12-15T00:00:00.000Z");
});
