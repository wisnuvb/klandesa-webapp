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

function normalizeDigitsPhone(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 18) return null;
  return digits.slice(0, 40);
}

async function upsertProspectFromReferralEvent(
  client: PrismaLike,
  partnerId: number,
  input: ReferralEventInput,
) {
  const action = String(input.action || "").toLowerCase();
  if (action !== "register_submit" && action !== "contact_submit") {
    return;
  }

  const phone = normalizeDigitsPhone(input.phone);
  const picNameRaw =
    typeof input.name === "string" ? input.name.trim().slice(0, 255) : "";
  const villageLabelRaw =
    typeof input.villageName === "string" && input.villageName.trim()
      ? input.villageName.trim()
      : picNameRaw || "Lead referral";

  const existing = phone
    ? await client.partnerProspect.findFirst({
        where: { partnerId, picPhone: phone },
        select: { id: true, notes: true },
      })
    : await client.partnerProspect.findFirst({
        where: {
          partnerId,
          villageName: villageLabelRaw.slice(0, 255),
          ...(picNameRaw ? { picName: picNameRaw } : {}),
        },
        select: { id: true, notes: true },
      });

  const inboundNote = [
    `[referral:${action}]`,
    picNameRaw || null,
    phone ? `tel:${phone}` : null,
    typeof input.email === "string" && input.email.trim()
      ? `email:${input.email.trim()}`
      : null,
    `subj:${(input.subject && input.subject.trim()) || "-"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  if (existing) {
    const mergedNotes = `${existing.notes ? `${existing.notes}\n` : ""}${new Date().toISOString()} ${inboundNote}`.slice(
      0,
      8000,
    );
    await client.partnerProspect.update({
      where: { id: existing.id },
      data: {
        lastContactAt: new Date(),
        notes: mergedNotes,
      },
    });
    return;
  }

  await client.partnerProspect.create({
    data: {
      partnerId,
      villageName: villageLabelRaw.slice(0, 255),
      picName: picNameRaw || null,
      picPhone: phone,
      province: null,
      district: null,
      regency: null,
      status: "BARU",
      notes: `${new Date().toISOString()} ${inboundNote}`.slice(0, 8000),
    },
  });
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
    select: { id: true, status: true, partnerId: true },
  });

  const isActive = referralCode?.status === "active";
  const created = await client.referralEvent.create({
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

  const partnerId = referralCode?.partnerId ?? null;
  const actionNorm = String(input.action || "").toLowerCase();
  if (
    partnerId != null &&
    isActive &&
    (actionNorm === "register_submit" ||
      actionNorm === "contact_submit")
  ) {
    try {
      await upsertProspectFromReferralEvent(client, partnerId, input);
    } catch (e) {
      console.warn("[referral] gagal sinkron PartnerProspect:", e);
    }
  }

  return created;
}
