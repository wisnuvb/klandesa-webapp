import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signAction, verifyAction, type MailDecisionPayload, type ReportActionPayload } from "../lib/ai/laras-actions.ts";
import { evaluateMailRequest } from "../lib/ai/laras-mail.ts";
import { executeLarasTool, larasToolSpecs } from "../lib/ai/laras-tools.ts";
import { resolveApiPermission } from "../lib/permissions/api-route-map.ts";
import { roleCan } from "../lib/permissions/matrix.ts";

const SECRET = "x".repeat(40);
const NOW = 1_800_000_000;
const payload = (p: Partial<MailDecisionPayload> = {}): MailDecisionPayload => ({
  v: 1, t: "mail_decision", u: 7, vi: 3, r: "42", d: "approve", n: "", e: NOW + 600, ...p,
});

describe("token aksi Laras", () => {
  it("token sah terverifikasi dan isinya utuh", () => {
    const v = verifyAction(signAction(payload({ d: "reject", n: "Lampirkan KK" }), SECRET), SECRET, NOW);
    assert.ok(v.ok);
    assert.equal(v.ok && v.payload.t === "mail_decision" && v.payload.d, "reject");
    assert.equal(v.ok && v.payload.t === "mail_decision" && v.payload.r, "42");
  });
  it("isi yang diubah klien (mis. approve→reject, id lain) ditolak", () => {
    const tok = signAction(payload(), SECRET);
    const [body, sig] = tok.split(".");
    const tampered = JSON.parse(Buffer.from(body!, "base64url").toString());
    tampered.r = "99";
    const forged = `${Buffer.from(JSON.stringify(tampered)).toString("base64url")}.${sig}`;
    assert.deepEqual(verifyAction(forged, SECRET, NOW), { ok: false, reason: "invalid" });
  });
  it("tanda tangan dengan secret lain ditolak", () => {
    assert.deepEqual(verifyAction(signAction(payload(), "y".repeat(40)), SECRET, NOW), { ok: false, reason: "invalid" });
  });
  it("kedaluwarsa dilaporkan terpisah", () => {
    const tok = signAction(payload({ e: NOW - 1 }), SECRET);
    assert.deepEqual(verifyAction(tok, SECRET, NOW), { ok: false, reason: "expired" });
  });
  it("sampah dan tipe salah ditolak tanpa melempar", () => {
    for (const bad of [undefined, null, 5, "", "a", "a.b", "a.b.c", "x".repeat(3000)]) {
      assert.equal(verifyAction(bad, SECRET, NOW).ok, false);
    }
    assert.equal(verifyAction(signAction(payload({ r: "1; DROP" }), SECRET), SECRET, NOW).ok, false);
    assert.equal(verifyAction(signAction(payload({ d: "delete" as never }), SECRET), SECRET, NOW).ok, false);
  });
});

describe("evaluateMailRequest", () => {
  const base = { status: "pending", rtStatus: null, nik: "3201011234560001", purpose: "Melamar pekerjaan", requestDate: new Date("2026-10-30") };
  const ok = { residentFound: true, residentAlive: true, duplicatePending: 1 };
  const now = new Date("2026-10-31");
  it("permohonan wajar siap diproses tanpa hambatan/peringatan", () => {
    assert.deepEqual(evaluateMailRequest(base, ok, now), { ready: true, blocking: [], warnings: [], approvalBlockers: [] });
  });
  it("sudah diproses atau belum disetujui RT = hambatan (tidak boleh diusulkan)", () => {
    assert.equal(evaluateMailRequest({ ...base, status: "approved" }, ok, now).ready, false);
    assert.equal(evaluateMailRequest({ ...base, rtStatus: "pending" }, ok, now).ready, false);
    assert.equal(evaluateMailRequest({ ...base, rtStatus: "rejected" }, ok, now).ready, false);
    assert.equal(evaluateMailRequest({ ...base, rtStatus: "approved" }, ok, now).ready, true);
  });
  it("NIK tak dikenal, warga tidak aktif, ganda, keperluan kosong, lama menunggu = peringatan", () => {
    const w = evaluateMailRequest(
      { ...base, nik: "123", purpose: " ", requestDate: new Date("2026-09-01") },
      { residentFound: false, residentAlive: true, duplicatePending: 2 },
      now,
    ).warnings.join(" | ");
    assert.match(w, /NIK pemohon tidak valid/);
    assert.match(w, /tidak ditemukan/);
    assert.match(w, /sejenis/);
    assert.match(w, /Keperluan/);
    assert.match(w, /menunggu \d+ hari/);
    const dead = evaluateMailRequest(base, { ...ok, residentAlive: false }, now).warnings.join();
    assert.match(dead, /tidak aktif/);
  });
  it("hanya peringatan data pemohon yang menghalangi usulan SETUJUI; lama menunggu hanya informasi", () => {
    const stale = evaluateMailRequest({ ...base, requestDate: new Date("2026-09-01") }, ok, now);
    assert.equal(stale.warnings.length, 1);
    assert.deepEqual(stale.approvalBlockers, []);
    const unknown = evaluateMailRequest(base, { ...ok, residentFound: false }, now);
    assert.equal(unknown.approvalBlockers.length, 1);
    const dup = evaluateMailRequest(base, { ...ok, duplicatePending: 2 }, now);
    assert.equal(dup.approvalBlockers.length, 1);
  });
});

