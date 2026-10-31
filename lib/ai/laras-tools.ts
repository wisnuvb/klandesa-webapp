import type { Session } from "next-auth";
import type { Village } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { larasCan } from "@/lib/ai/laras-authz";
import type { PermissionResource } from "@/lib/permissions/resources";
import { requireModuleEntitlement } from "@/lib/modules/require-module";
import {
  RESIDENT_FLAGS,
  RESIDENT_GROUP_BY,
  aggregateResidents,
} from "@/lib/ai/laras-aggregate";
import { suppressSmallCount } from "@/lib/ai/laras-guard";
import type { ActionCard } from "@/lib/ai/laras-actions";
import {
  MAX_PROPOSALS_PER_TURN,
  listPendingMailForAi,
  proposeMailDecision,
} from "@/lib/ai/laras-mail";
import { listOpenReportsForAi, proposeReportAction } from "@/lib/ai/laras-report";
import {
  CONTENT_MAX,
  CONTENT_MIN,
  TITLE_MAX,
  TITLE_MIN,
  listRecentAnnouncementsForAi,
  proposeAnnouncement,
} from "@/lib/ai/laras-announcement";
import { ANNOUNCEMENT_ACTION_CATEGORIES } from "@/lib/ai/laras-actions";
import type { PermissionAction } from "@/lib/permissions/actions";

/**
 * Tool baca-saja untuk Laras. Prinsip:
 * - `villageId` selalu dari konteks server, tidak pernah dari argumen model.
 * - Setiap tool dicek terhadap izin `read` milik PENGGUNA yang bertanya dan modul yang dilanggan desa.
 * - Hanya agregat: tidak ada NIK, KK, nama, alamat, atau telepon yang dikembalikan ke model.
 */

export type LarasToolContext = {
  villageId: number;
  userId: number;
  /** Role segar dari database (bukan dari JWT). */
  role: string;
  village: Village;
  session: Session;
  /** Penghitung usulan aksi dalam satu pertanyaan (dibagi lintas panggilan tool). */
  proposals?: { count: number };
  /** Cache per pertanyaan: data warga dan hasil cek modul tidak diambil ulang di setiap panggilan tool. */
  cache?: Map<string, Promise<unknown>>;
};

/** Jalankan `fn` sekali per pertanyaan untuk `key` yang sama. */
function memo<T>(ctx: LarasToolContext, key: string, fn: () => Promise<T>): Promise<T> {
  const cache = (ctx.cache ??= new Map());
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fn();
    cache.set(key, p);
    // Kegagalan tidak di-cache supaya panggilan berikutnya bisa mencoba lagi.
    p.catch(() => cache.delete(key));
  }
  return p;
}

const ACTION = Symbol("larasAction");
type WithAction = { [ACTION]: ActionCard; result: unknown };
const withAction = (result: unknown, card: ActionCard): WithAction => ({ [ACTION]: card, result });

type LarasTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  resource: PermissionResource;
  /** Izin yang dibutuhkan pengguna: "read" untuk tool baca, "update" untuk tool yang menyiapkan usulan aksi. */
  permission: PermissionAction;
  moduleId: string;
  schema: z.ZodType<Record<string, unknown>>;
  run: (ctx: LarasToolContext, args: never) => Promise<unknown>;
};

const CURRENT_YEAR = () => new Date().getFullYear();
const short = z.string().trim().min(1).max(20);

// ---------- population_stats ----------

const populationSchema = z.object({
  group_by: z.enum(RESIDENT_GROUP_BY).optional(),
  rt: short.optional(),
  rw: short.optional(),
  hamlet: z.string().trim().min(1).max(100).optional(),
  gender: z.enum(["Laki-laki", "Perempuan"]).optional(),
  age_min: z.number().int().min(0).max(120).optional(),
  age_max: z.number().int().min(0).max(120).optional(),
  flags: z.array(z.enum(RESIDENT_FLAGS)).max(5).optional(),
  desil: z.number().int().min(1).max(10).optional(),
});

