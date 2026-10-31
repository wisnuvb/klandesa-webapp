import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildLetterFormSnapshot,
  mergeMailFormDataForPersistence,
} from "@/lib/mail/letterFormSnapshot";
import { letterDateKeyFromInput } from "@/lib/mail/letterDateKey";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { readJsonBody } from "@/lib/http/read-json";
import {
  LETTER_LIMITS,
  cleanLine,
  parseLetterDate,
  parseLetterStatus,
  parseSignerRole,
  sanitizeFormData,
} from "@/lib/mail/letter-input";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id: idRaw } = await params;
    if (!/^\d{1,18}$/.test(idRaw)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }
    const mailId = BigInt(idRaw);

    const existing = await prisma.mailService.findFirst({
      where: { id: mailId, villageId: village.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
    }

    const parsed = await readJsonBody(req, LETTER_LIMITS.requestBytes);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const body = (parsed.body ?? {}) as Record<string, unknown>;

    const applicantName = cleanLine(body.applicantName, LETTER_LIMITS.applicantNameLength);
    const applicantNik = cleanLine(body.applicantNik, LETTER_LIMITS.applicantNikLength);
    if (!applicantName || !applicantNik) {
      return NextResponse.json(
        {
          error: "Missing required fields: applicantName, applicantNik, or formData",
        },
        { status: 400 },
      );
    }

    const form = sanitizeFormData(body.formData);
    if (!form.ok) {
      return NextResponse.json({ error: form.error }, { status: 400 });
    }
    const normalizedFormData = form.value;

    const rawNumber =
      (typeof body.letterNumber === "string" || typeof body.letterNumber === "number") &&
      String(body.letterNumber).trim()
        ? String(body.letterNumber)
        : (normalizedFormData.NOMOR_SURAT ?? existing.letterNumber);
    const requestedLetterNumber = cleanLine(rawNumber, LETTER_LIMITS.letterNumberLength);
    if (requestedLetterNumber === null) {
      return NextResponse.json({ error: "Nomor surat tidak valid" }, { status: 400 });
    }
    const finalLetterNumber =
      requestedLetterNumber || `${village.code?.toUpperCase() || "SURAT"}/${Date.now()}`;

    const statusParsed = body.status === undefined ? null : parseLetterStatus(body.status);
    if (body.status !== undefined && !statusParsed) {
      return NextResponse.json({ error: "Status surat tidak valid" }, { status: 400 });
    }

    const resolvedLetterDate =
      body.letterDate == null ? existing.letterDate : parseLetterDate(body.letterDate);
    if (!resolvedLetterDate) {
      return NextResponse.json({ error: "Tanggal surat tidak valid" }, { status: 400 });
    }
    const signerRole = parseSignerRole(body.signerRole);
    const signerName = cleanLine(body.signerName ?? "", LETTER_LIMITS.signerNameLength) || null;

    const template = await prisma.mailTemplate.findUnique({
      where: { id: Number(existing.templateId) },
      select: { id: true, name: true, category: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const changedBy = userId;

    const serverSnapshot = await buildLetterFormSnapshot(village.id);
    const persistedFormData = mergeMailFormDataForPersistence(
      serverSnapshot,
      normalizedFormData,
      finalLetterNumber,
    );

    const requestedStatus: "draft" | "completed" | "archived" =
      statusParsed ?? ((existing.status as "draft" | "completed" | "archived") ?? "draft");

    let nextCompletedAt = existing.completedAt;
    if (requestedStatus === "completed") {
      nextCompletedAt = existing.completedAt ?? new Date();
    } else if (requestedStatus === "draft") {
      nextCompletedAt = null;
    } else if (requestedStatus === "archived") {
      nextCompletedAt = existing.completedAt;
    }

    const letterDateKeyVal = letterDateKeyFromInput(resolvedLetterDate);

    const baseUpdate = {
      letterNumber: finalLetterNumber,
      letterDate: resolvedLetterDate,
      letterDateKey: letterDateKeyVal,
      applicantName,
      applicantNik,
      signerRole: signerRole || existing.signerRole || "kepala_desa",
      signerName,
      formData: persistedFormData,
      status: requestedStatus,
      completedAt: nextCompletedAt,
      templateName: template.name,
      templateCategory: template.category,
    };

    await prisma.$transaction(async (tx) => {
      await tx.mailService.update({
        where: { id: mailId },
        data: baseUpdate,
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

    // Nama/NIK pemohon & isi form tidak dicatat; hanya nomor, status, tanggal, penandatangan.
    await auditWeb(req, loaded.ctx, "update", "mail_services", String(mailId), {
      ...(existing.status !== requestedStatus ? { status: { from: existing.status, to: requestedStatus } } : {}),
      ...(existing.letterNumber !== finalLetterNumber
        ? { letterNumber: { from: existing.letterNumber, to: finalLetterNumber } }
        : {}),
      ...(existing.letterDate.getTime() !== resolvedLetterDate.getTime()
        ? { letterDate: { from: existing.letterDate.toISOString(), to: resolvedLetterDate.toISOString() } }
        : {}),
      applicantAndFormUpdated: true,
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
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
