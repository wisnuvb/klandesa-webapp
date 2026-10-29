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
import { readJsonBody } from "@/lib/http/read-json";
import { villageTemplateScope } from "@/lib/mail/template-access";
import {
  LETTER_LIMITS,
  cleanLine,
  parseLetterDate,
  parseLetterStatus,
  parseSignerRole,
  sanitizeFormData,
} from "@/lib/mail/letter-input";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    // Daftar dibatasi agar muatan tidak tumbuh tanpa batas; filter/pencarian server menyusul.
    const LIMIT = 500;
    const rows = await prisma.mailService.findMany({
      where: { villageId: village.id },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        letterNumber: true,
        templateId: true,
        templateName: true,
        templateCategory: true,
        applicantName: true,
        applicantNik: true,
        signerRole: true,
        status: true,
        createdAt: true,
        completedAt: true,
        formData: true,
        createdUser: { select: { name: true } },
      },
    });

    // Dokumen v2 diambil lewat GET /api/letters/[id] saat dibuka. Surat v2 diketahui dari bentuk formData; struktur template lama hanya dimuat untuk surat lama,
    // satu kali per template (bukan satu salinan per surat).
    const isV2 = (fd: unknown) =>
      !!fd && typeof fd === "object" && (fd as { schemaVersion?: unknown }).schemaVersion === 2;
    const legacyIds = [...new Set(rows.filter((r) => !isV2(r.formData)).map((r) => r.templateId))];
    const structures = legacyIds.length
      ? await prisma.mailTemplate.findMany({
          where: { id: { in: legacyIds } },
          select: { id: true, name: true, category: true, templateStructure: true },
        })
      : [];
    const byId = new Map(structures.map((t) => [t.id, t]));

    const mappedRows = rows.map((row) => {
      const v2 = isV2(row.formData);
      const tpl = v2 ? undefined : byId.get(row.templateId);
      // Surat berformat lama yang jenis suratnya kini dokumen v2 (katalog disinkronkan ulang): tidak bisa dirender ulang.
      const legacyUnavailable =
        !v2 && (tpl?.templateStructure as { schemaVersion?: unknown } | null | undefined)?.schemaVersion === 2;
      return {
        id: Number(row.id),
        letter_number: row.letterNumber,
        template_id: row.templateId,
        template_name: row.templateName || tpl?.name || "Template Surat",
        template_category: row.templateCategory || tpl?.category || "Lainnya",
        applicant_name: row.applicantName,
        applicant_nik: row.applicantNik,
        signer_role: row.signerRole || "kepala_desa",
        status: row.status as "draft" | "completed" | "archived",
        created_at: row.createdAt.toISOString(),
        created_by: row.createdUser?.name || "Admin Desa",
        completed_at: row.completedAt ? row.completedAt.toISOString() : null,
        content_html: "",
        form_data: v2 ? {} : ((row.formData as Record<string, string>) || {}),
        templateData: legacyUnavailable ? undefined : tpl?.templateStructure || undefined,
        schema_version: v2 ? 2 : 1,
        legacy_unavailable: legacyUnavailable || undefined,
      };
    });

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

    const parsed = await readJsonBody(req, LETTER_LIMITS.requestBytes);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const body = (parsed.body ?? {}) as Record<string, unknown>;

    const templateId = Number(body.templateId);
    const applicantName = cleanLine(body.applicantName, LETTER_LIMITS.applicantNameLength);
    const applicantNik = cleanLine(body.applicantNik, LETTER_LIMITS.applicantNikLength);
    if (!Number.isInteger(templateId) || templateId <= 0 || !applicantName || !applicantNik) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: templateId, applicantName, applicantNik, or formData",
        },
        { status: 400 },
      );
    }

    const form = sanitizeFormData(body.formData);
    if (!form.ok) {
      return NextResponse.json({ error: form.error }, { status: 400 });
    }
    const normalizedFormData = form.value;

    const statusParsed = body.status === undefined ? "draft" : parseLetterStatus(body.status);
    if (!statusParsed) {
      return NextResponse.json({ error: "Status surat tidak valid" }, { status: 400 });
    }
    const status = statusParsed;

    const rawNumber =
      (typeof body.letterNumber === "string" || typeof body.letterNumber === "number") &&
      String(body.letterNumber).trim()
        ? String(body.letterNumber)
        : (normalizedFormData.NOMOR_SURAT ?? "");
    const requestedLetterNumber = cleanLine(rawNumber, LETTER_LIMITS.letterNumberLength);
    if (requestedLetterNumber === null) {
      return NextResponse.json({ error: "Nomor surat tidak valid" }, { status: 400 });
    }
    const fallbackLetterNumber = `${village.code?.toUpperCase() || "SURAT"}/${new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")}`;
    const finalLetterNumber = requestedLetterNumber || fallbackLetterNumber;

    const resolvedLetterDate =
      body.letterDate == null ? new Date() : parseLetterDate(body.letterDate);
    if (!resolvedLetterDate) {
      return NextResponse.json({ error: "Tanggal surat tidak valid" }, { status: 400 });
    }

    const signerRole = parseSignerRole(body.signerRole) ?? "kepala_desa";
    const signerName = cleanLine(body.signerName ?? "", LETTER_LIMITS.signerNameLength) || null;

    // Hanya template milik desa ini atau katalog global yang aktif.
    const template = await prisma.mailTemplate.findFirst({
      where: { id: templateId, isActive: true, ...villageTemplateScope(village.id) },
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
          signerRole,
          signerName,
          formData: persistedFormData,
          // `contentHtml` dari klien tidak diterima (HTML tak tepercaya); dokumen dirender server-side.
          contentHtml: null,
          status,
          createdBy,
          completedAt: status === "completed" ? new Date() : null,
        },
      });

      await tx.mailHistory.create({
        data: {
          mailServiceId: created.id,
          action: status === "completed" ? "completed" : "created",
          changes: {
            status,
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
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
