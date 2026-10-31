import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma.ts";
import { executeMailDecision } from "../lib/ai/laras-mail.ts";
import { executeReportAction } from "../lib/ai/laras-report.ts";
import type { MailDecisionPayload, ReportActionPayload } from "../lib/ai/laras-actions.ts";

// Delegasi Prisma ditambal di memori: menguji kondisi update bersyarat dan efek sampingnya tanpa database.
type Any = Record<string, unknown>;
let updateManyArgs: Any[];
let reportUpdateArgs: Any[];
let responses: Any[];
let audits: Any[];
let mailCount: number;
let reportCount: number;
let reportStatus: string | null;

beforeEach(() => {
  updateManyArgs = []; reportUpdateArgs = []; responses = []; audits = [];
  mailCount = 1; reportCount = 1; reportStatus = "PENDING";
  const p = prisma as unknown as Record<string, unknown>;
  p.mailRequest = {
    updateMany: async (a: Any) => { updateManyArgs.push(a); return { count: mailCount }; },
    findUnique: async () => ({ requestNumber: "REQ-1", residentId: null, villageId: 3, mailType: "x", status: "approved", rejectionReason: null }),
  };
  p.citizenReport = {
    findFirst: async () => (reportStatus ? { status: reportStatus } : null),
    updateMany: async (a: Any) => { reportUpdateArgs.push(a); return { count: reportCount }; },
    findUnique: async () => ({ id: 1n, villageId: 3, residentId: null, title: "t", status: "PROCESS" }),
  };
  p.citizenReportResponse = { create: async (a: Any) => void responses.push(a) };
  p.auditLog = { create: async (a: Any) => void audits.push(a) };
  p.$transaction = async (fn: (tx: unknown) => unknown) => fn(p);
});

const actor = { userId: 7, ip: "1.1.1.1", userAgent: "t" };
const mail = (p: Partial<MailDecisionPayload> = {}): MailDecisionPayload => ({ v: 1, t: "mail_decision", u: 7, vi: 3, r: "42", d: "approve", n: "", e: 0, ...p });
const rep = (p: Partial<ReportActionPayload> = {}): ReportActionPayload => ({ v: 1, t: "report_action", u: 7, vi: 3, r: "12", s: "PROCESS", m: "", e: 0, ...p });
const reporter = { ...actor, name: "Budi", roleLabel: "Staf Desa" };

describe("executeMailDecision", () => {
  it("update bersyarat: hanya pending dan (tanpa RT atau RT setuju), terkunci pada desa pada token", async () => {
    const r = await executeMailDecision(mail(), actor);
    assert.equal(r.ok, true);
    const where = updateManyArgs[0]!.where as Any;
    assert.equal(where.villageId, 3);
    assert.equal(where.status, "pending");
    assert.deepEqual(where.OR, [{ rtStatus: null }, { rtStatus: "approved" }]);
    assert.equal(((updateManyArgs[0]!.data as Any).status), "approved");
    assert.match(JSON.stringify(audits[0]), /"via":"laras"/);
  });
  it("sudah diproses pihak lain → 409 dan tidak ada audit", async () => {
    mailCount = 0;
    const r = await executeMailDecision(mail(), actor);
    assert.deepEqual(r.ok, false);
    assert.equal(!r.ok && r.status, 409);
    assert.equal(audits.length, 0);
  });
  it("tolak tanpa alasan ≥5 huruf ditolak sebelum menyentuh database", async () => {
    const r = await executeMailDecision(mail({ d: "reject", n: "no" }), actor);
    assert.equal(!r.ok && r.status, 400);
    assert.equal(updateManyArgs.length, 0);
  });
  it("tolak menyimpan alasan sebagai rejectionReason", async () => {
    await executeMailDecision(mail({ d: "reject", n: "Lampirkan fotokopi KK" }), actor);
    const data = updateManyArgs[0]!.data as Any;
    assert.equal(data.status, "rejected");
    assert.equal(data.rejectionReason, "Lampirkan fotokopi KK");
  });
});

