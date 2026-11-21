/** Tes integrasi Aspirasi Warga terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

const BODY = "Tumpukan sampah di tepi sungai dekat jembatan sudah dua minggu tidak diangkut dan mulai berbau. Warga sekitar khawatir menjadi sumber penyakit.";
const KEY = "aspirasi/2026/11/123e4567-e89b-12d3-a456-426614174000.webp";
const KEY2 = "aspirasi/2026/11/223e4567-e89b-12d3-a456-426614174000.webp";

describe("Aspirasi warga (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/aspirasi/service");
  let mod: typeof import("../lib/aspirasi/moderation");
  const t = Date.now() % 1e6;
  let vA = 0;
  let vB = 0;
  let uA = 0;
  let uB = 0;
  const admin = { id: 1, email: "owner@klandesa.test" };
  const areaCode = `64.02.05.${2000 + (t % 900)}`;
  const resolveVillage = async (code: string) => (code === areaCode ? { wilayahCode: code, kind: "desa" as const, name: `Muara Uji ${t}`, district: "Muara Badak", regency: "Kabupaten Kutai Kartanegara", province: "Kalimantan Timur" } : null);
  const ctx = (ip = "iphash-1") => ({ ipHash: ip, resolveVillage });
  const input = (over: Record<string, unknown> = {}) => ({
    areaCode, category: "sampah", title: "Sampah menumpuk di tepi sungai", body: BODY, locationNote: "Dekat jembatan RT 03",
    reporterName: "Budi", reporterPhone: "0812-3456-7890", consent: true, photos: [KEY], ...over,
  });
  const submit = async (over: Record<string, unknown> = {}, ip = "iphash-1") => {
    const r = await svc.submitAspiration(prisma, input(over), ctx(ip));
    assert.ok(r.ok, r.ok ? "" : r.errors.join());
    return r.ok ? r.data : { code: "", id: "" };
  };
  const publish = async (id: string) => {
    const r = await mod.moderateAspiration(prisma, BigInt(id), admin, { action: "publish" });
    assert.ok(r.ok, r.ok ? "" : r.errors.join());
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/aspirasi/service");
    mod = await import("../lib/aspirasi/moderation");
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "Muara Badak", regency: "Kutai Kartanegara", province: "Kalimantan Timur", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("AS-A")).id;
    vB = (await mkV("AS-B")).id;
    uA = (await prisma.user.create({ data: { villageId: vA, email: `asp-a${t}@desa.test`, password: "x", name: "Admin A", role: "admin" } })).id;
    uB = (await prisma.user.create({ data: { villageId: vB, email: `asp-b${t}@desa.test`, password: "x", name: "Admin B", role: "admin" } })).id;
  });
  after(async () => {
    await prisma.aspiration.deleteMany({ where: { area: { OR: [{ wilayahCode: areaCode }, { slug: { startsWith: "manual-uji" } }] } } });
    await prisma.villageClaim.deleteMany({ where: { villageId: { in: [vA, vB] } } });
    await prisma.aspirationArea.deleteMany({ where: { OR: [{ wilayahCode: areaCode }, { slug: { startsWith: "manual-uji" } }, { villageId: { in: [vA, vB] } }] } });
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("kirim: masuk antrean PENDING, area dibuat dari kode, kontak dinormalkan dan tidak publik", async () => {
    const { code, id } = await submit();
    const row = await prisma.aspiration.findUniqueOrThrow({ where: { id: BigInt(id) }, include: { area: true } });
    assert.equal(row.status, "PENDING");
    assert.equal(row.reporterPhone, "6281234567890");
    assert.equal(row.area.wilayahCode, areaCode);
    assert.equal(row.area.kind, "desa");
    assert.equal(row.progress, "NEW");
    assert.deepEqual(svc.readPhotos(row.photos), [{ key: KEY }]);
    assert.equal(await svc.getPublicAspiration(prisma, code), null, "PENDING tidak tampil publik");
    assert.equal((await svc.listPublicAspirations(prisma, { areaSlug: row.area.slug })).total, 0);
  });

  it("kirim: validasi (persetujuan, NIK, panjang, kontak, foto, wilayah) dan kolom jebakan bot", async () => {
    const bad = async (over: Record<string, unknown>, field: string) => {
      const r = await svc.submitAspiration(prisma, input(over), ctx());
      assert.ok(!r.ok && r.status === 400, `harus ditolak: ${field}`);
      assert.ok(!r.ok && r.fieldErrors?.[field], `galat pada ${field}: ${JSON.stringify(!r.ok && r.fieldErrors)}`);
    };
    await bad({ consent: false }, "consent");
    await bad({ body: `${BODY} NIK 6402010101010001` }, "body");
    await bad({ body: "terlalu pendek" }, "body");
    await bad({ title: "pendek" }, "title");
    await bad({ category: "ngawur" }, "category");
    await bad({ reporterPhone: "", reporterEmail: "" }, "reporterPhone");
    await bad({ reporterPhone: "123" }, "reporterPhone");
    await bad({ reporterPhone: "", reporterEmail: "bukan-email" }, "reporterEmail");
    await bad({ photos: ["aspirasi/../../x.webp"] }, "photos");
    await bad({ photos: [KEY, KEY2, KEY, "aspirasi/2026/11/323e4567-e89b-12d3-a456-426614174000.webp", "aspirasi/2026/11/423e4567-e89b-12d3-a456-426614174000.webp"] }, "photos");
    await bad({ areaCode: undefined }, "area");
    const unknown = await svc.submitAspiration(prisma, input({ areaCode: "11.11.11.1111" }), ctx());
    assert.ok(!unknown.ok && unknown.fieldErrors?.area);
    // Nomor/email/tautan di isi disamarkan, bukan ditolak.
    const masked = await submit({ body: `${BODY} Hubungi 081234567891 atau a@b.id lewat https://x.id`, reporterPhone: "", reporterEmail: "Pelapor@Mail.ID" }, "iphash-2");
    const row = await prisma.aspiration.findUniqueOrThrow({ where: { code: masked.code } });
    assert.doesNotMatch(row.body, /081234567891|a@b\.id|https:/);
    assert.equal(row.reporterEmail, "pelapor@mail.id");
    // Bot: pura-pura berhasil, tidak ada baris.
    const before = await prisma.aspiration.count();
    const bot = await svc.submitAspiration(prisma, input({ website: "http://spam" }), ctx());
    assert.ok(bot.ok && bot.data.id === "0");
    assert.equal(await prisma.aspiration.count(), before);
  });

  it("wilayah manual memakai area yang sama bila namanya sama; area berkode tidak ganda", async () => {
    const manual = { name: `Manual Uji ${t}`, district: "Kec Uji", regency: "Kab Uji", province: "Prov Uji" };
    const a = await submit({ areaCode: undefined, manualArea: manual }, "iphash-3");
    const b = await submit({ areaCode: undefined, manualArea: { ...manual, name: `  manual   UJI ${t} ` } }, "iphash-4");
    const [ra, rb] = await Promise.all([prisma.aspiration.findUniqueOrThrow({ where: { code: a.code } }), prisma.aspiration.findUniqueOrThrow({ where: { code: b.code } })]);
    assert.equal(ra.areaId, rb.areaId);
    const area = await prisma.aspirationArea.findUniqueOrThrow({ where: { id: ra.areaId } });
    assert.equal(area.wilayahCode, null);
    assert.match(area.slug, /^manual-uji-/);
    const coded = await prisma.aspirationArea.count({ where: { wilayahCode: areaCode } });
    assert.equal(coded, 1);
  });

  it("cek status pelapor: kontak cocok (format berbeda boleh), salah/tak ada = pesan yang sama", async () => {
    const { code } = await submit({ reporterPhone: "081311112222", reporterEmail: "Cek@Mail.id" }, "iphash-5");
    const ok1 = await svc.reporterStatus(prisma, code, "+62 813-1111-2222");
    assert.ok(ok1.ok && ok1.data.status === "PENDING" && ok1.data.path === null);
    assert.ok((await svc.reporterStatus(prisma, code, "cek@mail.id")).ok);
    const wrong = await svc.reporterStatus(prisma, code, "081399999999");
    const missing = await svc.reporterStatus(prisma, "abcdefghjk", "081311112222");
    assert.ok(!wrong.ok && !missing.ok && wrong.status === 404 && wrong.errors[0] === missing.errors[0]);
  });

  it("moderasi: tolak wajib alasan, tayangkan sekali (tanggal terbit tetap), takedown final, sunting menyamarkan data", async () => {
    const { id, code } = await submit({}, "iphash-6");
    const noReason = await mod.moderateAspiration(prisma, BigInt(id), admin, { action: "reject" });
    assert.ok(!noReason.ok && noReason.status === 400);
    const wrongState = await mod.moderateAspiration(prisma, BigInt(id), admin, { action: "hide" });
    assert.ok(!wrongState.ok && wrongState.status === 409, "PENDING tidak bisa disembunyikan");

    const rej = await mod.moderateAspiration(prisma, BigInt(id), admin, { action: "reject", rejectReason: "Memuat nama orang tertentu." });
    assert.ok(rej.ok && rej.data.status === "REJECTED");
    const st = await svc.reporterStatus(prisma, code, "081234567890");
    assert.ok(st.ok && st.data.rejectReason === "Memuat nama orang tertentu.");
    assert.ok((await mod.moderateAspiration(prisma, BigInt(id), admin, { action: "reopen" })).ok);
    assert.equal((await prisma.aspiration.findUniqueOrThrow({ where: { id: BigInt(id) } })).rejectReason, null);

    await publish(id);
    const first = (await prisma.aspiration.findUniqueOrThrow({ where: { id: BigInt(id) } })).publishedAt;
    assert.ok(first);
    assert.ok((await mod.moderateAspiration(prisma, BigInt(id), admin, { action: "hide" })).ok);
    assert.equal(await svc.getPublicAspiration(prisma, code), null, "HIDDEN tidak tampil");
    await publish(id);
    assert.equal((await prisma.aspiration.findUniqueOrThrow({ where: { id: BigInt(id) } })).publishedAt?.getTime(), first!.getTime(), "tanggal terbit pertama dipertahankan");

    const edit = await mod.moderateAspiration(prisma, BigInt(id), admin, { action: "edit", body: `${BODY} Telepon 081234567899.`, keepPhotoKeys: [KEY2, KEY] });
    assert.ok(edit.ok && edit.data.removedPhotoKeys.length === 0);
    const edited = await prisma.aspiration.findUniqueOrThrow({ where: { id: BigInt(id) } });
    assert.doesNotMatch(edited.body, /081234567899/);
    assert.deepEqual(svc.readPhotos(edited.photos), [{ key: KEY }], "hanya foto yang memang ada yang boleh dipertahankan");
    // Judul disunting: alamat ikut berubah (judul lama tak boleh bertahan di URL); foto yang dibuang dilaporkan untuk dihapus dari penyimpanan.
    const retitle = await mod.moderateAspiration(prisma, BigInt(id), admin, { action: "edit", title: "Tumpukan sampah di tepi sungai", keepPhotoKeys: [] });
    assert.ok(retitle.ok && retitle.data.removedPhotoKeys.join() === KEY);
    const re = await prisma.aspiration.findUniqueOrThrow({ where: { id: BigInt(id) } });
    assert.equal(re.slug, "tumpukan-sampah-di-tepi-sungai");
    assert.deepEqual(svc.readPhotos(re.photos), []);
    assert.ok((await mod.moderateAspiration(prisma, BigInt(id), admin, { action: "noindex" })).ok);
    assert.equal((await svc.getPublicAspiration(prisma, code))?.noindex, true);

    assert.ok((await mod.moderateAspiration(prisma, BigInt(id), admin, { action: "remove", note: "takedown" })).ok);
    for (const a of ["publish", "hide", "edit", "remove"] as const) {
      const r = await mod.moderateAspiration(prisma, BigInt(id), admin, { action: a });
      assert.ok(!r.ok && r.status === 409, `REMOVED final: ${a}`);
    }
  });

  it("tampilan publik tidak pernah membawa kontak pelapor atau ipHash", async () => {
    const { id, code } = await submit({ reporterName: "Rahasia Nama", reporterPhone: "081377778888" }, "iphash-7");
    await publish(id);
    const p = await svc.getPublicAspiration(prisma, code);
    assert.ok(p);
    const dump = JSON.stringify(p);
    assert.doesNotMatch(dump, /Rahasia Nama|6281377778888|081377778888|iphash-7|reporter|ipHash/i);
    const list = await svc.listPublicAspirations(prisma, { areaSlug: p.area.slug });
    assert.doesNotMatch(JSON.stringify(list), /Rahasia Nama|6281377778888|iphash-7|reporter|ipHash/i);
    const area = await svc.getPublicArea(prisma, p.area.slug);
    assert.ok(area && area.published >= 1 && area.claimed === false);
    const found = await svc.searchAreas(prisma, `Muara Uji ${t}`);
    assert.equal(found.length, 1);
    assert.deepEqual(await svc.searchAreas(prisma, "x"), [], "kueri terlalu pendek");
  });

  it("klaim desa: validasi, satu wilayah satu desa, persetujuan menolak klaim saingan, pencabutan", async () => {
    const { id } = await submit({}, "iphash-8");
    await publish(id);
    const slug = (await prisma.aspirationArea.findUniqueOrThrow({ where: { wilayahCode: areaCode } })).slug;

    const bad = await svc.submitClaim(prisma, slug, { villageId: vA, userId: uA }, { position: "", evidenceNote: "x" });
    assert.ok(!bad.ok && bad.status === 400);
    const missing = await svc.submitClaim(prisma, "tidak-ada", { villageId: vA, userId: uA }, { position: "Sekdes", evidenceNote: "Situs resmi desa https://desa.id dan SK nomor 12/2024" });
    assert.ok(!missing.ok && missing.status === 404);

    const evidence = "Situs resmi desa https://desa.id dan SK nomor 12/2024 tentang pengangkatan.";
    const cA = await svc.submitClaim(prisma, slug, { villageId: vA, userId: uA }, { position: "Sekretaris Desa", evidenceNote: evidence, contactPhone: "081200001111" });
    assert.ok(cA.ok);
    const dup = await svc.submitClaim(prisma, slug, { villageId: vA, userId: uA }, { position: "Sekretaris Desa", evidenceNote: evidence });
    assert.ok(!dup.ok && dup.status === 409, "klaim tertunda kedua ditolak");
    const cB = await svc.submitClaim(prisma, slug, { villageId: vB, userId: uB }, { position: "Kades", evidenceNote: evidence });
    assert.ok(cB.ok);

    // Belum disetujui: desa tidak bisa menanggapi.
    const code = (await prisma.aspiration.findFirstOrThrow({ where: { areaId: (await prisma.aspirationArea.findUniqueOrThrow({ where: { slug } })).id, status: "PUBLISHED" } })).code;
    const early = await svc.createReply(prisma, code, { villageId: vA, userId: uA, authorLabel: "Pemerintah Desa A" }, { kind: "RESPONSE", body: "Kami akan menindaklanjuti laporan ini." });
    assert.ok(!early.ok && early.status === 403);

    const noNote = await mod.reviewClaim(prisma, cB.ok ? cB.data.id : 0, admin, { decision: "reject" });
    assert.ok(!noNote.ok && noNote.status === 400, "tolak wajib alasan");

    const approved = await mod.reviewClaim(prisma, cA.ok ? cA.data.id : 0, admin, { decision: "approve" });
    assert.ok(approved.ok && approved.data.status === "APPROVED");
    const area = await prisma.aspirationArea.findUniqueOrThrow({ where: { slug } });
    assert.equal(area.villageId, vA);
    assert.ok(area.claimedAt);
    const rival = await prisma.villageClaim.findUniqueOrThrow({ where: { id: cB.ok ? cB.data.id : 0 } });
    assert.equal(rival.status, "REJECTED", "klaim saingan otomatis ditolak");
    const again = await mod.reviewClaim(prisma, cA.ok ? cA.data.id : 0, admin, { decision: "approve" });
    assert.ok(!again.ok && again.status === 409);
    const late = await svc.submitClaim(prisma, slug, { villageId: vB, userId: uB }, { position: "Kades", evidenceNote: evidence });
    assert.ok(!late.ok && late.status === 409, "wilayah sudah dikelola");

    const state = await svc.villageClaimState(prisma, vA);
    assert.equal(state.area?.slug, slug);
    assert.equal((await svc.villageClaimState(prisma, vB)).area, null);

    const revoked = await mod.reviewClaim(prisma, cA.ok ? cA.data.id : 0, admin, { decision: "revoke", note: "Bukti ternyata palsu" });
    assert.ok(revoked.ok && revoked.data.status === "REVOKED");
    assert.equal((await prisma.aspirationArea.findUniqueOrThrow({ where: { slug } })).villageId, null);
    assert.equal((await svc.createReply(prisma, code, { villageId: vA, userId: uA, authorLabel: "x" }, { kind: "RESPONSE", body: "Setelah dicabut tidak boleh." })).ok, false);
  });

  it("tanggapan desa: hanya desa pengelola, status tindak lanjut bergerak, hapus menghitung ulang, batas jumlah", async () => {
    const { id, code } = await submit({}, "iphash-9");
    await publish(id);
    const slug = (await prisma.aspirationArea.findUniqueOrThrow({ where: { wilayahCode: areaCode } })).slug;
    const c = await svc.submitClaim(prisma, slug, { villageId: vB, userId: uB }, { position: "Kades", evidenceNote: "Situs resmi desa https://desa.id dan SK nomor 12/2024." });
    assert.ok(c.ok);
    assert.ok((await mod.reviewClaim(prisma, c.ok ? c.data.id : 0, admin, { decision: "approve" })).ok);

    const actorB = { villageId: vB, userId: uB, authorLabel: "Pemerintah Desa B" };
    const actorA = { villageId: vA, userId: uA, authorLabel: "Pemerintah Desa A" };
    assert.ok(!(await svc.createReply(prisma, code, actorA, { kind: "RESPONSE", body: "Saya desa yang salah." })).ok, "desa lain ditolak");
    assert.ok(!(await svc.createReply(prisma, code, actorB, { kind: "RESPONSE", body: "pendek" })).ok);
    assert.ok(!(await svc.createReply(prisma, code, actorB, { kind: "NGAWUR", body: "Jenis tanggapan tidak dikenal." })).ok);

    const r1 = await svc.createReply(prisma, code, actorB, { kind: "RESPONSE", body: "Terima kasih, kami cek ke lokasi besok pagi." });
    assert.ok(r1.ok && r1.data.progress === "RESPONDED");
    const r2 = await svc.createReply(prisma, code, actorB, { kind: "PROGRESS", body: "Petugas kebersihan sudah dijadwalkan Kamis." });
    assert.ok(r2.ok && r2.data.progress === "IN_PROGRESS");
    const r3 = await svc.createReply(prisma, code, actorB, { kind: "RESPONSE", body: "Tanggapan biasa tidak menurunkan status." });
    assert.ok(r3.ok && r3.data.progress === "IN_PROGRESS");
    const r4 = await svc.createReply(prisma, code, actorB, { kind: "RESOLVED", body: "Sampah sudah diangkut dan area dibersihkan." });
    assert.ok(r4.ok && r4.data.progress === "RESOLVED");

    const pub = await svc.getPublicAspiration(prisma, code);
    assert.equal(pub?.replies.length, 4);
    assert.equal(pub?.replies[0]?.authorLabel, "Pemerintah Desa B");
    assert.equal(pub?.progress, "RESOLVED");

    // Hapus tanggapan "selesai": status turun kembali ke yang tertinggi dari sisanya.
    assert.ok(!(await svc.removeReply(prisma, BigInt(r4.ok ? r4.data.id : 0), vA)).ok, "desa lain tak bisa menghapus");
    const rm = await svc.removeReply(prisma, BigInt(r4.ok ? r4.data.id : 0), vB);
    assert.ok(rm.ok && rm.data.progress === "IN_PROGRESS");
    assert.ok(!(await svc.removeReply(prisma, BigInt(r4.ok ? r4.data.id : 0), vB)).ok, "sudah dihapus");

    const dispute = await svc.createReply(prisma, code, actorB, { kind: "DISPUTE", body: "Laporan ini tidak sesuai: lokasi berada di wilayah desa tetangga." });
    assert.ok(dispute.ok && dispute.data.progress === "DISPUTED");

    const mine = await svc.listForVillage(prisma, vB);
    assert.equal(mine.area?.slug, slug);
    const row = mine.items.find((x) => x.code === code);
    assert.ok(row && row.replies.every((x) => x.mine));
    assert.equal(mine.counts.DISPUTED, 1);
    assert.equal((await svc.listForVillage(prisma, vA)).area, null, "desa tanpa wilayah: daftar kosong");

    // Batas jumlah tanggapan per laporan.
    const many = await submit({}, "iphash-10");
    await publish(many.id);
    for (let i = 0; i < svc.MAX_REPLIES_PER_ASPIRATION; i++) {
      const r = await svc.createReply(prisma, many.code, actorB, { kind: "PROGRESS", body: `Kabar progres ke-${i + 1} dari desa.` });
      assert.ok(r.ok, `tanggapan ${i + 1}`);
    }
    const over = await svc.createReply(prisma, many.code, actorB, { kind: "PROGRESS", body: "Tanggapan melewati batas jumlah." });
    assert.ok(!over.ok && over.status === 409);
  });

  it("laporan konten: duplikat dari perangkat sama diabaikan; data pribadi menyembunyikan otomatis (desa: langsung, publik: 3 pelapor)", async () => {
    const flagReq = (reason: string, over: Record<string, unknown> = {}) => ({ reason, ...over });

    const a = await submit({}, "iphash-11");
    await publish(a.id);
    assert.ok(!(await svc.createFlag(prisma, a.code, { source: "PUBLIC", ipHash: "f1" }, flagReq("NGAWUR"))).ok);
    assert.ok(!(await svc.createFlag(prisma, a.code, { source: "PUBLIC", ipHash: "f1" }, flagReq("OTHER"))).ok, "OTHER wajib dijelaskan");
    assert.ok(!(await svc.createFlag(prisma, "abcdefghjk", { source: "PUBLIC", ipHash: "f1" }, flagReq("SPAM"))).ok);

    const spam = await svc.createFlag(prisma, a.code, { source: "PUBLIC", ipHash: "f1" }, flagReq("SPAM"));
    assert.ok(spam.ok && spam.data.hidden === false);
    await svc.createFlag(prisma, a.code, { source: "PUBLIC", ipHash: "f1" }, flagReq("SPAM"));
    assert.equal(await prisma.aspirationFlag.count({ where: { aspirationId: BigInt(a.id), reason: "SPAM" } }), 1, "duplikat diabaikan");
    assert.equal((await svc.getPublicAspiration(prisma, a.code))?.openFlags, 1, "flag terbuka tercatat (untuk noindex)");

    const p1 = await svc.createFlag(prisma, a.code, { source: "PUBLIC", ipHash: "f1" }, flagReq("PERSONAL_DATA"));
    assert.ok(p1.ok && p1.data.hidden === false, "satu pelapor publik belum menyembunyikan");
    assert.ok(await svc.getPublicAspiration(prisma, a.code));
    const p2 = await svc.createFlag(prisma, a.code, { source: "PUBLIC", ipHash: "f2" }, flagReq("PERSONAL_DATA"));
    assert.ok(p2.ok && p2.data.hidden === false, "dua pelapor publik belum cukup");
    assert.ok(await svc.getPublicAspiration(prisma, a.code));
    const p3 = await svc.createFlag(prisma, a.code, { source: "PUBLIC", ipHash: "f4" }, flagReq("PERSONAL_DATA"));
    assert.ok(p3.ok && p3.data.hidden === true, "pelapor ketiga menyembunyikan");
    assert.equal(await svc.getPublicAspiration(prisma, a.code), null);
    assert.ok(!(await svc.createFlag(prisma, a.code, { source: "PUBLIC", ipHash: "f3" }, flagReq("SPAM"))).ok, "yang tidak tayang tak bisa dilaporkan");

    // Moderator menayangkan kembali; laporan ditutup.
    await publish(a.id);
    const flags = await mod.listFlags(prisma, { status: "OPEN" });
    assert.ok(flags.open >= 3);
    const mine = flags.items.filter((f) => f.aspiration.code === a.code);
    assert.equal(mine.length, 4);
    const closed = await mod.handleFlag(prisma, BigInt(mine[0]!.id), admin, { decision: "dismiss", note: "tidak berdasar" });
    assert.ok(closed.ok && closed.data.status === "DISMISSED");
    const twice = await mod.handleFlag(prisma, BigInt(mine[0]!.id), admin, { decision: "action" });
    assert.ok(!twice.ok && twice.status === 409);
    assert.ok(!(await mod.handleFlag(prisma, BigInt(mine[1]!.id), admin, { decision: "ngawur" })).ok);

    // Desa pengelola (B, disetujui di tes sebelumnya): keberatan data pribadi langsung menyembunyikan; desa lain (A) tak boleh.
    const b = await submit({}, "iphash-12");
    await publish(b.id);
    const outsider = await svc.createFlag(prisma, b.code, { source: "VILLAGE", villageId: vA }, flagReq("PERSONAL_DATA", { detail: "Saya bukan desa pengelola halaman ini." }));
    assert.ok(!outsider.ok && outsider.status === 403);
    const terse = await svc.createFlag(prisma, b.code, { source: "VILLAGE", villageId: vB }, flagReq("PERSONAL_DATA"));
    assert.ok(!terse.ok && terse.status === 400, "keberatan desa wajib dijelaskan");
    assert.ok((await svc.getPublicAspiration(prisma, b.code)), "belum disembunyikan tanpa penjelasan");
    const own = await svc.createFlag(prisma, b.code, { source: "VILLAGE", villageId: vB }, flagReq("PERSONAL_DATA", { detail: "Isi laporan memuat nama dan alamat rumah seorang warga." }));
    assert.ok(own.ok && own.data.hidden === true);
    assert.equal(await svc.getPublicAspiration(prisma, b.code), null);
    const hiddenRow = await prisma.aspiration.findUniqueOrThrow({ where: { code: b.code } });
    assert.equal(hiddenRow.status, "HIDDEN");
    assert.match(hiddenRow.moderationNote ?? "", /otomatis/);
  });

  it("daftar admin: antrean terlama dulu, kontak pelapor hanya di sini, pencarian aman dari karakter LIKE", async () => {
    const q = await mod.listForAdmin(prisma, { status: "PENDING" });
    assert.ok(q.items.length >= 1);
    const ids = q.items.map((x) => BigInt(x.id));
    assert.deepEqual([...ids].sort((x, y) => (x < y ? -1 : 1)), ids, "urut id naik");
    assert.ok(q.items.some((x) => x.reporter.phone));
    assert.ok(typeof q.counts.PENDING === "number");
    const all = await mod.listForAdmin(prisma, { q: "100%_" });
    assert.ok(Array.isArray(all.items));
    const claims = await mod.listClaims(prisma, { status: "APPROVED" });
    assert.ok(claims.items.every((c) => c.matchScore >= 0 && c.matchScore <= 3));
  });
});
