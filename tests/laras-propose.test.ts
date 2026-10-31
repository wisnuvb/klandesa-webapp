import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma.ts";
import { proposeMailDecision } from "../lib/ai/laras-mail.ts";
import { proposeReportAction, reportSafetyRules } from "../lib/ai/laras-report.ts";
import { proposeAnnouncement } from "../lib/ai/laras-announcement.ts";

type Any = Record<string, unknown>;
const p = prisma as unknown as Record<string, Any>;
const ctx = { villageId: 3, userId: 7 };

let mailRow: Any;
let residents: Any[];
let pendingMails: Any[];
let reportRow: Any | null;
let annCount: number;
let recentAnn: Any[];

beforeEach(() => {
  mailRow = {
    id: 42n, requestNumber: "REQ-42", mailType: "Surat Domisili", channel: "portal", nik: "3201015507900001", name: "Siti Aminah",
    purpose: "Untuk melamar pekerjaan. Hubungi 081234567890", status: "pending", rtStatus: null, requestDate: new Date(),
  };
  residents = [{ nik: "3201015507900001", isAlive: true }];
  pendingMails = [{ nik: "3201015507900001", mailType: "Surat Domisili" }];
  reportRow = { id: 12n, status: "PENDING", title: "Lampu jalan mati", content: "Lampu depan balai mati sejak seminggu. Telp 0812 3456 7890", category: "lampu", _count: { responses: 1 } };
  annCount = 0;
  recentAnn = [];
  p.mailRequest = { findFirst: async () => mailRow, findMany: async () => pendingMails };
  p.resident = { findMany: async () => residents };
  p.citizenReport = { findFirst: async () => reportRow };
  p.announcement = { count: async () => annCount, findMany: async () => recentAnn };
});

describe("usulan surat: aturan ditegakkan server", () => {
  it("setujui permohonan yang wajar → kartu dengan bukti keperluan (PII disamarkan), tidak massal", async () => {
    const r = await proposeMailDecision(ctx, { requestId: 42, decision: "approve" });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.card.batchable, false);
    assert.match(r.card.evidence, /melamar pekerjaan/);
    assert.ok(!/0812/.test(r.card.evidence));
    assert.ok(!JSON.stringify(r.forModel).includes("Siti"));
    assert.ok(!r.card.token.includes("undefined"));
  });
  it("setujui dengan peringatan data pemohon (NIK tak ditemukan) → DITOLAK server, bukan hanya prompt", async () => {
    residents = [];
    const r = await proposeMailDecision(ctx, { requestId: 42, decision: "approve" });
    assert.equal(r.ok, false);
    assert.match(r.ok ? "" : r.error, /peringatan/);
  });
  it("setujui permohonan ganda atau pemohon tidak aktif → ditolak", async () => {
    pendingMails = [{ nik: mailRow.nik, mailType: "Surat Domisili" }, { nik: mailRow.nik, mailType: "Surat Domisili" }];
    assert.equal((await proposeMailDecision(ctx, { requestId: 42, decision: "approve" })).ok, false);
    pendingMails = [{ nik: mailRow.nik, mailType: "Surat Domisili" }];
    residents = [{ nik: mailRow.nik, isAlive: false }];
    assert.equal((await proposeMailDecision(ctx, { requestId: 42, decision: "approve" })).ok, false);
  });
  it("tolak dengan peringatan tetap boleh (alasan wajib) dan peringatan tampil di kartu", async () => {
    residents = [];
    const r = await proposeMailDecision(ctx, { requestId: 42, decision: "reject", note: "NIK Anda belum terdaftar di data desa. Datanglah ke kantor desa." });
    assert.ok(r.ok && r.card.warnings.some((w) => /tidak ditemukan/.test(w)));
  });
  it("tautan di catatan untuk warga dibuang dan diberi peringatan", async () => {
    const r = await proposeMailDecision(ctx, { requestId: 42, decision: "reject", note: "Lengkapi data di https://verifikasi-desa.example/login segera." });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.ok(!/https?:|verifikasi-desa/.test(r.card.note));
    assert.ok(r.card.warnings.some((w) => /Tautan dihapus/.test(w)));
  });
  it("permohonan yang menunggu Ketua RT tidak bisa diusulkan", async () => {
    mailRow.rtStatus = "pending";
    assert.equal((await proposeMailDecision(ctx, { requestId: 42, decision: "reject", note: "Menunggu Ketua RT, mohon sabar." })).ok, false);
  });
});

