import type { VillageAssistantMode } from "@/lib/ai/village-assistant";
import { prisma } from "@/lib/prisma";

const MODE_LABELS: Record<VillageAssistantMode, string> = {
  citizen_faq: "FAQ Layanan Warga",
  sdgs_analysis: "Analisa SDGs",
  rpjmdes_draft: "Draft RPJMDes",
  program_recommendation: "Rekomendasi Program",
};

export function modeLabel(mode: string): string {
  return MODE_LABELS[mode as VillageAssistantMode] ?? mode;
}

export function titleFromFirstMessage(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (!oneLine) return "Percakapan baru";
  return oneLine.length > 80 ? `${oneLine.slice(0, 77)}…` : oneLine;
}

export async function listThreadsForUser(villageId: number, userId: number) {
  const rows = await prisma.aiAssistantThread.findMany({
    where: { villageId, userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      mode: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return rows.map((t) => ({
    id: t.id,
    mode: t.mode,
    modeLabel: modeLabel(t.mode),
    title: t.title,
    messageCount: t._count.messages,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

export async function getThreadForUser(
  villageId: number,
  userId: number,
  threadId: number,
) {
  return prisma.aiAssistantThread.findFirst({
    where: { id: threadId, villageId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  });
}

/** Cek kepemilikan thread tanpa memuat pesan (biaya tidak naik seiring panjang percakapan). */
export async function getThreadOwned(villageId: number, userId: number, threadId: number) {
  return prisma.aiAssistantThread.findFirst({
    where: { id: threadId, villageId, userId },
    select: { id: true },
  });
}

export async function getRecentMessagesForAi(threadId: number, take = 8) {
  const rows = await prisma.aiAssistantMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "desc" },
    take,
    select: { role: true, content: true },
  });
  return rows.reverse();
}

export async function createThread(params: {
  villageId: number;
  userId: number;
  mode: VillageAssistantMode;
  title: string;
}) {
  return prisma.aiAssistantThread.create({
    data: {
      villageId: params.villageId,
      userId: params.userId,
      mode: params.mode,
      title: params.title,
    },
  });
}

export async function appendMessage(
  threadId: number,
  role: "user" | "assistant",
  content: string,
) {
  await prisma.$transaction([
    prisma.aiAssistantMessage.create({
      data: { threadId, role, content },
    }),
    prisma.aiAssistantThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    }),
  ]);
}

export async function deleteThreadForUser(
  villageId: number,
  userId: number,
  threadId: number,
): Promise<boolean> {
  const existing = await prisma.aiAssistantThread.findFirst({
    where: { id: threadId, villageId, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.aiAssistantThread.delete({ where: { id: threadId } });
  return true;
}

/**
 * Simpan satu pertukaran (pesan pengguna + jawaban) sekaligus, dan buat threadnya bila baru. Dipanggil hanya setelah
 * model menjawab, sehingga kegagalan tidak meninggalkan thread kosong atau pesan pengguna tanpa jawaban.
 */
export async function saveExchange(params: {
  villageId: number;
  userId: number;
  mode: VillageAssistantMode;
  threadId: number | null;
  title: string;
  userMessage: string;
  assistantMessage: string;
}): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const threadId =
      params.threadId ??
      (
        await tx.aiAssistantThread.create({
          data: {
            villageId: params.villageId,
            userId: params.userId,
            mode: params.mode,
            title: params.title,
          },
        })
      ).id;
    const base = Date.now();
    await tx.aiAssistantMessage.create({
      data: { threadId, role: "user", content: params.userMessage, createdAt: new Date(base) },
    });
    await tx.aiAssistantMessage.create({
      data: { threadId, role: "assistant", content: params.assistantMessage, createdAt: new Date(base + 1) },
    });
    await tx.aiAssistantThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
    return threadId;
  });
}
