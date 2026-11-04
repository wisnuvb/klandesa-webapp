import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderEmail } from "../lib/email/render";
import { inviteEmail, passwordChangedEmail, resetEmail, welcomeEmail } from "../lib/email/templates";
import { budgetAllows } from "../lib/email/send";
import { getAppOrigin } from "../lib/email/app-origin";
import { maskEmail } from "../lib/rbac/access-links";

describe("email transaksional (murni)", () => {
  it("semua teks dinamis di-escape (nama/desa berisi HTML tidak menyuntik tag)", () => {
    const evil = `<img src=x onerror=alert(1)>"&`;
    const html = inviteEmail({ name: evil, villageName: evil, invitedBy: evil, link: `https://a/?t="><script>`, expiresAt: new Date() }).html;
    assert.ok(!html.includes("<img"), html);
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;img"));
  });

  it("setiap templat punya versi teks polos berisi tautan dan tanpa tag HTML", () => {
    const link = "https://my.klandesa.com/auth/atur-sandi?token=abc";
    for (const m of [
      inviteEmail({ name: "Budi", villageName: "Sukamaju", link, expiresAt: new Date("2026-11-07T03:00:00Z") }),
      resetEmail({ name: "Budi", link, expiresAt: new Date("2026-11-05T03:00:00Z"), byAdmin: false }),
      resetEmail({ name: "Budi", link, expiresAt: new Date("2026-11-05T03:00:00Z"), byAdmin: true }),
    ]) {
      assert.ok(m.text.includes(link));
      assert.ok(m.html.includes(link));
      assert.ok(!/<[a-z]/i.test(m.text));
      assert.match(m.text, /WIB/);
    }
    assert.match(passwordChangedEmail({ name: "B", at: new Date(), loginUrl: "https://x" }).text, /bukan Anda/);
    assert.match(welcomeEmail({ name: "B", villageName: "V", trialDays: 14, loginUrl: "https://x", onboardingUrl: "https://y" }).text, /14 hari/);
    assert.match(renderEmail({ subject: "s", title: "t", paragraphs: ["p"] }).text, /Tim Klandesa/);
  });

  it("undangan tidak pernah memuat kata sandi", () => {
    const m = inviteEmail({ name: "Budi", villageName: "V", link: "https://x/?token=t", expiresAt: new Date() });
    assert.ok(!/kata sandi (sementara|Anda adalah)/i.test(m.text));
  });

  it("anggaran harian: email biasa berhenti di batas, kritis punya ruang cadangan", () => {
    assert.equal(budgetAllows(249, "welcome", 250), true);
    assert.equal(budgetAllows(250, "welcome", 250), false);
    assert.equal(budgetAllows(250, "password-changed", 250), false);
    assert.equal(budgetAllows(250, "invite", 250), true);
    assert.equal(budgetAllows(289, "reset", 250), true);
    assert.equal(budgetAllows(290, "reset", 250), false);
  });

  it("cadangan kritis dibagi: tindakan admin hanya separuh, sisanya untuk alur publik (satu desa tak bisa menghabiskan jalur pemulihan)", () => {
    assert.equal(budgetAllows(269, "invite", 250, "admin"), true);
    assert.equal(budgetAllows(270, "invite", 250, "admin"), false);
    assert.equal(budgetAllows(270, "reset", 250, "public"), true);
    assert.equal(budgetAllows(290, "reset", 250, "public"), false);
    assert.equal(budgetAllows(250, "welcome", 250, "admin"), false);
  });

  it("origin tautan dari konfigurasi (my.<domain>), bukan dari header apa pun", () => {
    const save = { a: process.env.APP_PUBLIC_URL, b: process.env.NEXT_PUBLIC_SITE_URL };
    try {
      delete process.env.APP_PUBLIC_URL;
      process.env.NEXT_PUBLIC_SITE_URL = "https://klandesa.com";
      assert.equal(getAppOrigin(), "https://my.klandesa.com");
      process.env.NEXT_PUBLIC_SITE_URL = "https://www.klandesa.com";
      assert.equal(getAppOrigin(), "https://my.klandesa.com");
      process.env.APP_PUBLIC_URL = "https://app.contoh.id/path?x=1";
      assert.equal(getAppOrigin(), "https://app.contoh.id");
      process.env.APP_PUBLIC_URL = "bukan url";
      process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:2042";
      assert.equal(getAppOrigin(), "http://localhost:2042");
    } finally {
      if (save.a === undefined) delete process.env.APP_PUBLIC_URL; else process.env.APP_PUBLIC_URL = save.a;
      if (save.b === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = save.b;
    }
  });

  it("maskEmail menyamarkan bagian lokal", () => {
    assert.equal(maskEmail("budi@desa.id").endsWith("@desa.id"), true);
    assert.ok(!maskEmail("budi@desa.id").includes("udi@"));
  });
});
