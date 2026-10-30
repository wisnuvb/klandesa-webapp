import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { listRegisteredPackKeys } from "@/lib/website-engine/template-packs/registry";
import {
  compareSemver,
  themePackToTemplateRow,
  validateThemePackManifest,
  type ManifestIssue,
  type ThemePackManifestV1,
} from "@/lib/website-engine/theme-pack-manifest";

const MAX_PRICE = 50_000_000;

// ---------- aturan murni (diuji tanpa database) ----------

/** Versi baru harus lebih tinggi dari semua versi yang pernah diajukan, dan kunci hanya boleh dipakai satu penulis. */
export function checkSubmission(params: {
  existing: Array<{ version: string; authorName: string }>;
  version: string;
  authorName: string;
}): { ok: true } | { ok: false; error: string } {
  const mine = params.authorName.trim().toLowerCase();
  if (params.existing.some((e) => e.authorName.trim().toLowerCase() !== mine)) {
    return { ok: false, error: "Kunci paket ini sudah dimiliki penulis lain" };
  }
  const highest = params.existing.map((e) => e.version).sort(compareSemver).pop();
  if (highest !== undefined && compareSemver(params.version, highest) <= 0) {
    return { ok: false, error: `Versi harus lebih tinggi dari ${highest}` };
  }
  return { ok: true };
}

/**
 * Harga ditetapkan platform, bukan penulis. Persetujuan pertama wajib punya harga (dari reviewer atau saran penulis);
 * versi berikutnya mempertahankan harga template yang sudah ada kecuali reviewer menggantinya.
 */
export function resolveApprovalPrice(params: {
  requested: unknown;
  suggested?: number;
  existingPrice: number | null;
}): { ok: true; price: number } | { ok: false; error: string } {
  const { requested } = params;
  if (requested !== undefined && requested !== null) {
    if (typeof requested !== "number" || !Number.isInteger(requested) || requested < 0 || requested > MAX_PRICE) {
      return { ok: false, error: `Harga harus bilangan bulat 0–${MAX_PRICE.toLocaleString("id-ID")}` };
    }
    return { ok: true, price: requested };
  }
  if (params.existingPrice !== null) return { ok: true, price: params.existingPrice };
  if (params.suggested !== undefined) return { ok: true, price: params.suggested };
  return { ok: false, error: "Harga wajib ditetapkan pada persetujuan pertama" };
}

// ---------- layanan berbasis database ----------

export type SubmitResult =
  | { ok: true; id: number }
  | { ok: false; status: 409 | 422; error?: string; errors?: ManifestIssue[] };

export async function submitThemePack(raw: unknown, authorOverride?: string): Promise<SubmitResult> {
  const v = validateThemePackManifest(raw, { reservedKeys: listRegisteredPackKeys() });
  if (!v.ok) return { ok: false, status: 422, errors: v.errors };
  const m = v.manifest;
  const authorName = (authorOverride?.trim() || m.author.name).slice(0, 80);

  const existing = await prisma.websiteThemePack.findMany({
    where: { key: m.key },
    select: { version: true, authorName: true },
  });
  const check = checkSubmission({ existing, version: m.version, authorName });
  if (!check.ok) return { ok: false, status: 409, error: check.error };

  try {
    const row = await prisma.websiteThemePack.create({
      data: {
        key: m.key,
        version: m.version,
        name: m.name,
        authorName,
        manifest: m as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, status: 409, error: "Versi ini sudah diajukan" };
    }
    throw e;
  }
}

export type ReviewAction = "approve" | "reject" | "withdraw";
export type ReviewResult =
  | { ok: true; status: string; templateId?: number }
  | { ok: false; status: 404 | 409 | 422; error: string; errors?: ManifestIssue[] };

export async function reviewThemePack(params: {
  id: number;
  action: ReviewAction;
  note?: string;
  price?: unknown;
  reviewerId: number;
}): Promise<ReviewResult> {
  const note = params.note?.trim() || null;

  return prisma.$transaction(async (tx): Promise<ReviewResult> => {
    const row = await tx.websiteThemePack.findUnique({ where: { id: params.id } });
    if (!row) return { ok: false, status: 404, error: "Paket tidak ditemukan" };
    const audit = { reviewedById: params.reviewerId, reviewedAt: new Date(), reviewNote: note };

    if (params.action === "reject") {
      if (row.status !== "submitted") return { ok: false, status: 409, error: "Hanya pengajuan baru yang bisa ditolak" };
      if (!note || note.length < 5) return { ok: false, status: 422, error: "Alasan penolakan wajib diisi (min. 5 karakter)" };
      await tx.websiteThemePack.update({ where: { id: row.id }, data: { status: "rejected", ...audit } });
      return { ok: true, status: "rejected" };
    }

    if (params.action === "withdraw") {
      if (row.status !== "approved" || !row.templateId) {
        return { ok: false, status: 409, error: "Hanya paket yang sedang tayang yang bisa ditarik" };
      }
      // Template ditutup dari katalog; desa yang sudah memakainya tidak terganggu.
      await tx.websiteTemplate.update({ where: { id: row.templateId }, data: { isActive: false } });
      await tx.websiteThemePack.update({ where: { id: row.id }, data: { status: "withdrawn", ...audit } });
      return { ok: true, status: "withdrawn", templateId: row.templateId };
    }

    if (row.status !== "submitted") return { ok: false, status: 409, error: "Hanya pengajuan baru yang bisa disetujui" };

    // Manifest divalidasi ulang: isi kolom JSON tidak dipercaya hanya karena pernah lolos saat diajukan.
    const v = validateThemePackManifest(row.manifest, { reservedKeys: listRegisteredPackKeys() });
    if (!v.ok) return { ok: false, status: 422, error: "Manifest tidak lagi valid", errors: v.errors };
    const m: ThemePackManifestV1 = v.manifest;

    const prior = await tx.websiteThemePack.findFirst({
      where: { key: row.key, templateId: { not: null }, id: { not: row.id } },
      orderBy: { id: "desc" },
      select: { templateId: true },
    });
    const existingTemplate = prior?.templateId
      ? await tx.websiteTemplate.findUnique({ where: { id: prior.templateId }, select: { id: true, price: true } })
      : null;

    const price = resolveApprovalPrice({
      requested: params.price,
      suggested: m.suggestedPriceIdr,
      existingPrice: existingTemplate ? Number(existingTemplate.price) : null,
    });
    if (!price.ok) return { ok: false, status: 422, error: price.error };

    const row_ = themePackToTemplateRow(m, price.price);
    const data = { ...row_, structure: row_.structure as Prisma.InputJsonValue };
    const template = existingTemplate
      ? await tx.websiteTemplate.update({ where: { id: existingTemplate.id }, data: { ...data, isActive: true } })
      : await tx.websiteTemplate.create({ data: { ...data, isActive: true, isFeatured: false } });

    await tx.websiteThemePack.updateMany({
      where: { key: row.key, status: "approved", id: { not: row.id } },
      data: { status: "superseded" },
    });
    await tx.websiteThemePack.update({
      where: { id: row.id },
      data: { status: "approved", templateId: template.id, ...audit },
    });
    return { ok: true, status: "approved", templateId: template.id };
  });
}
