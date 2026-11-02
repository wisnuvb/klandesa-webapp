/**
 * Tes integrasi lampiran terhadap MySQL sungguhan (database sementara). Butuh KEP_TEST_DATABASE_URL ke database
 * yang namanya mengandung "scratch"/"test" (cara menjalankan sama dengan kependudukan-sync.integration.test.ts).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("lampiran generik (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/attachments/service");
  let catalog: typeof import("../lib/attachments/catalog");
  let villageId = 0;
  let otherVillageId = 0;
  const ent: Record<string, number> = {};
  const arch: Record<string, bigint> = {};

  const archive = (vid: number, name: string) =>
    prisma.digitalArchive.create({
      data: { villageId: vid, fileName: name, filePath: `https://x/${name}`, storageKey: `villages/T/${name}`, fileType: "pdf", fileSize: BigInt(2048), category: "Lampiran", title: name, uploadedBy: 1 },
    });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/attachments/service");
    catalog = await import("../lib/attachments/catalog");
    const t = Date.now() % 1e6;
    const mkVillage = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a" } });
    villageId = (await mkVillage("L")).id;
    otherVillageId = (await mkVillage("M")).id;

    const reg = await prisma.mailRegister.create({ data: { villageId, direction: "IN", year: 2026, agendaNo: 1, letterDate: new Date("2026-10-01"), registeredAt: new Date("2026-10-02"), party: "Dinas", subject: "Undangan" } });
    const legal = await prisma.legalDocument.create({ data: { villageId, type: "PERDES", number: "1", year: 2026, title: "Perdes", enactedAt: new Date("2026-01-01") } });
    const pos = await prisma.position.create({ data: { villageId, name: "Kaur", level: 3 } });
    const off = await prisma.official.create({ data: { villageId, positionId: pos.id, nik: "3508000000000001", name: "Budi", birthplace: "L", birthDate: new Date("1980-01-01"), gender: "M", address: "a", startDate: new Date("2020-01-01"), status: "active" } });
    const inst = await prisma.villageInstitution.create({ data: { villageId, type: "BPD", name: "BPD" } });
    const meet = await prisma.villageMeeting.create({ data: { villageId, kind: "MUSDES", title: "Musdes", scheduledOn: new Date("2026-10-10") } });
    const mut = await prisma.residentMutation.create({ data: { villageId, type: "BIRTH", effectiveDate: new Date("2026-10-05") } });
    Object.assign(ent, { MAIL_REGISTER: reg.id, LEGAL_DOCUMENT: legal.id, OFFICIAL: off.id, INSTITUTION: inst.id, MEETING: meet.id });
    ent.MUTATION = Number(mut.id);

    // Gelombang 2
    const d = new Date("2026-10-10");
    const proc = await prisma.procurementPackage.create({ data: { villageId, year: 2026, number: 1, activityCode: "01.01", title: "Paket", mode: "PENYEDIA", hpsCents: 1000n } });
    const agr = await prisma.villageAgreement.create({ data: { villageId, year: 2026, kind: "KERJA_SAMA", title: "Kerja sama", field: "Ekonomi" } });
    const blt = await prisma.bltProgram.create({ data: { villageId, year: 2026, title: "BLT", monthlyCents: 30000000n, totalMonths: 12 } });
    const pktd = await prisma.pktdActivity.create({ data: { villageId, year: 2026, title: "PKTD", costCents: 1000n } });
    const inv = await prisma.inventoryItem.create({ data: { villageId, name: "Meja", category: "KIB_B", origin: "BELI", acquiredYear: 2020 } });
    const dts = await prisma.dtsenProposal.create({ data: { villageId, residentName: "Warga", kind: "USULAN", source: "WARGA", reason: "Alasan" } });
    const ev = await prisma.incidentEvent.create({ data: { villageId, domain: "KEAMANAN", kind: "SENGKETA", title: "Kejadian", occurredAt: d } });
    const med = await prisma.securityMediation.create({ data: { villageId, eventId: ev.id, scheduledAt: d, place: "Balai", mediator: "Kasi" } });
    const res = await prisma.resident.create({ data: { villageId, nik: "3508000000009999", name: "Anggota", birthplace: "L", birthDate: new Date("1985-01-01"), gender: "Laki-laki", religion: "Islam", maritalStatus: "Menikah", familyRole: "Anak", address: "a" } });
    const mem = await prisma.securityMember.create({ data: { villageId, residentId: res.id, role: "ANGGOTA" } });
    const rep = await prisma.villageReport.create({ data: { villageId, kind: "LKPPD", year: 2026 } });
    const trx = await prisma.transaction.create({ data: { villageId, transactionNumber: `T${t}`, transactionDate: d, type: "income", category: "Lain", description: "Kas", amount: 1000 } });
    const spp = await prisma.apbdesPayRequest.create({ data: { villageId, year: 2026, number: 1, activityCode: "01.01", mode: "PENYEDIA" } });
    const bum = await prisma.bumdes.create({ data: { villageId, name: "BUMDes" } });
    const prof = await prisma.bumdesLegalProfile.create({ data: { bumdesId: bum.id } });
    const off2 = await prisma.bumdesOfficer.create({ data: { bumdesId: bum.id, role: "DIREKTUR", name: "Direktur" } });
    const coop = await prisma.cooperative.create({ data: { villageId, name: "Koperasi" } });
    const form = await prisma.cooperativeFormation.create({ data: { cooperativeId: coop.id } });
    Object.assign(ent, { PROCUREMENT: proc.id, AGREEMENT: agr.id, BLT_PROGRAM: blt.id, PKTD_ACTIVITY: pktd.id, INVENTORY_ITEM: inv.id, DTSEN_PROPOSAL: dts.id, SECURITY_MEDIATION: med.id, SECURITY_MEMBER: mem.id, VILLAGE_REPORT: rep.id, PAY_REQUEST: spp.id, BUMDES_PROFILE: prof.id, BUMDES_OFFICER: off2.id, COOP_FORMATION: form.id });
    ent.TRANSACTION = Number(trx.id);
    arch.a = (await archive(villageId, "a.pdf")).id;
    arch.b = (await archive(villageId, "b.pdf")).id;
    arch.foreign = (await archive(otherVillageId, "foreign.pdf")).id;
  });

  after(async () => {
    for (const id of [villageId, otherVillageId]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  const ref = (type: keyof typeof ent) => ({ type: type as import("../lib/attachments/catalog").AttachmentEntityType, id: BigInt(ent[type]) });
  const input = (type: keyof typeof ent, archiveId: bigint, label: string | null = null) => ({ ...ref(type), archiveId, label });

  it("rekaman tiap jenis ditemukan di desanya dan TIDAK ditemukan dari desa lain", async () => {
    for (const t of catalog.ATTACHMENT_ENTITY_TYPES) {
      assert.equal(await svc.entityExists(prisma, villageId, ref(t)), true, t);
      assert.equal(await svc.entityExists(prisma, otherVillageId, ref(t)), false, `${t} bocor lintas desa`);
      assert.equal(await svc.entityExists(prisma, villageId, { type: t, id: 999999999n }), false, `${t} id tak ada`);
    }
  });

  it("melampirkan: label bawaan dari judul berkas, daftar memuat nama dan ukuran nyata dari Arsip", async () => {
    const r = await svc.attach(prisma, { villageId, userId: 5, input: input("MAIL_REGISTER", arch.a) });
    assert.ok(r.ok);
    const list = await svc.listAttachments(prisma, villageId, ref("MAIL_REGISTER"));
    assert.equal(list.length, 1);
    assert.equal(list[0].label, "a.pdf");
    assert.equal(list[0].fileName, "a.pdf");
    assert.equal(list[0].fileSize, 2048);
    assert.equal(list[0].missing, false);
  });

  it("berkas yang sama tidak bisa dilampirkan dua kali pada rekaman yang sama (409), tetapi boleh pada rekaman lain", async () => {
    const dup = await svc.attach(prisma, { villageId, userId: 5, input: input("MAIL_REGISTER", arch.a) });
    assert.ok(!dup.ok && dup.status === 409);
    const other = await svc.attach(prisma, { villageId, userId: 5, input: input("LEGAL_DOCUMENT", arch.a) });
    assert.ok(other.ok);
  });

  it("berkas arsip desa lain ditolak (isolasi), rekaman tak ada ditolak 404", async () => {
    const foreign = await svc.attach(prisma, { villageId, userId: 5, input: input("OFFICIAL", arch.foreign) });
    assert.ok(!foreign.ok && foreign.status === 400);
    const ghost = await svc.attach(prisma, { villageId, userId: 5, input: { type: "OFFICIAL", id: 999999999n, archiveId: arch.a, label: null } });
    assert.ok(!ghost.ok && ghost.status === 404);
    const crossVillage = await svc.attach(prisma, { villageId: otherVillageId, userId: 5, input: input("OFFICIAL", arch.foreign) });
    assert.ok(!crossVillage.ok && crossVillage.status === 404, "rekaman desa A tak boleh dilampiri dari desa B");
    assert.equal((await svc.listAttachments(prisma, villageId, ref("OFFICIAL"))).length, 0);
  });

  it("daftar tidak bocor lintas desa", async () => {
    assert.equal((await svc.listAttachments(prisma, otherVillageId, ref("MAIL_REGISTER"))).length, 0);
  });

  it("jenis lain bekerja: perangkat, lembaga, rapat, mutasi (id BigInt)", async () => {
    for (const t of ["OFFICIAL", "INSTITUTION", "MEETING", "MUTATION"] as const) {
      const r = await svc.attach(prisma, { villageId, userId: 5, input: input(t, arch.b, `Berkas ${t}`) });
      assert.ok(r.ok, t);
      const list = await svc.listAttachments(prisma, villageId, ref(t));
      assert.equal(list.length, 1);
      assert.equal(list[0].label, `Berkas ${t}`);
    }
  });

  it("batas jumlah lampiran per rekaman", async () => {
    const limit = catalog.ATTACHMENT_LIMITS.perRecord;
    const have = await prisma.recordAttachment.count({ where: { villageId, entityType: "INSTITUTION", entityId: BigInt(ent.INSTITUTION) } });
    for (let i = have; i < limit; i++) {
      const a = await archive(villageId, `bulk-${i}.pdf`);
      const r = await svc.attach(prisma, { villageId, userId: 5, input: input("INSTITUTION", a.id) });
      assert.ok(r.ok, `ke-${i}`);
    }
    const extra = await archive(villageId, "extra.pdf");
    const over = await svc.attach(prisma, { villageId, userId: 5, input: input("INSTITUTION", extra.id) });
    assert.ok(!over.ok && over.status === 409);
  });

  it("jumlah pemakaian arsip dihitung (dasar pemblokiran hapus) dan turun setelah dilepas", async () => {
    assert.equal(await svc.attachmentUsageCount(prisma, villageId, arch.a), 2);
    const rows = await prisma.recordAttachment.findMany({ where: { villageId, archiveId: arch.a } });
    const gone = await svc.detach(prisma, { villageId, attachmentId: rows[0].id });
    assert.ok(gone.ok);
    assert.equal(await svc.attachmentUsageCount(prisma, villageId, arch.a), 1);
    assert.ok(await prisma.digitalArchive.findUnique({ where: { id: arch.a } }), "melepas tidak menghapus berkas di Arsip");
  });

  it("melepas lampiran desa lain gagal 404; lampiran tetap ada", async () => {
    const row = await prisma.recordAttachment.findFirstOrThrow({ where: { villageId, archiveId: arch.b } });
    const r = await svc.detach(prisma, { villageId: otherVillageId, attachmentId: row.id });
    assert.ok(!r.ok && r.status === 404);
    assert.ok(await svc.findAttachment(prisma, villageId, row.id));
    assert.equal(await svc.findAttachment(prisma, otherVillageId, row.id), null);
  });

  it("tautan yatim (berkas arsip terhapus) ditandai missing, bukan error", async () => {
    const temp = await archive(villageId, "temp.pdf");
    await svc.attach(prisma, { villageId, userId: 5, input: input("MEETING", temp.id, "Sementara") });
    await prisma.digitalArchive.delete({ where: { id: temp.id } });
    const list = await svc.listAttachments(prisma, villageId, ref("MEETING"));
    const orphan = list.find((x) => x.label === "Sementara");
    assert.ok(orphan && orphan.missing && orphan.fileName === null && orphan.fileSize === null);
  });

  it("ringkasan jumlah: per rekaman, hanya desa sendiri, dan jenis lain tidak tercampur", async () => {
    const reg = BigInt(ent.LEGAL_DOCUMENT);
    const counts = await svc.countAttachments(prisma, villageId, "LEGAL_DOCUMENT", [reg, 999999999n]);
    assert.equal(counts[String(reg)], 1);
    assert.equal(counts["999999999"], undefined, "tanpa lampiran tidak muncul");
    assert.deepEqual(await svc.countAttachments(prisma, otherVillageId, "LEGAL_DOCUMENT", [reg]), {});
    const meetingRows = await prisma.recordAttachment.count({ where: { villageId, entityType: "MEETING", entityId: reg } });
    const meetingCounts = await svc.countAttachments(prisma, villageId, "MEETING", [reg]);
    assert.equal(meetingCounts[String(reg)] ?? 0, meetingRows, "jumlah suatu jenis hanya dihitung dari jenisnya sendiri, walau id rekaman sama");
    assert.deepEqual(await svc.countAttachments(prisma, villageId, "LEGAL_DOCUMENT", []), {});
  });

  it("gelombang 2: berkas bisa dilampirkan ke tiap jenis baru, termasuk tabel anak BUMDes/koperasi", async () => {
    const wave2 = catalog.ATTACHMENT_ENTITY_TYPES.slice(6);
    assert.equal(wave2.length, 14);
    for (const t of wave2) {
      const r = await svc.attach(prisma, { villageId, userId: 5, input: input(t as keyof typeof ent, arch.a) });
      assert.ok(r.ok, `${t}: ${r.ok ? "" : r.errors[0]}`);
      const cross = await svc.attach(prisma, { villageId: otherVillageId, userId: 5, input: input(t as keyof typeof ent, arch.foreign) });
      assert.ok(!cross.ok && cross.status === 404, `${t} bocor lintas desa`);
    }
  });

  it("menghapus desa ikut menghapus tautan lampirannya (cascade)", async () => {
    const t = Date.now() % 1e6;
    const v = await prisma.village.create({ data: { code: `Z${t}`, name: "Desa Z", district: "k", regency: "r", province: "p", address: "a" } });
    await prisma.recordAttachment.create({ data: { villageId: v.id, entityType: "OFFICIAL", entityId: 1n, archiveId: 1n, label: "x" } });
    await prisma.village.delete({ where: { id: v.id } });
    assert.equal(await prisma.recordAttachment.count({ where: { villageId: v.id } }), 0);
  });
});
