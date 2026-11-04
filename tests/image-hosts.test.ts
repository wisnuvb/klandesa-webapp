import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildImageRemotePatterns } from "../lib/image-hosts.ts";

const hosts = (env: Record<string, string | undefined>) => buildImageRemotePatterns(env).map((p) => `${p.protocol}://${p.hostname}`);

describe("buildImageRemotePatterns", () => {
  it("tidak pernah mengizinkan semua host", () => {
    for (const env of [{}, { NEXT_IMAGE_REMOTE_HOSTS: "**" }, { NEXT_IMAGE_REMOTE_HOSTS: "*" }, { NEXT_IMAGE_REMOTE_HOSTS: "**." }]) {
      assert.ok(!buildImageRemotePatterns({ ...env, NODE_ENV: "production" }).some((p) => p.hostname === "**" || p.hostname === "*"));
    }
  });
  it("hanya https di produksi; http hanya localhost di non-produksi", () => {
    assert.ok(hosts({ NODE_ENV: "production" }).every((h) => h.startsWith("https://")));
    assert.ok(hosts({ NODE_ENV: "development" }).includes("http://localhost"));
  });
  it("memuat bucket Spaces dan host CDN/endpoint dari env", () => {
    const h = hosts({ NODE_ENV: "production", SPACES_CDN_BASE_URL: "https://assets.klandesa.example/", SPACES_ENDPOINT: "https://sgp1.digitaloceanspaces.com" });
    assert.ok(h.includes("https://**.digitaloceanspaces.com"));
    assert.ok(h.includes("https://assets.klandesa.example"));
    assert.ok(h.includes("https://sgp1.digitaloceanspaces.com"));
  });
  it("host tambahan lewat NEXT_IMAGE_REMOTE_HOSTS; entri tidak valid dibuang", () => {
    const h = hosts({ NODE_ENV: "production", NEXT_IMAGE_REMOTE_HOSTS: "cdn.contoh.id, **.contoh.net ,,bad host!,http://x" });
    assert.ok(h.includes("https://cdn.contoh.id") && h.includes("https://**.contoh.net"));
    assert.ok(!h.some((x) => x.includes("bad host") || x.includes("http://x")));
  });
  it("env yang rusak tidak menjatuhkan konfigurasi", () => {
    assert.doesNotThrow(() => buildImageRemotePatterns({ SPACES_CDN_BASE_URL: "::::", SPACES_ENDPOINT: "   " }));
  });
});
