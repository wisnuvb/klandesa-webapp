/** Tes integrasi BLT Desa terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("BLT Desa (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let blt: typeof import("../lib/blt/service");
  let vA = 0;
  let vB = 0;
  let seq = 0;

  const resident = (villageId: number, name: string, o: Record<string, unknown> = {}) => {
    seq += 1;
    return prisma.resident.create({ data: { villageId, nik: `${String(Date.now() % 1e8).padStart(8, "0")}${String(seq).padStart(8, "0")}`, kk: `${String(Date.now() % 1e8).padStart(8, "1")}${String(seq).padStart(8, "0")}`, name, birthplace: "x", birthDate: new Date("1980-05-05"), gender: "Laki-laki", address: "Jl. Mawar", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", rt: "01", rw: "02", occupation: "Buruh tani", ...o } });
  };
  const meeting = (villageId: number, kind: string, status = "HELD") => prisma.villageMeeting.create({ data: { villageId, kind, title: kind, scheduledOn: new Date("2026-02-01"), status, heldOn: status === "PLANNED" ? null : new Date("2026-02-01") } });
  const program = async (villageId: number, year = 2026, months = 6) => {
    const r = await blt.createProgram(prisma, { villageId, userId: 1, input: { year, title: `BLT ${year}`, monthly: "300000", totalMonths: months } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const addB = async (villageId: number, programId: number, residentId: number, o: Record<string, unknown> = {}) => blt.addBeneficiary(prisma, { villageId, programId, input: { residentId, source: "PEMERINTAH", category: "Miskin ekstrem", ...o } });
  const decide = async (villageId: number, id: number) => {
    const m = await meeting(villageId, "MUSDES_BLT");
    const p = await blt.patchProgram(prisma, { villageId, id, input: { musdesMeetingId: m.id, decreeNumber: "12/Kpts/2026", decreeDate: "2026-03-01" } });
    assert.ok(p.ok, JSON.stringify(p));
    const s = await blt.changeStatus(prisma, { villageId, id, action: "tetapkan" });
    assert.ok(s.ok, JSON.stringify(s));
  };
  const pay = (villageId: number, programId: number, beneficiaryId: number, o: Record<string, unknown> = {}) => blt.addPayment(prisma, { villageId, programId, userId: 1, input: { beneficiaryId, monthFrom: 1, method: "TUNAI", paidOn: "2026-03-10", ...o } });
  const view = async (villageId: number, id: number) => {
    const r = await blt.getProgram(prisma, villageId, id);
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data : (null as never);
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    blt = await import("../lib/blt/service");
    const t = Date.now() % 1e6;
    const mk = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mk("BA")).id;
    vB = (await mk("BB")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("program: batas Rp300.000 per bulan dari katalog aturan; satu program per tahun", async () => {
    const over = await blt.createProgram(prisma, { villageId: vA, userId: 1, input: { year: 2026, title: "x", monthly: "300001", totalMonths: 3 } });
    assert.equal(over.ok, false);
    assert.ok((await blt.createProgram(prisma, { villageId: vA, userId: 1, input: { year: 2026, title: "BLT", monthly: "300000", totalMonths: 3 } })).ok);
    assert.equal((await blt.createProgram(prisma, { villageId: vA, userId: 1, input: { year: 2026, title: "Lagi", monthly: "100000", totalMonths: 3 } })).ok, false);
    await prisma.bltProgram.deleteMany({ where: { villageId: vA } });
  });

  it("penerima: satu keluarga satu penerima; yang meninggal/pindah/desa lain ditolak; kriteria Desa wajib", async () => {
    const id = await program(vA, 2026);
    const a = await resident(vA, "Pak Budi");
    const sameKk = await resident(vA, "Bu Budi", { kk: a.kk, familyRole: "Istri" });
    const dead = await resident(vA, "Almarhum", { isAlive: false });
    const moved = await resident(vA, "Pindah", { moveDate: new Date("2026-01-01") });
    const foreign = await resident(vB, "Warga Desa Lain");
    assert.ok((await addB(vA, id, a.id)).ok);
    assert.equal((await addB(vA, id, a.id)).ok, false, "orang yang sama");
    assert.equal((await addB(vA, id, sameKk.id)).ok, false, "KK yang sama");
    assert.equal((await addB(vA, id, dead.id)).ok, false);
    assert.equal((await addB(vA, id, moved.id)).ok, false);
    assert.equal((await addB(vA, id, foreign.id)).ok, false, "warga desa lain");
    const c = await resident(vA, "Bu Sari");
    assert.equal((await addB(vA, id, c.id, { source: "DESA", criteria: [] })).ok, false);
    assert.ok((await addB(vA, id, c.id, { source: "DESA", criteria: [1, 5] })).ok);
    const v = await view(vA, id);
    assert.deepEqual(v.beneficiaries.map((b) => [b.name, b.jobGroup, b.criteria.join()]), [["Pak Budi", "Buruh tani", ""], ["Bu Sari", "Buruh tani", "1,5"]]);
    assert.match(v.beneficiaries[0]!.nikMasked!, /^•+\d{4}$/, "NIK disamarkan pada rincian");
    assert.equal(v.summary.needAmount, "3600000.00", "2 keluarga × 6 bulan × Rp300.000");
  });

  it("penetapan: butuh Musdes terlaksana, SK, dan penerima; sesudahnya penerima terkunci", async () => {
    const id = await program(vA, 2027, 3);
    const r = await resident(vA, "Pak Joko");
    assert.equal((await blt.changeStatus(prisma, { villageId: vA, id, action: "tetapkan" })).ok, false, "tanpa Musdes");
    const planned = await meeting(vA, "MUSDES_BLT", "PLANNED");
    assert.ok((await blt.patchProgram(prisma, { villageId: vA, id, input: { musdesMeetingId: planned.id } })).ok);
    assert.equal((await blt.changeStatus(prisma, { villageId: vA, id, action: "tetapkan" })).ok, false, "Musdes belum terlaksana");
    const wrongKind = await meeting(vA, "MUSDES_LAINNYA");
    assert.equal((await blt.patchProgram(prisma, { villageId: vA, id, input: { musdesMeetingId: wrongKind.id } })).ok, false, "jenis musyawarah salah");
    const held = await meeting(vA, "MUSDES_BLT");
    assert.ok((await blt.patchProgram(prisma, { villageId: vA, id, input: { musdesMeetingId: held.id } })).ok);
    assert.equal((await blt.changeStatus(prisma, { villageId: vA, id, action: "tetapkan" })).ok, false, "tanpa nomor SK");
    assert.ok((await blt.patchProgram(prisma, { villageId: vA, id, input: { decreeNumber: "5/Kpts/2027", decreeDate: "2027-02-01" } })).ok);
    assert.equal((await blt.changeStatus(prisma, { villageId: vA, id, action: "tetapkan" })).ok, false, "tanpa penerima");
    assert.ok((await addB(vA, id, r.id)).ok);
    assert.ok((await blt.changeStatus(prisma, { villageId: vA, id, action: "tetapkan" })).ok);
    const late = await resident(vA, "Terlambat");
    assert.equal((await addB(vA, id, late.id)).ok, false, "tak bisa menambah setelah SK");
    assert.equal((await blt.patchProgram(prisma, { villageId: vA, id, input: { monthly: "100000" } })).ok, false, "nilai terkunci");
    assert.ok((await blt.patchProgram(prisma, { villageId: vA, id, input: { reportedToRegencyOn: "2027-02-10" } })).ok, "tanggal pelaporan masih boleh");
    assert.equal((await blt.deleteProgram(prisma, { villageId: vA, id })).ok, false);
  });

  it("pembayaran: maks. 3 bulan sekaligus, tanpa tumpang tindih, jumlah dihitung server, tidak sebelum SK", async () => {
    const id = await program(vA, 2028, 6);
    const r = await resident(vA, "Bu Rina");
    const b = await addB(vA, id, r.id);
    assert.ok(b.ok);
    const bid = b.ok ? b.data.id : 0;
    assert.equal((await pay(vA, id, bid)).ok, false, "belum ditetapkan");
    await decide(vA, id);
    assert.equal((await pay(vA, id, bid, { monthFrom: 1, monthTo: 4 })).ok, false, "4 bulan sekaligus");
    assert.equal((await pay(vA, id, bid, { paidOn: "2026-02-28" })).ok, false, "sebelum tanggal SK");
    assert.equal((await pay(vA, id, bid, { monthFrom: 5, monthTo: 7 })).ok, false, "melewati bulan program");
    const p1 = await pay(vA, id, bid, { monthFrom: 1, monthTo: 3 });
    assert.ok(p1.ok && p1.data.amount === "900000.00", JSON.stringify(p1));
    assert.equal((await pay(vA, id, bid, { monthFrom: 3, monthTo: 4 })).ok, false, "tumpang tindih bulan 3");
    assert.ok((await pay(vA, id, bid, { monthFrom: 4, paidOn: "2026-04-10" })).ok);
    const v = await view(vA, id);
    assert.deepEqual(v.beneficiaries[0]!.paidMonths, [1, 2, 3, 4]);
    assert.equal(v.summary.paidAmount, "1200000.00");
    // pembatalan lalu bayar ulang
    const first = v.payments.find((x) => x.monthFrom === 4)!;
    assert.ok((await blt.voidPayment(prisma, { villageId: vA, programId: id, id: first.id })).ok);
    assert.ok((await pay(vA, id, bid, { monthFrom: 4, paidOn: "2026-04-10" })).ok);
  });

  it("konkurensi: dua pembayaran bersamaan untuk bulan yang sama, hanya satu yang lolos", async () => {
    const id = await program(vA, 2029, 6);
    const r = await resident(vA, "Pak Dodi");
    const b = await addB(vA, id, r.id);
    const bid = b.ok ? b.data.id : 0;
    await decide(vA, id);
    const res = await Promise.all([pay(vA, id, bid, { monthFrom: 2, monthTo: 3 }), pay(vA, id, bid, { monthFrom: 3, monthTo: 3 }), pay(vA, id, bid, { monthFrom: 2, monthTo: 2 })]);
    const rows = await prisma.bltPayment.findMany({ where: { beneficiaryId: bid } });
    const months = rows.flatMap((x) => Array.from({ length: x.monthTo - x.monthFrom + 1 }, (_, i) => x.monthFrom + i));
    assert.equal(new Set(months).size, months.length, "tidak ada bulan yang dibayar dua kali");
    assert.ok(res.filter((x) => x.ok).length >= 1);
  });

  it("penggantian: butuh Musdes khusus terlaksana; pengganti mulai setelah bulan terakhir yang dibayar; yang lama berhenti", async () => {
    const id = await program(vA, 2030, 6);
    const old = await resident(vA, "Pak Lama");
    const nu = await resident(vA, "Bu Baru");
    const b = await addB(vA, id, old.id);
    const oldId = b.ok ? b.data.id : 0;
    await decide(vA, id);
    assert.ok((await pay(vA, id, oldId, { monthFrom: 1, monthTo: 2 })).ok);
    const normal = await meeting(vA, "MUSDES_BLT");
    const plannedKhusus = await meeting(vA, "MUSDES_BLT_KHUSUS", "PLANNED");
    const khusus = await meeting(vA, "MUSDES_BLT_KHUSUS");
    const input = (meetingId: number, extra: Record<string, unknown> = {}) => ({ meetingId, reason: "Meninggal dunia", decreeRef: "20/Kpts/2030", replacement: { residentId: nu.id, source: "PEMERINTAH", category: "Miskin ekstrem" }, ...extra });
    assert.equal((await blt.replaceBeneficiary(prisma, { villageId: vA, programId: id, id: oldId, input: input(normal.id) })).ok, false, "bukan Musdes khusus");
    assert.equal((await blt.replaceBeneficiary(prisma, { villageId: vA, programId: id, id: oldId, input: input(plannedKhusus.id) })).ok, false, "belum terlaksana");
    assert.equal((await blt.replaceBeneficiary(prisma, { villageId: vA, programId: id, id: oldId, input: input(khusus.id, { replacement: { residentId: old.id, source: "PEMERINTAH", category: "x" } }) })).ok, false, "pengganti harus keluarga lain");
    const r = await blt.replaceBeneficiary(prisma, { villageId: vA, programId: id, id: oldId, input: input(khusus.id) });
    assert.ok(r.ok, JSON.stringify(r));
    const newId = r.ok ? r.data.id! : 0;
    assert.equal((await pay(vA, id, oldId, { monthFrom: 3 })).ok, false, "penerima lama tak bisa dibayar lagi");
    assert.equal((await pay(vA, id, newId, { monthFrom: 2 })).ok, false, "bulan 1-2 sudah dibayarkan kepada yang lama");
    assert.ok((await pay(vA, id, newId, { monthFrom: 3, monthTo: 5 })).ok);
    const v = await view(vA, id);
    assert.deepEqual(v.beneficiaries.map((x) => [x.name, x.status, x.startMonth]), [["Pak Lama", "DIGANTI", 1], ["Bu Baru", "AKTIF", 3]]);
    assert.equal(v.beneficiaries[1]!.replacesId, oldId);
    assert.equal((await blt.replaceBeneficiary(prisma, { villageId: vA, programId: id, id: oldId, input: input(khusus.id) })).ok, false, "sudah tidak aktif");
    // berakhir tanpa pengganti
    const solo = await resident(vA, "Pak Tunggal");
    const sb = await addB(vA, await program(vA, 2031, 3), solo.id).catch(() => null);
    void sb;
  });

  it("berakhir tanpa pengganti, penyelesaian, pencabutan, dan pembukaan kembali", async () => {
    const id = await program(vA, 2032, 3);
    const a = await resident(vA, "Pak Satu");
    const b2 = await resident(vA, "Bu Dua");
    const ba = await addB(vA, id, a.id);
    await addB(vA, id, b2.id);
    await decide(vA, id);
    const khusus = await meeting(vA, "MUSDES_BLT_KHUSUS");
    const end = await blt.replaceBeneficiary(prisma, { villageId: vA, programId: id, id: ba.ok ? ba.data.id : 0, input: { meetingId: khusus.id, reason: "Tidak ada keluarga lain yang memenuhi kriteria" } });
    assert.ok(end.ok && end.data.id === null);
    assert.equal((await view(vA, id)).beneficiaries[0]!.status, "BERAKHIR");
    const bid = (await view(vA, id)).beneficiaries[1]!.id;
    assert.ok((await blt.changeStatus(prisma, { villageId: vA, id, action: "cabut" })).ok, "belum ada pembayaran: boleh dicabut");
    await blt.changeStatus(prisma, { villageId: vA, id, action: "tetapkan" });
    assert.ok((await pay(vA, id, bid)).ok);
    assert.equal((await blt.changeStatus(prisma, { villageId: vA, id, action: "cabut" })).ok, false, "sudah ada pembayaran");
    assert.ok((await blt.changeStatus(prisma, { villageId: vA, id, action: "selesai" })).ok);
    assert.equal((await pay(vA, id, bid, { monthFrom: 2 })).ok, false, "program selesai");
    assert.ok((await blt.changeStatus(prisma, { villageId: vA, id, action: "buka" })).ok);
    assert.ok((await pay(vA, id, bid, { monthFrom: 2 })).ok);
  });

  it("batas 3 bulan sekaligus tidak bisa dihindari dengan memecah pembayaran pada tanggal yang sama; tanggal masa depan ditolak", async () => {
    const id = await program(vA, 2036, 12);
    const r = await resident(vA, "Pak Pecah");
    const b = await addB(vA, id, r.id);
    const bid = b.ok ? b.data.id : 0;
    await decide(vA, id);
    assert.ok((await pay(vA, id, bid, { monthFrom: 1, monthTo: 2 })).ok);
    const split = await pay(vA, id, bid, { monthFrom: 3, monthTo: 4 });
    assert.equal(split.ok, false, "2 + 2 bulan pada tanggal yang sama = 4 bulan sekaligus");
    assert.ok((await pay(vA, id, bid, { monthFrom: 3 })).ok, "1 bulan lagi masih dalam batas 3");
    assert.equal((await pay(vA, id, bid, { monthFrom: 4 })).ok, false, "bulan ke-4 pada tanggal yang sama melampaui 3");
    assert.ok((await pay(vA, id, bid, { monthFrom: 4, monthTo: 6, paidOn: "2026-06-10" })).ok, "tanggal lain boleh");
    const future = await blt.addPayment(prisma, { villageId: vA, programId: id, userId: 1, now: new Date("2026-11-01T03:00:00Z"), input: { beneficiaryId: bid, monthFrom: 7, method: "TUNAI", paidOn: "2026-12-25" } });
    assert.equal(future.ok, false, "pembayaran dengan tanggal di masa depan");
    const today = await blt.addPayment(prisma, { villageId: vA, programId: id, userId: 1, now: new Date("2026-11-01T03:00:00Z"), input: { beneficiaryId: bid, monthFrom: 7, method: "TUNAI", paidOn: "2026-11-01" } });
    assert.ok(today.ok, JSON.stringify(today));
  });

  it("pengganti tidak boleh dari Kartu Keluarga yang sama; KK disamarkan pada tampilan", async () => {
    const id = await program(vA, 2037, 6);
    const old = await resident(vA, "Pak KK Satu");
    const sibling = await resident(vA, "Bu KK Satu", { kk: old.kk, familyRole: "Istri" });
    const other = await resident(vA, "Pak KK Dua");
    const b = await addB(vA, id, old.id);
    await decide(vA, id);
    const khusus = await meeting(vA, "MUSDES_BLT_KHUSUS");
    const rep = (residentId: number) => ({ meetingId: khusus.id, reason: "Tidak memenuhi kriteria", replacement: { residentId, source: "PEMERINTAH", category: "Miskin ekstrem" } });
    assert.equal((await blt.replaceBeneficiary(prisma, { villageId: vA, programId: id, id: b.ok ? b.data.id : 0, input: rep(sibling.id) })).ok, false, "satu KK");
    assert.ok((await blt.replaceBeneficiary(prisma, { villageId: vA, programId: id, id: b.ok ? b.data.id : 0, input: rep(other.id) })).ok);
    const v = await view(vA, id);
    assert.ok(v.beneficiaries.every((x) => !x.kk || (x.kk.includes("•") && !x.kk.includes(old.kk!))), "KK disamarkan");
    const s = await blt.searchCandidates(prisma, { villageId: vA, programId: id, q: "KK Satu" });
    assert.ok(s.ok && s.data.every((c) => !c.kk || c.kk.includes("•")));
    const pd = await blt.printData(prisma, { villageId: vA, id, includeEnded: true });
    assert.ok(pd.ok && pd.data.rows.some((r) => r.kk === old.kk), "KK lengkap hanya pada data cetak");
  });

  it("desa lain tidak dapat melihat, mengubah, membayar, mencari, atau mencetak", async () => {
    const id = await program(vA, 2033, 3);
    const r = await resident(vA, "Pak Rahasia");
    const b = await addB(vA, id, r.id);
    const bid = b.ok ? b.data.id : 0;
    await decide(vA, id);
    assert.equal((await blt.getProgram(prisma, vB, id)).ok, false);
    assert.equal((await blt.patchProgram(prisma, { villageId: vB, id, input: { note: "x" } })).ok, false);
    assert.equal((await blt.changeStatus(prisma, { villageId: vB, id, action: "selesai" })).ok, false);
    assert.equal((await pay(vB, id, bid)).ok, false);
    assert.equal((await blt.searchCandidates(prisma, { villageId: vB, programId: id, q: "Pak" })).ok, false);
    assert.equal((await blt.printData(prisma, { villageId: vB, id })).ok, false);
    assert.equal((await blt.removeBeneficiary(prisma, { villageId: vB, programId: id, id: bid })).ok, false);
    assert.equal((await blt.deleteProgram(prisma, { villageId: vB, id })).ok, false);
    assert.equal(await prisma.bltPayment.count({ where: { villageId: vB } }), 0);
  });

  it("pencarian dan cetak: NIK disamarkan di pencarian, lengkap hanya di data cetak; peringatan PKH dan NIK", async () => {
    const id = await program(vA, 2034, 3);
    const r = await resident(vA, "Bu Cantik Ajaib", { occupation: null });
    const noNik = await resident(vA, "Bu Cantik Dua", { nik: `${String(seq + 777).padStart(15, "0")}9` });
    await prisma.resident.update({ where: { id: noNik.id }, data: { nik: "12345" } });
    const s = await blt.searchCandidates(prisma, { villageId: vA, programId: id, q: "Cantik" });
    assert.ok(s.ok && s.data.length === 2);
    if (s.ok) assert.ok(s.data.every((c) => /^•*\d{0,4}$/.test(c.nikMasked ?? "") && !c.nikMasked!.includes(r.nik)));
    assert.ok((await addB(vA, id, r.id, { source: "DESA", criteria: [3] })).ok);
    assert.ok((await addB(vA, id, noNik.id)).ok);
    const prog = await prisma.socialBenefitProgram.create({ data: { villageId: vA, name: "PKH 2026" } });
    await prisma.socialBenefitBeneficiary.create({ data: { programId: prog.id, nik: r.nik } });
    const v = await view(vA, id);
    assert.ok(v.beneficiaries[0]!.warnings.some((w) => /PKH/.test(w)), "kriteria 3 bertentangan dengan penerima PKH");
    assert.ok(v.beneficiaries[1]!.warnings.some((w) => /NIK belum 16 digit/.test(w)));
    assert.equal(v.beneficiaries[0]!.jobGroup, "Tidak bekerja / tidak tercatat");
    const pd = await blt.printData(prisma, { villageId: vA, id });
    assert.ok(pd.ok && pd.data.rows[0]!.nik === r.nik && pd.data.rows.length === 2);
    if (pd.ok) assert.deepEqual(pd.data.byCategory, [["Miskin ekstrem", 2]].map(([category, count]) => ({ category, count })));
  });
});
