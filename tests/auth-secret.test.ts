import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { getResolvedAuthSecret, requireAuthSecret } from "../lib/auth-secret.ts";
import { generateTokens, verifyToken } from "../lib/auth.ts";

const saved = { AUTH_SECRET: process.env.AUTH_SECRET, NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET, NODE_ENV: process.env.NODE_ENV };
const env = process.env as Record<string, string | undefined>;

function setEnv(v: Partial<typeof saved>) {
  for (const k of Object.keys(saved) as (keyof typeof saved)[]) {
    if (k in v) {
      if (v[k] === undefined) delete env[k];
      else env[k] = v[k];
    }
  }
}
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
});

const payload = { id: 1, email: "a@b.test", role: "admin", villageId: 1 };

describe("secret autentikasi gagal tertutup di produksi", () => {
  it("produksi tanpa AUTH_SECRET/NEXTAUTH_SECRET: kosong dan requireAuthSecret melempar", () => {
    setEnv({ NODE_ENV: "production", AUTH_SECRET: undefined, NEXTAUTH_SECRET: undefined });
    assert.equal(getResolvedAuthSecret(), "");
    assert.throws(() => requireAuthSecret(), /AUTH_SECRET/);
  });
  it("produksi tanpa secret: tidak bisa menerbitkan token, dan token apa pun (termasuk yang memakai kunci lama) ditolak", () => {
    // Token yang ditandatangani dengan fallback lama harus tidak lagi diterima.
    setEnv({ NODE_ENV: "development", AUTH_SECRET: "your-secret-key", NEXTAUTH_SECRET: undefined });
    const legacy = generateTokens(payload).accessToken;
    setEnv({ NODE_ENV: "production", AUTH_SECRET: undefined, NEXTAUTH_SECRET: undefined });
    assert.throws(() => generateTokens(payload), /AUTH_SECRET/);
    assert.equal(verifyToken(legacy), null);
  });
  it("produksi dengan secret: token round-trip, dan secret lain menolak", () => {
    setEnv({ NODE_ENV: "production", AUTH_SECRET: "x".repeat(40), NEXTAUTH_SECRET: undefined });
    const { accessToken } = generateTokens(payload);
    assert.equal((verifyToken(accessToken) as { id: number }).id, 1);
    setEnv({ AUTH_SECRET: "y".repeat(40) });
    assert.equal(verifyToken(accessToken), null);
  });
  it("NEXTAUTH_SECRET dipakai bila AUTH_SECRET kosong; AUTH_SECRET diutamakan", () => {
    setEnv({ NODE_ENV: "production", AUTH_SECRET: undefined, NEXTAUTH_SECRET: "n".repeat(40) });
    assert.equal(requireAuthSecret(), "n".repeat(40));
    setEnv({ AUTH_SECRET: "a".repeat(40) });
    assert.equal(requireAuthSecret(), "a".repeat(40));
  });
  it("luar produksi memakai kunci dev statis agar lokal tetap jalan", () => {
    setEnv({ NODE_ENV: "development", AUTH_SECRET: undefined, NEXTAUTH_SECRET: undefined });
    assert.ok(requireAuthSecret().length >= 32);
    assert.notEqual(requireAuthSecret(), "your-secret-key");
  });
});
