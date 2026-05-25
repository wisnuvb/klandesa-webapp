import { prisma } from "@/lib/prisma";
import { collectVillageMetrics } from "@/lib/sdgs/collect-metrics";
import { computeSdgsDashboard } from "@/lib/sdgs/scoring-engine";

export type VillageAssistantMode =
  | "sdgs_analysis"
  | "rpjmdes_draft"
  | "program_recommendation"
  | "citizen_faq";

export type VillageAssistantContext = {
  villageName: string;
  villageCode: string;
  regency: string;
  province: string;
  sdgsSummary: string;
  lowGoals: string;
  rpjmdesCount: number;
  mailServiceCount: number;
  socialProgramCount: number;
};

export async function buildVillageAssistantContext(
  villageId: number,
): Promise<VillageAssistantContext> {
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    select: {
      name: true,
      code: true,
      regency: true,
      province: true,
    },
  });
  if (!village) throw new Error("Desa tidak ditemukan");

  const [{ metrics, idmVillageCode }, rpjmdesCount, mailServiceCount, socialProgramCount] =
    await Promise.all([
      collectVillageMetrics(villageId),
      prisma.rpjmdesPlan.count({ where: { villageId } }),
      prisma.mailTemplate.count({
        where: {
          OR: [{ villageId }, { isGlobal: true }],
          isActive: true,
        },
      }),
      prisma.socialBenefitProgram.count({ where: { villageId, isActive: true } }),
    ]);

  const dashboard = computeSdgsDashboard(metrics, idmVillageCode);
  const lowGoals = dashboard.goals
    .filter((g) => g.status === "low" || g.status === "no_data")
    .slice(0, 6)
    .map((g) => `Goal ${g.goalId} (${g.shortTitle}): skor ${g.score ?? "—"}`)
    .join("\n");

  const sdgsSummary = dashboard.goals
    .map((g) => `${g.goalId}. ${g.shortTitle}: ${g.score ?? "—"}/100 (${g.status})`)
    .join("\n");

  return {
    villageName: village.name,
    villageCode: village.code,
    regency: village.regency,
    province: village.province,
    sdgsSummary,
    lowGoals: lowGoals || "Tidak ada goal kritis terdeteksi.",
    rpjmdesCount,
    mailServiceCount,
    socialProgramCount,
  };
}

export function buildSystemPrompt(mode: VillageAssistantMode, ctx: VillageAssistantContext) {
  const base = [
    "Anda adalah Asisten Desa Klandesa — penasihat digital untuk perangkat desa Indonesia.",
    "Jawab dalam Bahasa Indonesia yang jelas, praktis, dan sopan.",
    "Gunakan data desa yang diberikan; jangan mengarang angka spesifik di luar konteks.",
    `Desa: ${ctx.villageName} (${ctx.villageCode}), ${ctx.regency}, ${ctx.province}.`,
    "",
    "Ringkasan skor SDGs:",
    ctx.sdgsSummary,
    "",
    "Goal yang perlu perhatian:",
    ctx.lowGoals,
    "",
    `RPJMDes aktif: ${ctx.rpjmdesCount} rencana.`,
    `Layanan surat aktif: ${ctx.mailServiceCount}.`,
    `Program bansos aktif: ${ctx.socialProgramCount}.`,
  ];

  switch (mode) {
    case "sdgs_analysis":
      base.push(
        "",
        "Tugas: analisa kondisi SDGs desa, identifikasi 3–5 prioritas intervensi, dan urutkan berdasarkan dampak.",
      );
      break;
    case "rpjmdes_draft":
      base.push(
        "",
        "Tugas: buat draf section RPJMDes (visi, misi, atau program prioritas 5 tahun) yang selaras SDGs dan kondisi desa.",
      );
      break;
    case "program_recommendation":
      base.push(
        "",
        "Tugas: rekomendasikan program konkret (PKK, BUMDes, pertanian, infrastruktur) berdasarkan skor SDGs rendah.",
      );
      break;
    case "citizen_faq":
      base.push(
        "",
        "Tugas: jawab pertanyaan layanan warga (surat, bansos, pengaduan) dengan langkah yang bisa diikuti warga/perangkat desa.",
      );
      break;
  }

  return base.join("\n");
}

export async function deductAiCredit(userId: number, amount = 1): Promise<number> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { aiCredits: { decrement: amount } },
    select: { aiCredits: true },
  });
  return Math.max(0, updated.aiCredits);
}
