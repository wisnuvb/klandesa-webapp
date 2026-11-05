import { clientIpOrNull } from "@/lib/rbac/client-ip";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function logRegionalAccess(params: {
  regionalUserId: number;
  action: string;
  path: string;
  req: NextRequest;
}): Promise<void> {
  const ip = clientIpOrNull(params.req);
  const userAgent = params.req.headers.get("user-agent");

  try {
    await prisma.regionalAccessLog.create({
      data: {
        regionalUserId: params.regionalUserId,
        action: params.action,
        path: params.path,
        ip: ip?.slice(0, 45) ?? null,
        userAgent: userAgent?.slice(0, 500) ?? null,
      },
    });
  } catch (e) {
    console.error("[regional-audit] log failed", e);
  }
}
