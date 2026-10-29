/**
 * Layanan surat v2: membuat, mengubah, membaca, dan membuang draf. Rute API hanya menipis
 * ke sini. Semua akses dibatasi `villageId` sesi; template dibatasi cakupan tenant; nilai orang
 * dibaca ulang dari database (klien hanya mengirim id warga + koreksi).
 */
import { randomUUID } from "node:crypto";
import type { Prisma, Village } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { letterDateKeyFromInput } from "@/lib/mail/letterDateKey";
import { villageTemplateScope } from "@/lib/mail/template-access";
import { validateDocument } from "../document/validate";
import { deriveFormSpec } from "../document/form-spec";
import type { LetterDocument } from "../document/schema";
import { RESIDENT_SELECT, type ResidentLike } from "../registry";
import type { LetterValues } from "../values";
import { renderLetterHtml } from "../render-html";
import { assembleValues, parseLetterInput, type LetterInput } from "./input";
import { buildLetterContext } from "./context";
import { allocateLetterNumber, withLockRetry } from "./numbering";

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };
const fail = (status: number, error: string): { ok: false; status: number; error: string } => ({ ok: false, status, error });

const short = () => randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

/** Ambil dokumen v2 dari JSON tersimpan; format lama ditolak dengan pesan jelas. */
export function documentFromStructure(structure: unknown): ServiceResult<LetterDocument> {
  if (!structure || typeof structure !== "object" || (structure as { schemaVersion?: unknown }).schemaVersion !== 2) {
    return fail(422, "Template ini masih berformat lama dan belum bisa dipakai di pembuatan surat baru.");
  }
  const r = validateDocument(structure);
  return r.ok ? { ok: true, value: r.doc } : fail(422, "Template tidak valid. Hubungi admin untuk memperbaikinya.");
}

async function loadResidents(villageId: number, input: LetterInput): Promise<Map<number, ResidentLike>> {
  const ids = new Set<number>();
  for (const p of Object.values(input.people)) if (p.residentId != null) ids.add(p.residentId);
  for (const rows of Object.values(input.groups)) for (const r of rows) if (r.residentId != null) ids.add(r.residentId);
  if (ids.size === 0) return new Map();
  const rows = await prisma.resident.findMany({
    where: { villageId, id: { in: [...ids] } },
    select: { id: true, ...RESIDENT_SELECT },
  });
  return new Map(rows.map(({ id, ...rest }) => [id, rest as ResidentLike]));
}

type Prepared = {
  doc: LetterDocument;
  input: LetterInput;
  status: "draft" | "completed";
  date: Date;
  residents: Map<number, ResidentLike>;
  context: Awaited<ReturnType<typeof buildLetterContext>>;
};

async function prepare(
  village: Village,
  doc: LetterDocument,
  body: Record<string, unknown>,
  allowedStatuses: Array<"draft" | "completed"> = ["draft", "completed"],
): Promise<ServiceResult<Prepared>> {
  const status = body.status === undefined ? "draft" : body.status;
  if (status !== "draft" && status !== "completed") return fail(400, "Status surat tidak valid");
  if (!allowedStatuses.includes(status)) return fail(409, "Perubahan status ini tidak diizinkan");

  const spec = deriveFormSpec(doc);
  const parsed = parseLetterInput(body, doc, spec, status);
  if (!parsed.ok) return fail(400, parsed.error);

  const residents = await loadResidents(village.id, parsed.value);
  const context = await buildLetterContext(village);
  return {
    ok: true,
    value: { doc, input: parsed.value, status, date: parsed.value.letterDate ?? new Date(), residents, context },
  };
}

/** Nomor surat sesuai mode penomoran dokumen; hanya dipanggil di dalam transaksi. */
async function resolveNumber(
  tx: Prisma.TransactionClient,
  p: Prepared,
  villageId: number,
): Promise<ServiceResult<string>> {
  const n = p.doc.numbering;
  if (p.status === "draft") return { ok: true, value: p.input.number ?? "" };
  if (n.mode === "none") return { ok: true, value: "" };
  if (n.mode === "manual") {
    return p.input.number ? { ok: true, value: p.input.number } : fail(400, "Nomor surat wajib diisi");
  }
  const { nomor } = await allocateLetterNumber(tx, {
    villageId,
    numbering: n,
    date: p.date,
    kodeDesa: p.context.kodeDesa,
  });
  return { ok: true, value: nomor };
}

