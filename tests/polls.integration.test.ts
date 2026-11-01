/** Tes integrasi polling terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Polling warga (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/polls/service");
  let vA = 0;
  let vB = 0;
  const rid: Record<string, number> = {};
  const NOW = new Date("2026-11-01T03:00:00Z");
  const input = { title: "Setuju pembangunan jalan?", options: ["Setuju", "Tidak setuju", "Abstain"], closesAt: "2026-11-08T10:00:00Z" };

  const open = async (over: Record<string, unknown> = {}) => {
    const c = await svc.createPoll(prisma, { villageId: vA, userId: 1, input: { ...input, ...over }, now: NOW });
    assert.ok(c.ok, c.ok ? "" : c.errors.join());
    const id = c.ok ? c.data.id : 0;
    const p = await svc.publishPoll(prisma, { villageId: vA, id, now: NOW });
    assert.ok(p.ok);
    return id;
  };
  const vote = (pollId: number, who: string, optionIndex: unknown, villageId = vA, now = NOW) => svc.castVote(prisma, { villageId, residentId: rid[who], pollId, optionIndex, now });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/polls/service");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("PA")).id;
    vB = (await mkV("PB")).id;
    let n = 0;
    const mkR = async (key: string, villageId: number, birth: string, isAlive = true) =>
      (rid[key] = (await prisma.resident.create({ data: { villageId, nik: `33001${t}${++n}`.padEnd(16, "0").slice(0, 16), name: `Warga ${key}`, birthplace: "x", birthDate: new Date(birth), gender: "Laki-laki", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", isAlive } })).id);
    await mkR("a", vA, "1980-01-01");
    await mkR("b", vA, "1985-01-01");
    await mkR("c", vA, "1990-01-01");
    await mkR("anak", vA, "2015-01-01");
    await mkR("almarhum", vA, "1950-01-01", false);
    await mkR("lain", vB, "1980-01-01");
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("alur: draf boleh diubah dan dihapus; setelah terbit terkunci, tak bisa diterbitkan dua kali", async () => {
    const c = await svc.createPoll(prisma, { villageId: vA, userId: 1, input, now: NOW });
    const id = c.ok ? c.data.id : 0;
    assert.ok(c.ok && c.data.status === "DRAFT");
    assert.ok((await svc.updatePoll(prisma, { villageId: vA, id, input: { ...input, title: "Judul baru" }, now: NOW })).ok);
    assert.ok((await svc.publishPoll(prisma, { villageId: vA, id, now: NOW })).ok);
    const again = await svc.publishPoll(prisma, { villageId: vA, id, now: NOW });
    assert.ok(!again.ok && again.status === 409);
    const edit = await svc.updatePoll(prisma, { villageId: vA, id, input: { ...input, options: ["X", "Y"] }, now: NOW });
    assert.ok(!edit.ok && edit.status === 409);
    const del = await svc.deletePoll(prisma, vA, id);
    assert.ok(!del.ok && del.status === 409);
    const draft = await svc.createPoll(prisma, { villageId: vA, userId: 1, input, now: NOW });
    assert.ok((await svc.deletePoll(prisma, vA, draft.ok ? draft.data.id : 0)).ok);
  });

  it("desa lain tak bisa mengubah, menerbitkan, menutup, atau melihat hasil", async () => {
    const id = await open();
    assert.ok(!(await svc.updatePoll(prisma, { villageId: vB, id, input, now: NOW })).ok);
    assert.ok(!(await svc.publishPoll(prisma, { villageId: vB, id, now: NOW })).ok);
    assert.ok(!(await svc.closePoll(prisma, { villageId: vB, id, now: NOW })).ok);
    assert.ok(!(await svc.getPoll(prisma, vB, id, NOW)).ok);
    assert.equal((await svc.listPolls(prisma, vB, NOW)).length, 0);
  });

  it("memilih: sekali saja, pilihan harus valid, hasil dihitung benar", async () => {
    const id = await open();
    assert.ok((await vote(id, "a", 0)).ok);
    const twice = await vote(id, "a", 1);
    assert.ok(!twice.ok && twice.code === "ALREADY_VOTED");
    assert.ok((await vote(id, "b", 0)).ok);
    assert.ok((await vote(id, "c", 2)).ok);
    for (const bad of [3, -1, 1.5, "0", null, undefined]) {
      const r = await vote(id, "anak", bad);
      assert.ok(!r.ok && r.code === "INVALID_OPTION", String(bad));
    }
    const res = await svc.getPoll(prisma, vA, id, NOW);
    assert.ok(res.ok);
    if (res.ok) {
      assert.deepEqual(res.data.results.counts, [2, 0, 1]);
      assert.equal(res.data.results.total, 3);
      assert.equal(res.data.results.eligible, 3, "yang hidup dan >= 17 tahun saja");
      assert.equal(res.data.results.turnoutPercent, 100);
    }
  });

  it("tidak berhak: di bawah umur, sudah meninggal, atau warga desa lain", async () => {
    const id = await open();
    const kid = await vote(id, "anak", 0);
    assert.ok(!kid.ok && kid.code === "NOT_ELIGIBLE");
    const dead = await vote(id, "almarhum", 0);
    assert.ok(!dead.ok && dead.code === "NOT_ELIGIBLE");
    const outsider = await vote(id, "lain", 0);
    assert.ok(!outsider.ok && outsider.code === "NOT_ELIGIBLE");
    const wrongVillage = await vote(id, "lain", 0, vB);
    assert.ok(!wrongVillage.ok && wrongVillage.code === "NOT_FOUND", "polling desa A tak terlihat dari desa B");
    assert.equal((await svc.getPoll(prisma, vA, id, NOW)).ok && (await prisma.pollVote.count({ where: { pollId: id } })), 0);
  });

  it("umur minimum bisa diturunkan (anak 11 tahun boleh bila minAge 10)", async () => {
    const id = await open({ minAge: 10 });
    assert.ok((await vote(id, "anak", 0)).ok);
  });

  it("serentak: satu warga menekan berkali-kali bersamaan hanya menghasilkan satu suara", async () => {
    const id = await open();
    const rs = await Promise.all(Array.from({ length: 8 }, () => vote(id, "a", 1)));
    assert.equal(rs.filter((r) => r.ok).length, 1);
    assert.equal(await prisma.pollVote.count({ where: { pollId: id } }), 1);
    assert.equal(await prisma.pollParticipation.count({ where: { pollId: id } }), 1);
  });

  it("waktu: sebelum mulai, setelah tutup, dan ditutup lebih awal menolak suara", async () => {
    const sched = await svc.createPoll(prisma, { villageId: vA, userId: 1, input: { ...input, opensAt: "2026-11-03T08:00:00Z" }, now: NOW });
    const sid = sched.ok ? sched.data.id : 0;
    await svc.publishPoll(prisma, { villageId: vA, id: sid, now: NOW });
    const early = await vote(sid, "a", 0);
    assert.ok(!early.ok && early.code === "NOT_OPEN");
    assert.ok((await vote(sid, "a", 0, vA, new Date("2026-11-03T09:00:00Z"))).ok, "setelah jadwal mulai");
    const late = await vote(sid, "b", 0, vA, new Date("2026-11-09T00:00:00Z"));
    assert.ok(!late.ok && late.code === "NOT_OPEN");
    const id = await open();
    assert.ok((await svc.closePoll(prisma, { villageId: vA, id, now: NOW })).ok);
    const closed = await vote(id, "a", 0);
    assert.ok(!closed.ok && closed.code === "NOT_OPEN");
    const again = await svc.closePoll(prisma, { villageId: vA, id, now: NOW });
    assert.ok(!again.ok && again.status === 409);
  });

  it("kerahasiaan: tabel suara tak memuat id warga atau waktu, id acak (bukan urutan), dan jumlahnya sama dengan partisipasi", async () => {
    const id = await open();
    for (const [who, opt] of [["a", 0], ["b", 1], ["c", 0]] as const) await vote(id, who, opt);
    const votes = await prisma.pollVote.findMany({ where: { pollId: id } });
    assert.deepEqual(Object.keys(votes[0]).sort(), ["id", "optionIndex", "pollId"]);
    assert.ok(votes.every((v) => /^[0-9a-f-]{36}$/.test(v.id)));
    assert.equal(votes.length, await prisma.pollParticipation.count({ where: { pollId: id } }));
  });

  it("daftar untuk warga: status memilih, kelayakan, dan hasil hanya bila ditutup atau showLive", async () => {
    const hidden = await open({ title: "Tertutup" });
    const live = await open({ title: "Langsung", showLive: true });
    await vote(hidden, "a", 0);
    await vote(live, "a", 1);
    const list = await svc.pollsForResident(prisma, { villageId: vA, residentId: rid.a, birthDate: new Date("1980-01-01"), now: NOW });
    const h = list.find((p) => p.id === hidden)!;
    const l = list.find((p) => p.id === live)!;
    assert.equal(h.voted, true);
    assert.equal(h.results, null, "hasil disembunyikan selama berjalan");
    assert.deepEqual(l.results?.counts, [0, 1, 0]);
    const kid = await svc.pollsForResident(prisma, { villageId: vA, residentId: rid.anak, birthDate: new Date("2015-01-01"), now: NOW });
    assert.ok(kid.every((p) => p.eligible === false || p.minAge <= 10));
    assert.ok(!(await svc.pollsForResident(prisma, { villageId: vB, residentId: rid.lain, birthDate: new Date("1980-01-01"), now: NOW })).length, "desa lain tak melihat polling desa A");
  });

  it("menghapus warga tidak menghapus suaranya (partisipasi jadi tanpa id, suara tetap)", async () => {
    const id = await open();
    await vote(id, "c", 2);
    await prisma.resident.delete({ where: { id: rid.c } });
    assert.equal(await prisma.pollVote.count({ where: { pollId: id } }), 1);
  });
});
