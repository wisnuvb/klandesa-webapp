import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { confirmActions, MAX_TOKENS_PER_CALL, type ConfirmDeps } from "../lib/ai/laras-confirm.ts";
import { signAction, ACTION_TTL_SEC, type MailDecisionPayload, type ReportActionPayload, type AnnouncementPublishPayload } from "../lib/ai/laras-actions.ts";

const exp = () => Math.floor(Date.now() / 1000) + ACTION_TTL_SEC;
const mail = (p: Partial<MailDecisionPayload> = {}) =>
  signAction({ v: 1, t: "mail_decision", u: 7, vi: 3, r: "42", d: "approve", n: "", e: exp(), ...p });
const report = (p: Partial<ReportActionPayload> = {}) =>
  signAction({ v: 1, t: "report_action", u: 7, vi: 3, r: "12", s: "PROCESS", m: "", e: exp(), ...p });
const ann = (p: Partial<AnnouncementPublishPayload> = {}) =>
  signAction({ v: 1, t: "announcement_publish", u: 7, vi: 3, ti: "Kerja Bakti", co: "Minggu pagi di balai desa.", ca: "Pengumuman", pn: false, e: exp(), ...p });

type Spy = { calls: string[]; used: Set<string> };
function deps(over: Partial<ConfirmDeps> = {}): { d: ConfirmDeps; spy: Spy } {
  const spy: Spy = { calls: [], used: new Set() };
  const d: ConfirmDeps = {
    can: () => true,
    entitled: async () => true,
    consume: async (t) => (spy.used.has(t) ? false : (spy.used.add(t), true)),
    release: async (t) => void spy.used.delete(t),
    executeMail: async () => (spy.calls.push("mail"), { ok: true }),
    executeReport: async () => (spy.calls.push("report"), { ok: true }),
    executeAnnouncement: async () => (spy.calls.push("announcement"), { ok: true }),
    ...over,
  };
  return { d, spy };
}
const run = (tokens: unknown[], d: ConfirmDeps, userId = 7, villageId = 3) => confirmActions({ tokens, userId, villageId }, d);

describe("confirmActions", () => {
  it("mengalihkan tiap jenis aksi ke eksekutor yang benar", async () => {
    const { d, spy } = deps();
    const r = await run([mail(), report(), ann()], d);
    assert.deepEqual(r.map((x) => x.ok), [true, true, true]);
    assert.deepEqual(spy.calls, ["mail", "report", "announcement"]);
  });
  it("token milik pengguna lain atau desa lain ditolak tanpa mengeksekusi", async () => {
    const { d, spy } = deps();
    const r = await run([mail({ u: 99 }), mail({ vi: 4 })], d);
    assert.deepEqual(r.map((x) => x.ok), [false, false]);
    assert.match(r[0]!.error!, /bukan untuk akun Anda/);
    assert.equal(spy.calls.length, 0);
  });
  it("token palsu, cacat, atau kedaluwarsa ditolak dengan pesan yang tepat", async () => {
    const { d, spy } = deps();
    const r = await run(["bukan-token", 123, mail({ e: 1 })], d);
    assert.match(r[0]!.error!, /tidak valid/);
    assert.match(r[1]!.error!, /tidak valid/);
    assert.match(r[2]!.error!, /kedaluwarsa/);
    assert.equal(spy.calls.length, 0);
  });
  it("izin dicek ULANG per jenis aksi; izin dicabut sejak usulan → ditolak dan token tidak terpakai", async () => {
    const { d, spy } = deps({ can: (resource, action) => !(resource === "mail" && action === "update") });
    const t = mail();
    const r = await run([t, report()], d);
    assert.match(r[0]!.error!, /izin/);
    assert.equal(r[1]!.ok, true);
    assert.ok(!spy.used.has(t), "token yang ditolak karena izin tidak boleh terbakar");
  });
  it("pengumuman membutuhkan izin create (bukan update)", async () => {
    const seen: string[] = [];
    const { d } = deps({ can: (resource, action) => (seen.push(`${resource}:${action}`), true) });
    await run([ann()], d);
    assert.deepEqual(seen, ["announcements:create"]);
  });
  it("modul tidak aktif ditolak", async () => {
    const { d, spy } = deps({ entitled: async () => false });
    const r = await run([ann()], d);
    assert.match(r[0]!.error!, /belum aktif/);
    assert.equal(spy.calls.length, 0);
  });
  it("token sekali pakai: konfirmasi ganda (token sama, satu atau beberapa permintaan) hanya sekali dieksekusi", async () => {
    const { d, spy } = deps();
    const t = report({ s: "", m: "Terima kasih, laporan Anda kami terima." });
    const r1 = await run([t, t], d);
    assert.deepEqual(r1.map((x) => x.ok), [true, false]);
    assert.match(r1[1]!.error!, /sudah diproses/);
    const r2 = await run([t], d);
    assert.equal(r2[0]!.ok, false);
    assert.deepEqual(spy.calls, ["report"]);
  });
  it("galat sementara satu token: token dikembalikan, token lain tetap diproses, tidak ada 500", async () => {
    let n = 0;
    const { d, spy } = deps({
      executeMail: async () => {
        if (n++ === 0) throw new Error("koneksi DB putus");
        return { ok: true };
      },
    });
    const t1 = mail({ r: "1" });
    const t2 = mail({ r: "2" });
    const t3 = report();
    const r = await run([t1, t2, t3], d);
    assert.deepEqual(r.map((x) => x.ok), [false, true, true]);
    assert.match(r[0]!.error!, /Coba lagi/);
    assert.ok(!spy.used.has(t1), "token yang gagal dieksekusi harus dilepas agar bisa dicoba ulang");
    const retry = await run([t1], d);
    assert.equal(retry[0]!.ok, true);
  });
  it("hasil gagal bisnis (409) dilaporkan apa adanya dan tidak melepas token", async () => {
    const { d, spy } = deps({ executeMail: async () => ({ ok: false, error: "Permohonan ini sudah diproses." }) });
    const t = mail();
    const r = await run([t], d);
    assert.deepEqual(r, [{ ok: false, error: "Permohonan ini sudah diproses." }]);
    assert.ok(spy.used.has(t));
  });
  it("batas jumlah token per panggilan tersedia untuk rute", () => {
    assert.equal(MAX_TOKENS_PER_CALL, 20);
  });
});
