import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma.ts";
import { decideMailRequest, linkIssuedLetter } from "../lib/mail/request-decision.ts";
import { runSmartProcess, type SmartDeps } from "../lib/mail/request-smart.ts";
import { findIssuedLetter } from "../lib/mobile/mail-data.ts";

// Delegasi Prisma ditambal di memori (pola sama dengan laras-exec.test.ts).
type Any = Record<string, unknown>;
const p = prisma as unknown as Record<string, Any>;

let updateManyArgs: Any[];
let updateCount: number;
let existing: Any | null;
let letters: Any[];
let rows: Any[];
let pendingForEval: Any[];

const row = (id: number, over: Any = {}): Any => ({
  id: BigInt(id), villageId: 3, requestNumber: `REQ-${id}`, channel: "mobile", kioskDeviceId: null,
  nik: `32010155079000${String(id).padStart(2, "0")}`, name: `Warga ${id}`, mailType: "Surat Domisili",
  purpose: `Untuk melamar pekerjaan nomor ${id}`, status: "pending", notes: null, rejectionReason: null,
  residentId: id, onBehalfResidentId: null, templateId: null, formData: null, mailServiceId: null,
  rtStatus: null, rtNote: null, rtDecidedAt: null, rtDecidedByResidentId: null, applicantRt: "1", applicantRw: "2",
  requestDate: new Date(Date.now() - 2 * 86_400_000), processedDate: null, createdAt: new Date(), updatedAt: new Date(),
  ...over,
});

beforeEach(() => {
  process.env.AUTH_SECRET ||= "x".repeat(40);
  updateManyArgs = []; updateCount = 1; existing = { status: "pending", rtStatus: null }; letters = []; rows = []; pendingForEval = [];
  p.mailRequest = {
    updateMany: async (a: Any) => { updateManyArgs.push(a); return { count: updateCount }; },
    findFirst: async (a: Any) => {
      const id = (a.where as Any).id as bigint;
      return rows.find((r) => r.id === id) ?? existing;
    },
    findUnique: async () => ({ requestNumber: "REQ-1" }),
    findMany: async (a: Any) => (a.select ? pendingForEval : rows),
    groupBy: async () => [],
  };
  p.resident = { findMany: async () => rows.map((r) => ({ nik: r.nik, isAlive: true })) };
  p.mailService = { findFirst: async (a: Any) => letters.find((l) => l.id === (a.where as Any).id) ?? null };
  p.pushNotification = { create: async () => ({}) };
});

describe("keputusan web: update bersyarat", () => {
  it("setuju: hanya dari pending dan tahap RT null/approved", async () => {
    const r = await decideMailRequest({ villageId: 3, id: 1n, decision: "approve", note: "Silakan diambil" });
    assert.ok(r.ok);
    const w = updateManyArgs[0].where as Any;
    assert.equal(w.status, "pending");
    assert.equal(w.villageId, 3);
    assert.deepEqual(w.OR, [{ rtStatus: null }, { rtStatus: "approved" }]);
    assert.equal((updateManyArgs[0].data as Any).status, "approved");
  });
  it("tolak tanpa alasan → 400 dan tidak menyentuh DB", async () => {
    const r = await decideMailRequest({ villageId: 3, id: 1n, decision: "reject", note: "x" });
    assert.ok(!r.ok && r.status === 400);
    assert.equal(updateManyArgs.length, 0);
  });
  it("tolak boleh untuk permohonan yang ditolak RT (tidak ada syarat RT), setuju tidak", async () => {
    await decideMailRequest({ villageId: 3, id: 1n, decision: "reject", note: "Data tidak lengkap" });
    assert.equal((updateManyArgs[0].where as Any).OR, undefined);
  });
  it("kalah balapan: sudah diproses → 409 dengan pesan jelas", async () => {
    updateCount = 0; existing = { status: "approved", rtStatus: null };
    const r = await decideMailRequest({ villageId: 3, id: 1n, decision: "approve" });
    assert.ok(!r.ok && r.status === 409);
    assert.match(r.ok ? "" : r.error, /sudah diproses/);
  });
  it("menunggu RT → 409 menyebut Ketua RT; tidak ada → 404", async () => {
    updateCount = 0; existing = { status: "pending", rtStatus: "pending" };
    const a = await decideMailRequest({ villageId: 3, id: 1n, decision: "approve" });
    assert.match(a.ok ? "" : a.error, /Ketua RT/);
    existing = null;
    const b = await decideMailRequest({ villageId: 3, id: 1n, decision: "approve" });
    assert.ok(!b.ok && b.status === 404);
  });
  it("menautkan surat saat menyetujui", async () => {
    await decideMailRequest({ villageId: 3, id: 1n, decision: "approve", mailServiceId: 99n });
    assert.equal((updateManyArgs[0].data as Any).mailServiceId, 99n);
  });
});

