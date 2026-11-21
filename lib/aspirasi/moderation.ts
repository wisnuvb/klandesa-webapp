/**
 * Moderasi platform atas Aspirasi Warga: tinjau laporan baru, sunting/tayangkan/tolak/sembunyikan/hapus, tangani laporan
 * konten, dan setujui klaim desa. Dipanggil dari /api/admin/aspirasi/* (requirePlatformSession); servis tidak memeriksa izin.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isRecord, type Result } from "@/lib/form-input";
import { LIMITS, type ModerationStatus } from "./catalog";
import { cleanPublicText, tidyText } from "./text";
import { claimMatchScore, readPhotos, type Db } from "./service";
import { aspirationSlug } from "./slug";

const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });

export type Admin = { id: number | null; email: string };

// ---------------------------------------------------------------------------------------------------------------------
// Aturan perpindahan status moderasi
// ---------------------------------------------------------------------------------------------------------------------
export type ModerationAction = "publish" | "reject" | "hide" | "remove" | "reopen" | "noindex" | "index" | "edit";

const ALLOWED: Record<ModerationAction, ModerationStatus[]> = {
  publish: ["PENDING", "HIDDEN"],
  reject: ["PENDING"],
  hide: ["PUBLISHED"],
  remove: ["PENDING", "PUBLISHED", "HIDDEN", "REJECTED"],
  reopen: ["REJECTED"],
  // Tidak mengubah status: boleh pada laporan yang tayang atau disembunyikan.
  noindex: ["PUBLISHED", "HIDDEN"],
  index: ["PUBLISHED", "HIDDEN"],
  edit: ["PENDING", "PUBLISHED", "HIDDEN"],
};

export function canModerate(status: string, action: ModerationAction): boolean {
  return (ALLOWED[action] as string[]).includes(status);
}

export function isModerationAction(v: unknown): v is ModerationAction {
  return typeof v === "string" && v in ALLOWED;
}

export type ModerationResult = { status: string; noindex: boolean; publishedAt: Date | null; villageId: number | null; code: string; removedPhotoKeys: string[] };

export async function moderateAspiration(db: PrismaClient, id: bigint, admin: Admin, raw: unknown): Promise<Result<ModerationResult>> {
  if (!isRecord(raw)) return fail(400, "Data tidak valid.");
  const action = raw.action;
  if (!isModerationAction(action)) return fail(400, "Aksi tidak dikenal.");
  const note = tidyText(raw.note).slice(0, LIMITS.noteMax) || null;

  const data: Prisma.AspirationUpdateInput = { moderatedAt: new Date(), moderatedById: admin.id ?? null };
  const fieldErrors: Record<string, string> = {};

  if (action === "reject") {
    const reason = tidyText(raw.rejectReason).slice(0, 300);
    if (reason.length < 5) fieldErrors.rejectReason = "Tulis alasan penolakan (minimal 5 karakter); pelapor dapat membacanya.";
    data.rejectReason = reason;
  }

  // Sunting: moderator boleh memperbaiki judul, isi, patokan lokasi, dan membuang foto (mis. memburamkan wajib dilakukan di luar).
  let keepPhotos: string[] | null = null;
  if (action === "edit") {
    if (raw.title !== undefined) {
      const t = cleanPublicText(raw.title, "Judul", LIMITS.titleMin, LIMITS.titleMax);
      if (!t.ok) fieldErrors.title = t.error;
      else {
        data.title = t.text.replace(/\s+/g, " ");
        // Alamat ikut judul baru: judul lama (mis. memuat nama orang) tidak boleh bertahan di URL, kanonik, dan sitemap.
        // Alamat lama tetap bekerja lewat pengalihan kanonik karena pencarian memakai kode.
        data.slug = aspirationSlug(t.text);
      }
    }
    if (raw.body !== undefined) {
      const b = cleanPublicText(raw.body, "Isi laporan", LIMITS.bodyMin, LIMITS.bodyMax);
      if (!b.ok) fieldErrors.body = b.error;
      else data.body = b.text;
    }
    if (raw.locationNote !== undefined) {
      const raw2 = tidyText(raw.locationNote);
      if (!raw2) data.locationNote = null;
      else {
        const l = cleanPublicText(raw2, "Patokan lokasi", 2, LIMITS.locationMax);
        if (!l.ok) fieldErrors.locationNote = l.error;
        else data.locationNote = l.text.replace(/\s+/g, " ");
      }
    }
    if (Array.isArray(raw.keepPhotoKeys)) keepPhotos = raw.keepPhotoKeys.map((k) => String(k));
  }
  if (Object.keys(fieldErrors).length) return invalid({ errors: Object.values(fieldErrors), fieldErrors });

  return db.$transaction(async (tx) => {
    const a = await tx.aspiration.findUnique({ where: { id }, select: { id: true, code: true, status: true, noindex: true, publishedAt: true, photos: true, area: { select: { villageId: true } } } });
    if (!a) return fail(404, "Laporan tidak ditemukan.");
    if (!canModerate(a.status, action)) return fail(409, `Aksi ini tidak berlaku untuk laporan berstatus ${a.status}.`);

    if (note !== null || action !== "edit") data.moderationNote = note ?? undefined;
    let removedPhotoKeys: string[] = [];
    switch (action) {
      case "publish":
        data.status = "PUBLISHED";
        data.publishedAt = a.publishedAt ?? new Date();
        data.rejectReason = null;
        break;
      case "reject":
        data.status = "REJECTED";
        break;
      case "hide":
        data.status = "HIDDEN";
        break;
      case "remove":
        data.status = "REMOVED";
        removedPhotoKeys = readPhotos(a.photos).map((p) => p.key);
        break;
      case "reopen":
        data.status = "PENDING";
        data.rejectReason = null;
        break;
      case "noindex":
        data.noindex = true;
        break;
      case "index":
        data.noindex = false;
        break;
      case "edit":
        if (keepPhotos) {
          const have = new Set(readPhotos(a.photos).map((p) => p.key));
          const kept = keepPhotos.filter((k) => have.has(k));
          data.photos = (kept.length ? (kept.map((key) => ({ key })) as Prisma.InputJsonValue) : Prisma.JsonNull);
          removedPhotoKeys = [...have].filter((k) => !kept.includes(k));
        }
        break;
    }
    const updated = await tx.aspiration.update({ where: { id }, data, select: { status: true, noindex: true, publishedAt: true, code: true } });
    return ok({ ...updated, villageId: a.area.villageId, removedPhotoKeys });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Antrean dan daftar untuk konsol admin
// ---------------------------------------------------------------------------------------------------------------------
export type AdminAspirationRow = {
  id: string;
  code: string;
  status: string;
  category: string;
  title: string;
  body: string;
  locationNote: string | null;
  photoKeys: string[];
  noindex: boolean;
  progress: string;
  createdAt: Date;
  publishedAt: Date | null;
  moderationNote: string | null;
  rejectReason: string | null;
  manualArea: boolean;
  openFlags: number;
  replies: number;
  /** Kontak pelapor: hanya untuk admin platform. */
  reporter: { name: string | null; phone: string | null; email: string | null };
  area: { slug: string; name: string; district: string; regency: string; province: string; claimed: boolean };
};