function applicantOf(doc: LetterDocument, values: LetterValues): { name: string; nik: string } {
  if (doc.audience !== "warga") return { name: "", nik: "" };
  const p = values.people.pemohon ?? {};
  return { name: (p.nama ?? "").slice(0, 255), nik: (p.nik ?? "").slice(0, 16) };
}

const asJson = (v: unknown) => v as Prisma.InputJsonValue;

export async function createLetter(args: {
  village: Village;
  userId: number;
  body: Record<string, unknown>;
}): Promise<ServiceResult<{ id: number; letterNumber: string; status: string }>> {
  const { village, userId, body } = args;
  const templateId = Number(body.templateId);
  if (!Number.isInteger(templateId) || templateId <= 0) return fail(400, "Pilih jenis surat");

  const template = await prisma.mailTemplate.findFirst({
    where: { id: templateId, isActive: true, ...villageTemplateScope(village.id) },
    select: { id: true, name: true, category: true, templateStructure: true },
  });
  if (!template) return fail(404, "Jenis surat tidak tersedia");

  const doc = documentFromStructure(template.templateStructure);
  if (!doc.ok) return doc;
  const prepared = await prepare(village, doc.value, body);
  if (!prepared.ok) return prepared;
  const p = prepared.value;

  try {
    const created = await withLockRetry(() =>
      prisma.$transaction(async (tx) => {
        const num = await resolveNumber(tx, p, village.id);
        if (!num.ok) return num;
        const nomor = num.value;
        const assembled = assembleValues({ input: p.input, residents: p.residents, doc: p.doc, context: p.context, date: p.date, nomor });
        if (!assembled.ok) return fail(400, assembled.error);
        const values = assembled.value;
        const who = applicantOf(p.doc, values);
        const letterNumber = nomor || (p.status === "draft" ? `DRAFT-${short()}` : `TANPA-NOMOR-${short()}`);

        const mail = await tx.mailService.create({
          data: {
            villageId: village.id,
            templateId: template.id,
            templateName: template.name,
            templateCategory: template.category,
            letterNumber,
            letterDate: p.date,
            letterDateKey: letterDateKeyFromInput(p.date),
            applicantName: who.name,
            applicantNik: who.nik,
            signerRole: "kepala_desa",
            signerName: values.pejabat.kades.nama || null,
            formData: asJson({ schemaVersion: 2, values }),
            templateSnapshot: asJson(p.doc),
            contentHtml: p.status === "completed" ? await renderLetterHtml({ doc: p.doc, values }) : null,
            status: p.status,
            createdBy: userId,
            completedAt: p.status === "completed" ? new Date() : null,
          },
        });
        await tx.mailHistory.create({
          data: {
            mailServiceId: mail.id,
            action: p.status === "completed" ? "completed" : "created",
            changes: { status: p.status, letterNumber },
            changedBy: userId,
          },
        });
        await tx.mailTemplate.update({ where: { id: template.id }, data: { usageCount: { increment: 1 } } });
        return { ok: true as const, value: { id: Number(mail.id), letterNumber, status: p.status } };
      }),
    );
    return created;
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      return fail(409, "Nomor surat ini sudah dipakai untuk surat dengan jenis dan tanggal yang sama");
    }
    throw err;
  }
}