describe("executeReportAction", () => {
  it("mulai tangani: update bersyarat pada status lama, tanpa baris tanggapan bila tak ada teks", async () => {
    const r = await executeReportAction(rep(), reporter);
    assert.equal(r.ok, true);
    const a = reportUpdateArgs[0]!;
    assert.deepEqual(a.where, { id: 12n, villageId: 3, status: "PENDING" });
    assert.equal((a.data as Any).status, "PROCESS");
    assert.equal(responses.length, 0);
  });
  it("selesai mencatat doneById penekan tombol; tanggapan atas nama manusia, bukan Laras", async () => {
    reportStatus = "PROCESS";
    await executeReportAction(rep({ s: "DONE", m: "Sudah diperbaiki, terima kasih." }), reporter);
    assert.equal(((reportUpdateArgs[0]!.data) as Any).doneById, 7);
    const resp = (responses[0]!.data) as Any;
    assert.equal(resp.responderName, "Budi");
    assert.equal(resp.responderRole, "Staf Desa");
    assert.equal(resp.responderId, 7);
  });
  it("transisi yang sudah tidak sah (status berubah sejak usulan) → 409, tidak menulis apa pun", async () => {
    reportStatus = "DONE";
    const r = await executeReportAction(rep({ s: "PROCESS" }), reporter);
    assert.equal(!r.ok && r.status, 409);
    assert.equal(reportUpdateArgs.length, 0);
    assert.equal(responses.length, 0);
  });
  it("dua staf bersamaan: updateMany=0 → 409 dan tanggapan tidak dibuat", async () => {
    reportCount = 0;
    const r = await executeReportAction(rep({ m: "Sedang kami tangani." }), reporter);
    assert.equal(!r.ok && r.status, 409);
    assert.equal(responses.length, 0);
  });
  it("tolak wajib beralasan; hanya-tanggapan ditolak pada laporan yang sudah selesai", async () => {
    assert.equal((await executeReportAction(rep({ s: "REJECT", m: "no" }), reporter)).ok, false);
    reportStatus = "DONE";
    const r = await executeReportAction(rep({ s: "", m: "Tambahan informasi dari desa." }), reporter);
    assert.equal(!r.ok && r.status, 409);
    assert.equal(responses.length, 0);
  });
  it("audit tidak memuat isi tanggapan", async () => {
    await executeReportAction(rep({ m: "Isi tanggapan rahasia untuk pelapor" }), reporter);
    assert.ok(!JSON.stringify(audits[0]).includes("rahasia"));
  });
  it("laporan dari desa lain tidak ditemukan → 409", async () => {
    reportStatus = null;
    const r = await executeReportAction(rep(), reporter);
    assert.equal(!r.ok && r.status, 409);
  });
});

describe("executeReportAction: status + tanggapan satu transaksi", () => {
  it("semua tulis berjalan lewat objek transaksi (bukan klien global) sehingga bisa di-rollback bersama", async () => {
    const via: string[] = [];
    const p = prisma as unknown as Record<string, unknown>;
    p.$transaction = async (fn: (tx: unknown) => unknown) =>
      fn({
        citizenReport: { updateMany: async () => (via.push("tx.updateMany"), { count: 1 }) },
        citizenReportResponse: { create: async () => void via.push("tx.responseCreate") },
      });
    reportStatus = "PENDING";
    const r = await executeReportAction(rep({ s: "REJECT", m: "Di luar kewenangan desa; hubungi PLN." }), reporter);
    assert.equal(r.ok, true);
    assert.deepEqual(via, ["tx.updateMany", "tx.responseCreate"]);
    assert.equal(reportUpdateArgs.length, 0, "tidak boleh menulis lewat klien global");
    assert.equal(responses.length, 0);
  });
  it("gagal membuat tanggapan → galat merambat (transaksi batal), bukan penolakan tanpa alasan", async () => {
    const p = prisma as unknown as Record<string, unknown>;
    p.$transaction = async (fn: (tx: unknown) => unknown) =>
      fn({
        citizenReport: { updateMany: async () => ({ count: 1 }) },
        citizenReportResponse: { create: async () => { throw new Error("DB error"); } },
      });
    reportStatus = "PENDING";
    await assert.rejects(() => executeReportAction(rep({ s: "REJECT", m: "Di luar kewenangan desa." }), reporter), /DB error/);
  });
  it("dua staf bersamaan di dalam transaksi: updateMany=0 → 409 dan tanggapan tidak dibuat", async () => {
    const created: string[] = [];
    const p = prisma as unknown as Record<string, unknown>;
    p.$transaction = async (fn: (tx: unknown) => unknown) =>
      fn({
        citizenReport: { updateMany: async () => ({ count: 0 }) },
        citizenReportResponse: { create: async () => void created.push("x") },
      });
    reportStatus = "PENDING";
    const r = await executeReportAction(rep({ m: "Sedang kami tangani." }), reporter);
    assert.equal(!r.ok && r.status, 409);
    assert.equal(created.length, 0);
  });
});
