import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type WebsiteDomainStatus =
  | "pending_verification"
  | "active"
  | "inactive"
  | "error";

export type WebsiteDomainType = "subdomain" | "custom";

export async function createWebsiteDomainEvent(params: {
  domainId: number;
  kind: string;
  message?: string | null;
  meta?: unknown;
}): Promise<void> {
  try {
    await prisma.websiteDomainEvent.create({
      data: {
        domainId: params.domainId,
        kind: params.kind,
        message: params.message ?? null,
        meta: params.meta as never,
      },
    });
  } catch (e) {
    logger.warn(
      { err: e, domainId: params.domainId, kind: params.kind },
      "websiteDomainEvent.create failed",
    );
  }
}