async function runPopulation(ctx: LarasToolContext, a: z.infer<typeof populationSchema>) {
  const rows = await memo(ctx, "residents", () => prisma.resident.findMany({
    where: { villageId: ctx.villageId, isAlive: true },
    // Sengaja tanpa nik, kk, name, address, phone, email, nama orang tua.
    select: {
      gender: true,
      birthDate: true,
      education: true,
      occupation: true,
      religion: true,
      maritalStatus: true,
      rt: true,
      rw: true,
      hamlet: true,
      desil: true,
      isStunting: true,
      isDisability: true,
      isBpjsKis: true,
      isIlliterate: true,
      isPregnant: true,
    },
  }));
  return aggregateResidents(rows, {
    groupBy: a.group_by,
    rt: a.rt,
    rw: a.rw,
    hamlet: a.hamlet,
    gender: a.gender,
    ageMin: a.age_min,
    ageMax: a.age_max,
    flags: a.flags,
    desil: a.desil,
  });
}

// ---------- finance_summary ----------

const financeSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

async function runFinance(ctx: LarasToolContext, a: z.infer<typeof financeSchema>) {
  const year = a.year ?? CURRENT_YEAR();
  const from = new Date(year, a.month ? a.month - 1 : 0, 1);
  const to = new Date(a.month ? year : year + 1, a.month ? a.month : 0, 1);

  const [tx, budgets] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type", "category", "status"],
      where: { villageId: ctx.villageId, transactionDate: { gte: from, lt: to } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.budget.findMany({
      where: { villageId: ctx.villageId, year },
      select: { category: true, budgetAmount: true, realizedAmount: true },
    }),
  ]);

  const counted = tx.filter((r) => r.status !== "rejected");
  const sumBy = (type: string) =>
    counted.filter((r) => r.type === type).reduce((s, r) => s + Number(r._sum.amount ?? 0), 0);
  const byCategory = (type: string) =>
    counted
      .filter((r) => r.type === type)
      .map((r) => ({ category: r.category, status: r.status, jumlah_rp: Number(r._sum.amount ?? 0), transaksi: r._count }))
      .sort((x, y) => y.jumlah_rp - x.jumlah_rp)
      .slice(0, 30);

  const budgetByCat = new Map<string, { anggaran: number; realisasi: number }>();
  for (const b of budgets) {
    const cur = budgetByCat.get(b.category) ?? { anggaran: 0, realisasi: 0 };
    cur.anggaran += Number(b.budgetAmount);
    cur.realisasi += Number(b.realizedAmount);
    budgetByCat.set(b.category, cur);
  }
  const anggaran = Array.from(budgetByCat.entries())
    .map(([category, v]) => ({
      category,
      anggaran_rp: v.anggaran,
      realisasi_rp: v.realisasi,
      realisasi_persen: v.anggaran > 0 ? Math.round((v.realisasi / v.anggaran) * 1000) / 10 : null,
    }))
    .slice(0, 30);

  return {
    periode: a.month ? `${year}-${String(a.month).padStart(2, "0")}` : String(year),
    catatan: "Transaksi berstatus 'rejected' tidak dihitung. Nilai dalam rupiah.",
    pemasukan_rp: sumBy("income"),
    pengeluaran_rp: sumBy("expense"),
    selisih_rp: sumBy("income") - sumBy("expense"),
    pemasukan_per_kategori: byCategory("income"),
    pengeluaran_per_kategori: byCategory("expense"),
    anggaran_tahun_ini: anggaran,
  };
}

// ---------- mail_requests_summary ----------

const daysSchema = z.object({ days: z.number().int().min(1).max(365).optional() });

async function runMail(ctx: LarasToolContext, a: z.infer<typeof daysSchema>) {
  const days = a.days ?? 30;
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const [byStatus, byType, pending, oldest] = await Promise.all([
    prisma.mailRequest.groupBy({
      by: ["status"],
      where: { villageId: ctx.villageId, requestDate: { gte: since } },
      _count: true,
    }),
    prisma.mailRequest.groupBy({
      by: ["mailType"],
      where: { villageId: ctx.villageId, requestDate: { gte: since } },
      _count: true,
    }),
    prisma.mailRequest.count({ where: { villageId: ctx.villageId, status: "pending" } }),
    prisma.mailRequest.findFirst({
      where: { villageId: ctx.villageId, status: "pending" },
      orderBy: { requestDate: "asc" },
      select: { requestDate: true },
    }),
  ]);
  return {
    periode_hari: days,
    per_status: byStatus.map((r) => ({ status: r.status, jumlah: r._count })),
    per_jenis_surat: byType
      .map((r) => ({ jenis: r.mailType, jumlah: r._count }))
      .sort((x, y) => y.jumlah - x.jumlah)
      .slice(0, 20),
    menunggu_saat_ini: pending,
    permohonan_menunggu_tertua_hari: oldest
      ? Math.floor((Date.now() - oldest.requestDate.getTime()) / (24 * 3600 * 1000))
      : null,
  };
}

