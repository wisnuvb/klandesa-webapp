import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeAccountability, median, splitWindows, trendOf, type MailRow, type ReportRow,
} from "../lib/mobile/accountability-logic.ts";

const NOW = new Date("2026-10-24T00:00:00Z");
const H = 3600 * 1000;
const ago = (h: number) => new Date(NOW.getTime() - h * H);
const mail = (reqAgoH: number, tookH: number | null, status = "approved", channel = "mobile"): MailRow => ({
  status: tookH === null ? "pending" : status, channel, requestDate: ago(reqAgoH), processedDate: tookH === null ? null : new Date(ago(reqAgoH).getTime() + tookH * H),
});
const report = (createdAgoH: number, respondedAfterH: number | null, extra: Partial<ReportRow> = {}): ReportRow => ({
  status: "PENDING", createdAt: ago(createdAgoH), firstResponseAt: respondedAfterH === null ? null : new Date(ago(createdAgoH).getTime() + respondedAfterH * H), resolvedFeedback: null, ...extra,
});
const empty = { aliveResidents: 0, activeAccounts: 0, now: NOW };

describe("median", () => {
  it("ganjil, genap, kosong", () => {
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([1, 2, 3, 4]), 2.5);
    assert.equal(median([]), null);
  });
});

describe("rapor surat", () => {
  it("sampel kurang dari 5: persen dan median disembunyikan (null), bukan 0", () => {
    const a = computeAccountability({ ...empty, mail: [mail(100, 10), mail(100, 20)], reports: [] });
    assert.equal(a.mail.processed, 2);
    assert.equal(a.mail.medianHours, null);
    assert.equal(a.mail.withinSlaPercent, null);
    assert.equal(a.mail.viaAppPercent, null);
  });
  it("median jam, persen dalam 48 jam, persen lewat app", () => {
    const rows = [mail(500, 10), mail(500, 20), mail(500, 30), mail(500, 60, "approved", "kiosk"), mail(500, 100, "rejected", "portal")];
    const a = computeAccountability({ ...empty, mail: rows, reports: [] });
    assert.equal(a.mail.medianHours, 30);
    assert.equal(a.mail.withinSlaPercent, 60);
    assert.equal(a.mail.viaAppPercent, 60);
  });
  it("antrean: jumlah menunggu dan yang paling lama", () => {
    const a = computeAccountability({ ...empty, mail: [mail(5, null), mail(30.55, null), mail(10, 2)], reports: [] });
    assert.equal(a.mail.pending, 2);
    assert.equal(a.mail.oldestPendingHours, 30.6);
  });
  it("tanggal tidak masuk akal (diproses sebelum diajukan) tidak ikut median", () => {
    const bad: MailRow = { status: "approved", channel: "mobile", requestDate: ago(10), processedDate: ago(20) };
    assert.equal(computeAccountability({ ...empty, mail: [bad], reports: [] }).mail.processed, 0);
  });
});

describe("rapor pengaduan", () => {
  it("yang baru masuk (belum 72 jam) dan belum ditanggapi tidak dihitung terlambat", () => {
    const a = computeAccountability({ ...empty, mail: [], reports: [report(10, null), report(20, null)] });
    assert.equal(a.reports.eligible, 0);
    assert.equal(a.reports.respondedInTimePercent, null);
  });
  it("persen ditanggapi ≤ 72 jam: terlambat dan belum ditanggapi sama-sama menurunkan angka", () => {
    const rows = [report(200, 10), report(200, 70), report(200, 100), report(200, null), report(200, 1), report(5, 1)];
    const a = computeAccountability({ ...empty, mail: [], reports: rows });
    assert.equal(a.reports.eligible, 6);
    assert.equal(a.reports.respondedInTime, 4);
    assert.equal(a.reports.respondedInTimePercent, 67);
  });
  it("'sudah beres' menurut pelapor butuh minimal 3 jawaban", () => {
    const two = computeAccountability({ ...empty, mail: [], reports: [report(300, 1, { resolvedFeedback: "RESOLVED" }), report(300, 1, { resolvedFeedback: "NOT_RESOLVED" })] });
    assert.equal(two.reports.resolvedPercent, null);
    const three = computeAccountability({ ...empty, mail: [], reports: [report(300, 1, { resolvedFeedback: "RESOLVED" }), report(300, 1, { resolvedFeedback: "RESOLVED" }), report(300, 1, { resolvedFeedback: "NOT_RESOLVED" })] });
    assert.equal(three.reports.resolvedPercent, 67);
    assert.equal(three.reports.resolvedNo, 1);
  });
});

describe("aktivasi dan periode", () => {
  it("persen aktivasi, tanpa pembagian nol, dan tidak lebih dari 100", () => {
    assert.equal(computeAccountability({ ...empty, mail: [], reports: [], aliveResidents: 0, activeAccounts: 5 }).activation.percent, null);
    assert.equal(computeAccountability({ ...empty, mail: [], reports: [], aliveResidents: 200, activeAccounts: 50 }).activation.percent, 25);
    assert.equal(computeAccountability({ ...empty, mail: [], reports: [], aliveResidents: 10, activeAccounts: 50 }).activation.percent, 100);
  });
  it("membagi dua jendela berurutan dan membuang data masa depan atau lebih tua", () => {
    const rows = [ago(1), ago(24 * 89), ago(24 * 91), ago(24 * 179), ago(24 * 181), new Date(NOW.getTime() + H)];
    const { current, previous } = splitWindows(rows, (d) => d, NOW, 90);
    assert.equal(current.length, 2);
    assert.equal(previous.length, 2);
  });
  it("tren: durasi lebih kecil = lebih baik; selisih kecil dianggap sama; tanpa data = unknown", () => {
    assert.equal(trendOf(20, 40, false), "better");
    assert.equal(trendOf(40, 20, false), "worse");
    assert.equal(trendOf(80, 60, true), "better");
    assert.equal(trendOf(60, 60.5, true), "same");
    assert.equal(trendOf(null, 10, true), "unknown");
  });
});
