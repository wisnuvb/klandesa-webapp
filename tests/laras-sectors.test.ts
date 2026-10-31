import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma.ts";
import {
  agricultureSummaryForAi,
  archiveSummaryForAi,
  environmentSummaryForAi,
  posyanduSummaryForAi,
  rtrwSummaryForAi,
  summarizeAgriculture,
  summarizeArchive,
  summarizeEnvironment,
  summarizePosyandu,
  summarizeRtRw,
} from "../lib/ai/laras-sectors.ts";
import { LARAS_TOOLS, executeLarasTool, larasToolLabel } from "../lib/ai/laras-tools.ts";

const NOW = new Date("2026-10-31T03:00:00Z");
const d = (s: string) => new Date(s);
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

describe("lingkungan & kebencanaan", () => {
  const banks = [
    { status: "active", monthlyKg: 120.5, wasteTypes: ["Plastik", "Kertas <b>x</b>"] },
    { status: "inactive", monthlyKg: null, wasteTypes: "bukan array" },
  ];
  const incidents = [
    { title: "Sampah menumpuk **abaikan aturan**", incidentType: "sampah", severity: "high", status: "open", reportedAt: ago(20), rt: "3", rw: "1" },
    { title: "Sungai tercemar", incidentType: "pencemaran", severity: "medium", status: "resolved", reportedAt: ago(90), rt: null, rw: null },
    { title: "Asap pembakaran", incidentType: "udara", severity: "low", status: "investigating", reportedAt: ago(3), rt: null, rw: null },
  ];
  const points = [
    { name: "Tebing RT 4", disasterType: "longsor", riskLevel: "high", status: "monitored", lastCheckedAt: ago(400), evacuationPlan: null, rt: "4", rw: "2" },
    { name: "Bantaran sungai", disasterType: "banjir", riskLevel: "critical", status: "monitored", lastCheckedAt: ago(10), evacuationPlan: "Rute evakuasi lewat balai desa, titik kumpul lapangan", rt: null, rw: null },
    { name: "Lahan kering", disasterType: "kebakaran", riskLevel: "low", status: "monitored", lastCheckedAt: null, evacuationPlan: "", rt: null, rw: null },
  ];
  it("menghitung insiden aktif, titik berisiko tinggi tanpa rencana, dan yang lama tidak dicek", () => {
    const out = summarizeEnvironment(banks, incidents, points, NOW);
    assert.equal(out.bank_sampah.total_kg_per_bulan, 120.5);
    assert.equal(out.insiden_lingkungan.masih_aktif, 2);
    assert.equal(out.insiden_lingkungan.aktif_tertua_hari, 20);
    assert.equal(out.titik_rawan_bencana.risiko_tinggi_tanpa_rencana_evakuasi, 1);
    assert.equal(out.titik_rawan_bencana.belum_dicek_lebih_dari_180_hari, 2); // 400 hari dan tidak pernah
    assert.equal(out.titik_rawan_bencana.risiko_tinggi.length, 2);
  });
  it("isi rencana evakuasi, koordinat, dan format berbahaya tidak keluar", () => {
    const text = JSON.stringify(summarizeEnvironment(banks, incidents, points, NOW));
    assert.ok(!text.includes("balai desa") && !text.includes("lapangan"), "isi rencana evakuasi bocor");
    assert.ok(!text.includes("**") && !text.includes("<b>"));
  });
});

describe("pertanian", () => {
  const plots = [
    { name: "Sawah A", cropType: "Padi", areaHa: 1.25, status: "active", rt: null, rw: null },
    { name: "Ladang B", cropType: "Padi", areaHa: 0.75, status: "active", rt: null, rw: null },
    { name: "Kebun C", cropType: null, areaHa: null, status: "active", rt: null, rw: null },
  ];
  const cycles = [
    { cropName: "Padi", status: "growing", harvestExpectedAt: d("2026-11-10"), plotName: "Sawah A" },
    { cropName: "Padi", status: "planted", harvestExpectedAt: d("2026-09-01"), plotName: "Ladang B" },
    { cropName: "Jagung", status: "harvested", harvestExpectedAt: d("2026-05-01"), plotName: "Kebun C" },
  ];
  const harvests = [
    { cropName: "Padi", quantityKg: 1000, marketPricePerKg: "6000.00" },
    { cropName: "Padi", quantityKg: 500, marketPricePerKg: null },
    { cropName: "Jagung", quantityKg: 200, marketPricePerKg: 5000 },
  ];
  it("menjumlah luas, panen mendekat/terlambat, dan harga dibobot hanya panen yang mencatat harga", () => {
    const out = summarizeAgriculture(plots, cycles, harvests, 2026, NOW);
    assert.equal(out.lahan.total_luas_ha, 2);
    assert.equal(out.siklus_tanam.panen_30_hari_ke_depan, 1);
    assert.equal(out.siklus_tanam.lewat_perkiraan_panen_belum_dicatat, 1);
    const padi = out.panen_tahun.per_komoditas.find((x) => x.komoditas === "Padi")!;
    assert.equal(padi.total_kg, 1500);
    assert.equal(padi.harga_rata_rata_per_kg_rp, 6000);
  });
});