describe("usulan pengaduan: aturan keselamatan ditegakkan server", () => {
  it("pure: kategori keamanan tidak boleh ditolak, penutupan diberi peringatan", () => {
    assert.ok(reportSafetyRules("keamanan", "REJECT").block);
    assert.ok(reportSafetyRules("keamanan", "DONE").warning);
    assert.deepEqual(reportSafetyRules("keamanan", "PROCESS"), {});
    assert.deepEqual(reportSafetyRules("lampu", "REJECT"), {});
    assert.deepEqual(reportSafetyRules(null, "DONE"), {});
  });
  it("tolak laporan keamanan → ditolak server walau transisi dan alasan sah", async () => {
    reportRow = { ...reportRow!, category: "keamanan" };
    const r = await proposeReportAction(ctx, { reportId: 12, status: "REJECT", response: "Di luar kewenangan desa, hubungi polisi." });
    assert.equal(r.ok, false);
    assert.match(r.ok ? "" : r.error, /keamanan/);
  });
  it("tandai selesai laporan keamanan → boleh, tetapi kartu memperingatkan", async () => {
    reportRow = { ...reportRow!, status: "PROCESS", category: "keamanan" };
    const r = await proposeReportAction(ctx, { reportId: 12, status: "DONE", response: "Pos ronda sudah ditambah." });
    assert.ok(r.ok && r.card.warnings.some((w) => /keamanan/.test(w)) && r.card.batchable === false);
  });
  it("mulai tangani tanpa peringatan boleh massal; menolak dan menutup tidak", async () => {
    const start = await proposeReportAction(ctx, { reportId: 12, status: "PROCESS" });
    assert.ok(start.ok && start.card.batchable === true);
    const reject = await proposeReportAction(ctx, { reportId: 12, status: "REJECT", response: "Di luar kewenangan desa; hubungi PLN." });
    assert.ok(reject.ok && reject.card.batchable === false);
    reportRow = { ...reportRow!, status: "PROCESS" };
    const done = await proposeReportAction(ctx, { reportId: 12, status: "DONE", response: "Sudah diperbaiki." });
    assert.ok(done.ok && done.card.batchable === false);
  });
  it("kartu memuat kutipan isi laporan (PII disamarkan) dan tanggapan dibersihkan dari tautan", async () => {
    const r = await proposeReportAction(ctx, { reportId: 12, status: "PROCESS", response: "Kami tangani. Info: http://phish.example/x" });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.match(r.card.evidence, /Lampu jalan mati/);
    assert.ok(!/0812/.test(r.card.evidence));
    assert.ok(!/https?:/.test(r.card.note));
    assert.ok(r.card.warnings.some((w) => /Tautan dihapus/.test(w)));
    assert.equal(r.card.batchable, false, "ada peringatan → tidak massal");
  });
  it("laporan desa lain/tidak ada → tidak ditemukan", async () => {
    reportRow = null;
    assert.equal((await proposeReportAction(ctx, { reportId: 99, status: "PROCESS" })).ok, false);
  });
});

describe("usulan pengumuman", () => {
  it("kuota habis → ditolak; judul kembar → peringatan; tidak pernah massal", async () => {
    annCount = 10;
    assert.equal((await proposeAnnouncement(ctx, { title: "Kerja Bakti", content: "Minggu pagi di balai desa.", category: "Pengumuman" })).ok, false);
    annCount = 0;
    recentAnn = [{ title: "  kerja   BAKTI " }];
    const r = await proposeAnnouncement(ctx, { title: "Kerja Bakti", content: "Minggu pagi di balai desa.", category: "Pengumuman" });
    assert.ok(r.ok && r.card.batchable === false && r.card.warnings.some((w) => /sudah terbit/.test(w)));
  });
  it("tautan di pengumuman dibuang dan diperingatkan sebelum tayang publik", async () => {
    const r = await proposeAnnouncement(ctx, { title: "Bansos", content: "Daftar di https://bansos-desa.example/daftar hari ini.", category: "Berita" });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.ok(!/https?:/.test(r.card.note));
    assert.ok(r.card.warnings.some((w) => /Tautan dihapus/.test(w)));
  });
});
