import { test } from "node:test";
import assert from "node:assert/strict";
import { isCountablePageView, jakartaDay } from "@/lib/website-engine/page-views";

const CHROME =
  "Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";

test("browser biasa dihitung", () => {
  assert.equal(isCountablePageView({ userAgent: CHROME }), true);
});

test("bot, crawler, dan pratinjau tautan tidak dihitung", () => {
  for (const ua of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "WhatsApp/2.23.20 A",
    "facebookexternalhit/1.1",
    "curl/8.4.0",
    "Mozilla/5.0 HeadlessChrome/120.0",
    "Lighthouse",
  ]) {
    assert.equal(isCountablePageView({ userAgent: ua }), false, ua);
  }
});

test("tanpa user-agent tidak dihitung", () => {
  assert.equal(isCountablePageView({ userAgent: null }), false);
  assert.equal(isCountablePageView({ userAgent: "  " }), false);
});

test("prefetch tidak dihitung", () => {
  assert.equal(isCountablePageView({ userAgent: CHROME, purpose: "prefetch" }), false);
  assert.equal(isCountablePageView({ userAgent: CHROME, nextRouterPrefetch: "1" }), false);
});

test("jakartaDay memakai hari kalender WIB", () => {
  // 17:30 UTC tgl 29 = 00:30 WIB tgl 30
  assert.equal(jakartaDay(new Date("2026-10-29T17:30:00Z")).toISOString(), "2026-10-30T00:00:00.000Z");
  // 16:59 UTC tgl 29 = 23:59 WIB tgl 29
  assert.equal(jakartaDay(new Date("2026-10-29T16:59:00Z")).toISOString(), "2026-10-29T00:00:00.000Z");
});
