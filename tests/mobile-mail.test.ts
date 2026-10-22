import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canActForMember, describeMailRequest, excerpt, formatEstimate, maskNik, medianProcessHours, pickPopular,
} from "../lib/mobile/mail-logic.ts";

const T0 = new Date("2026-10-20T08:00:00Z");
const T1 = new Date("2026-10-21T08:00:00Z");
const base = { requestDate: T0, processedDate: null, notes: null, rejectionReason: null };

describe("status surat dalam bahasa warga", () => {
  it("pending → terkirim, menunggu desa", () => {
    const v = describeMailRequest({ ...base, status: "pending" }, false);
    assert.equal(v.stage, "sent");
    assert.deepEqual(v.steps.map((s) => s.state), ["done", "current", "todo"]);
  });
  it("disetujui tanpa surat terbit → diproses / ambil di kantor", () => {
    const v = describeMailRequest({ ...base, status: "approved", processedDate: T1 }, false);
    assert.equal(v.stage, "approved");
    assert.match(v.next, /kantor desa/);
    assert.deepEqual(v.steps.map((s) => s.state), ["done", "done", "current"]);
  });
  it("disetujui dan surat terbit → siap diunduh", () => {
    const v = describeMailRequest({ ...base, status: "approved", processedDate: T1 }, true);
    assert.equal(v.stage, "ready");
    assert.deepEqual(v.steps.map((s) => s.state), ["done", "done", "done"]);
  });
  it("ditolak memuat alasan dan langkah gagal", () => {
    const v = describeMailRequest({ ...base, status: "rejected", processedDate: T1, rejectionReason: "Foto KK buram" }, false);
    assert.equal(v.stage, "rejected");
    assert.match(v.next, /Foto KK buram/);
    assert.equal(v.steps[1]!.state, "failed");
  });
});

describe("surat populer per desa", () => {
  const svc = [
    { id: 1, name: "Surat Keterangan Domisili", category: "Keterangan" },
    { id: 2, name: "Surat Keterangan Tidak Mampu (SKTM)", category: "Keterangan" },
    { id: 3, name: "Pengantar SKCK", category: "Pengantar" },
    { id: 4, name: "Izin Keramaian", category: "Izin" },
  ];
  it("data kurang (<20): tebak dari daftar baku", () => {
    assert.deepEqual(pickPopular(svc, new Map(), 3), [1, 2, 3]);
  });
  it("data cukup: urut jumlah permohonan nyata, abaikan yang nol", () => {
    const counts = new Map([["izin keramaian", 15], ["surat keterangan domisili", 9], ["pengantar skck", 2]]);
    assert.deepEqual(pickPopular(svc, counts, 26), [4, 1, 3]);
  });
  it("batas limit", () => {
    assert.equal(pickPopular(svc, new Map(), 0, 2).length, 2);
  });
});

describe("perkiraan waktu & util", () => {
  it("median butuh minimal 5 data", () => {
    assert.equal(medianProcessHours([3600000, 7200000]), null);
    assert.equal(medianProcessHours([1, 2, 3, 4, 5].map((h) => h * 3600000)), 3);
  });
  it("format perkiraan", () => {
    assert.equal(formatEstimate(null), null);
    assert.equal(formatEstimate(5), "Biasanya selesai dalam beberapa jam");
    assert.equal(formatEstimate(30), "Biasanya selesai dalam 2 hari");
  });
  it("aturan atas nama keluarga, masking NIK, ringkasan teks", () => {
    assert.equal(canActForMember("Kepala Keluarga"), true);
    assert.equal(canActForMember("Istri"), false);
    assert.equal(canActForMember(null), false);
    assert.equal(maskNik("3201010101010001"), "3201••••••••0001");
    assert.equal(excerpt("a  b\n c", 100), "a b c");
    assert.equal(excerpt("x".repeat(200), 10).length, 10);
  });
});
