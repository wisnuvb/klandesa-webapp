import { getApiSession } from "@/lib/api-session";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import {
  buildLetterFormSnapshot,
  mergeMailFormDataForPersistence,
} from "@/lib/mail/letterFormSnapshot";
import { letterDateKeyFromInput } from "@/lib/mail/letterDateKey";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(req);
    const village = await resolveVillage({ req, session });

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id: idRaw } = await params;
    const mailId = BigInt(idRaw);

    const existing = await prisma.mailService.findFirst({
      where: { id: mailId, villageId: village.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const {
      letterNumber,
      letterDate,
      applicantName,
      applicantNik,
      signerRole,
      signerName,
      formData,
      status,
      contentHtml,
    } = body;

    const normalizedFormData: Record<string, string> =
      formData && typeof formData === "object" ? formData : {};
    const requestedLetterNumber = String(
      letterNumber ?? normalizedFormData.NOMOR_SURAT ?? existing.letterNumber,
    ).trim();
    const finalLetterNumber =
      requestedLetterNumber || `${village.code?.toUpperCase() || "SURAT"}/${Date.now()}`;

    if (
      !applicantName ||
      typeof applicantName !== "string" ||
      !applicantNik ||
      typeof applicantNik !== "string" ||
      !normalizedFormData
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields: applicantName, applicantNik, or formData",
        },
        { status: 400 },
      );
    }

    const template = await prisma.mailTemplate.findUnique({
      where: { id: Number(existing.templateId) },
      select: { id: true, name: true, category: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const changedBy = session?.user?.id ? parseInt(session.user.id, 10) : undefined;

    const serverSnapshot = await buildLetterFormSnapshot(village.id);
    const persistedFormData = mergeMailFormDataForPersistence(
      serverSnapshot,
      normalizedFormData,
      finalLetterNumber,
    );

    const requestedStatus =
      typeof status === "string" &&
      ["draft", "completed", "archived"].includes(status)
        ? (status as "draft" | "completed" | "archived")
        : ((existing.status as string) ?? "draft");

    let nextCompletedAt = existing.completedAt;
    if (requestedStatus === "completed") {
      nextCompletedAt = existing.completedAt ?? new Date();
    } else if (requestedStatus === "draft") {
      nextCompletedAt = null;
    } else if (requestedStatus === "archived") {
      nextCompletedAt = existing.completedAt;
    }

    const resolvedLetterDate = letterDate ? new Date(letterDate) : existing.letterDate;
    const letterDateKeyVal = letterDateKeyFromInput(resolvedLetterDate);

    const baseUpdate = {
      letterNumber: finalLetterNumber,
      letterDate: resolvedLetterDate,
      letterDateKey: letterDateKeyVal,
      applicantName: applicantName.trim().slice(0, 255),
      applicantNik: applicantNik.trim().slice(0, 16),
      signerRole: signerRole || existing.signerRole || "kepala_desa",
      signerName:
        typeof signerName === "string" && signerName.trim().length > 0
          ? signerName.trim().slice(0, 255)
          : null,
      formData: persistedFormData,
      status: requestedStatus,
      completedAt: nextCompletedAt,
      templateName: template.name,
      templateCategory: template.category,
    };

    const contentPatch =
      "contentHtml" in body && (contentHtml === null || typeof contentHtml === "string")
        ? { contentHtml: contentHtml ?? null }
        : {};

    await prisma.$transaction(async (tx) => {
      await tx.mailService.update({
        where: { id: mailId },
        data: { ...baseUpdate, ...contentPatch },
      });

      await tx.mailHistory.create({
        data: {
          mailServiceId: mailId,
          action:
            requestedStatus === "completed" && existing.status !== "completed"
              ? "completed"
              : "updated",
          changes: {
            status: requestedStatus,
            letterNumber: finalLetterNumber,
          },
          changedBy,
        },
      });
    });

    return NextResponse.json({
      id: Number(mailId),
      letter_number: finalLetterNumber,
      status: requestedStatus,
    });
  } catch (err: any) {
    console.error("PATCH /api/mail-services/[id] error:", err);

    if (err?.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "Nomor surat ini sudah dipakai untuk surat dengan jenis dan tanggal yang sama",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
