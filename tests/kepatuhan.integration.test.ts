/** Tes integrasi Kalender Kepatuhan terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Kalender kepatuhan (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/kepatuhan/service");
  let rem: typeof import("../lib/kepatuhan/reminders");
  let bundle: typeof import("../lib/kepatuhan/bundle");
  let vA = 0;
  let vB = 0;
  let vC = 0;
  let archA = 0n;
  let archB = 0n;
  const created: number[] = [];
  const t = `${Date.now() % 1e7}${Math.floor(Math.random() * 900 + 100)}`;
  const REG_AB = `kabupaten-${t}-ab`;
  const REG_C = `kabupaten-${t}-c`;
  const TODAY = "2027-03-25"; // TA 2026: LPJ/LPPD/LKPPD/informasi jatuh tempo 31 Maret 2027 (6 hari lagi)

  const rec = (villageId: number, itemKey: string, o: Record<string, unknown> = {}, year = 2026) => svc.saveRecord(prisma, { villageId, year, userId: null, now: new Date("2027-03-25T03:00:00Z"), input: { itemKey, status: "TERKIRIM", sentOn: "2027-03-20", ...o } });
  const registry = async (villageId: number, year = 2026, today = TODAY) => {
    const r = await svc.getRegistry(prisma, { villageId, year, today });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data : (null as never);
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/kepatuhan/service");
    rem = await import("../lib/kepatuhan/reminders");
    bundle = await import("../lib/kepatuhan/bundle");
    const mk = async (c: string, regency: string, extra: Record<string, unknown> = {}) => {
      const v = await prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "Kec", regency, province: "Jawa Tengah", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 90 * 86_400_000), ...extra } });
      created.push(v.id);
      return v.id;
    };
    vA = await mk("KPA", REG_AB);
    vB = await mk("KPB", ` ${REG_AB.toUpperCase()} `);
    vC = await mk("KPC", REG_C);
    const arch = (villageId: number) => prisma.digitalArchive.create({ data: { villageId, fileName: "bukti.pdf", filePath: "/x", fileType: "pdf", fileSize: 10n, category: "Laporan", title: `Bukti ${villageId}`, uploadedBy: 1 } });
    archA = (await arch(vA)).id;
    archB = (await arch(vB)).id;
  });
  after(async () => {
    for (const id of created) await prisma.village.delete({ where: { id } }).catch(() => undefined);
    await prisma.complianceCatalogEntry.deleteMany({ where: { OR: [{ regencyKey: { in: [REG_AB, REG_C] } }, { scope: "GLOBAL", basis: { startsWith: `uji-${t}` } }] } });
    await prisma.$disconnect();
  });

  it("status diturunkan dari modul lain: APB Desa, LPPD, RKP Desa, Dana Desa", async () => {
    const legal = await prisma.legalDocument.create({ data: { villageId: vA, type: "PERDES", number: `1/${t}`, year: 2025, title: "RKP Desa 2026", enactedAt: new Date("2025-09-20T00:00:00Z") } });
    await prisma.rkpdesDocument.create({ data: { villageId: vA, year: 2026, revision: 0, legalDocumentId: legal.id, usulanSubmittedAt: new Date("2025-12-20T00:00:00Z") } });
    await prisma.apbdesDocument.create({ data: { villageId: vA, year: 2026, version: 0, status: "DITETAPKAN", regulationNumber: "2/2025", regulationDate: new Date("2025-12-29T00:00:00Z") } });
    await prisma.villageReport.create({ data: { villageId: vA, kind: "LPPD_TAHUN", year: 2026, status: "DISERAHKAN", submittedAt: new Date("2027-03-10T00:00:00Z") } });
    await prisma.villageReport.create({ data: { villageId: vA, kind: "LKPPD", year: 2026, status: "DRAFT" } });
    await prisma.ddYearSetting.create({ data: { villageId: vA, year: 2026, focusReportedOn: new Date("2025-10-10T00:00:00Z") } });
    await prisma.ddPublication.create({ data: { villageId: vA, year: 2026, channel: "BALIHO", publishedOn: new Date("2026-01-05T00:00:00Z") } });
    const r = await registry(vA);
    const g = (k: string) => r.rows.find((x) => x.key === k)!;
    assert.deepEqual([g("RKPDES_PERDES").status, g("RKPDES_PERDES").sentOn, g("RKPDES_PERDES").evidenceSource], ["TERKIRIM", "2025-09-20", "SISTEM"]);
    assert.equal(g("RKPDES_USULAN").status, "TERKIRIM");
    assert.deepEqual([g("APBDES_PERDES").status, g("APBDES_PERDES").late], ["TERKIRIM", false], "ditetapkan 29 Des 2025, tenggat 31 Des 2025");
    assert.equal(g("LPPD_TAHUN").status, "TERKIRIM");
    assert.equal(g("LKPPD").status, "DRAF");
    assert.equal(g("LKPPD").soon, true);
    assert.equal(g("DD_FOKUS").status, "TERKIRIM");
    assert.equal(g("DD_FOKUS").due, "2025-10-20", "1 bulan setelah Perdes RKP Desa 20 Sep 2025");
    assert.equal(g("DD_PUBLIKASI").status, "TERKIRIM");
    assert.equal(g("LPJ_APBDES").status, "BELUM");
    assert.equal(g("BUMDES_TAHUNAN"), undefined, "desa tanpa BUM Desa");
    assert.ok(r.upcoming.some((u) => u.key === "LPJ_APBDES" && u.daysLeft === 6));
  });
  it("APBDES_PERDES: draf APB Desa tidak dihitung selesai; draf yang lewat tenggat tetap terlambat", async () => {
    await prisma.apbdesDocument.create({ data: { villageId: vB, year: 2028, version: 0, status: "DRAFT" } });
    assert.equal((await registry(vB, 2028)).rows.find((x) => x.key === "APBDES_PERDES")!.status, "DRAF");
    await prisma.apbdesDocument.create({ data: { villageId: vB, year: 2026, version: 0, status: "DRAFT" } });
    assert.equal((await registry(vB, 2026)).rows.find((x) => x.key === "APBDES_PERDES")!.status, "TERLAMBAT");
  });

  it("catatan: simpan, ubah, hapus; butir tak berlaku dan berkas desa lain ditolak", async () => {
    assert.ok((await rec(vA, "LPJ_APBDES", { referenceNo: "140/12", archiveId: String(archA) })).ok);
    let r = await registry(vA);
    const lpj = r.rows.find((x) => x.key === "LPJ_APBDES")!;
    assert.deepEqual([lpj.status, lpj.record?.referenceNo, lpj.archive?.title, lpj.late], ["TERKIRIM", "140/12", `Bukti ${vA}`, false]);
    assert.ok((await rec(vA, "LPJ_APBDES", { status: "DRAF", sentOn: undefined })).ok, "ubah ke draf");
    r = await registry(vA);
    assert.equal(r.rows.find((x) => x.key === "LPJ_APBDES")!.status, "DRAF");
    assert.equal(await prisma.complianceReportRecord.count({ where: { villageId: vA, itemKey: "LPJ_APBDES" } }), 1);

    const noBumdes = await rec(vA, "BUMDES_TAHUNAN");
    assert.ok(!noBumdes.ok && noBumdes.status === 400);
    const other = await rec(vA, "LPJ_APBDES", { archiveId: String(archB) });
    assert.ok(!other.ok && other.fieldErrors?.archiveId, "berkas milik desa lain tidak boleh dipakai");
    const unknown = await rec(vA, "KAB-TIDAKADA");
    assert.ok(!unknown.ok);
    const badYear = await svc.saveRecord(prisma, { villageId: vA, year: 1800, userId: null, input: { itemKey: "LPJ_APBDES", status: "DRAF" } });
    assert.ok(!badYear.ok);

    const del = await svc.clearRecord(prisma, { villageId: vA, year: 2026, itemKey: "LPJ_APBDES" });
    assert.ok(del.ok);
    assert.ok(!(await svc.clearRecord(prisma, { villageId: vA, year: 2026, itemKey: "LPJ_APBDES" })).ok, "sudah terhapus");
  });
  it("isolasi desa: catatan desa A tak tampak di B dan penghapusan oleh B tak menyentuh A", async () => {
    assert.ok((await rec(vA, "INFO_MASYARAKAT", { referenceNo: "rahasia-A" })).ok);
    const rb = await registry(vB);
    assert.equal(rb.rows.find((x) => x.key === "INFO_MASYARAKAT")!.record, null);
    assert.ok(!(await svc.clearRecord(prisma, { villageId: vB, year: 2026, itemKey: "INFO_MASYARAKAT" })).ok);
    assert.equal(await prisma.complianceReportRecord.count({ where: { villageId: vA, itemKey: "INFO_MASYARAKAT" } }), 1);
    const found = await svc.searchArchives(prisma, { villageId: vA, q: "Bukti" });
    assert.deepEqual(found.map((a) => a.id), [String(archA)], "pencarian arsip hanya milik desa sendiri");
  });
  it("simpan serentak untuk butir yang sama tidak gagal dan menyisakan satu baris", async () => {
    const res = await Promise.all(Array.from({ length: 6 }, (_, i) => rec(vC, "LKPPD", { referenceNo: `n${i}` })));
    assert.ok(res.every((x) => x.ok), JSON.stringify(res.filter((x) => !x.ok)));
    assert.equal(await prisma.complianceReportRecord.count({ where: { villageId: vC, itemKey: "LKPPD" } }), 1);
  });

  it("penimpaan katalog per kabupaten: berlaku bagi desa di kabupaten itu saja; hapus dibatasi pemilik; V hanya admin", async () => {
    const input = { itemKey: "LPJ_APBDES", fromYear: 2026, ruleKind: "FIXED", yearOffset: 1, month: 3, day: 10, basis: "Perbup 7/2026 Pasal 3", verification: "K" };
    const saved = await svc.saveCatalogEntry(prisma, { scope: "REGENCY", regencyKey: REG_AB, provinceKey: "jawa tengah", editor: { regionalUserId: 1 }, input });
    assert.ok(saved.ok, JSON.stringify(saved));
    const ra = await registry(vA);
    const rb = await registry(vB);
    const rc = await registry(vC);
    assert.equal(ra.rows.find((x) => x.key === "LPJ_APBDES")!.due, "2027-03-10");
    assert.equal(rb.rows.find((x) => x.key === "LPJ_APBDES")!.due, "2027-03-10", "teks wilayah dinormalisasi (spasi/huruf besar)");
    assert.equal(rc.rows.find((x) => x.key === "LPJ_APBDES")!.due, "2027-03-31", "kabupaten lain tak terpengaruh");
    assert.equal(ra.rows.find((x) => x.key === "LPJ_APBDES")!.source, "Ketetapan kabupaten");
    // desa A: sudah lewat 10 Maret sehingga terlambat sesuai ketetapan kabupaten
    assert.equal(ra.rows.find((x) => x.key === "LPJ_APBDES")!.status, "TERLAMBAT");

    const id = saved.ok ? saved.data.id : 0;
    // kabupaten lain tidak dapat menghapus baris ini lewat id tebakan, begitu pula lapis GLOBAL
    assert.ok(!(await svc.deleteCatalogEntry(prisma, { scope: "REGENCY", regencyKey: REG_C, provinceKey: "jawa tengah", id })).ok);
    assert.ok(!(await svc.deleteCatalogEntry(prisma, { scope: "GLOBAL", regencyKey: "", provinceKey: "", id })).ok);
    assert.ok(!(await svc.deleteCatalogEntry(prisma, { scope: "REGENCY", regencyKey: REG_AB, provinceKey: "", id })).ok, "kunci provinsi harus sama");
    assert.equal(await prisma.complianceCatalogEntry.count({ where: { id } }), 1);

    const asV = await svc.saveCatalogEntry(prisma, { scope: "REGENCY", regencyKey: REG_AB, provinceKey: "jawa tengah", editor: {}, input: { ...input, verification: "V" } });
    assert.ok(!asV.ok && asV.fieldErrors?.verification);
    // simpan ulang kunci yang sama = pembaruan, bukan baris kedua
    assert.ok((await svc.saveCatalogEntry(prisma, { scope: "REGENCY", regencyKey: REG_AB, provinceKey: "jawa tengah", editor: {}, input: { ...input, day: 12 } })).ok);
    assert.equal(await prisma.complianceCatalogEntry.count({ where: { regencyKey: REG_AB, itemKey: "LPJ_APBDES" } }), 1);

    // butir tambahan kabupaten
    assert.ok((await svc.saveCatalogEntry(prisma, { scope: "REGENCY", regencyKey: REG_AB, provinceKey: "jawa tengah", editor: {}, input: { itemKey: "KAB-DPMD", fromYear: 2026, title: "Laporan ke DPMD", ruleKind: "FIXED", yearOffset: 0, month: 10, day: 5, basis: "Surat Edaran Bupati 5/2026" } })).ok);
    assert.ok((await registry(vA)).rows.some((x) => x.key === "KAB-DPMD"));
    assert.ok(!(await registry(vC)).rows.some((x) => x.key === "KAB-DPMD"));
    assert.ok((await rec(vA, "KAB-DPMD")).ok, "butir kabupaten dapat dicatat desa kabupaten itu");
    assert.ok(!(await rec(vC, "KAB-DPMD")).ok, "tetapi tidak oleh desa kabupaten lain");

    // lapis GLOBAL (admin platform): label V diizinkan, tanpa wilayah
    const g = await svc.saveCatalogEntry(prisma, { scope: "GLOBAL", regencyKey: "", provinceKey: "", editor: { label: "platform:1" }, input: { itemKey: "DD_TAHAP2", fromYear: 2026, ruleKind: "FIXED", yearOffset: 0, month: 11, day: 30, basis: `uji-${t} PMK 7/2026 Pasal 24`, verification: "V" } });
    assert.ok(g.ok, JSON.stringify(g));
    assert.equal((await registry(vC)).rows.find((x) => x.key === "DD_TAHAP2")!.due, "2026-11-30");
    assert.ok(!(await svc.saveCatalogEntry(prisma, { scope: "GLOBAL", regencyKey: REG_C, provinceKey: "", editor: {}, input: { itemKey: "DD_TAHAP2", fromYear: 2027, ruleKind: "NONE", basis: "x" } })).ok, "global tidak memakai wilayah");
    if (g.ok) assert.ok((await svc.deleteCatalogEntry(prisma, { scope: "GLOBAL", regencyKey: "", provinceKey: "", id: g.data.id })).ok);
    assert.equal((await registry(vC)).rows.find((x) => x.key === "DD_TAHAP2")!.due, null);
  });

  it("respons katalog dan register tidak memuat kolom internal (penyunting, cap waktu, kunci wilayah akun lain)", async () => {
    await svc.saveCatalogEntry(prisma, { scope: "GLOBAL", regencyKey: "", provinceKey: "", editor: { label: "platform:77" }, input: { itemKey: "DD_PUBLIKASI", fromYear: 2026, ruleKind: "NONE", basis: `uji-${t} Permendesa 16/2025 Pasal 10`, verification: "V" } });
    await svc.saveCatalogEntry(prisma, { scope: "REGENCY", regencyKey: REG_AB, provinceKey: "jawa tengah", editor: { regionalUserId: 4242 }, input: { itemKey: "LKPPD", fromYear: 2026, ruleKind: "FIXED", yearOffset: 1, month: 3, day: 20, basis: "Perbup 8/2026" } });
    const view = await svc.listCatalog(prisma, { regencyKey: REG_AB, provinceKey: "jawa tengah" });
    const json = JSON.stringify(view);
    for (const k of ["updatedByLabel", "updatedByRegionalId", "createdAt", "updatedAt", "platform:77", "4242"]) assert.equal(json.includes(k), false, `bocor: ${k}`);
    const allowed = new Set(["id", "scope", "regencyKey", "provinceKey", "itemKey", "fromYear", "disabled", "title", "recipient", "ruleKind", "yearOffset", "month", "day", "event", "amount", "unit", "verification", "basis", "note"]);
    for (const e of [...view.global, ...view.regency]) assert.deepEqual(Object.keys(e).filter((k) => !allowed.has(k)), []);
    // kabupaten lain tidak melihat baris kabupaten ini
    const other = await svc.listCatalog(prisma, { regencyKey: REG_C, provinceKey: "jawa tengah" });
    assert.equal(other.regency.some((e) => e.itemKey === "LKPPD"), false);
    const reg = JSON.stringify(await registry(vA));
    for (const k of ["updatedByLabel", "updatedByRegionalId", "updatedById", "platform:77", "4242"]) assert.equal(reg.includes(k), false, `register membocorkan ${k}`);
    await prisma.complianceCatalogEntry.deleteMany({ where: { OR: [{ regencyKey: REG_AB, itemKey: "LKPPD" }, { scope: "GLOBAL", itemKey: "DD_PUBLIKASI", basis: { startsWith: `uji-${t}` } }] } });
  });

  it("kabupaten mematikan butir: tetap tampil bertanda beserta dasarnya, tak mengikat, tak diingatkan, tak bisa dicatat; kunci kode menang atas teks", async () => {
    // vA memiliki kode kab/kota; vB hanya teks; vC kabupaten lain
    const KODE = `9${t}`.slice(0, 10);
    await prisma.village.update({ where: { id: vA }, data: { settings: { wilayah: { kode_provinsi: "33", kode_kab_kota: KODE } } } });
    const off = { itemKey: "LKPPD", fromYear: 2026, disabled: true, basis: "Perbup 11/2026 Pasal 4, LKPPD diganti forum BPD" };
    assert.ok(!(await svc.saveCatalogEntry(prisma, { scope: "REGENCY", regencyKey: `kode:${KODE}`, provinceKey: "", editor: {}, input: { ...off, basis: "" } })).ok, "tanpa alasan ditolak");
    assert.ok((await svc.saveCatalogEntry(prisma, { scope: "REGENCY", regencyKey: `kode:${KODE}`, provinceKey: "", editor: {}, input: off })).ok);
    const ra = await registry(vA);
    const lk = ra.rows.find((x) => x.key === "LKPPD")!;
    assert.deepEqual([lk.disabled, lk.binding, lk.override?.source, lk.override?.basis], [true, false, "KABUPATEN", off.basis]);
    assert.equal((await registry(vB)).rows.find((x) => x.key === "LKPPD")!.disabled, false, "desa tanpa kode tidak tercakup penimpaan berkunci kode");
    assert.equal((await registry(vC)).rows.find((x) => x.key === "LKPPD")!.disabled, false);
    const blocked = await rec(vA, "LKPPD");
    assert.ok(!blocked.ok, "butir yang dimatikan tidak bisa dicatat");
    assert.ok(!(await rem.planForVillages(prisma, [vA], TODAY)).some((p) => p.itemKey === "LKPPD"), "tidak diingatkan");
    const recap = await svc.regionalRecap(prisma, { villages: [{ id: vA, name: "A", district: "k", regency: "Teks Profil", province: "Jawa Tengah" }], year: 2026, today: TODAY });
    assert.ok(recap.ok);
    if (recap.ok) {
      assert.equal(recap.data.villages[0]!.cells.LKPPD, undefined);
      assert.deepEqual([recap.data.villages[0]!.regency, recap.data.villages[0]!.province, recap.data.villages[0]!.matchedBy], ["Teks Profil", "Jawa Tengah", "KODE"]);
    }
    // admin desa mengganti teks kabupaten di profil: penimpaan berkunci kode tetap berlaku, tidak pindah ke kabupaten lain
    await prisma.village.update({ where: { id: vA }, data: { regency: REG_C } });
    assert.equal((await registry(vA)).rows.find((x) => x.key === "LKPPD")!.disabled, true);
    await prisma.village.update({ where: { id: vA }, data: { regency: REG_AB } });
    await prisma.complianceCatalogEntry.deleteMany({ where: { regencyKey: `kode:${KODE}` } });
    await prisma.village.update({ where: { id: vA }, data: { settings: {} } });
  });

  it("rekap kabupaten hanya memuat desa yang diberikan pemanggil dan tidak bercampur dengan desa lain", async () => {
    const r = await svc.regionalRecap(prisma, { villages: [{ id: vC, name: "Desa KPC", district: "Kec" }], year: 2026, today: TODAY });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.deepEqual(r.data.villages.map((v) => v.villageId), [vC]);
    assert.equal(r.data.totals.villages, 1);
    const c = r.data.villages[0]!;
    assert.equal(c.cells.LKPPD!.status, "TERKIRIM");
    assert.equal(c.cells["KAB-DPMD"], undefined, "butir kabupaten A tak tampak pada desa kabupaten C");
    assert.equal(c.cells.LPJ_APBDES!.due, "2027-03-31");

    const both = await svc.regionalRecap(prisma, { villages: [{ id: vA, name: "A", district: "k" }, { id: vB, name: "B", district: "k" }], year: 2026, today: TODAY });
    assert.ok(both.ok);
    if (!both.ok) return;
    assert.equal(both.data.totals.villages, 2);
    assert.ok(both.data.villages[0]!.tally.terlambat >= both.data.villages[1]!.tally.terlambat, "terlambat terbanyak di atas");
    assert.ok(both.data.items.some((i) => i.key === "LPJ_APBDES"));
    assert.equal(JSON.stringify(both.data).includes("rahasia-A"), false, "nomor surat tidak ikut ke rekap");
    const bad = await svc.regionalRecap(prisma, { villages: [], year: 99999 });
    assert.ok(!bad.ok);
    const empty = await svc.regionalRecap(prisma, { villages: [], year: 2026 });
    assert.ok(empty.ok && empty.data.villages.length === 0);
  });

  it("pengingat: idempoten, serentak tidak ganda, hanya butir wajib belum terkirim, desa tak berlangganan dilewati", async () => {
    // Reset penimpaan kabupaten A agar tenggat LPJ kembali 31 Maret
    await prisma.complianceCatalogEntry.deleteMany({ where: { regencyKey: REG_AB } });
    await prisma.complianceReportRecord.deleteMany({ where: { villageId: { in: [vA, vB, vC] } } });
    await prisma.adminNotification.deleteMany({ where: { villageId: { in: [vA, vB, vC] } } });
    const expired = await prisma.village.create({ data: { code: `KPX${t}`, name: "Desa KPX", district: "k", regency: REG_AB, province: "Jawa Tengah", address: "a", subscriptionStatus: "INACTIVE", subscriptionExpiry: new Date(Date.now() - 90 * 86_400_000) } });
    created.push(expired.id);

    const emails: string[] = [];
    const staff: number[] = [];
    const deps = { sendEmail: async (m: { to: string; subject: string }) => { emails.push(`${m.to}|${m.subject}`); return { ok: true }; }, notifyStaff: async (id: number) => { staff.push(id); } };
    await prisma.user.create({ data: { villageId: vA, email: `kp-${t}@x.id`, password: "x", name: "Admin", role: "admin", isActive: true } }).catch(() => undefined);
    const ids = [vA, vB, vC, expired.id];
    const now = new Date();

    // Tandai satu butir terkirim di desa B: tidak boleh diingatkan
    assert.ok((await rec(vB, "LPJ_APBDES")).ok);
    const plan = await rem.planForVillages(prisma, ids, TODAY);
    const keysOf = (v: number) => plan.filter((p) => p.villageId === v).map((p) => `${p.itemKey}:${p.year}:${p.stage}`).sort();
    assert.ok(keysOf(vA).includes("LPJ_APBDES:2026:d7"));
    assert.ok(keysOf(vA).includes("LKPPD:2026:d7"));
    assert.ok(!keysOf(vA).some((k) => k.startsWith("LPPD_TAHUN:")), "LPPD desa A sudah diserahkan (data sistem)");
    assert.ok(!keysOf(vB).some((k) => k.startsWith("LPJ_APBDES:")), "butir yang sudah terkirim tidak diingatkan");
    assert.ok(keysOf(vB).includes("LPPD_TAHUN:2026:d7"));
    assert.ok(!plan.some((p) => p.itemKey === "INFO_SEMESTER1" || p.itemKey.startsWith("KIP_")), "butir R tidak pernah diingatkan");

    const expected = plan.filter((p) => p.villageId !== expired.id).length;
    const [r1, r2] = await Promise.all([rem.runReminders(prisma, { now, today: TODAY, deps, onlyVillageIds: ids }), rem.runReminders(prisma, { now, today: TODAY, deps, onlyVillageIds: ids })]);
    assert.equal(r1.claimed + r2.claimed, expected, "dua proses serentak: tiap pengingat diklaim tepat sekali");
    assert.equal(r1.skippedAlreadySent + r2.skippedAlreadySent, expected);
    assert.equal(staff.length, expected, "notifikasi mobile tepat sekali per klaim");
    assert.equal(await prisma.adminNotification.count({ where: { villageId: { in: ids }, type: rem.NOTIFICATION_TYPE } }), expected);
    assert.equal(await prisma.adminNotification.count({ where: { villageId: expired.id } }), 0, "desa tanpa langganan aktif dilewati");
    assert.ok(emails.length >= 1 && emails.every((e) => e.startsWith(`kp-${t}@x.id|`)));

    const again = await rem.runReminders(prisma, { now, today: TODAY, deps, onlyVillageIds: ids });
    assert.equal(again.claimed, 0, "proses ulang tidak mengirim lagi");
    assert.equal(staff.length, expected);

    // Tahap berikutnya (d1) adalah pengingat baru; butir yang kemudian terkirim berhenti diingatkan
    assert.ok((await rec(vA, "LKPPD")).ok);
    const next = await rem.runReminders(prisma, { now, today: "2027-03-31", deps, onlyVillageIds: [vA] });
    assert.ok(next.claimed > 0);
    const n = await prisma.adminNotification.findMany({ where: { villageId: vA, type: rem.NOTIFICATION_TYPE }, select: { sourceKey: true } });
    assert.ok(n.some((x) => x.sourceKey === "kal:LPJ_APBDES:2026:d1"));
    assert.ok(!n.some((x) => x.sourceKey.startsWith("kal:LKPPD:2026:d1")), "LKPPD sudah terkirim, tidak diingatkan");

    // Setelah tenggat: sekali "late" dalam jendela 14 hari, lalu berhenti
    const late = await rem.runReminders(prisma, { now, today: "2027-04-02", deps, onlyVillageIds: [vA] });
    assert.ok(late.claimed > 0);
    const count2026 = () => prisma.adminNotification.count({ where: { villageId: vA, sourceKey: { contains: ":2026:" } } });
    const before = await count2026();
    await rem.runReminders(prisma, { now, today: "2027-05-30", deps, onlyVillageIds: [vA] });
    assert.equal(await count2026(), before, "jauh lewat tenggat tahun anggaran 2026 tidak diingatkan terus-menerus");
  });

  it("pengingat Dana Desa/semester: butir wajib diingatkan, butir R tidak", async () => {
    await prisma.adminNotification.deleteMany({ where: { villageId: vC } });
    const plan = await rem.planForVillages(prisma, [vC], "2026-07-10");
    const keys = plan.map((p) => p.itemKey);
    assert.ok(keys.includes("LAPORAN_SEMESTER1"));
    assert.ok(!keys.includes("INFO_SEMESTER1"));
  });

  it("bahan cetak gabungan: tabel dari data sistem, daftar lampiran, dan butir tanpa bahan ditolak", async () => {
    const r = await bundle.buildBundle(prisma, { villageId: vA, year: 2026, itemKey: "LPJ_APBDES", today: TODAY });
    assert.ok(r.ok, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.data.villageName, "Desa KPA");
    assert.equal(r.data.parts.filter((p) => p.type === "table").length, 4);
    assert.ok(r.data.attachments.length >= 2);
    const lppd = await bundle.buildBundle(prisma, { villageId: vA, year: 2026, itemKey: "LPPD_TAHUN", today: TODAY });
    assert.ok(lppd.ok && lppd.data.parts[0]!.type === "document");
    const dd = await bundle.buildBundle(prisma, { villageId: vA, year: 2026, itemKey: "DD_TAHAP1", today: TODAY });
    assert.ok(dd.ok && dd.data.parts.some((p) => p.type === "table"));
    const none = await bundle.buildBundle(prisma, { villageId: vA, year: 2026, itemKey: "KAB-DPMD" });
    assert.ok(!none.ok && none.status === 404);
    const unknown = await bundle.buildBundle(prisma, { villageId: vA, year: 2026, itemKey: "ACAK" });
    assert.ok(!unknown.ok);
  });
});