describe("penautan surat terbit", () => {
  it("NIK surat harus sama dengan pemohon; beda → tidak menyetujui apa pun", async () => {
    existing = { status: "pending", mailServiceId: null, nik: "3201015507900001" };
    letters = [{ id: 5n, applicantNik: "9999999999999999" }];
    assert.equal(await linkIssuedLetter({ villageId: 3, requestId: 1n, letterId: 5n }), false);
    assert.equal(updateManyArgs.length, 0);
  });
  it("surat milik pemohon → permohonan disetujui dan tertaut", async () => {
    existing = { status: "pending", mailServiceId: null, nik: "3201015507900001" };
    letters = [{ id: 5n, applicantNik: "3201015507900001" }];
    assert.equal(await linkIssuedLetter({ villageId: 3, requestId: 1n, letterId: 5n }), true);
    assert.equal((updateManyArgs[0].data as Any).mailServiceId, 5n);
    assert.equal((updateManyArgs[0].data as Any).status, "approved");
  });
  it("sudah ditolak atau sudah tertaut → dilewati", async () => {
    letters = [{ id: 5n, applicantNik: "3201015507900001" }];
    existing = { status: "rejected", mailServiceId: null, nik: "3201015507900001" };
    assert.equal(await linkIssuedLetter({ villageId: 3, requestId: 1n, letterId: 5n }), false);
    existing = { status: "approved", mailServiceId: 7n, nik: "3201015507900001" };
    assert.equal(await linkIssuedLetter({ villageId: 3, requestId: 1n, letterId: 5n }), false);
  });
  it("sudah disetujui tanpa tautan → hanya menambahkan tautan", async () => {
    existing = { status: "approved", mailServiceId: null, nik: "3201015507900001" };
    letters = [{ id: 5n, applicantNik: "3201015507900001" }];
    assert.equal(await linkIssuedLetter({ villageId: 3, requestId: 1n, letterId: 5n }), true);
    assert.deepEqual(updateManyArgs[0].data, { mailServiceId: 5n });
  });
  it("findIssuedLetter mendahulukan tautan eksplisit", async () => {
    letters = [{ id: 5n, letterNumber: "001", letterDate: new Date(), status: "completed" }];
    const l = await findIssuedLetter({ villageId: 3, nik: "x", templateId: null, mailType: "x", requestDate: new Date(), mailServiceId: 5n });
    assert.equal(l?.id, 5n);
  });
});

describe("Proses Cerdas", () => {
  let reserved = 0, refunded = 0, calls: Array<{ system: string; user: string }>, answer: string | null, tokens: number;
  const deps = (): SmartDeps => ({
    reserve: async () => { reserved++; return true; },
    refund: async () => { refunded++; },
    callModel: async (system, user) => {
      calls.push({ system, user });
      return answer == null ? { ok: false, kind: "upstream", tokens: 10 } : { ok: true, text: answer, tokens: 100 };
    },
    addTokens: async (n) => { tokens += n; },
  });
  beforeEach(() => { reserved = 0; refunded = 0; calls = []; answer = null; tokens = 0; });

  const setup = (rs: Any[]) => { rows = rs; pendingForEval = rs.map((r) => ({ nik: r.nik, mailType: r.mailType })); };

  it("hanya permohonan bersih ke model; yang bermasalah → manual tanpa biaya model; identitas tidak dikirim", async () => {
    setup([row(1), row(2, { purpose: "x" })]); // 2: keperluan terlalu singkat → peringatan
    answer = JSON.stringify({ hasil: [{ id: 1, tingkat: "cocok", alasan: "Wajar untuk melamar kerja" }] });
    const out = await runSmartProcess({ villageId: 3, userId: 7 }, deps());
    assert.ok(out.ok);
    if (!out.ok) return;
    assert.equal(calls.length, 1);
    assert.ok(!calls[0].user.includes("Warga 1"));
    assert.ok(!calls[0].user.includes("320101550790001"));
    assert.ok(!calls[0].user.includes('"id": 2'));
    assert.equal(out.proposals.length, 1);
    assert.equal(out.proposals[0].requestId, 1);
    assert.equal(out.proposals[0].card.batchable, false);
    assert.ok(out.proposals[0].card.token.length > 20);
    assert.equal(out.manual.length, 1);
    assert.equal(out.manual[0].requestId, 2);
    assert.equal(reserved, 1);
    assert.equal(refunded, 0);
    assert.equal(tokens, 100);
  });
  it("AI menilai perlu_dicek/tidak_cocok → tidak ada usulan setuju", async () => {
    setup([row(1), row(3)]);
    answer = JSON.stringify({ hasil: [{ id: 1, tingkat: "perlu_dicek", alasan: "Kabur" }, { id: 3, tingkat: "tidak_cocok", alasan: "Tidak sesuai" }] });
    const out = await runSmartProcess({ villageId: 3, userId: 7 }, deps());
    assert.ok(out.ok && out.proposals.length === 0 && out.manual.length === 2);
  });
  it("model gagal atau keluaran rusak → kredit dikembalikan, tidak ada usulan", async () => {
    setup([row(1)]);
    answer = null;
    const a = await runSmartProcess({ villageId: 3, userId: 7 }, deps());
    assert.ok(!a.ok && a.status === 502);
    answer = "bukan json";
    const b = await runSmartProcess({ villageId: 3, userId: 7 }, deps());
    assert.ok(!b.ok);
    assert.equal(reserved, 2);
    assert.equal(refunded, 2);
  });
  it("tidak ada kandidat bersih → tidak memanggil model dan tidak menagih kredit", async () => {
    setup([row(2, { purpose: "x" })]);
    const out = await runSmartProcess({ villageId: 3, userId: 7 }, deps());
    assert.ok(out.ok && !out.charged && out.proposals.length === 0);
    assert.equal(reserved, 0);
    assert.equal(calls.length, 0);
  });
  it("kredit habis → 402 tanpa memanggil model", async () => {
    setup([row(1)]);
    const d = deps();
    d.reserve = async () => false;
    const out = await runSmartProcess({ villageId: 3, userId: 7 }, d);
    assert.ok(!out.ok && out.status === 402);
    assert.equal(calls.length, 0);
  });
});
