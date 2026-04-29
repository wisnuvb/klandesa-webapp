import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveTxtRecords } from "@/lib/domain/doh";

test("resolveTxtRecords parses TXT answers and strips quotes", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        Status: 0,
        Answer: [{ data: '"token-1"' }, { data: '"part1" "part2"' }],
      }),
      { status: 200, headers: { "content-type": "application/dns-json" } },
    );
  }) as unknown as typeof fetch;

  try {
    const r = await resolveTxtRecords("_klandesa-verify.example.com");
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.records, ["token-1", "part1part2"]);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