// ---------- citizen_reports_summary ----------

async function runReports(ctx: LarasToolContext, a: z.infer<typeof daysSchema>) {
  const days = a.days ?? 90;
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const where = { villageId: ctx.villageId, createdAt: { gte: since }, status: { not: "DRAFT" } };
  const [byStatus, byCategory, open] = await Promise.all([
    prisma.citizenReport.groupBy({ by: ["status"], where, _count: true }),
    prisma.citizenReport.groupBy({ by: ["category"], where, _count: true }),
    prisma.citizenReport.count({
      where: { villageId: ctx.villageId, status: { in: ["PENDING", "PROCESS"] } },
    }),
  ]);
  return {
    periode_hari: days,
    per_status: byStatus.map((r) => ({ status: r.status, jumlah: r._count })),
    per_kategori: byCategory
      .map((r) => ({ kategori: r.category ?? "(tanpa kategori)", jumlah: r._count }))
      .sort((x, y) => y.jumlah - x.jumlah)
      .slice(0, 20),
    belum_selesai_saat_ini: open,
    catatan: "Isi, judul, dan identitas pelapor tidak disertakan.",
  };
}

// ---------- social_benefits_summary ----------

const emptySchema = z.object({});

const proposeAnnouncementSchema = z.object({
  title: z.string().min(TITLE_MIN).max(TITLE_MAX + 100),
  content: z.string().min(CONTENT_MIN).max(CONTENT_MAX + 500),
  category: z.enum(ANNOUNCEMENT_ACTION_CATEGORIES),
  pinned: z.boolean().optional(),
});

const proposeReportSchema = z.object({
  report_id: z.number().int().positive(),
  status: z.enum(["PROCESS", "DONE", "REJECT"]).optional(),
  response: z.string().max(1000).optional(),
});

