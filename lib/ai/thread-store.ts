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
