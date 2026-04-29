import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyDnsTxtOwnership } from "@/app/api/website/domains/[id]/verify/route";

test("verifyDnsTxtOwnership returns error when DNS lookup fails", async () => {
  const r = await verifyDnsTxtOwnership({
    hostname: "example.com",
    token: "abc",
    resolveTxtRecordsFn: async () => ({ ok: false, error: "DNS gagal" }),
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, "error");
    assert.equal(r.error, "DNS gagal");
    assert.equal(r.name, "_klandesa-verify.example.com");
  }
});

test("verifyDnsTxtOwnership returns pending_verification when token not found", async () => {
  const r = await verifyDnsTxtOwnership({
    hostname: "example.com",
    token: "abc",
    resolveTxtRecordsFn: async () => ({ ok: true, records: ["zzz"] }),
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, "pending_verification");
    assert.equal(r.error, "Token TXT belum terdeteksi");
    assert.deepEqual(r.records, ["zzz"]);
  }
});

test("verifyDnsTxtOwnership returns ok when token is found", async () => {
  const r = await verifyDnsTxtOwnership({
    hostname: "example.com",
    token: "abc",
    resolveTxtRecordsFn: async () => ({ ok: true, records: ["abc", "zzz"] }),
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.name, "_klandesa-verify.example.com");
    assert.deepEqual(r.records, ["abc", "zzz"]);
  }
});