const proposeMailSchema = z.object({
  request_id: z.number().int().positive(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});

async function runSocial(ctx: LarasToolContext) {
  const [programs, groups] = await Promise.all([
    prisma.socialBenefitProgram.findMany({
      where: { villageId: ctx.villageId },
      select: { id: true, name: true, periodLabel: true, isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 30,
    }),
    prisma.socialBenefitBeneficiary.groupBy({
      by: ["programId", "status"],
      where: { program: { villageId: ctx.villageId } },
      _count: true,
    }),
  ]);
  return {
    program: programs.map((p) => ({
      nama: p.name,
      periode: p.periodLabel,
      aktif: p.isActive,
      penerima_per_status: groups
        .filter((g) => g.programId === p.id)
        .map((g) => ({ status: g.status, jumlah: suppressSmallCount(g._count) })),
    })),
    catatan: "Daftar nama penerima tidak disertakan; jumlah kurang dari 5 disamarkan.",
  };
}

const daysParam = (def: number) => ({
  type: "object",
  properties: {
    days: { type: "integer", minimum: 1, maximum: 365, description: `Rentang hari ke belakang (bawaan ${def}).` },
  },
  additionalProperties: false,
});

export const LARAS_TOOLS: LarasTool[] = [
  {
    name: "population_stats",
    description:
      "Statistik penduduk desa (hanya hitungan, tanpa identitas). Bisa difilter (RT, RW, dusun, jenis kelamin, rentang usia, " +
      "desil, penanda seperti stunting/disabilitas/BPJS-KIS/buta huruf/hamil) dan dikelompokkan (rt, rw, hamlet, gender, age_group, " +
      "education, occupation, religion, marital_status, desil). Jumlah kurang dari 5 disamarkan demi privasi.",
    parameters: {
      type: "object",
      properties: {
        group_by: { type: "string", enum: [...RESIDENT_GROUP_BY] },
        rt: { type: "string" },
        rw: { type: "string" },
        hamlet: { type: "string" },
        gender: { type: "string", enum: ["Laki-laki", "Perempuan"] },
        age_min: { type: "integer", minimum: 0, maximum: 120 },
        age_max: { type: "integer", minimum: 0, maximum: 120 },
        flags: { type: "array", items: { type: "string", enum: [...RESIDENT_FLAGS] } },
        desil: { type: "integer", minimum: 1, maximum: 10 },
      },
      additionalProperties: false,
    },
    resource: "residents",
    permission: "read",
    moduleId: "data-warga",
    schema: populationSchema,
    run: runPopulation as LarasTool["run"],
  },
  {
    name: "finance_summary",
    description:
      "Ringkasan keuangan desa untuk satu tahun atau satu bulan: total pemasukan, pengeluaran, selisih, rincian per kategori, " +
      "dan realisasi anggaran tahun itu.",
    parameters: {
      type: "object",
      properties: {
        year: { type: "integer", minimum: 2000, maximum: 2100, description: "Bawaan: tahun berjalan." },
        month: { type: "integer", minimum: 1, maximum: 12, description: "Kosongkan untuk setahun penuh." },
      },
      additionalProperties: false,
    },
    resource: "finance",
    permission: "read",
    moduleId: "keuangan",
    schema: financeSchema,
    run: runFinance as LarasTool["run"],
  },
  {
    name: "mail_requests_summary",
    description:
      "Ringkasan permohonan surat warga: jumlah per status dan jenis surat dalam rentang hari tertentu, jumlah yang masih menunggu, dan umur permohonan menunggu tertua.",
    parameters: daysParam(30),
    resource: "mail",
    permission: "read",
    moduleId: "layanan-surat",
    schema: daysSchema,
    run: runMail as LarasTool["run"],
  },
  {
    name: "citizen_reports_summary",
    description:
      "Ringkasan pengaduan warga: jumlah per status dan kategori dalam rentang hari tertentu serta jumlah yang belum selesai.",
    parameters: daysParam(90),
    resource: "citizen_reports",
    permission: "read",
    moduleId: "pengaduan-masyarakat",
    schema: daysSchema,
    run: runReports as LarasTool["run"],
  },
  {
    name: "social_benefits_summary",
    description:
      "Ringkasan program bantuan/bansos desa dan jumlah penerima per status (tanpa nama penerima).",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    resource: "social_benefits",
    permission: "read",
    moduleId: "bantuan-program-keluarga",
    schema: emptySchema,
    run: runSocial as LarasTool["run"],
  },
  {
    name: "mail_requests_pending",
    description:
      "Daftar permohonan surat yang menunggu diproses (paling lama dulu, maks. 20), beserta hasil pemeriksaan server: " +
      "siap diproses atau tidak, hambatan, dan peringatan. Identitas pemohon tidak ditampilkan. Gunakan sebelum mengusulkan keputusan.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    resource: "mail",
    permission: "read",
    moduleId: "layanan-surat",
    schema: emptySchema,
    run: (async (ctx: LarasToolContext) => listPendingMailForAi(ctx.villageId)) as LarasTool["run"],
  },
  {
    name: "propose_mail_decision",
    description:
      "USULKAN menyetujui atau menolak satu permohonan surat. Ini TIDAK menjalankan apa pun: usulan tampil sebagai kartu " +
      "yang harus dikonfirmasi perangkat desa. Penolakan wajib menyertakan alasan yang sopan dan jelas agar warga bisa memperbaiki. " +
      "Hanya untuk permohonan yang 'siap_diproses'. Jangan menulis NIK atau nama warga di catatan.",
    parameters: {
      type: "object",
      properties: {
        request_id: { type: "integer", description: "Nilai 'id' dari mail_requests_pending." },
        decision: { type: "string", enum: ["approve", "reject"] },
        note: { type: "string", maxLength: 500, description: "Catatan untuk warga. Wajib untuk penolakan." },
      },
      required: ["request_id", "decision"],
      additionalProperties: false,
    },
    resource: "mail",
    permission: "update",
    moduleId: "layanan-surat",
    schema: proposeMailSchema,
    run: (async (ctx: LarasToolContext, a: z.infer<typeof proposeMailSchema>) => {
      const counter = (ctx.proposals ??= { count: 0 });
      if (counter.count >= MAX_PROPOSALS_PER_TURN) {
        return { error: `Batas ${MAX_PROPOSALS_PER_TURN} usulan per pertanyaan tercapai. Minta pengguna melanjutkan di pertanyaan berikutnya.` };
      }
      const r = await proposeMailDecision(
        { villageId: ctx.villageId, userId: ctx.userId },
        { requestId: a.request_id, decision: a.decision, note: a.note },
      );
      if (!r.ok) return { error: r.error };
      counter.count++;
      return withAction(r.forModel, r.card);
    }) as LarasTool["run"],
  },
  {
    name: "citizen_reports_open",
    description:
      "Daftar pengaduan warga yang masih aktif (PENDING/PROCESS, paling lama dulu, maks. 20): kategori, umur, jumlah tanggapan, " +
      "status tujuan yang diizinkan, dan hal yang perlu perhatian. Identitas pelapor tidak ditampilkan. Gunakan sebelum mengusulkan tindak lanjut.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    resource: "citizen_reports",
    permission: "read",
    moduleId: "pengaduan-masyarakat",
    schema: emptySchema,
    run: (async (ctx: LarasToolContext) => listOpenReportsForAi(ctx.villageId)) as LarasTool["run"],
  },
  {
    name: "propose_report_action",
    description:
      "USULKAN tindak lanjut satu pengaduan: ubah status (PROCESS = mulai ditangani, DONE = selesai, REJECT = tolak) dan/atau kirim tanggapan " +
      "untuk pelapor. Ini TIDAK menjalankan apa pun: tampil sebagai kartu yang harus dikonfirmasi perangkat desa. Penolakan wajib beralasan. " +
      "Tanggapan harus sopan, faktual, tidak menjanjikan jadwal/anggaran yang belum pasti, dan tanpa nama/NIK. Hanya status_tujuan_yang_diizinkan yang sah.",
    parameters: {
      type: "object",
      properties: {
        report_id: { type: "integer", description: "Nilai 'id' dari citizen_reports_open." },
        status: { type: "string", enum: ["PROCESS", "DONE", "REJECT"], description: "Kosongkan bila hanya mengirim tanggapan." },
        response: { type: "string", maxLength: 1000, description: "Tanggapan/alasan untuk pelapor. Wajib untuk REJECT atau bila status kosong." },
      },
      required: ["report_id"],
      additionalProperties: false,
    },
    resource: "citizen_reports",
    permission: "update",
    moduleId: "pengaduan-masyarakat",
    schema: proposeReportSchema,
    run: (async (ctx: LarasToolContext, a: z.infer<typeof proposeReportSchema>) => {
      const counter = (ctx.proposals ??= { count: 0 });
      if (counter.count >= MAX_PROPOSALS_PER_TURN) {
        return { error: `Batas ${MAX_PROPOSALS_PER_TURN} usulan per pertanyaan tercapai. Minta pengguna melanjutkan di pertanyaan berikutnya.` };
      }
      const r = await proposeReportAction(
        { villageId: ctx.villageId, userId: ctx.userId },
        { reportId: a.report_id, status: a.status, response: a.response },
      );
      if (!r.ok) return { error: r.error };
      counter.count++;
      return withAction(r.forModel, r.card);
    }) as LarasTool["run"],
  },
  {
    name: "announcements_recent",
    description:
      "Pengumuman desa terbaru (maks. 10) dan sisa kuota terbit pengguna hari ini. Gunakan sebelum menyusun pengumuman baru " +
      "agar tidak dobel dan gayanya selaras.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    resource: "announcements",
    permission: "read",
    moduleId: "pengumuman-desa",
    schema: emptySchema,
    run: (async (ctx: LarasToolContext) => listRecentAnnouncementsForAi(ctx.villageId, ctx.userId)) as LarasTool["run"],
  },
  {
    name: "propose_announcement",
    description:
      "USULKAN menerbitkan satu pengumuman desa. TIDAK menjalankan apa pun: tampil sebagai kartu berisi isi lengkap yang harus " +
      "dikonfirmasi perangkat desa, dan begitu dikonfirmasi pengumuman LANGSUNG tayang untuk publik (tidak ada draf). Hanya tulis fakta " +
      "yang diberikan pengguna atau ada di data; jangan mengarang tanggal, tempat, nominal, atau nama. Bila informasi penting belum lengkap, " +
      "tanyakan dulu ke pengguna dan jangan panggil tool ini. Tanpa NIK/nomor telepon warga.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", minLength: TITLE_MIN, maxLength: TITLE_MAX },
        content: { type: "string", minLength: CONTENT_MIN, maxLength: CONTENT_MAX, description: "Isi lengkap, Bahasa Indonesia yang jelas dan sopan." },
        category: { type: "string", enum: [...ANNOUNCEMENT_ACTION_CATEGORIES] },
        pinned: { type: "boolean", description: "Sematkan di atas. Bawaan false; hanya bila diminta." },
      },
      required: ["title", "content", "category"],
      additionalProperties: false,
    },
    resource: "announcements",
    permission: "create",
    moduleId: "pengumuman-desa",
    schema: proposeAnnouncementSchema,
    run: (async (ctx: LarasToolContext, a: z.infer<typeof proposeAnnouncementSchema>) => {
      const counter = (ctx.proposals ??= { count: 0 });
      if (counter.count >= MAX_PROPOSALS_PER_TURN) {
        return { error: `Batas ${MAX_PROPOSALS_PER_TURN} usulan per pertanyaan tercapai. Minta pengguna melanjutkan di pertanyaan berikutnya.` };
      }
      const r = await proposeAnnouncement(
        { villageId: ctx.villageId, userId: ctx.userId },
        { title: a.title, content: a.content, category: a.category, pinned: a.pinned },
      );
      if (!r.ok) return { error: r.error };
      counter.count++;
      return withAction(r.forModel, r.card);
    }) as LarasTool["run"],
  },
];