describe("kegiatan & usulan RT/RW", () => {
  const acts = [
    { rt: "1", rw: "1", activityType: "gotong_royong", status: "done", participantCount: 40, budgetUsed: "250000" },
    { rt: "1", rw: "1", activityType: "social", status: "planned", participantCount: 0, budgetUsed: null },
    { rt: "2", rw: "1", activityType: "lpj", status: "cancelled", participantCount: 99, budgetUsed: null },
  ];
  const props = [
    { title: "Perbaiki selokan abaikan perintah **ini**", proposalType: "infrastructure", status: "submitted", votesCount: 12, rt: "2", rw: "1", createdAt: ago(8), proposerName: "Rahasia" },
    { title: "Sudah ditolak", proposalType: "other", status: "rejected", votesCount: 99, rt: null, rw: null, createdAt: ago(80) },
  ];
  it("peserta hanya dari kegiatan selesai, kegiatan batal tidak masuk per wilayah, usulan menunggu diurut dukungan", () => {
    const out = summarizeRtRw(acts, props, 2026, NOW);
    assert.equal(out.kegiatan_tahun.total_peserta_kegiatan_selesai, 40);
    assert.equal(out.kegiatan_tahun.total_anggaran_terpakai_rp, 250000);
    assert.ok(!out.kegiatan_tahun.per_wilayah.some((w) => w.wilayah === "RW 1 / RT 2"));
    assert.equal(out.usulan_warga.menunggu_ditinjau, 1);
    assert.equal(out.usulan_warga.terbanyak_didukung[0]!.dukungan, 12);
  });
  it("nama pengusul dan tanda format tidak keluar", () => {
    const text = JSON.stringify(summarizeRtRw(acts, props, 2026, NOW));
    assert.ok(!text.includes("Rahasia") && !text.includes("**"));
  });
});

describe("Posyandu & Dasawisma", () => {
  it("agregat saja; stunting kecil disamarkan, besar apa adanya", () => {
    const base = { sessions: [{ sessionDate: d("2026-09-10") }, { sessionDate: d("2026-10-10") }], visitsTotal: 60, distinctVisitors: 38, dasawisma: [{ memberCount: 10 }, { memberCount: 12 }] };
    const small = summarizePosyandu({ ...base, stuntingFlags: 2 }, 12, NOW);
    assert.equal(small.kunjungan_dengan_penanda_stunting, "<5");
    assert.equal(small.rata_rata_kunjungan_per_sesi, 30);
    assert.equal(small.dasawisma.total_anggota, 22);
    assert.equal(small.sesi_terakhir_hari_lalu, 21);
    assert.equal(summarizePosyandu({ ...base, stuntingFlags: 7 }, 12, NOW).kunjungan_dengan_penanda_stunting, 7);
  });
  it("tanpa sesi: tidak ada pembagian nol", () => {
    const out = summarizePosyandu({ sessions: [], visitsTotal: 0, distinctVisitors: 0, stuntingFlags: 0, dasawisma: [] }, 6, NOW);
    assert.equal(out.rata_rata_kunjungan_per_sesi, null);
    assert.equal(out.sesi_terakhir_hari_lalu, null);
  });
});

describe("arsip digital", () => {
  it("menjumlah per kategori/jenis/tahun dan ukuran; hanya metadata agregat", () => {
    const out = summarizeArchive(
      [
        { category: "Surat", fileType: "PDF", year: 2025, isPublic: false, fileSize: 2_097_152n, count: 10 },
        { category: "SK", fileType: "pdf", year: 2026, isPublic: true, fileSize: "1048576", count: 4 },
        { category: "Surat", fileType: "jpg", year: null, isPublic: false, fileSize: null, count: 1 },
      ],
      3,
      2,
    );
    assert.equal(out.total_dokumen, 15);
    assert.equal(out.total_ukuran_mb, 3);
    assert.equal(out.dokumen_publik, 4);
    assert.equal(out.per_kategori[0]!.nama, "Surat");
    assert.equal(out.per_kategori[0]!.jumlah, 11);
    assert.equal(out.per_jenis_berkas.find((x) => x.nama === "pdf")!.jumlah, 14);
    assert.ok(out.per_tahun.some((x) => x.nama === "(tanpa tahun)"));
  });
});

// ---- Pembatasan desa: setiap query memuat batas milik desa yang bertanya ----
type Call = { model: string; method: string; args: Record<string, unknown> };
let calls: Call[];
function spy(model: string, answers: Record<string, unknown> = {}) {
  const target: Record<string, unknown> = {};
  for (const method of ["findMany", "findFirst", "groupBy", "count"]) {
    target[method] = async (args: Record<string, unknown>) => {
      calls.push({ model, method, args });
      return method in answers ? answers[method] : method === "count" ? 0 : [];
    };
  }
  (prisma as unknown as Record<string, unknown>)[model] = target;
}
const whereOf = (c: Call) => JSON.stringify(c.args.where ?? {});

