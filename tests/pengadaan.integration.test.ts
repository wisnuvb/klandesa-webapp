/** Tes integrasi pengadaan terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Pengadaan (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let pg: typeof import("../lib/pengadaan/service");
  let vA = 0;
  let vB = 0;
  const made: number[] = [];
  const ACT = "2.3.01"; // Pemeliharaan Jalan Desa
  const YEAR = 2026;

  const mkVillage = async (c: string) => {
    const v = await prisma.village.create({ data: { code: `${c}${Date.now() % 1e6}${Math.floor(Math.random() * 1000)}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    made.push(v.id);
    return v.id;
  };
  const budget = async (villageId: number, cents: bigint, activityCode = ACT, status = "DITETAPKAN", version = 0) => {
    const doc = await prisma.apbdesDocument.create({ data: { villageId, year: YEAR, version, status } });
    await prisma.apbdesLine.create({ data: { documentId: doc.id, villageId, activityCode, accountCode: "5.2.1.07", description: "Material", amountCents: cents, fundSource: "DD" } });
    return doc.id;
  };
  const create = async (villageId: number, o: Record<string, unknown> = {}) => {
    const r = await pg.createPackage(prisma, { villageId, userId: 1, input: { year: YEAR, activityCode: ACT, title: "Pengadaan semen", mode: "PENYEDIA", method: "PERMINTAAN_PENAWARAN", hps: "50000000", executorName: "Budi", executorTitle: "Kasi Pembangunan", ...o } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const member = (villageId: number, packageId: number, name: string, role: string, element = "PERANGKAT") => pg.addMember(prisma, { villageId, packageId, input: { name, role, element } });
  const tpk = async (villageId: number, id: number, n = 3) => {
    const els = ["PERANGKAT", "LEMBAGA", "MASYARAKAT"];
    for (let i = 0; i < n; i++) assert.ok((await member(villageId, id, `Anggota ${i}`, i === 0 ? "KETUA" : i === 1 ? "SEKRETARIS" : "ANGGOTA", els[i % 3])).ok);
  };
  const offer = (villageId: number, packageId: number, name: string, price: string, o: Record<string, unknown> = {}) => pg.addOffer(prisma, { villageId, packageId, input: { providerName: name, offeredOn: "2026-02-01", price, passed: true, ...o } });
  const move = (villageId: number, id: number, to: string, reason?: string) => pg.transition(prisma, { villageId, id, to, reason, canApprove: true });
  const get = async (villageId: number, id: number) => {
    const r = await pg.getPackage(prisma, { villageId, id });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data : (null as never);
  };
  const patch = (villageId: number, id: number, input: Record<string, unknown>) => pg.patchPackage(prisma, { villageId, id, input });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    pg = await import("../lib/pengadaan/service");
    vA = await mkVillage("PA");
    vB = await mkVillage("PB");
  });
  after(async () => {
    for (const id of made) await prisma.village.delete({ where: { id } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("alur penyedia lengkap: tiap pagar menolak lalu meloloskan; BAST menyelesaikan", async () => {
    await budget(vA, 100_000_000_00n);
    const id = await create(vA);
    // persiapan -> pemilihan butuh TPK sah (permintaan penawaran)
    const early = await move(vA, id, "PEMILIHAN");
    assert.ok(!early.ok && early.status === 409 && /minimal 3/.test(early.errors[0]));
    await tpk(vA, id, 3);
    assert.ok((await move(vA, id, "PEMILIHAN")).ok);
    // memotong tim saat sudah pemilihan ditolak (TPK tidak sah)
    const members = (await get(vA, id)).team;
    const rm = await pg.removeMember(prisma, { villageId: vA, id: members[2].id });
    assert.ok(!rm.ok && rm.status === 409 && /tidak memenuhi syarat/.test(rm.errors[0]));
    // penawaran: satu penawaran belum cukup untuk permintaan penawaran
    const o1 = await offer(vA, id, "CV Maju", "48000000");
    assert.ok(o1.ok);
    assert.ok(!(await offer(vA, id, "cv maju", "47000000")).ok, "penyedia ganda ditolak (tak peka huruf besar)");
    const blocked = await move(vA, id, "PELAKSANAAN");
    assert.ok(!blocked.ok && blocked.errors.length >= 3, `semua alasan dilaporkan: ${blocked.ok ? "" : blocked.errors.join(" | ")}`);
    assert.ok(blocked.ok === false && blocked.errors.some((e) => /minimal ke 2/.test(e)));
    const o2 = await offer(vA, id, "UD Sentosa", "49000000");
    assert.ok(o1.ok && o2.ok);
    // pemenang harus terendah
    const wrong = await pg.chooseWinner(prisma, { villageId: vA, offerId: o2.ok ? o2.data.id : 0, canApprove: true });
    assert.ok(!wrong.ok && /terendah/.test(wrong.errors[0]));
    assert.ok((await pg.chooseWinner(prisma, { villageId: vA, offerId: o1.ok ? o1.data.id : 0, canApprove: true })).ok);
    // penawaran yang lulus tak boleh dilepas dari syarat terendah: ubah harga o2 jadi lebih murah -> pemenang dilepas
    const cheaper = await pg.patchOffer(prisma, { villageId: vA, id: o2.ok ? o2.data.id : 0, input: { providerName: "UD Sentosa", offeredOn: "2026-02-01", price: "47000000", passed: true } });
    assert.ok(cheaper.ok);
    assert.equal((await get(vA, id)).offers.some((o) => o.isWinner), false, "pemenang lama dilepas karena bukan lagi terendah");
    assert.ok((await pg.chooseWinner(prisma, { villageId: vA, offerId: o2.ok ? o2.data.id : 0, canApprove: true })).ok);
    // SPK wajib
    const noSpk = await move(vA, id, "PELAKSANAAN");
    assert.ok(!noSpk.ok && noSpk.errors.some((e) => /SPK/.test(e)));
    assert.ok((await patch(vA, id, { contractNumber: "SPK/01", contractDate: "2026-02-10", contract: "47000000" })).ok);
    assert.ok((await move(vA, id, "PELAKSANAAN")).ok);
    // BAST wajib untuk selesai
    const noBast = await move(vA, id, "SELESAI");
    assert.ok(!noBast.ok && noBast.errors.length >= 3);
    assert.ok((await patch(vA, id, { bastNumber: "BAST/1", bastDate: "2026-03-01", bastHandedBy: "UD Sentosa", bastReceivedBy: "Budi" })).ok);
    assert.ok((await move(vA, id, "SELESAI")).ok);
    const done = await get(vA, id);
    assert.equal(done.status, "SELESAI");
    assert.equal(done.progressPct, 100);
    // paket final terkunci: hanya tanggal pengumuman/penyerahan
    const locked = await patch(vA, id, { title: "Ganti" });
    assert.ok(!locked.ok && locked.status === 409);
    assert.ok((await patch(vA, id, { resultAnnouncedOn: "2026-03-05" })).ok);
    assert.ok(!(await move(vA, id, "BATAL", "keliru")).ok);
    assert.ok(!(await pg.deletePackage(prisma, { villageId: vA, id })).ok, "paket selesai tidak dapat dihapus");
  });

  it("negosiasi wajib bila satu penyedia lulus; pembelian langsung tanpa TPK dan tanpa negosiasi", async () => {
    const v = await mkVillage("PN");
    await budget(v, 100_000_000_00n);
    const id = await create(v, { method: "PERMINTAAN_PENAWARAN" });
    await tpk(v, id, 3);
    assert.ok((await move(v, id, "PEMILIHAN")).ok);
    const o = await offer(v, id, "Toko Tunggal", "40000000");
    assert.ok((await patch(v, id, { singleProviderReason: "Hanya satu toko di desa" })).ok);
    assert.ok((await pg.chooseWinner(prisma, { villageId: v, offerId: o.ok ? o.data.id : 0, canApprove: true })).ok);
    assert.ok((await patch(v, id, { contractNumber: "N/1", contractDate: "2026-02-10", contract: "40000000" })).ok);
    const need = await move(v, id, "PELAKSANAAN");
    assert.ok(!need.ok && need.errors.some((e) => /Negosiasi|negosiasi/.test(e)), need.ok ? "" : need.errors.join("|"));
    assert.ok((await patch(v, id, { negotiationNumber: "BA/1", negotiationDate: "2026-02-05" })).ok);
    assert.ok((await move(v, id, "PELAKSANAAN")).ok);

    const pl = await create(v, { method: "PEMBELIAN_LANGSUNG", hps: "5000000", title: "ATK" });
    assert.ok((await move(v, pl, "PEMILIHAN")).ok, "tanpa TPK");
    const po = await offer(v, pl, "Toko ATK", "4800000");
    assert.ok((await pg.chooseWinner(prisma, { villageId: v, offerId: po.ok ? po.data.id : 0, canApprove: true })).ok);
    assert.ok((await patch(v, pl, { contractNumber: "NOTA/9", contractDate: "2026-02-11", contract: "4800000" })).ok);
    const plm = await move(v, pl, "PELAKSANAAN");
    assert.ok(plm.ok, plm.ok ? "" : plm.errors.join("|"));
  });

  it("swakelola: tanpa pemilihan, butuh TPK sah; penawaran ditolak; RAB di atas pagu tidak boleh berjalan", async () => {
    const v = await mkVillage("PS");
    await budget(v, 30_000_000_00n);
    const id = await create(v, { mode: "SWAKELOLA", method: null, hps: "40000000", title: "Jalan setapak" });
    assert.ok(!(await move(v, id, "PEMILIHAN")).ok);
    assert.ok(!(await offer(v, id, "X", "10")).ok, "swakelola tidak memakai penawaran");
    await tpk(v, id, 3);
    const over = await move(v, id, "PELAKSANAAN");
    assert.ok(!over.ok && /melebihi sisa anggaran/.test(over.errors.join(" ")));
    assert.ok((await patch(v, id, { hps: "30000000" })).ok);
    assert.ok((await move(v, id, "PELAKSANAAN")).ok);
    assert.ok(!(await patch(v, id, { hps: "1" })).ok, "HPS terkunci setelah persiapan");
    const bad = await patch(v, id, { negotiationNumber: "x" });
    assert.ok(!bad.ok, "swakelola tidak punya negosiasi");
  });

  it("anggaran: tanpa baris anggaran kegiatan di APB Desa ditetapkan, perjanjian tidak boleh berjalan; draf tidak dihitung", async () => {
    const v = await mkVillage("PD");
    await budget(v, 100_000_000_00n, ACT, "DRAFT", 0); // hanya draf
    const id = await create(v, { mode: "SWAKELOLA", method: null, hps: "1000000" });
    await tpk(v, id, 3);
    assert.ok((await move(v, id, "PELAKSANAAN")).ok, "tanpa APB Desa ditetapkan: hanya peringatan, tidak blokir");
    const d = await get(v, id);
    assert.ok(d.findings.some((f) => f.code === "NO_BUDGET_DOC"));
    const v2 = await mkVillage("PE");
    await budget(v2, 100_000_000_00n, "2.3.02"); // APB Desa ditetapkan tetapi tidak untuk kegiatan ini
    const id2 = await create(v2, { mode: "SWAKELOLA", method: null, hps: "1000000" });
    await tpk(v2, id2, 3);
    const r = await move(v2, id2, "PELAKSANAAN");
    assert.ok(!r.ok && /belum tersedia/.test(r.errors.join(" ")));
  });

  it("dua paket serentak pada kegiatan yang sama tidak boleh sama-sama melampaui anggaran (kunci desa)", async () => {
    const v = await mkVillage("PC");
    await budget(v, 10_000_000_00n); // cukup untuk satu paket 6 juta, tidak dua
    const ids: number[] = [];
    for (let i = 0; i < 4; i++) {
      const id = await create(v, { mode: "SWAKELOLA", method: null, hps: "6000000", title: `Paket ${i}` });
      await tpk(v, id, 3);
      ids.push(id);
    }
    const rs = await Promise.all(ids.map((id) => move(v, id, "PELAKSANAAN")));
    assert.equal(rs.filter((r) => r.ok).length, 1, JSON.stringify(rs.map((r) => (r.ok ? "ok" : r.errors[0]))));
  });

  it("pembuatan paket serentak mendapat nomor unik berurutan", async () => {
    const v = await mkVillage("PU");
    const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => pg.createPackage(prisma, { villageId: v, userId: 1, input: { year: YEAR, activityCode: ACT, title: `P${i}`, mode: "SWAKELOLA", hps: "1000000" } })));
    assert.ok(rs.every((r) => r.ok), JSON.stringify(rs.map((r) => (r.ok ? "ok" : r.errors))));
    const nums = rs.map((r) => (r.ok ? r.data.number : 0)).sort((a, b) => a - b);
    assert.deepEqual(nums, [1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("anggota TPK serentak: hanya satu ketua yang lolos", async () => {
    const v = await mkVillage("PK");
    const id = await create(v, { mode: "SWAKELOLA", method: null });
    const rs = await Promise.all([1, 2, 3, 4].map((i) => member(v, id, `Ketua ${i}`, "KETUA")));
    assert.equal(rs.filter((r) => r.ok).length, 1);
    assert.equal((await get(v, id)).team.length, 1);
  });

  it("isolasi lintas desa: desa B tidak dapat membaca, mengubah, menghapus, atau menambah ke paket desa A", async () => {
    const id = await create(vA, { title: "Rahasia A" });
    const mine = await member(vA, id, "Orang A", "KETUA");
    assert.ok(mine.ok);
    const other = await pg.getPackage(prisma, { villageId: vB, id });
    assert.ok(!other.ok && other.status === 404);
    assert.ok(!(await patch(vB, id, { title: "Dibajak" })).ok);
    assert.ok(!(await pg.deletePackage(prisma, { villageId: vB, id })).ok);
    assert.ok(!(await move(vB, id, "BATAL", "alasan")).ok);
    assert.ok(!(await member(vB, id, "Penyusup", "ANGGOTA")).ok);
    assert.ok(!(await offer(vB, id, "Penyusup", "1")).ok);
    assert.ok(!(await pg.removeMember(prisma, { villageId: vB, id: mine.ok ? mine.data.id : 0 })).ok);
    assert.ok(!(await pg.patchMember(prisma, { villageId: vB, id: mine.ok ? mine.data.id : 0, input: { name: "x", role: "ANGGOTA", element: "PERANGKAT" } })).ok);
    const listB = await pg.listPackages(prisma, { villageId: vB, year: YEAR });
    assert.ok(listB.ok && listB.data.packages.every((p) => p.title !== "Rahasia A"));
    assert.equal((await get(vA, id)).title, "Rahasia A");
  });

  it("SPP terkait hanya dibaca: pembayaran tanpa paket terdaftar, hilang saat paket dibuat; SPP sebelum BAST diperingatkan; SPP tidak berubah", async () => {
    const v = await mkVillage("PL");
    await budget(v, 100_000_000_00n, "2.3.03");
    const mkSpp = async (number: number, status: string, o: Record<string, unknown> = {}) => {
      const r = await prisma.apbdesPayRequest.create({ data: { villageId: v, year: YEAR, number, activityCode: "2.3.03", mode: "PENYEDIA", status, hasReceipt: false, ...o } });
      await prisma.apbdesPayRequestLine.create({ data: { requestId: r.id, accountCode: "5.2.1.07", description: "Semen", amountCents: 20_000_000_00n } });
      return r.id;
    };
    await mkSpp(1, "DIBAYAR", { paidAt: new Date("2026-05-01") });
    await mkSpp(2, "DITOLAK");
    await mkSpp(3, "DIBAYAR", { sourceKind: "BLT", sourceId: 1 }); // program lain: bukan pengadaan
    const before = await pg.listPackages(prisma, { villageId: v, year: YEAR });
    assert.ok(before.ok);
    const un = before.ok ? before.data.unpackaged : [];
    assert.equal(un.length, 1);
    assert.equal(un[0].activityCode, "2.3.03");
    assert.equal(un[0].sppCount, 1, "ditolak dan program BLT tidak dihitung");
    assert.equal(un[0].paid, "20000000.00");
    const sppBefore = await prisma.apbdesPayRequest.findMany({ where: { villageId: v }, orderBy: { id: "asc" }, select: { id: true, status: true, updatedAt: true } });

    const id = await create(v, { activityCode: "2.3.03", title: "Semen" });
    const after2 = await pg.listPackages(prisma, { villageId: v, year: YEAR });
    assert.ok(after2.ok && after2.data.unpackaged.length === 0);
    const d = await get(v, id);
    assert.equal(d.spp.length, 2, "SPP biasa (termasuk ditolak) tampil; yang berasal dari program lain tidak");
    assert.ok(d.findings.some((f) => f.code === "SPP_BEFORE_BAST"));
    assert.ok(d.findings.some((f) => f.code === "SPP_NO_RECEIPT"));
    assert.ok(!(await move(v, id, "BATAL")).ok, "alasan wajib");
    assert.ok((await move(v, id, "BATAL", "salah kegiatan")).ok);
    const un2 = await pg.listPackages(prisma, { villageId: v, year: YEAR });
    assert.ok(un2.ok && un2.data.unpackaged.length === 1, "paket batal tidak dihitung sebagai paket aktif");
    const sppAfter = await prisma.apbdesPayRequest.findMany({ where: { villageId: v }, orderBy: { id: "asc" }, select: { id: true, status: true, updatedAt: true } });
    assert.deepEqual(sppAfter, sppBefore, "tidak ada SPP yang tersentuh");
  });

  it("pengaturan ambang disimpan per desa dan memicu hanya peringatan", async () => {
    const v = await mkVillage("PT");
    const s = await pg.saveSetting(prisma, { villageId: v, input: { directLimit: "10000000", offerLimit: "200000000", basisNote: "Perbup X" } });
    assert.ok(s.ok);
    const id = await create(v, { method: "PEMBELIAN_LANGSUNG", hps: "15000000" });
    const d = await get(v, id);
    assert.equal(d.suggestedMethod, "PERMINTAAN_PENAWARAN");
    assert.ok(d.findings.some((f) => f.code === "OVER_DIRECT" && f.level === "WARN"));
    assert.ok((await move(v, id, "PEMILIHAN")).ok, "ambang tidak memblokir");
    const other = await pg.listPackages(prisma, { villageId: vB, year: YEAR });
    assert.ok(other.ok && other.data.limits.direct === null, "ambang desa lain tidak bocor");
    assert.ok(!(await pg.saveSetting(prisma, { villageId: v, input: { directLimit: "9", offerLimit: "1" } })).ok);
  });

  it("batas berpindah: tahap hanya maju lewat pagar; kembali ke persiapan hanya bila belum ada pemenang/SPK; hapus hanya persiapan/batal", async () => {
    const v = await mkVillage("PR");
    await budget(v, 100_000_000_00n);
    const id = await create(v, { method: "PEMBELIAN_LANGSUNG", hps: "5000000" });
    assert.ok(!(await move(v, id, "SELESAI")).ok);
    assert.ok(!(await move(v, id, "PELAKSANAAN")).ok);
    assert.ok((await move(v, id, "PEMILIHAN")).ok);
    assert.ok((await move(v, id, "PERSIAPAN")).ok, "kembali sebelum ada pemenang");
    assert.ok((await move(v, id, "PEMILIHAN")).ok);
    const o = await offer(v, id, "Toko", "4000000");
    assert.ok((await pg.chooseWinner(prisma, { villageId: v, offerId: o.ok ? o.data.id : 0, canApprove: true })).ok);
    assert.ok(!(await move(v, id, "PERSIAPAN")).ok, "pemenang sudah ada");
    assert.ok(!(await pg.deletePackage(prisma, { villageId: v, id })).ok, "tahap pemilihan tidak dapat dihapus");
    assert.ok((await move(v, id, "BATAL", "dibatalkan")).ok);
    assert.ok((await pg.deletePackage(prisma, { villageId: v, id })).ok);
    assert.equal(await prisma.procurementOffer.count({ where: { villageId: v } }), 0, "penawaran ikut terhapus");
  });

  it("masukan jahat ditolak di lapisan servis tanpa menyentuh data", async () => {
    const v = await mkVillage("PJ");
    const id = await create(v);
    for (const input of [{ title: "x".repeat(300) }, { hps: "1e9" }, { activityCode: "x'; DROP TABLE procurement_packages;--" }, { progressPct: 500 }, {}]) {
      const r = await patch(v, id, input);
      assert.equal(r.ok, false, JSON.stringify(input));
    }
    assert.equal((await get(v, id)).title, "Pengadaan semen");
    assert.ok(!(await pg.createPackage(prisma, { villageId: v, userId: 1, input: { year: 2026, activityCode: "9.9.99", title: "x", mode: "SWAKELOLA", hps: "1" } })).ok);
    assert.ok(!(await pg.createPackage(prisma, { villageId: v, userId: 1, input: "bukan objek" })).ok);
  });

  it("SPK terkunci setelah pelaksanaan dimulai: nilai kontrak tidak dapat dinaikkan melewati pagar anggaran", async () => {
    const v = await mkVillage("PX");
    await budget(v, 60_000_000_00n);
    const id = await create(v, { method: "PEMBELIAN_LANGSUNG", hps: "50000000", title: "Beli" });
    assert.ok((await move(v, id, "PEMILIHAN")).ok);
    const o = await offer(v, id, "Toko Aman", "48000000");
    assert.ok((await pg.chooseWinner(prisma, { villageId: v, offerId: o.ok ? o.data.id : 0, canApprove: true })).ok);
    assert.ok((await patch(v, id, { contractNumber: "N/1", contractDate: "2026-02-10", contract: "48000000" })).ok);
    assert.ok((await move(v, id, "PELAKSANAAN")).ok);
    for (const input of [{ contract: "90000000" }, { contractNumber: "N/2" }, { contractDate: "2026-02-11" }, { negotiationNote: "x" }]) {
      const r = await patch(v, id, input);
      assert.ok(!r.ok && r.status === 409 && /terkunci/.test(r.errors[0]), JSON.stringify(input));
    }
    assert.ok((await patch(v, id, { contractStartOn: "2026-02-15", contractEndOn: "2026-03-15" })).ok, "jadwal pekerjaan masih boleh");
    assert.equal((await get(v, id)).contract.value, "48000000.00");
  });

  it("pemisahan tugas dan persetujuan: penyedia = anggota TPK/pelaksana ditolak; jabatan wajib; approve diwajibkan untuk pemenang dan pelaksanaan", async () => {
    const v = await mkVillage("PY");
    await budget(v, 100_000_000_00n);
    const id = await create(v, { executorTitle: "" });
    await tpk(v, id, 3);
    assert.ok((await move(v, id, "PEMILIHAN")).ok);
    const o1 = await offer(v, id, "anggota 1", "40000000"); // sama dengan anggota TPK (tak peka huruf besar)
    const o2 = await offer(v, id, "budi", "45000000"); // sama dengan Kasi/Kaur pelaksana
    const o3 = await offer(v, id, "CV Bersih", "46000000");
    assert.ok(o1.ok && o2.ok && o3.ok);
    const bad1 = await pg.chooseWinner(prisma, { villageId: v, offerId: o1.ok ? o1.data.id : 0, canApprove: true });
    assert.ok(!bad1.ok && /pertentangan kepentingan/.test(bad1.errors[0]));
    // o3 bukan terendah; hapus dua lainnya agar o3 sah
    assert.ok((await pg.removeOffer(prisma, { villageId: v, id: o1.ok ? o1.data.id : 0 })).ok);
    assert.ok((await pg.removeOffer(prisma, { villageId: v, id: o2.ok ? o2.data.id : 0 })).ok);
    const noApprove = await pg.chooseWinner(prisma, { villageId: v, offerId: o3.ok ? o3.data.id : 0, canApprove: false });
    assert.ok(!noApprove.ok && noApprove.status === 403);
    assert.ok((await pg.chooseWinner(prisma, { villageId: v, offerId: o3.ok ? o3.data.id : 0, canApprove: true })).ok);
    assert.ok((await patch(v, id, { singleProviderReason: "satu", negotiationNumber: "BA/1", negotiationDate: "2026-02-05", contractNumber: "S/1", contractDate: "2026-02-10", contract: "46000000" })).ok);
    const noTitle = await move(v, id, "PELAKSANAAN");
    assert.ok(!noTitle.ok && noTitle.errors.some((e) => /jabatan/.test(e)), "jabatan kosong tidak menghilangkan pagar");
    assert.ok((await patch(v, id, { executorTitle: "Kaur Keuangan" })).ok);
    const keu = await move(v, id, "PELAKSANAAN");
    assert.ok(!keu.ok && keu.errors.some((e) => /Kaur Keuangan/.test(e)));
    assert.ok((await patch(v, id, { executorTitle: "Kasi Pelayanan", executorName: "Anggota 2" })).ok);
    const same = await move(v, id, "PELAKSANAAN");
    assert.ok(!same.ok && same.errors.some((e) => /anggota TPK/.test(e)));
    assert.ok((await patch(v, id, { executorName: "Budi" })).ok);
    const denied = await pg.transition(prisma, { villageId: v, id, to: "PELAKSANAAN", canApprove: false });
    assert.ok(!denied.ok && denied.status === 403, "tanpa approve: tidak dapat memulai pelaksanaan");
    assert.equal((await get(v, id)).status, "PEMILIHAN");
    assert.ok((await pg.transition(prisma, { villageId: v, id, to: "PELAKSANAAN", canApprove: true })).ok);
  });

  it("status tidak valid (kunci prototipe) ditolak 400", async () => {
    const v = await mkVillage("PZ");
    const id = await create(v);
    for (const to of ["constructor", "__proto__", "toString", "", 5, null]) {
      const r = await pg.transition(prisma, { villageId: v, id, to, canApprove: true });
      assert.ok(!r.ok && r.status === 400, String(to));
    }
    const r = await pg.createPackage(prisma, { villageId: v, userId: 1, input: { year: 2026, activityCode: "2.3.01", title: "x", mode: "constructor", hps: "1" } });
    assert.ok(!r.ok && r.status === 400);
  });

  it("penawaran bentrok kepentingan: ditandai, dikeluarkan dari harga terendah, dan penyedia lain dapat dipilih tanpa mengubah apa pun", async () => {
    const v = await mkVillage("PB2");
    await budget(v, 100_000_000_00n);
    const id = await create(v, { method: "LELANG" });
    await tpk(v, id, 3);
    assert.ok((await move(v, id, "PEMILIHAN")).ok);
    const bad = await offer(v, id, "ANGGOTA 1", "30000000"); // anggota TPK, harga terendah
    const good = await offer(v, id, "CV Bersih", "45000000");
    assert.ok(bad.ok && good.ok);
    const d = await get(v, id);
    const dBad = d.offers.find((o) => o.providerName === "ANGGOTA 1")!;
    assert.equal(dBad.conflict, true);
    assert.equal(dBad.isLowest, false, "tidak ikut harga terendah");
    assert.equal(d.offers.find((o) => o.providerName === "CV Bersih")!.isLowest, true);
    const refuse = await pg.chooseWinner(prisma, { villageId: v, offerId: bad.ok ? bad.data.id : 0, canApprove: true });
    assert.ok(!refuse.ok && /"ANGGOTA 1"/.test(refuse.errors[0]) && /Hapus penawaran ini/.test(refuse.errors[0]), "pesan menyebut penawaran dan cara memperbaiki");
    assert.ok((await pg.chooseWinner(prisma, { villageId: v, offerId: good.ok ? good.data.id : 0, canApprove: true })).ok, "penyedia lain langsung dapat dipilih");
    // pemenang yang kemudian menjadi bentrok (anggota TPK diganti namanya) dilepas saat penawaran diubah
    const o = await pg.patchOffer(prisma, { villageId: v, id: good.ok ? good.data.id : 0, input: { providerName: "Anggota 2", offeredOn: "2026-02-01", price: "45000000", passed: true } });
    assert.ok(o.ok);
    assert.equal((await get(v, id)).offers.some((x) => x.isWinner), false);
  });
});
