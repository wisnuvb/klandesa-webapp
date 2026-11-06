import { test } from "node:test";
import assert from "node:assert/strict";
import { isCrossSiteMutation } from "../app/api/admin/_auth";

const req = (method: string, headers: Record<string, string> = {}) => ({ method, headers: new Headers(headers) });

test("GET tidak pernah dianggap lintas-situs", () => {
  assert.equal(isCrossSiteMutation(req("GET", { "sec-fetch-site": "cross-site" })), false);
});

test("mutasi: Sec-Fetch-Site hanya same-origin/none yang lolos (same-site = sub-domain lain ditolak)", () => {
  assert.equal(isCrossSiteMutation(req("POST", { "sec-fetch-site": "same-origin" })), false);
  assert.equal(isCrossSiteMutation(req("PATCH", { "sec-fetch-site": "none" })), false);
  assert.equal(isCrossSiteMutation(req("POST", { "sec-fetch-site": "same-site" })), true);
  assert.equal(isCrossSiteMutation(req("DELETE", { "sec-fetch-site": "cross-site" })), true);
});

test("tanpa Sec-Fetch-Site: Origin harus sama dengan host; tanpa Origin lolos (klien non-peramban)", () => {
  assert.equal(isCrossSiteMutation(req("POST", { origin: "https://my.klandesa.com", host: "my.klandesa.com" })), false);
  assert.equal(isCrossSiteMutation(req("POST", { origin: "https://desa.klandesa.com", host: "my.klandesa.com" })), true);
  assert.equal(isCrossSiteMutation(req("POST", { origin: "https://evil.test", "x-forwarded-host": "my.klandesa.com" })), true);
  assert.equal(isCrossSiteMutation(req("POST", { origin: "bukan-url", host: "x" })), true);
  assert.equal(isCrossSiteMutation(req("POST", {})), false);
});
