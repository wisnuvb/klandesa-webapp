/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
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

const LIST_PAGE_SIZE = 20;
const LIST_PAGE_SIZE_MAX = 100;
/** Tanpa `page` (pemanggil lama): daftar datar dengan batas ini, seperti sebelumnya. */
const LIST_UNPAGED_LIMIT = 500;
const LIST_STATUSES = ["draft", "completed", "archived"] as const;

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  const n = raw != null && /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/**
 * Riwayat surat. Dengan `?page=` (mulai 1) hasilnya berpaginasi dan dapat disaring di server:
 * `pageSize` (≤100), `q` (nomor/jenis/pemohon/NIK), `status`, `category`; bentuknya
 * `{ items, total, page, pageSize, counts, categories }`. Tanpa `page`: larik datar (maks 500) seperti dulu.
 * `formData` tidak ikut dibaca untuk surat v2 (dokumennya lewat GET /api/letters/[id]).
 */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const sp = req.nextUrl.searchParams;
    const paged = sp.has("page");
    const page = clampInt(sp.get("page"), 1, 100000, 1);
    const pageSize = clampInt(sp.get("pageSize"), 1, LIST_PAGE_SIZE_MAX, LIST_PAGE_SIZE);
    const q = (sp.get("q") ?? "").trim().slice(0, 100);
    const statusParam = sp.get("status");
    const status = (LIST_STATUSES as readonly string[]).includes(statusParam ?? "") ? (statusParam as (typeof LIST_STATUSES)[number]) : undefined;
    const category = (sp.get("category") ?? "").trim().slice(0, 100);

    const scope = { villageId: village.id };
    const where: Prisma.MailServiceWhereInput = {
      ...scope,
      ...(status ? { status } : {}),
      ...(category ? { templateCategory: category === "Lainnya" ? { in: ["Lainnya", ""] } : category } : {}),
      ...(q
        ? {
            OR: [
              { applicantName: { contains: q } },
              { letterNumber: { contains: q } },
              { templateName: { contains: q } },
              { applicantNik: { contains: q } },
            ],
          }
        : {}),
    };

    const [rows, total, statusGroups, categoryGroups] = await Promise.all([
      prisma.mailService.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: paged ? (page - 1) * pageSize : undefined,
        take: paged ? pageSize : LIST_UNPAGED_LIMIT,
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
          createdUser: { select: { name: true } },
        },
      }),
      paged ? prisma.mailService.count({ where }) : Promise.resolve(0),
      paged ? prisma.mailService.groupBy({ by: ["status"], where: scope, _count: { _all: true } }) : Promise.resolve([]),
      paged ? prisma.mailService.groupBy({ by: ["templateCategory"], where: scope }) : Promise.resolve([]),
    ]);

    // Surat v2 ditandai `formData.schemaVersion = 2`. Ditentukan oleh DB (JSON path) agar formData surat v2
    // yang besar tidak dibaca ke aplikasi; hanya surat format lama yang dibaca isiannya, untuk ditampilkan apa adanya.
    const ids = rows.map((r) => r.id);
    const v2Rows = ids.length
      ? await prisma.mailService.findMany({
          where: { id: { in: ids }, formData: { path: "$.schemaVersion", equals: 2 } },
          select: { id: true },
        })
      : [];
    const v2Ids = new Set(v2Rows.map((r) => Number(r.id)));
    const legacyIds = ids.filter((id) => !v2Ids.has(Number(id)));
    const legacyForms = legacyIds.length
      ? await prisma.mailService.findMany({ where: { id: { in: legacyIds } }, select: { id: true, formData: true } })
      : [];
    const formById = new Map(legacyForms.map((r) => [Number(r.id), (r.formData as Record<string, string>) || {}]));

    const items = rows.map((row) => {
      const v2 = v2Ids.has(Number(row.id));
      return {
        id: Number(row.id),
        letter_number: row.letterNumber,
        template_id: row.templateId,
        template_name: row.templateName || "Template Surat",
        template_category: row.templateCategory || "Lainnya",
        applicant_name: row.applicantName,
        applicant_nik: row.applicantNik,
        signer_role: row.signerRole || "kepala_desa",
        status: row.status as "draft" | "completed" | "archived",
        created_at: row.createdAt.toISOString(),
        created_by: row.createdUser?.name || "Admin Desa",
        completed_at: row.completedAt ? row.completedAt.toISOString() : null,
        content_html: "",
        form_data: v2 ? {} : (formById.get(Number(row.id)) ?? {}),
        schema_version: v2 ? 2 : 1,
      };
    });

    if (!paged) return NextResponse.json(items);

    const countOf = (st: string) => statusGroups.find((g) => g.status === st)?._count._all ?? 0;
    const categories = [...new Set(categoryGroups.map((g) => g.templateCategory || "Lainnya"))].sort((a, b) => a.localeCompare(b, "id"));
    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      counts: { all: statusGroups.reduce((n, g) => n + g._count._all, 0), completed: countOf("completed"), draft: countOf("draft") },
      categories,
    });
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
