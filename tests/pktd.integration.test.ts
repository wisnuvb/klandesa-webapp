/** Tes integrasi PKTD terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("PKTD (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let pk: typeof import("../lib/pktd/service");
  let vA = 0;
  let vB = 0;
  let seq = 0;
  const NOW = new Date("2026-11-01T03:00:00Z");

  const resident = (villageId: number, name: string, o: Record<string, unknown> = {}) => {
    seq += 1;
    return prisma.resident.create({ data: { villageId, nik: `${String(Date.now() % 1e8).padStart(8, "0")}${String(seq).padStart(8, "2")}`, name, birthplace: "x", birthDate: new Date("1985-05-05"), gender: "Laki-laki", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", rt: "01", rw: "02", ...o } });
  };
  const act = async (villageId: number, o: Record<string, unknown> = {}) => {
    const r = await pk.createActivity(prisma, { villageId, userId: 1, input: { year: 2026, title: "Rabat jalan", cost: "10000000", plannedWage: "6000000", wageMin: undefined, ...o } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const worker = async (villageId: number, activityId: number, name: string, priority = "PENGANGGUR") => {
    const r = await pk.addWorker(prisma, { villageId, activityId, input: { name, gender: "L", priority } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const days = (villageId: number, activityId: number, workerIds: number[], o: Record<string, unknown> = {}) => pk.addWorkDays(prisma, { skipFunding: true, villageId, activityId, userId: 1, now: NOW, input: { workDate: "2026-03-02", task: "PELAKSANAAN", wage: "80000", workerIds, ...o } });
  const view = async (villageId: number, id: number) => {
    const r = await pk.getActivity(prisma, villageId, id);
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data : (null as never);
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    pk = await import("../lib/pktd/service");
    const t = Date.now() % 1e6;
    const mk = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mk("PA")).id;
    vB = (await mk("PB")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("rasio upah: rencana di bawah 50% diperingatkan; realisasi dihitung dari hari kerja tercatat", async () => {
    const id = await act(vA, { plannedWage: "4000000" });
    const w1 = await worker(vA, id, "Pak A");
    const w2 = await worker(vA, id, "Pak B", "LAINNYA");
    let v = await view(vA, id);
    assert.ok(v.warnings.some((x) => x.level === "ERROR" && /40% dari biaya/.test(x.message)));
    assert.ok((await pk.patchActivity(prisma, { villageId: vA, id, input: { plannedWage: "5000000" } })).ok);
    assert.ok((await days(vA, id, [w1, w2])).ok);
    v = await view(vA, id);
    assert.equal(v.recordedWage, "160000.00");
    assert.equal(v.recordedShareBps, 160);
    assert.equal(v.warnings.some((x) => x.level === "ERROR"), false, "tepat 50% lolos");
    assert.equal(v.stats.workDays, 2);
    assert.equal(v.stats.priorityWorkers, 1);
    assert.ok(v.warnings.some((x) => /2 hari kerja belum ditandai dibayar/.test(x.message)));
  });

  it("hari kerja: satu pekerja satu hari, batas upah ditegakkan, tidak masa depan, dalam periode kegiatan, tidak melebihi biaya", async () => {
    const id = await act(vA, { startDate: "2026-03-01", endDate: "2026-04-30", cost: "300000", plannedWage: "200000" });
    const w = await worker(vA, id, "Bu C", "PEREMPUAN_KK");
    assert.ok((await pk.patchActivity(prisma, { villageId: vA, id, input: { wageMin: "50000", wageMax: "100000" } })).ok);
    assert.equal((await days(vA, id, [w], { wage: "40000" })).ok, false, "di bawah batas bawah");
    assert.equal((await days(vA, id, [w], { wage: "150000" })).ok, false, "di atas batas atas");
    assert.equal((await days(vA, id, [w], { workDate: "2026-02-28" })).ok, false, "sebelum kegiatan mulai");
    assert.equal((await days(vA, id, [w], { workDate: "2026-05-02" })).ok, false, "setelah kegiatan selesai");
    assert.equal((await days(vA, id, [w], { workDate: "2026-12-25" })).ok, false, "masa depan");
    assert.ok((await days(vA, id, [w], { workDate: "2026-03-02" })).ok);
    assert.equal((await days(vA, id, [w], { workDate: "2026-03-02" })).ok, false, "dua kali pada hari yang sama");
    assert.ok((await days(vA, id, [w], { workDate: "2026-03-03" })).ok);
    assert.ok((await days(vA, id, [w], { workDate: "2026-03-04", wage: "100000" })).ok);
    assert.equal((await days(vA, id, [w], { workDate: "2026-03-05", wage: "100000" })).ok, false, "upah tercatat akan melebihi biaya Rp300.000");
    // batas baru yang membuat catatan lama di luar batas ditolak
    assert.equal((await pk.patchActivity(prisma, { villageId: vA, id, input: { wageMax: "90000" } })).ok, false);
  });

  it("pembayaran harian: tandai dibayar per tanggal; hapus per tanggal; kegiatan selesai terkunci", async () => {
    const id = await act(vA);
    const w1 = await worker(vA, id, "Pak D");
    const w2 = await worker(vA, id, "Pak E");
    assert.ok((await days(vA, id, [w1, w2])).ok);
    assert.equal((await pk.markPaid(prisma, { skipFunding: true, villageId: vA, activityId: id, now: NOW, input: { workDate: "2026-03-02", paidOn: "2026-03-01" } })).ok, false, "sebelum tanggal kerja");
    assert.equal((await pk.markPaid(prisma, { skipFunding: true, villageId: vA, activityId: id, now: NOW, input: { workDate: "2026-03-02", paidOn: "2026-12-30" } })).ok, false, "masa depan");
    const paid = await pk.markPaid(prisma, { skipFunding: true, villageId: vA, activityId: id, now: NOW, input: { workDate: "2026-03-02", paidOn: "2026-03-02" } });
    assert.ok(paid.ok && paid.data.updated === 2);
    assert.equal((await pk.markPaid(prisma, { skipFunding: true, villageId: vA, activityId: id, now: NOW, input: { workDate: "2026-03-02", paidOn: "2026-03-02" } })).ok, false, "sudah dibayar semua");
    let v = await view(vA, id);
    assert.equal(v.paidWage, "160000.00");
    assert.equal(v.warnings.some((x) => /belum ditandai dibayar/.test(x.message)), false);
    // dibayar langsung saat dicatat
    assert.ok((await days(vA, id, [w1], { workDate: "2026-03-03", paid: true })).ok);
    assert.equal((await view(vA, id)).paidWage, "240000.00");
    assert.ok((await pk.patchActivity(prisma, { villageId: vA, id, input: { status: "SELESAI" } })).ok);
    assert.equal((await days(vA, id, [w2], { workDate: "2026-03-04" })).ok, false, "selesai: tidak bisa mencatat");
    assert.equal((await pk.deleteWorkDays(prisma, { villageId: vA, activityId: id, date: new Date("2026-03-03") })).ok, false, "selesai: tidak bisa menghapus");
    assert.equal((await pk.patchActivity(prisma, { villageId: vA, id, input: { title: "Ganti" } })).ok, false, "selesai: isian terkunci");
    assert.equal((await pk.markPaid(prisma, { skipFunding: true, villageId: vA, activityId: id, now: NOW, input: { workDate: "2026-03-03", paidOn: "2026-03-03" } })).ok, false, "selesai: pembayaran terkunci");
    assert.equal((await pk.removeWorker(prisma, { villageId: vA, activityId: id, id: w2 })).ok, false, "selesai: pekerja terkunci");
    assert.equal((await pk.patchActivity(prisma, { villageId: vA, id, input: { status: "AKTIF" } })).ok, false, "hanya admin (izin approve) yang boleh membuka kembali");
    assert.ok((await pk.patchActivity(prisma, { villageId: vA, id, input: { status: "AKTIF" }, allowReopen: true })).ok, "dibuka kembali oleh admin");
    const delPaid = await pk.deleteWorkDays(prisma, { villageId: vA, activityId: id, date: new Date("2026-03-03") });
    assert.equal(delPaid.ok, false, "upah yang sudah dibayar tidak dapat dihapus oleh operator");
    const delAdmin = await pk.deleteWorkDays(prisma, { villageId: vA, activityId: id, date: new Date("2026-03-03"), allowPaid: true });
    assert.ok(delAdmin.ok && delAdmin.data.paid === 1 && delAdmin.data.amount === "80000.00", "admin boleh, dengan jumlah tercatat untuk audit");
    v = await view(vA, id);
    assert.equal(v.recordedWage, "160000.00");
    assert.equal((await pk.deleteActivity(prisma, { villageId: vA, id })).ok, false, "punya catatan hari kerja");
  });

  it("total biaya tidak boleh diturunkan di bawah upah yang sudah tercatat", async () => {
    const id = await act(vA, { cost: "1000000", plannedWage: "600000" });
    const w = await worker(vA, id, "Pak Z");
    assert.ok((await days(vA, id, [w], { wage: "100000" })).ok);
    const low = await pk.patchActivity(prisma, { villageId: vA, id, input: { cost: "90000", plannedWage: "50000" } });
    assert.equal(low.ok, false);
    const ok = await pk.patchActivity(prisma, { villageId: vA, id, input: { cost: "100000", plannedWage: "50000" } });
    assert.ok(ok.ok && ok.data.before.cost === "1000000.00", "tepat sama dengan upah tercatat boleh; nilai lama dikembalikan untuk audit");
  });

  it("selesai tapi upah di bawah 50% diperingatkan sebagai galat", async () => {
    const id = await act(vA, { cost: "1000000", plannedWage: "600000" });
    const w = await worker(vA, id, "Pak F");
    assert.ok((await days(vA, id, [w])).ok);
    assert.ok((await pk.patchActivity(prisma, { villageId: vA, id, input: { status: "SELESAI" } })).ok);
    assert.ok((await view(vA, id)).warnings.some((x) => x.level === "ERROR" && /terealisasi baru 8%/.test(x.message)));
  });

  it("pekerja: warga desa sendiri saja, tidak ganda, jenis kelamin dari data warga; yang meninggal ditolak; tidak bisa dihapus bila sudah bekerja", async () => {
    const id = await act(vA);
    const r = await resident(vA, "Bu Wati", { gender: "Perempuan" });
    const dead = await resident(vA, "Almarhum", { isAlive: false });
    const foreign = await resident(vB, "Warga Lain");
    const add = (residentId: number) => pk.addWorker(prisma, { villageId: vA, activityId: id, input: { residentId, priority: "PEREMPUAN_KK" } });
    const a = await add(r.id);
    assert.ok(a.ok);
    assert.equal((await add(r.id)).ok, false, "ganda");
    assert.equal((await add(dead.id)).ok, false);
    assert.equal((await add(foreign.id)).ok, false, "warga desa lain");
    const v = await view(vA, id);
    assert.deepEqual(v.workers.map((w) => [w.name, w.gender, w.priorityLabel]), [["Bu Wati", "P", "Perempuan kepala keluarga"]]);
    assert.equal(v.stats.women, 1);
    assert.ok((await days(vA, id, [a.ok ? a.data.id : 0])).ok);
    assert.equal((await pk.removeWorker(prisma, { villageId: vA, activityId: id, id: a.ok ? a.data.id : 0 })).ok, false);
    const s = await pk.searchCandidates(prisma, { villageId: vA, activityId: id, q: "Wati" });
    assert.ok(s.ok && s.data[0]?.alreadyIn === true && !("nik" in s.data[0]!));
  });

  it("konkurensi: dua pencatatan bersamaan yang bersama-sama melebihi biaya, hanya satu yang lolos", async () => {
    const id = await act(vA, { cost: "100000", plannedWage: "60000" });
    const ws = [await worker(vA, id, "P1"), await worker(vA, id, "P2")];
    const res = await Promise.all([days(vA, id, [ws[0]!], { wage: "80000" }), days(vA, id, [ws[1]!], { wage: "80000" })]);
    assert.equal(res.filter((x) => x.ok).length, 1, "total tercatat tidak boleh melebihi Rp100.000");
    assert.ok((await view(vA, id)).recordedShareBps <= 10000);
  });

  it("desa lain tidak dapat melihat, mengubah, mencatat, mencari, atau mencetak", async () => {
    const id = await act(vA);
    const w = await worker(vA, id, "Pak Rahasia");
    assert.ok((await days(vA, id, [w])).ok);
    assert.equal((await pk.getActivity(prisma, vB, id)).ok, false);
    assert.equal((await pk.patchActivity(prisma, { villageId: vB, id, input: { note: "x" } })).ok, false);
    assert.equal((await pk.addWorker(prisma, { villageId: vB, activityId: id, input: { name: "x", priority: "LAINNYA" } })).ok, false);
    assert.equal((await days(vB, id, [w], { workDate: "2026-03-09" })).ok, false);
    assert.equal((await pk.markPaid(prisma, { skipFunding: true, villageId: vB, activityId: id, now: NOW, input: { workDate: "2026-03-02", paidOn: "2026-03-02" } })).ok, false);
    assert.equal((await pk.deleteWorkDays(prisma, { villageId: vB, activityId: id, date: new Date("2026-03-02") })).ok, false);
    assert.equal((await pk.searchCandidates(prisma, { villageId: vB, activityId: id, q: "Pak" })).ok, false);
    assert.equal((await pk.printData(prisma, { villageId: vB, id })).ok, false);
    assert.equal((await pk.deleteActivity(prisma, { villageId: vB, id })).ok, false);
    assert.equal((await pk.listActivities(prisma, vB, 2026)).length, 0);
  });

  it("lembar cetak: kolom tanggal, jumlah per pekerja, rasio terhadap biaya", async () => {
    const id = await act(vA, { cost: "1000000", plannedWage: "600000" });
    const w1 = await worker(vA, id, "Pak G");
    const w2 = await worker(vA, id, "Pak H");
    await days(vA, id, [w1, w2], { workDate: "2026-03-02" });
    await days(vA, id, [w1], { workDate: "2026-03-03" });
    const r = await pk.printData(prisma, { villageId: vA, id });
    assert.ok(r.ok);
    if (r.ok) {
      assert.deepEqual(r.data.dates, ["2026-03-02", "2026-03-03"]);
      assert.deepEqual(r.data.rows.map((x) => [x.name, x.days, x.total]), [["Pak G", 2, "160000.00"], ["Pak H", 1, "80000.00"]]);
      assert.equal(r.data.total, "240000.00");
      assert.equal(r.data.shareBps, 2400);
    }
    const sub = await pk.printData(prisma, { villageId: vA, id, from: new Date("2026-03-03"), to: new Date("2026-03-03") });
    assert.ok(sub.ok && sub.data.dates.length === 1 && sub.data.rows.length === 1);
  });
});
