/** Tes integrasi kerja sama desa terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Kerja sama desa (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let ks: typeof import("../lib/kerja-sama/service");
  let vA = 0;
  let vB = 0;
  const made: number[] = [];
  const TODAY = "2026-11-01";

  const mkVillage = async (c: string) => {
    const v = await prisma.village.create({ data: { code: `${c}${Date.now() % 1e6}${Math.floor(Math.random() * 1000)}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    made.push(v.id);
    return v.id;
  };
  const meeting = async (villageId: number, o: Record<string, unknown> = {}) =>
    (await prisma.villageMeeting.create({ data: { villageId, kind: "MUSDES_LAINNYA", title: "Musdes kerja sama", scheduledOn: new Date("2026-03-01"), status: "HELD", heldOn: new Date("2026-03-01"), ...o } })).id;
  const create = async (villageId: number, o: Record<string, unknown> = {}) => {
    const r = await ks.createAgreement(prisma, { villageId, userId: 1, input: { year: 2026, kind: "ANTAR_DESA", title: "Wisata bersama", field: "PEMBANGUNAN", ...o } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const patch = (villageId: number, id: number, input: Record<string, unknown>) => ks.patchAgreement(prisma, { villageId, id, input });
  const move = (villageId: number, id: number, body: Record<string, unknown>) => ks.transition(prisma, { villageId, id, body });
  const get = async (villageId: number, id: number) => {
    const r = await ks.getAgreement(prisma, { villageId, id, today: TODAY });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data : (null as never);
  };
  const FULL_CONTENT = { scope: "Pengelolaan wisata", procedures: "Dikelola BKAD", rights: "Setara", funding: "APB Desa masing-masing", amendment: "Atas kesepakatan", dispute: "Musyawarah", termStartOn: "2026-06-01", termEndOn: "2027-05-31" };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    ks = await import("../lib/kerja-sama/service");
    vA = await mkVillage("KA");
    vB = await mkVillage("KB");
  });
  after(async () => {
    for (const id of made) await prisma.village.delete({ where: { id } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("alur antar-Desa lengkap, tiap pagar menolak lalu meloloskan; isi terkunci setelah ditandatangani", async () => {
    const id = await create(vA);
    const d0 = await get(vA, id);
    assert.equal(d0.parties.length, 1);
    assert.equal(d0.parties[0].kind, "SELF");
    assert.match(d0.parties[0].name, /^Pemerintah Desa KA/, "awalan 'Desa' tidak digandakan");
    assert.doesNotMatch(d0.parties[0].name, /Desa Desa/);
    // penawaran: butuh Musdes terlaksana, RPJM/RKP, delapan muatan
    const early = await move(vA, id, { to: "PENAWARAN" });
    assert.ok(!early.ok && early.status === 409 && early.errors.length >= 3);
    const planned = await meeting(vA, { status: "PLANNED", heldOn: null });
    assert.ok((await patch(vA, id, { ...FULL_CONTENT, prepMusdesId: planned, inPlanConfirmed: true })).ok);
    const stillNo = await move(vA, id, { to: "PENAWARAN" });
    assert.ok(!stillNo.ok && stillNo.errors.some((e) => /Musyawarah Desa/.test(e)), "Musdes belum terlaksana");
    const held = await meeting(vA);
    assert.ok((await patch(vA, id, { prepMusdesId: held })).ok);
    assert.ok((await move(vA, id, { to: "PENAWARAN" })).ok);
    // penyusunan
    assert.ok(!(await move(vA, id, { to: "PENYUSUNAN" })).ok);
    const sj = await ks.addParty(prisma, { villageId: vA, agreementId: id, input: { kind: "DESA", name: "Desa B (Kec. X)", representativeName: "Kades B" } });
    assert.ok(sj.ok);
    assert.ok((await ks.patchParty(prisma, { villageId: vA, id: d0.parties[0].id, input: { representativeName: "Kades A", representativeTitle: "Kepala Desa" } })).ok);
    const offerMeet = await meeting(vA, { title: "Musdes penawaran" });
    assert.ok((await patch(vA, id, { offerSentOn: "2026-03-05", offerMusdesId: offerMeet, offerDecision: "SEPAKAT", offerReplyOn: "2026-03-12" })).ok);
    assert.ok((await move(vA, id, { to: "PENYUSUNAN" })).ok);
    // RAB: beban Desa ini mewajibkan konsultasi sebelum penandatanganan
    const self = (await get(vA, id)).parties[0];
    assert.ok((await ks.addBudget(prisma, { villageId: vA, agreementId: id, input: { description: "Papan nama", amount: "5000000", bearerId: self.id } })).ok);
    assert.ok((await ks.addBudget(prisma, { villageId: vA, agreementId: id, input: { description: "Promosi", amount: "3000000", bearerId: sj.ok ? sj.data.id : 0 } })).ok);
    const d1 = await get(vA, id);
    assert.equal(d1.total, "8000000.00");
    assert.equal(d1.selfShare, "5000000.00");
    const sign0 = await ks.sign(prisma, { villageId: vA, id, body: { signedOn: "2026-04-03", signedNumber: "PB/01/2026" }, canApprove: true });
    assert.ok(!sign0.ok && sign0.errors.some((e) => /kesepakatan/.test(e)) && sign0.errors.some((e) => /dikonsultasikan/.test(e)), sign0.ok ? "" : sign0.errors.join("|"));
    assert.equal((await get(vA, id)).status, "PENYUSUNAN", "gagal = tidak ada yang tersimpan");
    assert.equal((await get(vA, id)).signedNumber, null);
    assert.ok((await patch(vA, id, { agreedOn: "2026-04-01", consultedOn: "2026-03-20" })).ok);
    const sign1 = await ks.sign(prisma, { villageId: vA, id, body: { signedOn: "2026-04-03", signedNumber: "PB/01/2026", witnessName: "Camat X" }, canApprove: true });
    assert.ok(sign1.ok, sign1.ok ? "" : sign1.errors.join("|"));
    const d2 = await get(vA, id);
    assert.equal(d2.status, "DITANDATANGANI");
    assert.equal(d2.signedNumber, "PB/01/2026");
    // terkunci
    const locked = await patch(vA, id, { scope: "diubah" });
    assert.ok(!locked.ok && locked.status === 409);
    assert.ok(!(await ks.addBudget(prisma, { villageId: vA, agreementId: id, input: { description: "x", amount: "1" } })).ok);
    assert.ok(!(await ks.addParty(prisma, { villageId: vA, agreementId: id, input: { kind: "DESA", name: "Desa C" } })).ok);
    assert.ok(!(await move(vA, id, { to: "BATAL", reason: "tidak jadi" })).ok, "setelah ditandatangani tidak dapat dibatalkan");
    // pelaksanaan, pelaporan, berakhir
    assert.ok((await patch(vA, id, { reportedOn: "2027-01-10" })).ok, "pelaporan masih boleh");
    assert.ok((await move(vA, id, { to: "PELAKSANAAN" })).ok);
    const noReason = await move(vA, id, { to: "SELESAI" });
    assert.ok(!noReason.ok);
    assert.ok((await move(vA, id, { to: "SELESAI", endReason: "MASA_BERAKHIR", endedOn: "2027-05-31" })).ok);
    const done = await get(vA, id);
    assert.equal(done.status, "SELESAI");
    assert.equal(done.endReason, "MASA_BERAKHIR");
    assert.ok(!(await patch(vA, id, { reportedOn: "2027-06-01" })).ok, "berakhir = terkunci");
  });

  it("penandatanganan antar-Desa tanpa pembebanan APB Desa dan tanpa konsultasi wajib", async () => {
    const v = await mkVillage("KN");
    const id = await create(v, { kind: "PIHAK_KETIGA", initiative: "PIHAK_KETIGA", title: "CSR PT Maju", field: "PEMBERDAYAAN" });
    assert.ok(!(await ks.addParty(prisma, { villageId: v, agreementId: id, input: { kind: "DESA", name: "Desa Z" } })).ok, "pihak ketiga hanya pihak ketiga");
    assert.ok((await patch(v, id, { scope: "Pelatihan UMKM" })).ok);
    assert.ok((await move(v, id, { to: "PENAWARAN" })).ok, "prakarsa pihak ketiga: tanpa Musdes persiapan");
    const pt = await ks.addParty(prisma, { villageId: v, agreementId: id, input: { kind: "PIHAK_KETIGA", name: "PT Maju", representativeName: "Direktur PT" } });
    assert.ok(pt.ok);
    const m = await meeting(v);
    assert.ok((await patch(v, id, { offerMusdesId: m, offerDecision: "TIDAK" })).ok);
    assert.ok(!(await move(v, id, { to: "PENYUSUNAN" })).ok, "musyawarah tidak menyepakati");
    assert.ok((await patch(v, id, { offerDecision: "SEPAKAT" })).ok);
    assert.ok((await move(v, id, { to: "PENYUSUNAN" })).ok);
    assert.ok((await patch(v, id, { ...FULL_CONTENT, agreedOn: "2026-04-01" })).ok);
    const self = (await get(v, id)).parties[0];
    assert.ok((await ks.patchParty(prisma, { villageId: v, id: self.id, input: { representativeName: "Kades N" } })).ok);
    const s = await ks.sign(prisma, { villageId: v, id, body: { signedOn: "2026-04-02", signedNumber: "PJ/1" }, canApprove: true });
    assert.ok(s.ok, s.ok ? "" : s.errors.join("|"));
  });

  it("Musdes yang dikaitkan harus milik desa ini, bukan BLT, dan tidak dibatalkan", async () => {
    const id = await create(vA);
    const foreign = await meeting(vB);
    const r1 = await patch(vA, id, { prepMusdesId: foreign });
    assert.ok(!r1.ok && /tidak ditemukan/.test(r1.errors[0]), "musyawarah desa lain ditolak");
    const blt = await meeting(vA, { kind: "MUSDES_BLT" });
    assert.ok(!(await patch(vA, id, { prepMusdesId: blt })).ok);
    const cancelled = await meeting(vA, { status: "CANCELLED", heldOn: null });
    assert.ok(!(await patch(vA, id, { offerMusdesId: cancelled })).ok);
    assert.ok(!(await patch(vA, id, { prepMusdesId: 99999999 })).ok);
  });

  it("isolasi lintas desa", async () => {
    const id = await create(vA, { title: "Rahasia A" });
    const d = await get(vA, id);
    const bud = await ks.addBudget(prisma, { villageId: vA, agreementId: id, input: { description: "x", amount: "10", bearerId: d.parties[0].id } });
    assert.ok(bud.ok);
    const other = await ks.getAgreement(prisma, { villageId: vB, id, today: TODAY });
    assert.ok(!other.ok && other.status === 404);
    assert.ok(!(await patch(vB, id, { title: "Dibajak" })).ok);
    assert.ok(!(await ks.deleteAgreement(prisma, { villageId: vB, id })).ok);
    assert.ok(!(await move(vB, id, { to: "BATAL", reason: "abc" })).ok);
    assert.ok(!(await ks.addParty(prisma, { villageId: vB, agreementId: id, input: { kind: "DESA", name: "Penyusup" } })).ok);
    assert.ok(!(await ks.addBudget(prisma, { villageId: vB, agreementId: id, input: { description: "x", amount: "1" } })).ok);
    assert.ok(!(await ks.patchParty(prisma, { villageId: vB, id: d.parties[0].id, input: { representativeName: "x" } })).ok);
    assert.ok(!(await ks.removeBudget(prisma, { villageId: vB, id: bud.ok ? bud.data.id : 0 })).ok);
    assert.ok(!(await ks.sign(prisma, { villageId: vB, id, body: { signedOn: "2026-04-03", signedNumber: "x" }, canApprove: true })).ok);
    const list = await ks.listAgreements(prisma, { villageId: vB, year: 2026, today: TODAY });
    assert.ok(list.ok && list.data.agreements.every((a) => a.title !== "Rahasia A"));
  });

  it("pihak penanggung RAB harus pihak dalam kerja sama itu; pihak Desa ini tidak dapat dihapus", async () => {
    const a = await create(vA);
    const b = await create(vA, { title: "Lain" });
    const pb = (await get(vA, b)).parties[0];
    const r = await ks.addBudget(prisma, { villageId: vA, agreementId: a, input: { description: "x", amount: "10", bearerId: pb.id } });
    assert.ok(!r.ok && /bukan pihak/.test(r.errors[0]));
    const self = (await get(vA, a)).parties[0];
    const del = await ks.removeParty(prisma, { villageId: vA, id: self.id });
    assert.ok(!del.ok && /tidak dapat dihapus/.test(del.errors[0]));
    const ren = await ks.patchParty(prisma, { villageId: vA, id: self.id, input: { name: "Nama Lain" } });
    assert.ok(!ren.ok, "nama pihak Desa ini tidak dapat diubah");
    const d2 = await ks.addParty(prisma, { villageId: vA, agreementId: a, input: { kind: "DESA", name: "Desa Y" } });
    assert.ok(d2.ok);
    assert.ok(!(await ks.addParty(prisma, { villageId: vA, agreementId: a, input: { kind: "DESA", name: "desa y" } })).ok, "nama ganda (tak peka huruf besar)");
    const bd = await ks.addBudget(prisma, { villageId: vA, agreementId: a, input: { description: "x", amount: "10", bearerId: d2.ok ? d2.data.id : 0 } });
    assert.ok(bd.ok);
    assert.ok((await ks.removeParty(prisma, { villageId: vA, id: d2.ok ? d2.data.id : 0 })).ok);
    const after = await get(vA, a);
    assert.equal(after.budget[0].bearerId, null, "baris RAB tanpa penanggung setelah pihaknya dihapus");
  });

  it("konkurensi: penandatanganan serentak hanya sekali; tambah pihak serentak tidak melebihi batas/duplikat", async () => {
    const v = await mkVillage("KC");
    const id = await create(v);
    const m = await meeting(v);
    assert.ok((await patch(v, id, { ...FULL_CONTENT, prepMusdesId: m, inPlanConfirmed: true, offerMusdesId: m, offerDecision: "SEPAKAT", offerReplyOn: "2026-03-12", agreedOn: "2026-04-01" })).ok);
    assert.ok((await ks.addParty(prisma, { villageId: v, agreementId: id, input: { kind: "DESA", name: "Desa B", representativeName: "Kades B" } })).ok);
    const self = (await get(v, id)).parties[0];
    assert.ok((await ks.patchParty(prisma, { villageId: v, id: self.id, input: { representativeName: "Kades A" } })).ok);
    assert.ok((await move(v, id, { to: "PENAWARAN" })).ok);
    assert.ok((await move(v, id, { to: "PENYUSUNAN" })).ok);
    const rs = await Promise.all([1, 2, 3, 4].map((i) => ks.sign(prisma, { villageId: v, id, body: { signedOn: "2026-04-02", signedNumber: `PB/${i}` }, canApprove: true })));
    assert.equal(rs.filter((r) => r.ok).length, 1, JSON.stringify(rs.map((r) => (r.ok ? "ok" : r.errors[0]))));
    const dups = await Promise.all([1, 2, 3, 4].map(() => ks.addParty(prisma, { villageId: v, agreementId: id, input: { kind: "DESA", name: "Desa Kembar" } })));
    assert.ok(dups.every((r) => !r.ok), "sudah ditandatangani: terkunci");
    const w = await create(v, { title: "Dup" });
    const dd = await Promise.all([1, 2, 3, 4].map(() => ks.addParty(prisma, { villageId: v, agreementId: w, input: { kind: "DESA", name: "Desa Kembar" } })));
    assert.equal(dd.filter((r) => r.ok).length, 1, "nama ganda serentak: tepat satu");
  });

  it("hapus hanya persiapan/batal; batal butuh alasan; masukan jahat ditolak", async () => {
    const v = await mkVillage("KH");
    const id = await create(v);
    assert.ok(!(await move(v, id, { to: "BATAL" })).ok, "alasan wajib");
    assert.ok(!(await move(v, id, { to: "DITANDATANGANI" })).ok, "penandatanganan lewat rute sendiri");
    assert.ok(!(await move(v, id, { to: "NGAWUR" })).ok);
    assert.ok(!(await move(v, id, { to: 5 })).ok);
    for (const input of [{ scope: "x".repeat(3000) }, { termStartOn: "2026-13-40" }, { inPlanConfirmed: "ya" }, { prepMusdesId: "1; DROP TABLE x" }, {}]) assert.equal((await patch(v, id, input)).ok, false, JSON.stringify(input));
    assert.ok((await move(v, id, { to: "BATAL", reason: "tidak jadi" })).ok);
    assert.ok(!(await patch(v, id, { scope: "x" })).ok, "batal terkunci");
    assert.ok((await ks.deleteAgreement(prisma, { villageId: v, id })).ok);
    assert.equal(await prisma.villageAgreementParty.count({ where: { villageId: v } }), 0, "pihak ikut terhapus");
    const p = await create(v);
    assert.ok((await move(v, p, { to: "PENAWARAN" })).ok === false);
    assert.ok(!(await ks.createAgreement(prisma, { villageId: v, userId: 1, input: { year: 2026, kind: "ANTAR_DESA", initiative: "DESA", title: "x", field: "PEMBANGUNAN" } })).ok);
  });

  it("penandatanganan tanpa izin approve ditolak di servis; nama penandatangan terkunci setelah ditandatangani; audit memuat nilai lama/baru", async () => {
    const v = await mkVillage("KS");
    const id = await create(v);
    const m = await meeting(v);
    assert.ok((await patch(v, id, { ...FULL_CONTENT, prepMusdesId: m, inPlanConfirmed: true, offerMusdesId: m, offerDecision: "SEPAKAT", offerReplyOn: "2026-03-12", agreedOn: "2026-04-01" })).ok);
    const other = await ks.addParty(prisma, { villageId: v, agreementId: id, input: { kind: "DESA", name: "Desa B", representativeName: "Kades B", representativeTitle: "Kepala Desa" } });
    assert.ok(other.ok);
    const self = (await get(v, id)).parties[0];
    const edit = await ks.patchParty(prisma, { villageId: v, id: self.id, input: { representativeName: "Kades A" } });
    assert.ok(edit.ok && edit.data.before.representativeName === null && edit.data.after.representativeName === "Kades A", "audit memuat nilai sebelum/sesudah");
    assert.ok((await move(v, id, { to: "PENAWARAN" })).ok);
    assert.ok((await move(v, id, { to: "PENYUSUNAN" })).ok);
    const denied = await ks.sign(prisma, { villageId: v, id, body: { signedOn: "2026-04-02", signedNumber: "PB/1" }, canApprove: false });
    assert.ok(!denied.ok && denied.status === 403);
    assert.equal((await get(v, id)).status, "PENYUSUNAN");
    assert.ok((await ks.sign(prisma, { villageId: v, id, body: { signedOn: "2026-04-02", signedNumber: "PB/1" }, canApprove: true })).ok);
    const oid = other.ok ? other.data.id : 0;
    for (const input of [{ representativeName: "Orang Lain" }, { representativeTitle: "Camat" }, { name: "Desa Z" }]) {
      const r = await ks.patchParty(prisma, { villageId: v, id: oid, input });
      assert.ok(!r.ok && r.status === 409, JSON.stringify(input));
      assert.ok(!(await ks.patchParty(prisma, { villageId: v, id: self.id, input })).ok, "juga untuk Desa ini");
    }
    assert.equal((await get(v, id)).parties.find((p) => p.id === oid)?.representativeName, "Kades B");
  });

  it("kunci prototipe ditolak 400 pada jenis, bidang, dan status", async () => {
    const v = await mkVillage("KP");
    for (const o of [{ kind: "constructor" }, { field: "__proto__" }, { kind: "PIHAK_KETIGA", initiative: "toString" }]) {
      const r = await ks.createAgreement(prisma, { villageId: v, userId: 1, input: { year: 2026, kind: "ANTAR_DESA", title: "x", field: "PEMBANGUNAN", ...o } });
      assert.ok(!r.ok && r.status === 400, JSON.stringify(o));
    }
    const id = await create(v);
    for (const to of ["constructor", "__proto__", "toString"]) {
      const r = await move(v, id, { to });
      assert.ok(!r.ok && r.status === 400, to);
    }
    assert.ok(!(await patch(v, id, { field: "constructor" })).ok);
    assert.equal((await get(v, id)).kind, "ANTAR_DESA");
  });
});