describe("gerbang izin usulan aksi", () => {
  const as = (role: string) => ({ user: { id: "5", role } }) as never;
  const ctx = (role: string) => ({ villageId: 1, userId: 5, role, village: {} as never, session: as(role) });
  it("kepala desa (mail: read saja) tidak bisa mengusulkan; tidak menyentuh database", async () => {
    const out = await executeLarasTool(ctx("village_head"), "propose_mail_decision", '{"request_id":1,"decision":"approve"}');
    assert.equal(out.ok, false);
    assert.match(JSON.stringify(out.result), /izin/);
    assert.equal(out.action, undefined);
  });
  it("daftar tool memuat tool baru dan propose mewajibkan request_id + decision", () => {
    const spec = larasToolSpecs().find((t) => t.function.name === "propose_mail_decision")!;
    assert.deepEqual((spec.function.parameters as { required: string[] }).required, ["request_id", "decision"]);
    assert.ok(larasToolSpecs().some((t) => t.function.name === "mail_requests_pending"));
  });
  it("tidak ada tool yang mengeksekusi langsung: tak ada tool bernama approve/reject/execute", () => {
    for (const t of larasToolSpecs()) assert.doesNotMatch(t.function.name, /^(approve|reject|execute|delete|update)/);
  });
  it("endpoint konfirmasi dapat diakses semua role desa; izin sebenarnya dicek di handler", () => {
    const perm = resolveApiPermission("/api/ai/actions/confirm", "POST")!;
    assert.deepEqual(perm, { resource: "ai_assistant", action: "read" });
    assert.equal(roleCan("mail", "update", "village_head"), false);
    assert.equal(roleCan("mail", "update", "secretary"), true);
  });
});

describe("token aksi pengaduan", () => {
  const rp = (p: Partial<ReportActionPayload> = {}): ReportActionPayload => ({
    v: 1, t: "report_action", u: 7, vi: 3, r: "12", s: "PROCESS", m: "Kami tangani", e: NOW + 600, ...p,
  });
  it("sah, termasuk usulan hanya-tanggapan (status kosong)", () => {
    const a = verifyAction(signAction(rp(), SECRET), SECRET, NOW);
    assert.ok(a.ok && a.payload.t === "report_action" && a.payload.s === "PROCESS");
    const b = verifyAction(signAction(rp({ s: "" }), SECRET), SECRET, NOW);
    assert.ok(b.ok);
  });
  it("status di luar daftar atau tipe tak dikenal ditolak", () => {
    assert.equal(verifyAction(signAction(rp({ s: "DELETE" as never }), SECRET), SECRET, NOW).ok, false);
    assert.equal(verifyAction(signAction(rp({ t: "drop" as never }), SECRET), SECRET, NOW).ok, false);
    assert.equal(verifyAction(signAction(rp({ m: 5 as never }), SECRET), SECRET, NOW).ok, false);
  });
  it("token surat tidak bisa dipakai sebagai token pengaduan (dan sebaliknya) lewat pengubahan jenis", () => {
    const tok = signAction(payload(), SECRET);
    const [body, sig] = tok.split(".");
    const j = JSON.parse(Buffer.from(body!, "base64url").toString());
    j.t = "report_action";
    const forged = `${Buffer.from(JSON.stringify(j)).toString("base64url")}.${sig}`;
    assert.equal(verifyAction(forged, SECRET, NOW).ok, false);
  });
});
