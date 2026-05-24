import type { NextRequest } from "next/server";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ReferralAction =
  | "page_view"
  | "register_open"
  | "register_submit"
  | "contact_open"
  | "contact_submit"
  | "whatsapp_click";

export type ReferralEventInput = {
  code?: string | null;
  action: ReferralAction | string;
  sourcePath?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  villageName?: string | null;
  subject?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export function normalizeReferralCode(value: unknown): string | null {
  const code = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
  if (!code) return null;
  return code.slice(0, 40);
}

export function firstIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

export async function trackReferralEvent(
  req: NextRequest,
  input: ReferralEventInput,
  client: PrismaLike = prisma,
) {
  const code = normalizeReferralCode(input.code);
  if (!code) return null;

  const referralCode = await client.referralCode.findUnique({
    where: { code },
    select: { id: true, status: true },
  });

  const isActive = referralCode?.status === "active";
  return client.referralEvent.create({
    data: {
      referralCodeId: isActive ? referralCode.id : null,
      codeSnapshot: code,
      action: String(input.action || "unknown").slice(0, 50),
      sourcePath: input.sourcePath?.slice(0, 500) || null,
      name: input.name?.slice(0, 255) || null,
      email: input.email?.slice(0, 255) || null,
      phone: input.phone?.slice(0, 40) || null,
      villageName: input.villageName?.slice(0, 255) || null,
      subject: input.subject?.slice(0, 120) || null,
      metadata: input.metadata ?? Prisma.JsonNull,
      ipAddress: firstIp(req),
      userAgent: req.headers.get("user-agent"),
    },
    select: { id: true },
  });
}