export function larasToolSpecs() {
  return LARAS_TOOLS.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

export type ToolOutcome = { result: unknown; ok: boolean; action?: ActionCard };

/** Jalankan satu tool atas permintaan model. Tidak pernah melempar: kegagalan dikembalikan sebagai pesan untuk model. */
export async function executeLarasTool(
  ctx: LarasToolContext,
  name: string,
  rawArgs: string,
): Promise<ToolOutcome> {
  const tool = LARAS_TOOLS.find((t) => t.name === name);
  if (!tool) return { ok: false, result: { error: "Tool tidak dikenal." } };

  if (!larasCan(ctx.session, ctx.role, tool.resource, tool.permission)) {
    return {
      ok: false,
      result: { error: "Pengguna ini tidak memiliki izin untuk data atau tindakan tersebut. Sampaikan hal ini dengan sopan." },
    };
  }
  let parsedArgs: unknown = {};
  try {
    parsedArgs = rawArgs?.trim() ? JSON.parse(rawArgs) : {};
  } catch {
    return { ok: false, result: { error: "Argumen bukan JSON yang valid." } };
  }
  const parsed = tool.schema.safeParse(parsedArgs);
  if (!parsed.success) {
    return { ok: false, result: { error: "Argumen tidak valid.", detail: parsed.error.issues.slice(0, 3).map((i) => i.message) } };
  }

  const ent = await memo(ctx, `module:${tool.moduleId}`, () => requireModuleEntitlement(ctx.village, tool.moduleId));
  if (!ent.ok) {
    return { ok: false, result: { error: "Modul untuk data tersebut belum aktif di desa ini." } };
  }

  try {
    const out = await tool.run(ctx, parsed.data as never);
    if (out && typeof out === "object" && ACTION in out) {
      const w = out as WithAction;
      return { ok: true, result: w.result, action: w[ACTION] };
    }
    const failed = out && typeof out === "object" && "error" in out;
    return { ok: !failed, result: out };
  } catch (e) {
    console.error(`laras tool ${name} failed`, e);
    return { ok: false, result: { error: "Data tidak dapat diambil saat ini." } };
  }
}
