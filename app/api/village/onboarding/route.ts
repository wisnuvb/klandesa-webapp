import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";

export type OnboardingSteps = {
  profile?: boolean;
  official?: boolean;
  resident?: boolean;
  letter?: boolean;
};

async function detectSteps(villageId: number): Promise<OnboardingSteps> {
  const [village, officialCount, residentCount, mailCount] = await Promise.all([
    prisma.village.findUnique({
      where: { id: villageId },
      select: { logoUrl: true, onboardingSteps: true },
    }),
    prisma.official.count({ where: { villageId } }),
    prisma.resident.count({ where: { villageId } }),
    prisma.mailTemplate.count({ where: { villageId } }),
  ]);

  const stored =
    village?.onboardingSteps && typeof village.onboardingSteps === "object"
      ? (village.onboardingSteps as OnboardingSteps)
      : {};

  return {
    profile: stored.profile ?? Boolean(village?.logoUrl),
    official: stored.official ?? officialCount > 0,
    resident: stored.resident ?? residentCount > 0,
    letter: stored.letter ?? mailCount > 0,
  };
}

export async function GET(req: NextRequest) {
  const loaded = await requireVillageApiContext(req);
  if (!loaded.ok) return loaded.response;
  const { village } = loaded.ctx;

  const steps = await detectSteps(village.id);
  const completed = Boolean(village.onboardingCompletedAt);

  return NextResponse.json({
    completed,
    completedAt: village.onboardingCompletedAt?.toISOString() ?? null,
    steps,
  });
}

export async function PATCH(req: NextRequest) {
  const loaded = await requireVillageApiContext(req);
  if (!loaded.ok) return loaded.response;
  const { village } = loaded.ctx;

  const body = (await req.json().catch(() => null)) as
    | { steps?: OnboardingSteps; markComplete?: boolean }
    | null;

  const current = await detectSteps(village.id);
  const merged: OnboardingSteps = {
    ...current,
    ...(body?.steps ?? {}),
  };

  const data: {
    onboardingSteps: OnboardingSteps;
    onboardingCompletedAt?: Date;
  } = { onboardingSteps: merged };

  if (body?.markComplete === true) {
    data.onboardingCompletedAt = new Date();
  }

  const updated = await prisma.village.update({
    where: { id: village.id },
    data,
    select: { onboardingCompletedAt: true, onboardingSteps: true },
  });

  return NextResponse.json({
    completed: Boolean(updated.onboardingCompletedAt),
    completedAt: updated.onboardingCompletedAt?.toISOString() ?? null,
    steps: merged,
  });
}
