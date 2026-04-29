import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDnsTxtVerificationName,
  generateVerificationToken,
  normalizeHostname,
  validateHostnameFqdn,
  validateSubdomainLabel,
} from "@/lib/domain/validators";

test("validateSubdomainLabel accepts valid label", () => {
  const r = validateSubdomainLabel("desa-001");
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value, "desa-001");
});

test("validateSubdomainLabel rejects reserved label", () => {
  const r = validateSubdomainLabel("app");
  assert.equal(r.ok, false);
});

test("validateHostnameFqdn normalizes and validates", () => {
  const r = validateHostnameFqdn("Example.COM");
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value, "example.com");
});

test("normalizeHostname strips port", () => {
  assert.equal(normalizeHostname("Example.com:3000"), "example.com");
});

test("buildDnsTxtVerificationName prefixes correctly", () => {
  assert.equal(
    buildDnsTxtVerificationName("example.com"),
    "_klandesa-verify.example.com",
  );
});

test("generateVerificationToken returns hex", () => {
  const t = generateVerificationToken();
  assert.equal(typeof t, "string");
  assert.ok(/^[0-9a-f]+$/.test(t));
  assert.ok(t.length >= 20);
});