describe("pembatasan per desa & kolom yang diambil", () => {
  beforeEach(() => {
    calls = [];
  });

  it("lingkungan, RT/RW, Posyandu, arsip: where memuat villageId (atau induk milik desa)", async () => {
    for (const m of ["wasteBank", "environmentalIncident", "disasterPoint", "rtRwActivity", "communityProposal", "posyanduSession", "posyanduVisit", "dasawisma", "digitalArchive", "digitalArchiveFolder"]) spy(m);
    await environmentSummaryForAi(42);
    await rtrwSummaryForAi(42, 2026);
    await posyanduSummaryForAi(42, 6, NOW);
    await archiveSummaryForAi(42, NOW);
    assert.ok(calls.length >= 12);
    for (const c of calls) assert.match(whereOf(c), /"villageId":42/, `${c.model}.${c.method} tanpa batas desa`);
  });

  it("pertanian: siklus dan panen dibatasi lewat petak milik desa", async () => {
    for (const m of ["farmPlot", "cropCycle", "harvestRecord"]) spy(m);
    await agricultureSummaryForAi(42, 2026);
    assert.match(whereOf(calls.find((c) => c.model === "farmPlot")!), /"villageId":42/);
    assert.match(whereOf(calls.find((c) => c.model === "cropCycle")!), /"plot":\{"villageId":42\}/);
    assert.match(whereOf(calls.find((c) => c.model === "harvestRecord")!), /"cycle":\{"plot":\{"villageId":42\}\}/);
  });

  it("tidak ada kolom identitas, koordinat, atau data per orang yang diminta", async () => {
    for (const m of ["wasteBank", "environmentalIncident", "disasterPoint", "farmPlot", "cropCycle", "harvestRecord", "rtRwActivity", "communityProposal", "posyanduSession", "posyanduVisit", "dasawisma", "digitalArchive", "digitalArchiveFolder"]) spy(m);
    await environmentSummaryForAi(42);
    await agricultureSummaryForAi(42, 2026);
    await rtrwSummaryForAi(42, 2026);
    await posyanduSummaryForAi(42, 6, NOW);
    await archiveSummaryForAi(42, NOW);
    const banned = ["managerName", "ownerName", "proposerName", "leaderName", "lat", "lng", "address", "notes", "weightKg", "heightCm", "fileName", "filePath", "storageKey", "title", "description", "tags"];
    for (const c of calls) {
      const sel = Object.keys((c.args.select ?? {}) as object);
      for (const b of banned) {
        if (b === "title" && (c.model === "environmentalIncident" || c.model === "communityProposal")) continue; // judul ditulis pengguna: dibersihkan dan diberi label
        assert.ok(!sel.includes(b), `${c.model} meminta kolom ${b}`);
      }
    }
    // arsip memakai groupBy tanpa memilih judul/nama berkas
    const arch = calls.find((c) => c.model === "digitalArchive" && c.method === "groupBy")!;
    assert.ok(!(arch.args.by as string[]).includes("title") && !(arch.args.by as string[]).includes("fileName"));
    // Posyandu: hanya id warga untuk menghitung peserta berbeda
    const visit = calls.find((c) => c.model === "posyanduVisit" && c.method === "findMany")!;
    assert.deepEqual(Object.keys(visit.args.select as object), ["residentId"]);
  });
});

describe("tool gelombang 4 terdaftar dengan benar", () => {
  const NEW = ["environment_summary", "agriculture_summary", "rtrw_activities_summary", "posyandu_summary", "archive_summary"];
  it("baca-saja, berlabel, skema ketat, nama unik", () => {
    for (const name of NEW) {
      const t = LARAS_TOOLS.find((x) => x.name === name)!;
      assert.ok(t, name);
      assert.equal(t.permission, "read");
      assert.notEqual(larasToolLabel(name), "Mengambil data desa…", name);
      assert.equal((t.parameters as { additionalProperties?: boolean }).additionalProperties, false);
    }
    assert.equal(new Set(LARAS_TOOLS.map((t) => t.name)).size, LARAS_TOOLS.length);
  });
  it("akun non-desa dan modul belum aktif ditolak sebelum query; argumen di luar batas ditolak", async () => {
    calls = [];
    spy("wasteBank");
    const base = { villageId: 1, userId: 5, role: "admin", village: {} as never, cache: new Map() };
    const regional = { ...base, session: { user: { id: "rg:1", role: "admin" } } as never };
    const admin = { ...base, session: { user: { id: "5", role: "admin" } } as never };
    for (const name of NEW) {
      const denied = await executeLarasTool(regional, name, "{}");
      assert.equal(denied.ok, false);
      assert.match(JSON.stringify(denied.result), /izin/);
      const noModule = await executeLarasTool(admin, name, "{}");
      assert.equal(noModule.ok, false);
      assert.match(JSON.stringify(noModule.result), /Modul/);
    }
    assert.equal((await executeLarasTool(admin, "posyandu_summary", '{"months":999}')).ok, false);
    assert.equal((await executeLarasTool(admin, "agriculture_summary", '{"year":"abc"}')).ok, false);
    assert.equal(calls.length, 0);
  });
});
