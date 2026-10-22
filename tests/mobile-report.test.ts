import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildReportTitle, describeReport, isOwnReportPhotoUrl, isReportCategory, parseImages, validCoordinates,
} from "../lib/mobile/report-logic.ts";

describe("pengaduan warga", () => {
  it("kategori valid dan judul otomatis dipotong", () => {
    assert.equal(isReportCategory("lampu"), true);
    assert.equal(isReportCategory("hack"), false);
    assert.equal(buildReportTitle("lampu", "Lampu   depan balai\nmati"), "Lampu jalan: Lampu depan balai mati");
    assert.ok(buildReportTitle("jalan", "x".repeat(300)).length <= 120);
  });
  it("status DB → bahasa warga", () => {
    assert.equal(describeReport("PENDING", false).stage, "sent");
    assert.deepEqual(describeReport("PROCESS", false).steps.map((s) => s.state), ["done", "current", "todo"]);
    assert.deepEqual(describeReport("DONE", false).steps.map((s) => s.state), ["done", "done", "done"]);
    assert.equal(describeReport("REJECT", true).steps[1]!.state, "failed");
    assert.equal(describeReport("DRAFT", false).stage, "sent");
  });
  it("hanya menerima URL foto unggahan mobile desa sendiri", () => {
    const cdn = "https://bucket.sgp1.digitaloceanspaces.com/";
    const ok = "https://bucket.sgp1.digitaloceanspaces.com/villages/ABC/mobile-reports/2026/10/u.jpg";
    assert.equal(isOwnReportPhotoUrl(ok, cdn, "ABC"), true);
    assert.equal(isOwnReportPhotoUrl(ok, cdn, "XYZ"), false);
    assert.equal(isOwnReportPhotoUrl("https://evil.test/a.jpg", cdn, "ABC"), false);
    assert.equal(isOwnReportPhotoUrl(ok + ",http://x", cdn, "ABC"), false);
    assert.equal(isOwnReportPhotoUrl(ok.replace("2026/10", "../.."), cdn, "ABC"), false);
    assert.equal(isOwnReportPhotoUrl(42, cdn, "ABC"), false);
  });
  it("parse gambar & koordinat", () => {
    assert.deepEqual(parseImages(" a , b ,,"), ["a", "b"]);
    assert.deepEqual(parseImages(null), []);
    assert.deepEqual(validCoordinates(-6.2000001, 106.8), { lat: -6.2, lng: 106.8 });
    assert.equal(validCoordinates(91, 0), null);
    assert.equal(validCoordinates("1", 2), null);
    assert.equal(validCoordinates(NaN, 2), null);
  });
});
