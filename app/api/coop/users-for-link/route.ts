import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import {
  loadCoopApiContextWithCooperative,
  requireManage,
} from "@/lib/coop/api-context";

export async function GET(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;

  const { village } = loaded.ctx;

  const users = await prisma.user.findMany({
    where: {
      villageId: village.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: toJSONSafe(users),
  });
}
