import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as jwt from "jsonwebtoken";
import {
  hashRefreshToken,
  newRefreshToken,
  readBearer,
  signMobileAccessToken,
  verifyMobileAccessToken,
} from "../lib/mobile/tokens.ts";
import { buildMobileConfig, compareVersions } from "../lib/mobile/version.ts";
import { checkMobileRateLimit } from "../lib/mobile/rate-limit.ts";
import { getResolvedAuthSecret } from "../lib/auth-secret.ts";

describe("mobile access token", () => {
  it("round-trip membawa klaim akun", () => {
    const t = signMobileAccessToken({ t: "staff", id: 7, villageId: 3, role: "secretary" });
    const c = verifyMobileAccessToken(t);
    assert.deepEqual(
      { t: c?.t, id: c?.id, villageId: c?.villageId, role: c?.role, sub: c?.sub },
      { t: "staff", id: 7, villageId: 3, role: "secretary", sub: "staff:7" },
    );
  });

  it("menolak token tanpa audience mobile (mis. JWT web 24 jam)", () => {
    const webToken = jwt.sign({ id: 7, villageId: 3, role: "admin" }, getResolvedAuthSecret());
    assert.equal(verifyMobileAccessToken(webToken), null);
  });

  it("menolak token kedaluwarsa dan sampah", () => {
    const old = signMobileAccessToken({ t: "staff", id: 1, villageId: 1, role: "staff" }, Math.floor(Date.now() / 1000) - 3600);
    assert.equal(verifyMobileAccessToken(old), null);
    assert.equal(verifyMobileAccessToken("bukan.token.jwt"), null);
  });

  it("menolak tipe akun tak dikenal", () => {
    const forged = jwt.sign({ t: "root", id: 1, villageId: 1, role: "x", sub: "root:1" }, getResolvedAuthSecret(), {
      audience: "klandesa-mobile",
      expiresIn: 60,
    });
    assert.equal(verifyMobileAccessToken(forged), null);
  });
});

describe("refresh token & header", () => {
  it("token acak unik, hash deterministik 64 hex", () => {
    const a = newRefreshToken();
    assert.notEqual(a, newRefreshToken());
    assert.match(hashRefreshToken(a), /^[0-9a-f]{64}$/);
    assert.equal(hashRefreshToken(a), hashRefreshToken(a));
  });
  it("readBearer", () => {
    assert.equal(readBearer("Bearer abc"), "abc");
    assert.equal(readBearer("bearer  abc "), "abc");
    assert.equal(readBearer("Basic abc"), null);
    assert.equal(readBearer(null), null);
  });
});

describe("force update config", () => {
  it("membandingkan versi", () => {
    assert.equal(compareVersions("2.0.0", "2.0"), 0);
    assert.equal(compareVersions("1.9.9", "2.0.0"), -1);
  });
  it("forceUpdate hanya bila klien di bawah minimum", () => {
    const env = { MOBILE_MIN_VERSION: "2.1.0", MOBILE_LATEST_VERSION: "2.2.0" };
    assert.equal(buildMobileConfig("2.0.0", env).forceUpdate, true);
    assert.equal(buildMobileConfig("2.1.0", env).forceUpdate, false);
    assert.equal(buildMobileConfig(null, env).forceUpdate, false);
    assert.equal(buildMobileConfig("1.0.0", {}).forceUpdate, false);
  });
});

describe("rate limit", () => {
  it("memblokir setelah batas dan reset setelah jendela", () => {
    const k = `t-${Math.random()}`;
    const o = { max: 2, windowMs: 1000 };
    assert.equal(checkMobileRateLimit(k, o, 0).ok, true);
    assert.equal(checkMobileRateLimit(k, o, 1).ok, true);
    assert.equal(checkMobileRateLimit(k, o, 2).ok, false);
    assert.equal(checkMobileRateLimit(k, o, 1500).ok, true);
  });
});

import { createHmac } from "crypto";
import { clientIp, limiterKey } from "../lib/mobile/rate-limit.ts";

describe("pemisahan kunci token mobile", () => {
  it("token bertanda AUTH_SECRET langsung (bukan kunci turunan) ditolak walau audience benar", () => {
    const direct = jwt.sign({ t: "staff", id: 1, villageId: 1, role: "admin", sub: "staff:1" }, getResolvedAuthSecret(), { audience: "klandesa-mobile", expiresIn: 60 });
    assert.equal(verifyMobileAccessToken(direct), null);
  });
  it("token bertanda kunci turunan yang benar diterima", () => {
    const derived = createHmac("sha256", getResolvedAuthSecret()).update("klandesa-mobile-access-token-v1").digest("hex");
    const ok = jwt.sign({ t: "staff", id: 1, villageId: 1, role: "admin", sub: "staff:1" }, derived, { audience: "klandesa-mobile", expiresIn: 60 });
    assert.equal(verifyMobileAccessToken(ok)?.id, 1);
  });
});

describe("IP klien & kunci limiter", () => {
  const req = (h: Record<string, string>) => new Request("https://x.test/", { headers: h });
  it("utamakan X-Real-IP; XFF ambil entri TERAKHIR (bukan yang bisa dipalsukan klien)", () => {
    assert.equal(clientIp(req({ "x-real-ip": "10.0.0.5", "x-forwarded-for": "1.2.3.4, 9.9.9.9" })), "10.0.0.5");
    assert.equal(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" })), "203.0.113.9");
    assert.equal(clientIp(req({})), "unknown");
  });
  it("kunci limiter pendek, stabil, dan tidak memuat data mentah", () => {
    const k = limiterKey("reg-nik", 3, "3201010101010001");
    assert.equal(k, limiterKey("reg-nik", 3, "3201010101010001"));
    assert.ok(!k.includes("3201"));
    assert.ok(k.length <= 120);
  });
});