export async function listForAdmin(db: Db, opts: { status?: string; q?: string; page?: number; pageSize?: number }) {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
  const page = Math.min(Math.max(opts.page ?? 1, 1), 1000);
  const where: Prisma.AspirationWhereInput = {};
  if (opts.status && ["PENDING", "PUBLISHED", "REJECTED", "HIDDEN", "REMOVED"].includes(opts.status)) where.status = opts.status;
  const q = opts.q?.replace(/[%_\\]/g, " ").trim().slice(0, 60);
  if (q) where.OR = [{ title: { contains: q } }, { code: { contains: q.toLowerCase() } }, { area: { name: { contains: q } } }, { area: { regency: { contains: q } } }];
  const [rows, total, grouped] = await Promise.all([
    db.aspiration.findMany({
      where,
      // Antrean: yang terlama dulu supaya tidak ada yang menunggu tanpa batas; daftar lain: terbaru dulu.
      orderBy: where.status === "PENDING" ? { id: "asc" } : { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, code: true, status: true, category: true, title: true, body: true, locationNote: true, photos: true, noindex: true, progress: true,
        createdAt: true, publishedAt: true, moderationNote: true, rejectReason: true, reporterName: true, reporterPhone: true, reporterEmail: true,
        area: { select: { slug: true, name: true, district: true, regency: true, province: true, villageId: true, wilayahCode: true } },
        _count: { select: { replies: true, flags: { where: { status: "OPEN" } } } },
      },
    }),
    db.aspiration.count({ where }),
    db.aspiration.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const items: AdminAspirationRow[] = rows.map((r) => ({
    id: String(r.id),
    code: r.code,
    status: r.status,
    category: r.category,
    title: r.title,
    body: r.body,
    locationNote: r.locationNote,
    photoKeys: readPhotos(r.photos).map((p) => p.key),
    noindex: r.noindex,
    progress: r.progress,
    createdAt: r.createdAt,
    publishedAt: r.publishedAt,
    moderationNote: r.moderationNote,
    rejectReason: r.rejectReason,
    manualArea: r.area.wilayahCode == null,
    openFlags: r._count.flags,
    replies: r._count.replies,
    reporter: { name: r.reporterName, phone: r.reporterPhone, email: r.reporterEmail },
    area: { slug: r.area.slug, name: r.area.name, district: r.area.district, regency: r.area.regency, province: r.area.province, claimed: r.area.villageId != null },
  }));
  return { items, total, page, pageSize, counts: Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Record<string, number> };
}

// ---------------------------------------------------------------------------------------------------------------------
// Laporan konten
// ---------------------------------------------------------------------------------------------------------------------
export async function listFlags(db: Db, opts: { status?: string; page?: number; pageSize?: number }) {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
  const page = Math.min(Math.max(opts.page ?? 1, 1), 1000);
  const where: Prisma.AspirationFlagWhereInput = {};
  if (opts.status === "OPEN" || opts.status === "ACTIONED" || opts.status === "DISMISSED") where.status = opts.status;
  const [rows, total, open] = await Promise.all([
    db.aspirationFlag.findMany({
      where,
      orderBy: where.status === "OPEN" ? { id: "asc" } : { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, reason: true, detail: true, source: true, contact: true, status: true, createdAt: true, handledAt: true, handleNote: true,
        aspiration: { select: { id: true, code: true, slug: true, title: true, status: true, area: { select: { name: true, regency: true } } } },
      },
    }),
    db.aspirationFlag.count({ where }),
    db.aspirationFlag.count({ where: { status: "OPEN" } }),
  ]);
  return {
    items: rows.map((f) => ({
      id: String(f.id), reason: f.reason, detail: f.detail, source: f.source, contact: f.contact, status: f.status, createdAt: f.createdAt, handledAt: f.handledAt, handleNote: f.handleNote,
      aspiration: { id: String(f.aspiration.id), code: f.aspiration.code, slug: f.aspiration.slug, title: f.aspiration.title, status: f.aspiration.status, area: `${f.aspiration.area.name}, ${f.aspiration.area.regency}` },
    })),
    total, page, pageSize, open,
  };
}

/** Tutup laporan konten: "action" = ditindaklanjuti (laporan sudah ditangani), "dismiss" = ditolak/tidak berlaku. */
export async function handleFlag(db: PrismaClient, id: bigint, admin: Admin, raw: unknown): Promise<Result<{ status: string }>> {
  if (!isRecord(raw)) return fail(400, "Data tidak valid.");
  const decision = raw.decision;
  if (decision !== "action" && decision !== "dismiss") return fail(400, "Keputusan harus action atau dismiss.");
  const note = tidyText(raw.note).slice(0, LIMITS.noteMax) || null;
  const f = await db.aspirationFlag.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!f) return fail(404, "Laporan konten tidak ditemukan.");
  if (f.status !== "OPEN") return fail(409, "Laporan konten ini sudah ditangani.");
  const status = decision === "action" ? "ACTIONED" : "DISMISSED";
  await db.aspirationFlag.update({ where: { id }, data: { status, handledAt: new Date(), handledById: admin.id ?? null, handleNote: note } });
  return ok({ status });
}

// ---------------------------------------------------------------------------------------------------------------------
// Klaim desa
// ---------------------------------------------------------------------------------------------------------------------
export async function listClaims(db: Db, opts: { status?: string; page?: number; pageSize?: number }) {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
  const page = Math.min(Math.max(opts.page ?? 1, 1), 1000);
  const where: Prisma.VillageClaimWhereInput = {};
  if (opts.status && ["PENDING", "APPROVED", "REJECTED", "REVOKED"].includes(opts.status)) where.status = opts.status;
  const [rows, total, pending] = await Promise.all([
    db.villageClaim.findMany({
      where,
      orderBy: where.status === "PENDING" ? { id: "asc" } : { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, position: true, contactPhone: true, evidenceNote: true, status: true, reviewNote: true, reviewedAt: true, createdAt: true,
        area: { select: { id: true, slug: true, name: true, district: true, regency: true, province: true, villageId: true } },
        village: { select: { id: true, name: true, district: true, regency: true, province: true, email: true, phone: true, subscriptionStatus: true } },
        user: { select: { name: true, email: true, role: true } },
      },
    }),
    db.villageClaim.count({ where }),
    db.villageClaim.count({ where: { status: "PENDING" } }),
  ]);
  return {
    items: rows.map((c) => ({
      id: c.id, position: c.position, contactPhone: c.contactPhone, evidenceNote: c.evidenceNote, status: c.status, reviewNote: c.reviewNote, reviewedAt: c.reviewedAt, createdAt: c.createdAt,
      area: { slug: c.area.slug, name: c.area.name, district: c.area.district, regency: c.area.regency, province: c.area.province, claimedByOther: c.area.villageId != null && c.area.villageId !== c.village.id },
      village: c.village,
      user: c.user,
      matchScore: claimMatchScore(c.area, c.village),
    })),
    total, page, pageSize, pending,
  };
}

export type ClaimReview = { status: string; areaSlug: string; villageId: number; userEmail: string | null; villageName: string };

export async function reviewClaim(db: PrismaClient, id: number, admin: Admin, raw: unknown): Promise<Result<ClaimReview>> {
  if (!isRecord(raw)) return fail(400, "Data tidak valid.");
  const decision = raw.decision;
  if (decision !== "approve" && decision !== "reject" && decision !== "revoke") return fail(400, "Keputusan harus approve, reject, atau revoke.");
  const note = tidyText(raw.note).slice(0, LIMITS.noteMax) || null;
  if (decision !== "approve" && (note?.length ?? 0) < 5) return invalid({ errors: ["Tulis alasan (minimal 5 karakter)."], fieldErrors: { note: "Tulis alasan (minimal 5 karakter)." } });

  return db.$transaction(async (tx) => {
    // Kunci baris area lebih dulu agar dua persetujuan serentak untuk wilayah yang sama tidak lolos keduanya.
    const claimRow = await tx.villageClaim.findUnique({ where: { id }, select: { areaId: true } });
    if (!claimRow) return fail(404, "Permohonan klaim tidak ditemukan.");
    await tx.$queryRaw`SELECT id FROM aspiration_areas WHERE id = ${claimRow.areaId} FOR UPDATE`;
    const c = await tx.villageClaim.findUnique({
      where: { id },
      select: { id: true, status: true, areaId: true, villageId: true, village: { select: { name: true } }, user: { select: { email: true } }, area: { select: { slug: true, villageId: true } } },
    });
    if (!c) return fail(404, "Permohonan klaim tidak ditemukan.");
    const now = new Date();
    const base = { reviewedAt: now, reviewedById: admin.id ?? null, reviewNote: note };
    if (decision === "approve") {
      if (c.status !== "PENDING") return fail(409, "Hanya permohonan yang menunggu verifikasi yang dapat disetujui.");
      if (c.area.villageId != null && c.area.villageId !== c.villageId) return fail(409, "Wilayah ini sudah dikelola desa lain.");
      const owned = await tx.aspirationArea.findUnique({ where: { villageId: c.villageId }, select: { id: true } });
      if (owned && owned.id !== c.areaId) return fail(409, "Desa pemohon sudah mengelola wilayah lain.");
      await tx.aspirationArea.update({ where: { id: c.areaId }, data: { villageId: c.villageId, claimedAt: now } });
      await tx.villageClaim.update({ where: { id }, data: { status: "APPROVED", ...base } });
      // Klaim lain yang menunggu untuk wilayah yang sama otomatis ditolak.
      await tx.villageClaim.updateMany({
        where: { areaId: c.areaId, status: "PENDING", id: { not: id } },
        data: { status: "REJECTED", reviewedAt: now, reviewedById: admin.id ?? null, reviewNote: "Wilayah ini disetujui untuk desa lain." },
      });
    } else if (decision === "reject") {
      if (c.status !== "PENDING") return fail(409, "Hanya permohonan yang menunggu verifikasi yang dapat ditolak.");
      await tx.villageClaim.update({ where: { id }, data: { status: "REJECTED", ...base } });
    } else {
      if (c.status !== "APPROVED") return fail(409, "Hanya klaim yang sudah disetujui yang dapat dicabut.");
      await tx.aspirationArea.update({ where: { id: c.areaId }, data: { villageId: null, claimedAt: null } });
      await tx.villageClaim.update({ where: { id }, data: { status: "REVOKED", ...base } });
    }
    const status = decision === "approve" ? "APPROVED" : decision === "reject" ? "REJECTED" : "REVOKED";
    return ok({ status, areaSlug: c.area.slug, villageId: c.villageId, userEmail: c.user.email, villageName: c.village.name });
  });
}
