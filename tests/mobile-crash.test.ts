import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { maskSensitive, sanitizeCrashReport } from "../lib/mobile/crash-logic.ts";

describe("laporan crash mobile", () => {
  it("menyamarkan NIK, nomor HP, email, dan token", () => {
    const out = maskSensitive("gagal NIK 3509012345678901 hp +62 812-3456-7890 budi@desa.id Bearer abc.def.ghi eyJhbGciOi.eyJzdWIi.sig");
    assert.ok(!/3509012345678901|812-3456|budi@|abc\.def|eyJhbGci/.test(out), out);
    assert.match(out, /\[angka\]/);
    assert.match(out, /\[email\]/);
    assert.match(out, /\[token\]/);
  });
  it("tidak menyamarkan angka pendek seperti kode status atau nomor baris", () => {
    assert.equal(maskSensitive("HTTP 500 di baris 1234:56"), "HTTP 500 di baris 1234:56");
  });
  it("menolak laporan tanpa pesan atau bukan objek", () => {
    for (const bad of [null, "x", [], {}, { message: "  " }, { message: 5 }]) assert.equal(sanitizeCrashReport(bad), null);
  });
  it("memotong field panjang dan mengisi bawaan", () => {
    const r = sanitizeCrashReport({ message: "x".repeat(1000), stack: "s".repeat(9000), fatal: "ya", appVersion: "2.0.0" })!;
    assert.equal(r.message.length, 400);
    assert.equal(r.stack?.length, 3000);
    assert.equal(r.fatal, false);
    assert.equal(r.platform, "?");
    assert.equal(r.screen, null);
  });
});
