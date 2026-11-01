/** Tes integrasi Laporan Kepala Desa (LPPD/LKPPD) terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Laporan Kepala Desa (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/laporan-desa/service");
  let vA = 0;
  let vB = 0;
  const NOW = new Date("2027-03-10T03:00:00Z");

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/laporan-desa/service");
    const t = Date.now() % 1e6;
    const mk = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "Jl. Uji 1", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mk("LA")).id;
    vB = (await mk("LB")).id;
    await prisma.rpjmdesPlan.create({ data: { villageId: vA, title: "RPJMDes 2022-2027", periodStart: 2022, periodEnd: 2027, vision: "Desa maju", mission: "Melayani warga", status: "active" } });
    await prisma.resident.create({ data: { villageId: vA, nik: `${t}1`.padEnd(16, "0").slice(0, 16), name: "W1", birthplace: "x", birthDate: new Date("1990-01-01"), gender: "Laki-laki", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga" } });
    await prisma.resident.create({ data: { villageId: vA, nik: `${t}2`.padEnd(16, "0").slice(0, 16), name: "W2", birthplace: "x", birthDate: new Date("1992-01-01"), gender: "Perempuan", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Istri" } });
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("menyimpan bagian naratif (paragraf dipertahankan), menolak bagian asing dan terlalu panjang, desa terisolasi", async () => {
    assert.equal((await svc.saveReport(prisma, { villageId: vA, userId: 1, kind: "LPPD_TAHUN", year: 2026, input: { sections: { ngawur: "x" } } })).ok, false);
    assert.equal((await svc.saveReport(prisma, { villageId: vA, userId: 1, kind: "LPPD_TAHUN", year: 2026, input: { sections: { tujuan: "x".repeat(20001) } } })).ok, false);
    assert.equal((await svc.saveReport(prisma, { villageId: vA, userId: 1, kind: "LPPD_TAHUN", year: 2026, input: { sections: { tujuan: 5 } } })).ok, false);
    const r = await svc.saveReport(prisma, { villageId: vA, userId: 1, kind: "LPPD_TAHUN", year: 2026, input: { sections: { tujuan: "Paragraf satu.\n\nParagraf dua.  \n" } } });
    assert.ok(r.ok && r.data.saved === 1);
    const g = await svc.getReport(prisma, vA, "LPPD_TAHUN", 2026);
    assert.ok(g.ok && g.data.sections.tujuan === "Paragraf satu.\n\nParagraf dua.");
    assert.equal(g.ok && g.data.deadline, "2027-03-31");
    assert.ok(g.ok && g.data.suggestions.visi_misi?.includes("Visi: Desa maju") && g.data.suggestions.visi_misi.includes("Misi: Melayani warga"));
    const other = await svc.getReport(prisma, vB, "LPPD_TAHUN", 2026);
    assert.ok(other.ok && Object.keys(other.data.sections).length === 0 && other.data.suggestions.visi_misi === null, "desa lain tidak melihat isi desa A");
    // kosongkan bagian
    await svc.saveReport(prisma, { villageId: vA, userId: 1, kind: "LPPD_TAHUN", year: 2026, input: { sections: { tujuan: "" } } });
    const empty = await svc.getReport(prisma, vA, "LPPD_TAHUN", 2026);
    assert.ok(empty.ok && !("tujuan" in empty.data.sections));
  });

  it("penyerahan butuh semua bagian wajib; setelah diserahkan terkunci sampai dibuka kembali", async () => {
    const kind = "LKPPD" as const;
    assert.equal((await svc.submitReport(prisma, { villageId: vA, kind, year: 2026, input: { submittedAt: "2027-03-05" }, now: NOW })).ok, false, "belum disusun");
    assert.ok((await svc.saveReport(prisma, { villageId: vA, userId: 1, kind, year: 2026, input: { sections: { catatan_lain: "x" } } })).ok);
    const incomplete = await svc.submitReport(prisma, { villageId: vA, kind, year: 2026, input: { submittedAt: "2027-03-05" }, now: NOW });
    assert.equal(incomplete.ok, false);
    assert.match(incomplete.ok ? "" : incomplete.errors[0]!, /Bagian wajib belum diisi/);
    assert.ok((await svc.saveReport(prisma, { villageId: vA, userId: 1, kind, year: 2026, input: { sections: { langkah_kebijakan: "Menerbitkan Perkades penjabaran APB Desa." } } })).ok);
    assert.equal((await svc.submitReport(prisma, { villageId: vA, kind, year: 2026, input: { submittedAt: "2027-04-01" }, now: NOW })).ok, false, "tanggal masa depan");
    assert.equal((await svc.submitReport(prisma, { villageId: vB, kind, year: 2026, input: { submittedAt: "2027-03-05" }, now: NOW })).ok, false, "desa lain");
    assert.ok((await svc.submitReport(prisma, { villageId: vA, kind, year: 2026, input: { submittedAt: "2027-03-05", note: "Diserahkan ke BPD" }, now: NOW })).ok);
    assert.equal((await svc.saveReport(prisma, { villageId: vA, userId: 1, kind, year: 2026, input: { sections: { catatan_lain: "ubah" } } })).ok, false, "terkunci");
    assert.equal((await svc.submitReport(prisma, { villageId: vA, kind, year: 2026, input: { submittedAt: "2027-03-06" }, now: NOW })).ok, false, "sudah diserahkan");
    assert.ok((await svc.reopenReport(prisma, { villageId: vA, kind, year: 2026 })).ok);
    assert.ok((await svc.saveReport(prisma, { villageId: vA, userId: 1, kind, year: 2026, input: { sections: { catatan_lain: "ubah" } } })).ok);
  });

  it("LPPD akhir masa jabatan: tenggat dari tanggal berakhir; dokumen memuat penduduk otomatis untuk LPPD tahunan", async () => {
    assert.ok((await svc.saveReport(prisma, { villageId: vA, userId: 1, kind: "LPPD_JABATAN", year: 2027, input: { sections: { masa_jabatan_berakhir: "2027-08-31" } } })).ok);
    assert.equal((await svc.saveReport(prisma, { villageId: vA, userId: 1, kind: "LPPD_JABATAN", year: 2027, input: { sections: { masa_jabatan_berakhir: "31/08/2027" } } })).ok, false);
    const g = await svc.getReport(prisma, vA, "LPPD_JABATAN", 2027);
    assert.equal(g.ok && g.data.deadline, "2027-03-31");
    const doc = await svc.loadDocument(prisma, vA, "LPPD_TAHUN", 2026);
    assert.ok(doc.ok);
    const pop = doc.ok ? doc.data.blocks.find((b) => b.type === "table") : undefined;
    assert.ok(pop && pop.type === "table" && pop.table.rows.some((r) => r.cells[0] === "Jumlah penduduk" && r.cells[1] === "2"));
  });
});
