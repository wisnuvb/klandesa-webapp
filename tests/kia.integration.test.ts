/** Tes integrasi KIA dan lansia terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("KIA dan posyandu lansia (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/kia/service");
  let vA = 0;
  let vB = 0;
  const NOW = new Date("2026-11-01T03:00:00Z");
  const ids: Record<string, number> = {};

  const mkR = (villageId: number, key: string, gender: string, birth: string, extra: Record<string, unknown> = {}) =>
    prisma.resident.create({ data: { villageId, nik: `${Date.now() % 1e9}${key}`.padEnd(16, "0").slice(0, 16), name: `Warga ${key}`, birthplace: "x", birthDate: new Date(birth), gender, address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Istri", rt: "01", rw: "02", ...extra } });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/kia/service");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("IA")).id;
    vB = (await mkV("IB")).id;
    ids.ibu = (await mkR(vA, "11", "Perempuan", "1995-03-10")).id;
    ids.ibu2 = (await mkR(vA, "12", "Perempuan", "2000-05-05")).id;
    ids.ibuB = (await mkR(vB, "13", "Perempuan", "1995-03-10")).id;
    ids.ayah = (await mkR(vA, "14", "Laki-laki", "1990-01-01")).id;
    ids.remaja = (await mkR(vA, "15", "Perempuan", "2020-01-01")).id;
    ids.wafat = (await mkR(vA, "16", "Perempuan", "1990-01-01", { isAlive: false })).id;
    ids.lansia = (await mkR(vA, "21", "Laki-laki", "1950-04-04")).id;
    ids.lansia2 = (await mkR(vA, "22", "Perempuan", "1955-04-04")).id;
    ids.lansia3 = (await mkR(vA, "23", "Perempuan", "1950-01-01")).id;
    ids.muda = (await mkR(vA, "24", "Laki-laki", "1980-04-04")).id;
    ids.lansiaB = (await mkR(vB, "25", "Laki-laki", "1950-04-04")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  const reg = (residentId: number, lmpDate: string, villageId = vA) => svc.registerPregnancy(prisma, { villageId, userId: 1, input: { residentId, lmpDate }, now: NOW });
  const visit = (pregnancyId: number, input: Record<string, unknown>, villageId = vA) => svc.addVisit(prisma, { villageId, pregnancyId, userId: 1, input, now: NOW });

  it("mendaftarkan kehamilan: HPL otomatis, hanya perempuan hidup di desa sendiri, HPHT wajar", async () => {
    const r = await reg(ids.ibu!, "2026-05-01");
    assert.ok(r.ok);
    assert.equal(r.ok && r.data.edd, "2027-02-05");
    assert.equal((await reg(ids.ayah!, "2026-05-01")).ok, false, "laki-laki");
    assert.equal((await reg(ids.wafat!, "2026-05-01")).ok, false, "sudah meninggal");
    assert.equal((await reg(ids.remaja!, "2026-05-01")).ok, false, "umur 6 tahun tidak wajar");
    assert.equal((await reg(ids.ibu2!, "2026-12-01")).ok, false, "HPHT masa depan");
    assert.equal((await reg(ids.ibu2!, "2025-10-01")).ok, false, "HPHT lebih dari 43 minggu");
    assert.equal((await reg(ids.ibuB!, "2026-05-01")).ok, false, "warga desa lain tak bisa didaftarkan dari desa A");
    assert.ok((await reg(ids.ibuB!, "2026-05-01", vB)).ok);
  });

  it("hanya satu kehamilan terbuka per warga, termasuk saat didaftarkan serentak; boleh lagi setelah diakhiri", async () => {
    const res = await Promise.all(Array.from({ length: 5 }, () => reg(ids.ibu2!, "2026-06-01")));
    assert.equal(res.filter((r) => r.ok).length, 1);
    const id = res.find((r) => r.ok)!;
    const pid = id.ok ? id.data.id : 0;
    assert.equal((await svc.endPregnancy(prisma, { villageId: vB, pregnancyId: pid, input: { status: "BERSALIN", endedAt: "2026-10-30" }, now: NOW })).ok, false, "desa lain tak bisa mengakhiri");
    assert.equal((await svc.endPregnancy(prisma, { villageId: vA, pregnancyId: pid, input: { status: "BERSALIN", endedAt: "2026-05-01" }, now: NOW })).ok, false, "tanggal sebelum HPHT");
    assert.equal((await svc.endPregnancy(prisma, { villageId: vA, pregnancyId: pid, input: { status: "LAHIR", endedAt: "2026-10-30" }, now: NOW })).ok, false, "status asing");
    assert.ok((await svc.endPregnancy(prisma, { villageId: vA, pregnancyId: pid, input: { status: "KEGUGURAN", endedAt: "2026-08-01", endNote: "dirujuk puskesmas" }, now: NOW })).ok);
    assert.equal((await svc.endPregnancy(prisma, { villageId: vA, pregnancyId: pid, input: { status: "KEGUGURAN", endedAt: "2026-08-02" }, now: NOW })).ok, false, "sudah berakhir");
    assert.equal((await visit(pid, { visitDate: "2026-08-02", provider: "BIDAN" })).ok, false, "kunjungan pada kehamilan yang berakhir ditolak");
    assert.ok((await reg(ids.ibu2!, "2026-09-01")).ok, "kehamilan baru setelah yang lama berakhir");
  });

  it("kunjungan: minggu dan trimester dihitung dari HPHT, penanda keluar, desa lain tak bisa menulis", async () => {
    const list = await svc.maternalBoard(prisma, vA, NOW);
    const mine = list.pregnancies.find((p) => p.residentId === ids.ibu)!;
    assert.equal(mine.weeks, 26); // 1 Mei -> 1 Nov = 184 hari
    assert.equal(mine.trimester, 3);
    assert.equal(mine.visitCount, 0);
    assert.deepEqual(mine.plan.missing, ["trimester 1 kurang 2", "trimester 2 kurang 1", "trimester 3 kurang 1"]);

    assert.equal((await visit(mine.id, { visitDate: "2026-04-01", provider: "BIDAN" })).ok, false, "sebelum HPHT");
    assert.equal((await visit(mine.id, { visitDate: "2026-05-20", provider: "BIDAN" }, vB)).ok, false, "desa lain");
    const v1 = await visit(mine.id, { visitDate: "2026-05-20", provider: "DOKTER", ultrasound: true, weightKg: 55, systolic: 110, diastolic: 70 });
    assert.ok(v1.ok && v1.data.weeks === 2 && v1.data.trimester === 1);
    const v2 = await visit(mine.id, { visitDate: "2026-10-27", provider: "BIDAN", systolic: 150, diastolic: 95, upperArmCm: 22, hemoglobin: 10, dangerSigns: ["BENGKAK_KEJANG"] });
    assert.ok(v2.ok && v2.data.trimester === 3);
    assert.equal(v2.ok && v2.data.flags.length, 4);

    const board = await svc.maternalBoard(prisma, vA, NOW);
    const b = board.pregnancies.find((p) => p.residentId === ids.ibu)!;
    assert.equal(b.visitCount, 2);
    assert.equal(b.lastVisit, "2026-10-27");
    assert.equal(b.flags.length, 4);
    assert.equal(board.pregnancies[0]!.residentId, ids.ibu, "yang berpenanda paling atas");
    assert.equal(board.summary.flagged >= 1, true);

    const det = await svc.pregnancyDetail(prisma, vA, mine.id, NOW);
    assert.ok(det.ok && det.data.visits.length === 2 && det.data.visits[0]!.bloodPressure === "150/95");
    assert.equal((await svc.pregnancyDetail(prisma, vB, mine.id, NOW)).ok, false);
  });

  it("catatan yang sudah punya kunjungan tidak bisa dihapus; yang kosong bisa", async () => {
    const board = await svc.maternalBoard(prisma, vA, NOW);
    const withVisits = board.pregnancies.find((p) => p.residentId === ids.ibu)!;
    assert.equal((await svc.deletePregnancy(prisma, { villageId: vA, pregnancyId: withVisits.id })).ok, false);
    const empty = board.pregnancies.find((p) => p.residentId === ids.ibu2)!;
    assert.equal((await svc.deletePregnancy(prisma, { villageId: vB, pregnancyId: empty.id })).ok, false, "desa lain");
    assert.ok((await svc.deletePregnancy(prisma, { villageId: vA, pregnancyId: empty.id })).ok);
  });

  it("warga yang pindah: tak bisa didaftarkan atau diperiksa, dan kehamilan atasnya keluar dari papan tetapi terhitung", async () => {
    const pindah = await mkR(vA, "31", "Perempuan", "1994-02-02", { moveDate: new Date("2026-09-01") });
    assert.equal((await reg(pindah.id, "2026-08-01")).ok, false);
    const lansiaPindah = await mkR(vA, "32", "Laki-laki", "1945-02-02", { moveDate: new Date("2026-09-01") });
    assert.equal((await svc.addElderCheck(prisma, { villageId: vA, userId: 1, input: { residentId: lansiaPindah.id, checkedAt: "2026-10-20", weightKg: 55 }, now: NOW })).ok, false);
    assert.equal((await svc.elderBoard(prisma, vA, NOW)).elders.some((e) => e.residentId === lansiaPindah.id), false, "lansia pindah tak masuk papan");
    const hamil = await mkR(vA, "33", "Perempuan", "1994-02-02");
    const r = await reg(hamil.id, "2026-08-01");
    assert.ok(r.ok);
    const before = await svc.maternalBoard(prisma, vA, NOW);
    assert.equal(before.pregnancies.some((p) => p.residentId === hamil.id), true);
    await prisma.resident.update({ where: { id: hamil.id }, data: { moveDate: new Date("2026-10-15") } });
    const after = await svc.maternalBoard(prisma, vA, NOW);
    assert.equal(after.pregnancies.some((p) => p.residentId === hamil.id), false);
    assert.equal(after.summary.residentGone, before.summary.residentGone + 1);
    assert.equal((await svc.endPregnancy(prisma, { villageId: vA, pregnancyId: r.ok ? r.data.id : 0, input: { status: "BERSALIN", endedAt: "2026-10-30" }, now: NOW })).ok, true, "tetap bisa diakhiri");
  });

  it("tanggal akhir kehamilan tak boleh melewati 43 minggu dari HPHT", async () => {
    const w = await mkR(vA, "34", "Perempuan", "1993-02-02");
    const r = await reg(w.id, "2026-02-01");
    assert.ok(r.ok);
    const pid = r.ok ? r.data.id : 0;
    assert.equal((await svc.endPregnancy(prisma, { villageId: vA, pregnancyId: pid, input: { status: "BERSALIN", endedAt: "2026-12-05" }, now: new Date("2027-12-01T03:00:00Z") })).ok, false);
    assert.ok((await svc.endPregnancy(prisma, { villageId: vA, pregnancyId: pid, input: { status: "BERSALIN", endedAt: "2026-10-01" }, now: NOW })).ok);
  });

  it("lansia: usia minimal 60, papan menandai belum diperiksa, terlambat, dan penanda; desa lain terisolasi", async () => {
    const add = (residentId: number, input: Record<string, unknown>, villageId = vA) => svc.addElderCheck(prisma, { villageId, userId: 1, input: { residentId, ...input }, now: NOW });
    assert.equal((await add(ids.muda!, { checkedAt: "2026-10-20", weightKg: 70 })).ok, false, "umur 46");
    assert.equal((await add(ids.lansiaB!, { checkedAt: "2026-10-20", weightKg: 70 })).ok, false, "warga desa lain");
    const ok1 = await add(ids.lansia!, { checkedAt: "2026-10-20", weightKg: 60, heightCm: 160, systolic: 160, diastolic: 95, glucoseMgDl: 130, glucoseType: "PUASA", adlScore: 18 });
    assert.ok(ok1.ok && ok1.data.flags.length === 2);
    assert.ok((await add(ids.lansia2!, { checkedAt: "2026-06-01", weightKg: 50 })).ok);

    const board = await svc.elderBoard(prisma, vA, NOW);
    const byId = (id: number) => board.elders.find((e) => e.residentId === id)!;
    assert.equal(byId(ids.lansia!).status, "OK");
    assert.equal(byId(ids.lansia!).lastCheck?.bmi, 23.4);
    assert.equal(byId(ids.lansia2!).status, "OVERDUE");
    assert.equal(byId(ids.lansia3!).status, "NEVER");
    assert.equal(board.elders.some((e) => e.residentId === ids.muda), false);
    assert.equal(board.elders.some((e) => e.residentId === ids.lansiaB), false);
    assert.equal(board.elders[0]!.residentId, ids.lansia, "yang berpenanda paling atas");
    assert.equal(board.summary.flagged, 1);

    const hist = await svc.elderHistory(prisma, vA, ids.lansia!);
    assert.ok(hist.ok && hist.data.checks.length === 1);
    assert.equal((await svc.elderHistory(prisma, vB, ids.lansia!)).ok, false);
    const cid = hist.ok ? hist.data.checks[0]!.id : 0;
    assert.equal((await svc.deleteElderCheck(prisma, { villageId: vB, checkId: cid })).ok, false);
    assert.ok((await svc.deleteElderCheck(prisma, { villageId: vA, checkId: cid })).ok);
  });
});
