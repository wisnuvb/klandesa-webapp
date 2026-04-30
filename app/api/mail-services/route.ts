/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  buildLetterFormSnapshot,
  mergeMailFormDataForPersistence,
} from "@/lib/mail/letterFormSnapshot";
import { letterDateKeyFromInput } from "@/lib/mail/letterDateKey";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const rows = await prisma.mailService.findMany({
      where: { villageId: village.id },
      orderBy: { createdAt: "desc" },
      include: {
        template: {
          select: {
            name: true,
            category: true,
            templateStructure: true,
          },
        },
        createdUser: {
          select: {
            name: true,
          },
        },
      },
    });

    const mappedRows = rows.map((row) => ({
      id: Number(row.id),
      letter_number: row.letterNumber,
      template_id: row.templateId,
      template_name: row.templateName || row.template?.name || "Template Surat",
      template_category: row.templateCategory || row.template?.category || "Lainnya",
      applicant_name: row.applicantName,
      applicant_nik: row.applicantNik,
      signer_role: row.signerRole || "kepala_desa",
      status: row.status as "draft" | "completed" | "archived",
      created_at: row.createdAt.toISOString(),
      created_by: row.createdUser?.name || "Admin Desa",
      completed_at: row.completedAt ? row.completedAt.toISOString() : null,
      content_html: row.contentHtml || "",
      form_data: (row.formData as Record<string, string>) || {},
      templateData: row.template?.templateStructure || undefined,
    }));

    return NextResponse.json(mappedRows);
  } catch (err) {
    console.error("GET /api/mail-services error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json();
    const {
      templateId,
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
      letterNumber || normalizedFormData.NOMOR_SURAT || ""
    ).trim();
    const fallbackLetterNumber = `${village.code?.toUpperCase() || "SURAT"}/${new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")}`;
    const finalLetterNumber = requestedLetterNumber || fallbackLetterNumber;

    if (!templateId || !applicantName || !applicantNik || !formData) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: templateId, applicantName, applicantNik, or formData",
        },
        { status: 400 }
      );
    }

    const template = await prisma.mailTemplate.findUnique({
      where: { id: Number(templateId) },
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const createdBy = userId;

    const serverSnapshot = await buildLetterFormSnapshot(village.id);
    const persistedFormData = mergeMailFormDataForPersistence(
      serverSnapshot,
      normalizedFormData,
      finalLetterNumber,
    );

    const resolvedLetterDate = letterDate ? new Date(letterDate) : new Date();
    const letterDateKeyVal = letterDateKeyFromInput(resolvedLetterDate);

    const mail = await prisma.$transaction(async (tx) => {
      const created = await tx.mailService.create({
        data: {
          villageId: village.id,
          templateId: template.id,
          templateName: template.name,
          templateCategory: template.category,
          letterNumber: finalLetterNumber,
          letterDate: resolvedLetterDate,
          letterDateKey: letterDateKeyVal,
          applicantName,
          applicantNik,
          signerRole: signerRole || "kepala_desa",
          signerName:
            typeof signerName === "string" && signerName.trim().length > 0
              ? signerName.trim().slice(0, 255)
              : null,
          formData: persistedFormData,
          contentHtml: contentHtml || null,
          status: status || "draft",
          createdBy,
          completedAt: status === "completed" ? new Date() : null,
        },
      });

      await tx.mailHistory.create({
        data: {
          mailServiceId: created.id,
          action: status === "completed" ? "completed" : "created",
          changes: {
            status: status || "draft",
            letterNumber: finalLetterNumber,
          },
          changedBy: createdBy,
        },
      });

      await tx.mailTemplate.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 } },
      });

      return created;
    });

    return NextResponse.json(
      {
        id: Number(mail.id),
        letter_number: mail.letterNumber,
        status: mail.status,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/mail-services error:", err);

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
      { status: 500 }
    );
  }
}
