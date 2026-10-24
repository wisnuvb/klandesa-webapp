import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canRtAccessRequest, canRtDecide, mergeRtApproval, normalizeRtCode, readRtApproval, residentInScope, rtCodeVariants, rtOfficersFor, shouldRequireRt,
} from "../lib/mobile/rt-logic.ts";
import { describeMailRequest } from "../lib/mobile/mail-logic.ts";

describe("kode RT/RW", () => {
  it("dinormalkan dari berbagai penulisan", () => {
    for (const [raw, out] of [["03", "3"], ["003", "3"], ["RT 03", "3"], ["3", "3"], ["12", "12"], [3, "3"]] as const) assert.equal(normalizeRtCode(raw), out, String(raw));
    for (const bad of ["", "0", "00", "RT", null, undefined, "12345", {}]) assert.equal(normalizeRtCode(bad), null, String(bad));
  });
  it("varian untuk query awal mencakup penulisan berangka nol", () => {
    assert.deepEqual(rtCodeVariants("3"), ["3", "03", "003", "0003"]);
    assert.deepEqual(rtCodeVariants("12"), ["12", "012", "0012"]);
  });
});

describe("cakupan RT", () => {
  it("RT sama saja cukup bila penugasan tanpa RW", () => {
    assert.equal(residentInScope({ rt: "03", rw: "02" }, { rt: "3", rw: null }), true);
    assert.equal(residentInScope({ rt: "04", rw: "02" }, { rt: "3", rw: null }), false);
    assert.equal(residentInScope({ rt: null, rw: null }, { rt: "3", rw: null }), false);
  });
  it("penugasan ber-RW: RT 03 RW 01 tidak mencakup RT 03 RW 02 maupun warga tanpa RW", () => {
    const scope = { rt: "3", rw: "1" };
    assert.equal(residentInScope({ rt: "003", rw: "01" }, scope), true);
    assert.equal(residentInScope({ rt: "03", rw: "02" }, scope), false);
    assert.equal(residentInScope({ rt: "03", rw: null }, scope), false);
  });
});

describe("matriks akses permohonan surat per peran", () => {
  const actorRt3 = { villageId: 1, scope: { rt: "3", rw: "1" }, residentId: 100 };
  const req = { villageId: 1, rtStatus: "pending", applicantRt: "3", applicantRw: "1", requesterResidentId: 7 };
  it("RT yang tepat boleh", () => assert.equal(canRtAccessRequest(actorRt3, req), true));
  it("RT lain di desa yang sama ditolak (RT berbeda, atau RW berbeda)", () => {
    assert.equal(canRtAccessRequest({ ...actorRt3, scope: { rt: "4", rw: "1" } }, req), false);
    assert.equal(canRtAccessRequest({ ...actorRt3, scope: { rt: "3", rw: "2" } }, req), false);
  });
  it("RT dari desa lain ditolak walau RT/RW sama", () => assert.equal(canRtAccessRequest({ ...actorRt3, villageId: 2 }, req), false));
  it("permohonan tanpa tahap RT tidak terlihat oleh RT mana pun", () => assert.equal(canRtAccessRequest(actorRt3, { ...req, rtStatus: null }), false));
  it("RT tidak menyetujui permohonannya sendiri", () => assert.equal(canRtAccessRequest(actorRt3, { ...req, requesterResidentId: 100 }), false));
  it("hanya yang masih menunggu RT dan belum diputus desa yang bisa diputuskan", () => {
    assert.equal(canRtDecide({ rtStatus: "pending", status: "pending" }), true);
    assert.equal(canRtDecide({ rtStatus: "approved", status: "pending" }), false);
    assert.equal(canRtDecide({ rtStatus: "pending", status: "approved" }), false);
    assert.equal(canRtDecide({ rtStatus: null, status: "pending" }), false);
  });
});

describe("kapan tahap RT dipakai", () => {
  const officers = [{ residentId: 100, rt: "3", rw: "1" }, { residentId: 101, rt: "4", rw: "1" }];
  const base = { villageEnabled: true, applicant: { rt: "03", rw: "01" }, requesterResidentId: 7, activeRts: officers };
  it("aktif bila desa menyalakan dan ada petugas RT yang cocok", () => assert.equal(shouldRequireRt(base), true));
  it("tidak aktif bila desa mematikan, tanpa petugas, atau pemohon tanpa RT", () => {
    assert.equal(shouldRequireRt({ ...base, villageEnabled: false }), false);
    assert.equal(shouldRequireRt({ ...base, activeRts: [] }), false);
    assert.equal(shouldRequireRt({ ...base, applicant: { rt: "09", rw: "01" } }), false);
    assert.equal(shouldRequireRt({ ...base, applicant: { rt: null, rw: null } }), false);
  });
  it("pemohon yang sendiri petugas RT-nya melewati tahap RT", () => assert.equal(shouldRequireRt({ ...base, requesterResidentId: 100 }), false));
  it("penerima notifikasi: hanya petugas RT yang cakupannya cocok", () => assert.deepEqual(rtOfficersFor(base.applicant, officers), [100]));
});

describe("pengaturan desa", () => {
  it("default mati dan merge tidak menghapus kunci lain", () => {
    assert.equal(readRtApproval(null), false);
    assert.equal(readRtApproval({ mobile: { mail: { rtApproval: "true" } } }), false);
    const next = mergeRtApproval({ x: 1, mobile: { social: { mode: "pre" }, mail: { other: 2 } } }, true) as { x: number; mobile: { social: unknown; mail: unknown } };
    assert.equal(next.x, 1);
    assert.deepEqual(next.mobile.social, { mode: "pre" });
    assert.deepEqual(next.mobile.mail, { other: 2, rtApproval: true });
    assert.equal(readRtApproval(next), true);
  });
});

describe("status surat dengan tahap RT", () => {
  const T0 = new Date("2026-10-20T08:00:00Z");
  const T1 = new Date("2026-10-20T10:00:00Z");
  const row = { status: "pending", requestDate: T0, processedDate: null, notes: null, rejectionReason: null };
  it("tanpa tahap RT: langkah tetap 3", () => assert.equal(describeMailRequest(row, false).steps.length, 3));
  it("menunggu RT: 4 langkah, RT sedang berjalan, bahasa warga", () => {
    const v = describeMailRequest({ ...row, rtStatus: "pending" }, false);
    assert.equal(v.title, "Menunggu Pak/Bu RT");
    assert.deepEqual(v.steps.map((s) => [s.key, s.state]), [["sent", "done"], ["rt", "current"], ["review", "todo"], ["done", "todo"]]);
  });
  it("RT setuju: langkah RT selesai, desa sedang memeriksa", () => {
    const v = describeMailRequest({ ...row, rtStatus: "approved", rtDecidedAt: T1 }, false);
    assert.equal(v.title, "Menunggu desa memeriksa");
    assert.deepEqual(v.steps.map((s) => [s.key, s.state]), [["sent", "done"], ["rt", "done"], ["review", "current"], ["done", "todo"]]);
  });
  it("RT menolak: gagal di langkah RT, alasan tampil, desa tidak diperiksa", () => {
    const v = describeMailRequest({ ...row, status: "rejected", rtStatus: "rejected", rtDecidedAt: T1, processedDate: T1, rejectionReason: "Ditolak RT: belum tinggal di RT ini" }, false);
    assert.equal(v.stage, "rejected");
    assert.deepEqual(v.steps.map((s) => [s.key, s.state]), [["sent", "done"], ["rt", "failed"], ["review", "todo"], ["done", "todo"]]);
    assert.match(v.next, /belum tinggal di RT ini/);
  });
});
