import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import {
  AI_CREDITS_CONSUMPTION_ENABLED,
  ensureDefaultAiCredits,
} from "@/lib/ai/credits";

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const accountType = session?.user?.accountType;

  if (accountType === "platform") {
    return NextResponse.json({ hasCredit: true, remaining: 999999 }, { status: 200 });
  }

  if (accountType === "partner" || accountType === "regional") {
    return NextResponse.json({ hasCredit: false, remaining: 0 }, { status: 200 });
  }

  const rawUserId = session?.user?.id || "";
  const userId = Number(rawUserId);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ hasCredit: false, remaining: 0 }, { status: 200 });
  }

  if (!AI_CREDITS_CONSUMPTION_ENABLED) {
    const remaining = await ensureDefaultAiCredits(userId);
    return NextResponse.json(
      { hasCredit: true, remaining, consumptionEnabled: false },
      { status: 200 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiCredits: true },
  });

  const remaining = typeof user?.aiCredits === "number" ? user.aiCredits : 0;
  return NextResponse.json(
    { hasCredit: remaining > 0, remaining, consumptionEnabled: true },
    { status: 200 },
  );
}