export async function updateLetter(args: {
  village: Village;
  userId: number;
  id: bigint;
  body: Record<string, unknown>;
}): Promise<ServiceResult<{ id: number; letterNumber: string; status: string }>> {
  const { village, userId, id, body } = args;
  const existing = await prisma.mailService.findFirst({ where: { id, villageId: village.id } });
  if (!existing) return fail(404, "Surat tidak ditemukan");
  if (existing.templateSnapshot == null) return fail(422, "Surat berformat lama tidak dapat diubah di sini.");

  // Surat yang sudah terbit tidak boleh diubah isinya; hanya boleh diarsipkan.
  if (existing.status !== "draft") {
    if (body.status === "archived" && existing.status === "completed") {
      await prisma.$transaction([
        prisma.mailService.update({ where: { id }, data: { status: "archived" } }),
        prisma.mailHistory.create({ data: { mailServiceId: id, action: "archived", changes: { status: "archived" }, changedBy: userId } }),
      ]);
      return { ok: true, value: { id: Number(id), letterNumber: existing.letterNumber, status: "archived" } };
    }
    return fail(409, "Surat yang sudah terbit tidak dapat diubah. Buat surat baru bila ada kesalahan.");
  }

  const doc = documentFromStructure(existing.templateSnapshot);
  if (!doc.ok) return doc;
  const prepared = await prepare(village, doc.value, body);
  if (!prepared.ok) return prepared;
  const p = prepared.value;

  try {
    return await withLockRetry(() =>
      prisma.$transaction(async (tx) => {
        const num = await resolveNumber(tx, p, village.id);
        if (!num.ok) return num;
        const nomor = num.value;
        const assembled = assembleValues({ input: p.input, residents: p.residents, doc: p.doc, context: p.context, date: p.date, nomor });
        if (!assembled.ok) return fail(400, assembled.error);
        const values = assembled.value;
        const who = applicantOf(p.doc, values);
        const letterNumber = nomor || (p.status === "draft" ? existing.letterNumber : `TANPA-NOMOR-${short()}`);

        await tx.mailService.update({
          where: { id },
          data: {
            letterNumber,
            letterDate: p.date,
            letterDateKey: letterDateKeyFromInput(p.date),
            applicantName: who.name,
            applicantNik: who.nik,
            signerName: values.pejabat.kades.nama || null,
            formData: asJson({ schemaVersion: 2, values }),
            contentHtml: p.status === "completed" ? await renderLetterHtml({ doc: p.doc, values }) : null,
            status: p.status,
            completedAt: p.status === "completed" ? new Date() : null,
          },
        });
        await tx.mailHistory.create({
          data: {
            mailServiceId: id,
            action: p.status === "completed" ? "completed" : "updated",
            changes: { status: p.status, letterNumber },
            changedBy: userId,
          },
        });
        return { ok: true as const, value: { id: Number(id), letterNumber, status: p.status } };
      }),
    );
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      return fail(409, "Nomor surat ini sudah dipakai untuk surat dengan jenis dan tanggal yang sama");
    }
    throw err;
  }
}

export type LetterDetail = {
  id: number;
  status: string;
  letterNumber: string;
  letterDate: string;
  templateId: number;
  templateName: string;
  document: LetterDocument;
  values: LetterValues;
  /** Masukan asli operator (id warga + koreksi) tidak disimpan; nilai akhir ada di `values`. */
  createdAt: string;
  completedAt: string | null;
};

export async function getLetterDetail(village: Village, id: bigint): Promise<ServiceResult<LetterDetail>> {
  const row = await prisma.mailService.findFirst({ where: { id, villageId: village.id } });
  if (!row) return fail(404, "Surat tidak ditemukan");
  if (row.templateSnapshot == null) return fail(422, "Surat berformat lama");
  const doc = documentFromStructure(row.templateSnapshot);
  if (!doc.ok) return doc;
  const fd = row.formData as { schemaVersion?: number; values?: LetterValues } | null;
  if (!fd || fd.schemaVersion !== 2 || !fd.values) return fail(422, "Data surat tidak dikenali");
  return {
    ok: true,
    value: {
      id: Number(row.id),
      status: row.status,
      letterNumber: row.letterNumber,
      letterDate: row.letterDate.toISOString(),
      templateId: row.templateId,
      templateName: row.templateName,
      document: doc.value,
      values: fd.values,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    },
  };
}

/** Hanya draf yang boleh dibuang; surat terbit adalah arsip. */
export async function deleteDraft(village: Village, id: bigint): Promise<ServiceResult<{ ok: true }>> {
  const row = await prisma.mailService.findFirst({ where: { id, villageId: village.id }, select: { status: true } });
  if (!row) return fail(404, "Surat tidak ditemukan");
  if (row.status !== "draft") return fail(409, "Hanya draf yang dapat dibuang");
  await prisma.mailService.delete({ where: { id } });
  return { ok: true, value: { ok: true } };
}

