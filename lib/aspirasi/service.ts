/**
 * Servis Aspirasi Warga publik: kirim laporan, cek status pelapor, baca publik, tanggapan desa, laporan konten, klaim desa.
 * Moderasi platform ada di moderation.ts. Aturan utama:
 *  - Kueri publik memakai PUBLIC_SELECT: kontak pelapor, ipHash, dan catatan moderator TIDAK PERNAH ikut.
 *  - Servis tidak memeriksa izin; rute yang memeriksa (sesi desa / sesi platform / publik berbatas laju).
 *  - Dependensi luar (daftar wilayah) dapat disuntikkan agar tes tidak memanggil jaringan.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isRecord, type Result } from "@/lib/form-input";
import { normalizeWaNumber } from "@/lib/contacts/lead";
import {
  LIMITS,
  REPLY_KIND_PROGRESS,
  REPLY_KINDS,
  isAspirationCategory,
  isFlagReason,
  type AspirationProgress,
  type FlagReason,
  type ReplyKind,
} from "./catalog";
import { cleanPublicText, tidyText } from "./text";
import { areaSlug, aspirationSlug, newAspirationCode } from "./slug";
import { resolveVillageCode, type ResolvedVillage } from "./wilayah";

export type Db = PrismaClient | Prisma.TransactionClient;

const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
const isP2002 = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** Kunci unggahan foto aspirasi (dibuat endpoint unggah): aspirasi/YYYY/MM/<uuid>.webp. */
export const ASPIRATION_PHOTO_KEY_RE = /^aspirasi\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export type StoredPhoto = { key: string };

export function readPhotos(json: unknown): StoredPhoto[] {
  if (!Array.isArray(json)) return [];
  const out: StoredPhoto[] = [];
  for (const p of json) {
    const key = isRecord(p) && typeof p.key === "string" ? p.key : null;
    if (key && ASPIRATION_PHOTO_KEY_RE.test(key)) out.push({ key });
  }
  return out.slice(0, LIMITS.photosMax);
}

// ---------------------------------------------------------------------------------------------------------------------
// Tampilan publik (tanpa data pribadi)
// ---------------------------------------------------------------------------------------------------------------------
const AREA_PUBLIC_SELECT = { slug: true, name: true, kind: true, district: true, regency: true, province: true, villageId: true, claimedAt: true } as const;

/** SATU-SATUNYA daftar kolom yang boleh dibaca untuk halaman publik. Jangan menambah reporter*, ipHash, moderation*. */
export const PUBLIC_SELECT = {
  id: true,
  code: true,
  slug: true,
  category: true,
  title: true,
  body: true,
  locationNote: true,
  photos: true,
  status: true,
  noindex: true,
  publishedAt: true,
  progress: true,
  progressAt: true,
  area: { select: AREA_PUBLIC_SELECT },
  replies: {
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, body: true, authorLabel: true, createdAt: true },
  },
  _count: { select: { flags: { where: { status: "OPEN" } } } },
} satisfies Prisma.AspirationSelect;

type PublicRow = Prisma.AspirationGetPayload<{ select: typeof PUBLIC_SELECT }>;

export type PublicAspiration = {
  code: string;
  slug: string;
  category: string;
  title: string;
  body: string;
  locationNote: string | null;
  photoKeys: string[];
  noindex: boolean;
  publishedAt: Date | null;
  progress: AspirationProgress;
  progressAt: Date | null;
  openFlags: number;
  area: { slug: string; name: string; kind: string; district: string; regency: string; province: string; claimed: boolean };
  replies: Array<{ id: string; kind: ReplyKind; body: string; authorLabel: string; createdAt: Date }>;
};

function toPublic(r: PublicRow): PublicAspiration {
  return {
    code: r.code,
    slug: r.slug,
    category: r.category,
    title: r.title,
    body: r.body,
    locationNote: r.locationNote,
    photoKeys: readPhotos(r.photos).map((p) => p.key),
    noindex: r.noindex,
    publishedAt: r.publishedAt,
    progress: r.progress as AspirationProgress,
    progressAt: r.progressAt,
    openFlags: r._count.flags,
    area: {
      slug: r.area.slug,
      name: r.area.name,
      kind: r.area.kind,
      district: r.area.district,
      regency: r.area.regency,
      province: r.area.province,
      claimed: r.area.villageId != null,
    },
    replies: r.replies.map((x) => ({ id: String(x.id), kind: x.kind as ReplyKind, body: x.body, authorLabel: x.authorLabel, createdAt: x.createdAt })),
  };
}

export async function getPublicAspiration(db: Db, code: string): Promise<PublicAspiration | null> {
  const row = await db.aspiration.findUnique({ where: { code }, select: PUBLIC_SELECT });
  if (!row || row.status !== "PUBLISHED") return null;
  return toPublic(row);
}

export type PublicListOpts = { areaSlug?: string; category?: string; q?: string; progress?: string; page?: number; pageSize?: number };

const likeSafe = (raw: string) => raw.replace(/[%_\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

export async function listPublicAspirations(db: Db, opts: PublicListOpts = {}): Promise<{ items: PublicAspiration[]; total: number; page: number; pageSize: number }> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 12, 1), 50);
  const page = Math.min(Math.max(opts.page ?? 1, 1), 1000);
  const where: Prisma.AspirationWhereInput = { status: "PUBLISHED" };
  if (opts.areaSlug) where.area = { slug: opts.areaSlug };
  if (opts.category && isAspirationCategory(opts.category)) where.category = opts.category;
  if (opts.progress === "NEW" || opts.progress === "RESPONDED" || opts.progress === "IN_PROGRESS" || opts.progress === "RESOLVED" || opts.progress === "DISPUTED") where.progress = opts.progress;
  const q = opts.q ? likeSafe(opts.q) : "";
  if (q) where.OR = [{ title: { contains: q } }, { body: { contains: q } }, { area: { name: { contains: q } } }];
  const [rows, total] = await Promise.all([
    db.aspiration.findMany({ where, orderBy: [{ publishedAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, select: PUBLIC_SELECT }),
    db.aspiration.count({ where }),
  ]);
  return { items: rows.map(toPublic), total, page, pageSize };
}

export type PublicArea = {
  slug: string;
  name: string;
  kind: string;
  district: string;
  regency: string;
  province: string;
  claimed: boolean;
  published: number;
  resolved: number;
  responded: number;
};

export async function getPublicArea(db: Db, slug: string): Promise<PublicArea | null> {
  const a = await db.aspirationArea.findUnique({ where: { slug }, select: { id: true, ...AREA_PUBLIC_SELECT } });
  if (!a) return null;
  const grouped = await db.aspiration.groupBy({ by: ["progress"], where: { areaId: a.id, status: "PUBLISHED" }, _count: { _all: true } });
  const n = (p: string) => grouped.find((g) => g.progress === p)?._count._all ?? 0;
  const published = grouped.reduce((s, g) => s + g._count._all, 0);
  return {
    slug: a.slug,
    name: a.name,
    kind: a.kind,
    district: a.district,
    regency: a.regency,
    province: a.province,
    claimed: a.villageId != null,
    published,
    resolved: n("RESOLVED"),
    responded: published - n("NEW"),
  };
}

/** Pencarian desa untuk halaman utama: hanya desa yang punya laporan tayang atau sudah diklaim. */
export async function searchAreas(db: Db, q: string, limit = 10) {
  const term = likeSafe(q);
  if (term.length < 2) return [];
  const rows = await db.aspirationArea.findMany({
    where: { name: { contains: term }, OR: [{ villageId: { not: null } }, { aspirations: { some: { status: "PUBLISHED" } } }] },
    orderBy: { name: "asc" },
    take: Math.min(limit, 20),
    select: { ...AREA_PUBLIC_SELECT, _count: { select: { aspirations: { where: { status: "PUBLISHED" } } } } },
  });
  return rows.map((a) => ({ slug: a.slug, name: a.name, kind: a.kind, district: a.district, regency: a.regency, province: a.province, claimed: a.villageId != null, published: a._count.aspirations }));
}

// ---------------------------------------------------------------------------------------------------------------------
// Kirim laporan
// ---------------------------------------------------------------------------------------------------------------------
const MANUAL_NAME_RE = /^[\p{L}\p{N} .,'()/-]{2,120}$/u;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

export type SubmitCtx = { ipHash: string | null; resolveVillage?: (code: string) => Promise<ResolvedVillage | null> };

type AreaInput = { kind: "code"; code: string } | { kind: "manual"; name: string; district: string; regency: string; province: string };

function parseArea(raw: Record<string, unknown>, fieldErrors: Record<string, string>): AreaInput | null {
  const code = typeof raw.areaCode === "string" ? raw.areaCode.trim() : "";
  if (code) return { kind: "code", code };
  const m = isRecord(raw.manualArea) ? raw.manualArea : null;
  if (m) {
    const f = (k: string) => tidyText(m[k]).replace(/\s+/g, " ");
    const v = { name: f("name"), district: f("district"), regency: f("regency"), province: f("province") };
    const bad = (Object.keys(v) as Array<keyof typeof v>).filter((k) => !MANUAL_NAME_RE.test(v[k]));
    if (bad.length === 0) return { kind: "manual", ...v };
    fieldErrors.area = "Isi nama desa, kecamatan, kabupaten/kota, dan provinsi dengan benar (huruf dan angka saja).";
    return null;
  }
  fieldErrors.area = "Pilih desa atau kelurahan yang dimaksud.";
  return null;
}

export type SubmittedAspiration = { code: string; id: string };

/** Foto yang dilampirkan: hanya kunci unggahan sah, maksimal 3, tanpa duplikat. */
function parsePhotoKeys(raw: unknown, fieldErrors: Record<string, string>): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    fieldErrors.photos = "Format foto tidak valid.";
    return [];
  }
  const keys = [...new Set(raw.map((k) => String(k)))];
  if (keys.length > LIMITS.photosMax || keys.some((k) => !ASPIRATION_PHOTO_KEY_RE.test(k))) {
    fieldErrors.photos = `Maksimal ${LIMITS.photosMax} foto, hasil unggahan dari formulir ini.`;
    return [];
  }
  return keys;
}

export async function submitAspiration(db: PrismaClient, raw: unknown, ctx: SubmitCtx): Promise<Result<SubmittedAspiration>> {
  if (!isRecord(raw)) return fail(400, "Data tidak valid.");
  // Kolom jebakan bot: manusia tidak melihatnya. Pura-pura berhasil agar bot tidak belajar.
  if (typeof raw.website === "string" && raw.website.trim() !== "") return ok({ code: "tidak-disimpan", id: "0" });

  const fieldErrors: Record<string, string> = {};
  if (raw.consent !== true) fieldErrors.consent = "Centang persetujuan sebelum mengirim.";

  const category = String(raw.category ?? "");
  if (!isAspirationCategory(category)) fieldErrors.category = "Pilih kategori laporan.";

  const title = cleanPublicText(raw.title, "Judul", LIMITS.titleMin, LIMITS.titleMax);
  if (!title.ok) fieldErrors.title = title.error;
  const body = cleanPublicText(raw.body, "Isi laporan", LIMITS.bodyMin, LIMITS.bodyMax);
  if (!body.ok) fieldErrors.body = body.error;

  let locationNote: string | null = null;
  if (tidyText(raw.locationNote)) {
    const loc = cleanPublicText(raw.locationNote, "Patokan lokasi", 2, LIMITS.locationMax);
    if (!loc.ok) fieldErrors.locationNote = loc.error;
    else locationNote = loc.text.replace(/\s+/g, " ");
  }

  const phoneRaw = tidyText(raw.reporterPhone);
  const emailRaw = tidyText(raw.reporterEmail).toLowerCase();
  const phone = phoneRaw ? normalizeWaNumber(phoneRaw) : null;
  if (phoneRaw && !phone) fieldErrors.reporterPhone = "Nomor telepon tidak valid. Contoh: 081234567890.";
  if (emailRaw && !EMAIL_RE.test(emailRaw)) fieldErrors.reporterEmail = "Alamat email tidak valid.";
  if (!phone && !emailRaw && !fieldErrors.reporterPhone && !fieldErrors.reporterEmail) {
    fieldErrors.reporterPhone = "Isi nomor WhatsApp atau email agar kami bisa memberi kabar. Kontak Anda tidak ditampilkan.";
  }
  const name = tidyText(raw.reporterName).replace(/\s+/g, " ").slice(0, LIMITS.nameMax) || null;

  const photoKeys = parsePhotoKeys(raw.photos, fieldErrors);
  const areaInput = parseArea(raw, fieldErrors);

  if (Object.keys(fieldErrors).length > 0 || !title.ok || !body.ok || !areaInput || !isAspirationCategory(category)) {
    return invalid({ errors: Object.values(fieldErrors), fieldErrors });
  }

  // Wilayah: kode diverifikasi ke sumber agar halaman desa tidak bisa dibuat dengan nama palsu.
  let area: { wilayahCode: string | null; kind: "desa" | "kelurahan"; name: string; district: string; regency: string; province: string };
  if (areaInput.kind === "code") {
    const resolved = await (ctx.resolveVillage ?? resolveVillageCode)(areaInput.code);
    if (!resolved) return invalid({ errors: ["Desa tidak ditemukan. Pilih ulang dari daftar atau isi manual."], fieldErrors: { area: "Desa tidak ditemukan. Pilih ulang dari daftar atau isi manual." } });
    area = resolved;
  } else {
    area = { wilayahCode: null, kind: "desa", name: areaInput.name, district: areaInput.district, regency: areaInput.regency, province: areaInput.province };
  }

  const areaId = await upsertArea(db, area);
  const slug = aspirationSlug(title.text);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newAspirationCode();
    try {
      const created = await db.aspiration.create({
        data: {
          code,
          slug,
          areaId,
          category,
          title: title.text.replace(/\s+/g, " "),
          body: body.text,
          locationNote,
          photos: photoKeys.length ? (photoKeys.map((key) => ({ key })) as Prisma.InputJsonValue) : Prisma.JsonNull,
          reporterName: name,
          reporterPhone: phone,
          reporterEmail: emailRaw || null,
          ipHash: ctx.ipHash,
        },
        select: { id: true, code: true },
      });
      return ok({ code: created.code, id: String(created.id) });
    } catch (e) {
      if (!isP2002(e)) throw e;
    }
  }
  return fail(500, "Gagal membuat nomor laporan. Coba lagi.");
}

/** Cari atau buat area. Nama yang sama (slug sama) memakai area yang sama, walau diisi manual. */
export async function upsertArea(db: Db, a: { wilayahCode: string | null; kind: "desa" | "kelurahan"; name: string; district: string; regency: string; province: string }): Promise<number> {
  if (a.wilayahCode) {
    const byCode = await db.aspirationArea.findUnique({ where: { wilayahCode: a.wilayahCode }, select: { id: true } });
    if (byCode) return byCode.id;
  }
  const base = areaSlug(a);
  const bySlug = await db.aspirationArea.findUnique({ where: { slug: base }, select: { id: true, wilayahCode: true } });
  if (bySlug && (!bySlug.wilayahCode || !a.wilayahCode || bySlug.wilayahCode === a.wilayahCode)) {
    if (!bySlug.wilayahCode && a.wilayahCode) {
      await db.aspirationArea.update({ where: { id: bySlug.id }, data: { wilayahCode: a.wilayahCode, kind: a.kind } }).catch(() => undefined);
    }
    return bySlug.id;
  }
  // Slug dipakai desa lain berkode beda: bedakan dengan kodenya.
  const slug = bySlug && a.wilayahCode ? `${base}-${a.wilayahCode.replace(/\./g, "")}` : base;
  try {
    const created = await db.aspirationArea.create({
      data: { slug, wilayahCode: a.wilayahCode, kind: a.kind, name: a.name, district: a.district, regency: a.regency, province: a.province },
      select: { id: true },
    });
    return created.id;
  } catch (e) {
    if (!isP2002(e)) throw e;
    const again = (a.wilayahCode && (await db.aspirationArea.findUnique({ where: { wilayahCode: a.wilayahCode }, select: { id: true } }))) || (await db.aspirationArea.findUnique({ where: { slug }, select: { id: true } }));
    if (!again) throw e;
    return again.id;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Cek status oleh pelapor (kode + kontak yang sama)
// ---------------------------------------------------------------------------------------------------------------------
export type ReporterStatus = {
  code: string;
  status: string;
  rejectReason: string | null;
  progress: AspirationProgress;
  createdAt: Date;
  publishedAt: Date | null;
  path: string | null;
};

export async function reporterStatus(db: Db, code: string, contact: string): Promise<Result<ReporterStatus>> {
  const c = tidyText(contact).toLowerCase();
  const phone = normalizeWaNumber(c);
  const row = await db.aspiration.findUnique({
    where: { code },
    select: { code: true, slug: true, status: true, rejectReason: true, progress: true, createdAt: true, publishedAt: true, reporterPhone: true, reporterEmail: true },
  });
  const matches = !!row && ((phone != null && row.reporterPhone === phone) || (c.includes("@") && row.reporterEmail === c));
  // Satu pesan untuk "tidak ada" dan "kontak salah" agar kode tidak bisa ditebak.
  if (!row || !matches) return fail(404, "Laporan tidak ditemukan atau kontak tidak cocok.");
  return ok({
    code: row.code,
    status: row.status,
    rejectReason: row.status === "REJECTED" ? row.rejectReason : null,
    progress: row.progress as AspirationProgress,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
    path: row.status === "PUBLISHED" ? `/aspirasi/laporan/${row.slug}-${row.code}` : null,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Tanggapan desa
// ---------------------------------------------------------------------------------------------------------------------
const PROGRESS_RANK: Record<AspirationProgress, number> = { NEW: 0, RESPONDED: 1, DISPUTED: 1, IN_PROGRESS: 2, RESOLVED: 3 };
export const MAX_REPLIES_PER_ASPIRATION = 30;

/** Status tindak lanjut setelah sebuah tanggapan: tanggapan biasa tidak menurunkan status yang sudah lebih maju. */
export function nextProgress(current: AspirationProgress, kind: ReplyKind): AspirationProgress {
  const target = REPLY_KIND_PROGRESS[kind];
  if (kind === "RESPONSE" && PROGRESS_RANK[current] > PROGRESS_RANK[target]) return current;
  return target;
}

export type ReplyActor = { villageId: number; userId: number | null; authorLabel: string };

export async function createReply(db: PrismaClient, code: string, actor: ReplyActor, raw: unknown): Promise<Result<{ id: string; progress: AspirationProgress }>> {
  if (!isRecord(raw)) return fail(400, "Data tidak valid.");
  const kind = String(raw.kind ?? "");
  if (!(REPLY_KINDS as readonly string[]).includes(kind)) return invalid({ errors: ["Pilih jenis tanggapan."], fieldErrors: { kind: "Pilih jenis tanggapan." } });
  const body = tidyText(raw.body);
  if (body.length < LIMITS.replyMin) return invalid({ errors: [`Tanggapan terlalu pendek (minimal ${LIMITS.replyMin} karakter).`], fieldErrors: { body: `Minimal ${LIMITS.replyMin} karakter.` } });
  if (body.length > LIMITS.replyMax) return invalid({ errors: [`Tanggapan terlalu panjang (maksimal ${LIMITS.replyMax} karakter).`], fieldErrors: { body: `Maksimal ${LIMITS.replyMax} karakter.` } });

  return db.$transaction(async (tx) => {
    const a = await tx.aspiration.findUnique({ where: { code }, select: { id: true, status: true, progress: true, area: { select: { villageId: true } } } });
    if (!a || a.status !== "PUBLISHED") return fail(404, "Laporan tidak ditemukan.");
    if (a.area.villageId !== actor.villageId) return fail(403, "Desa Anda belum mengelola halaman aspirasi wilayah ini.");
    const count = await tx.aspirationReply.count({ where: { aspirationId: a.id, status: "PUBLISHED" } });
    if (count >= MAX_REPLIES_PER_ASPIRATION) return fail(409, "Jumlah tanggapan untuk laporan ini sudah mencapai batas.");
    const reply = await tx.aspirationReply.create({
      data: { aspirationId: a.id, villageId: actor.villageId, authorUserId: actor.userId, authorLabel: actor.authorLabel.slice(0, 160), kind, body },
      select: { id: true },
    });
    const progress = nextProgress(a.progress as AspirationProgress, kind as ReplyKind);
    await tx.aspiration.update({ where: { id: a.id }, data: { progress, progressAt: new Date() } });
    return ok({ id: String(reply.id), progress });
  });
}

/** Desa menghapus tanggapannya sendiri; status tindak lanjut dihitung ulang dari tanggapan yang tersisa. */
export async function removeReply(db: PrismaClient, replyId: bigint, villageId: number): Promise<Result<{ progress: AspirationProgress }>> {
  return db.$transaction(async (tx) => {
    const r = await tx.aspirationReply.findUnique({ where: { id: replyId }, select: { id: true, villageId: true, status: true, aspirationId: true } });
    if (!r || r.villageId !== villageId || r.status !== "PUBLISHED") return fail(404, "Tanggapan tidak ditemukan.");
    await tx.aspirationReply.update({ where: { id: r.id }, data: { status: "REMOVED" } });
    const remaining = await tx.aspirationReply.findMany({ where: { aspirationId: r.aspirationId, status: "PUBLISHED" }, orderBy: { createdAt: "asc" }, select: { kind: true } });
    let progress: AspirationProgress = "NEW";
    for (const x of remaining) progress = nextProgress(progress, x.kind as ReplyKind);
    await tx.aspiration.update({ where: { id: r.aspirationId }, data: { progress, progressAt: remaining.length ? new Date() : null } });
    return ok({ progress });
  });
}

export type VillageAspirationRow = {
  code: string;
  slug: string;
  category: string;
  title: string;
  body: string;
  locationNote: string | null;
  photoKeys: string[];
  progress: AspirationProgress;
  publishedAt: Date | null;
  openFlags: number;
  replies: Array<{ id: string; kind: ReplyKind; body: string; authorLabel: string; createdAt: Date; mine: boolean }>;
};

/** Daftar laporan wilayah yang dikelola desa ini (hanya yang tayang). Tanpa data pribadi pelapor. */
export async function listForVillage(db: Db, villageId: number, opts: { progress?: string; page?: number; pageSize?: number } = {}) {
  const area = await db.aspirationArea.findUnique({ where: { villageId }, select: { id: true, slug: true, name: true, district: true, regency: true, province: true, claimedAt: true } });
  if (!area) return { area: null, items: [] as VillageAspirationRow[], total: 0, counts: {} as Record<string, number> };
  const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
  const page = Math.min(Math.max(opts.page ?? 1, 1), 1000);
  const where: Prisma.AspirationWhereInput = { areaId: area.id, status: "PUBLISHED" };
  if (opts.progress && (["NEW", "RESPONDED", "IN_PROGRESS", "RESOLVED", "DISPUTED"] as string[]).includes(opts.progress)) where.progress = opts.progress;
  const [rows, total, grouped] = await Promise.all([
    db.aspiration.findMany({ where, orderBy: [{ publishedAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, select: PUBLIC_SELECT }),
    db.aspiration.count({ where }),
    db.aspiration.groupBy({ by: ["progress"], where: { areaId: area.id, status: "PUBLISHED" }, _count: { _all: true } }),
  ]);
  const replyVillage = rows.length
    ? await db.aspirationReply.findMany({ where: { aspirationId: { in: rows.map((r) => r.id) }, villageId }, select: { id: true } })
    : [];
  const mine = new Set(replyVillage.map((r) => String(r.id)));
  const items: VillageAspirationRow[] = rows.map((r) => {
    const p = toPublic(r);
    return {
      code: p.code,
      slug: p.slug,
      category: p.category,
      title: p.title,
      body: p.body,
      locationNote: p.locationNote,
      photoKeys: p.photoKeys,
      progress: p.progress,
      publishedAt: p.publishedAt,
      openFlags: p.openFlags,
      replies: p.replies.map((x) => ({ ...x, mine: mine.has(x.id) })),
    };
  });
  return { area, items, total, counts: Object.fromEntries(grouped.map((g) => [g.progress, g._count._all])) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Laporan konten (publik atau desa)
// ---------------------------------------------------------------------------------------------------------------------
export type FlagCtx = { source: "PUBLIC" | "VILLAGE"; villageId?: number | null; ipHash?: string | null };
/** Berapa laporan PERSONAL_DATA dari publik yang membuat laporan disembunyikan otomatis. Dari desa terklaim: cukup satu. */
export const AUTO_HIDE_PUBLIC_FLAGS = 3;

export async function createFlag(db: PrismaClient, code: string, ctx: FlagCtx, raw: unknown): Promise<Result<{ hidden: boolean }>> {
  if (!isRecord(raw)) return fail(400, "Data tidak valid.");
  const reason = String(raw.reason ?? "");
  if (!isFlagReason(reason)) return invalid({ errors: ["Pilih alasan laporan."], fieldErrors: { reason: "Pilih alasan laporan." } });
  const detail = tidyText(raw.detail).slice(0, LIMITS.flagDetailMax) || null;
  if (ctx.source === "VILLAGE" && (detail?.length ?? 0) < 20) return invalid({ errors: ["Jelaskan keberatan Anda (minimal 20 karakter) agar dapat ditinjau."], fieldErrors: { detail: "Minimal 20 karakter." } });
  if (reason === "OTHER" && (detail?.length ?? 0) < 10) return invalid({ errors: ["Jelaskan alasannya (minimal 10 karakter)."], fieldErrors: { detail: "Jelaskan alasannya (minimal 10 karakter)." } });
  const contactRaw = tidyText(raw.contact).slice(0, 255);
  const contact = contactRaw || null;

  return db.$transaction(async (tx) => {
    const a = await tx.aspiration.findUnique({ where: { code }, select: { id: true, status: true, area: { select: { villageId: true } } } });
    if (!a || a.status !== "PUBLISHED") return fail(404, "Laporan tidak ditemukan.");
    if (ctx.source === "VILLAGE" && (ctx.villageId == null || a.area.villageId !== ctx.villageId)) return fail(403, "Hanya desa yang mengelola halaman ini yang dapat mengajukan keberatan.");

    // Pelapor yang sama tidak menumpuk laporan terbuka untuk alasan yang sama.
    if (ctx.ipHash) {
      const dup = await tx.aspirationFlag.findFirst({ where: { aspirationId: a.id, ipHash: ctx.ipHash, reason, status: "OPEN" }, select: { id: true } });
      if (dup) return ok({ hidden: false });
    }
    await tx.aspirationFlag.create({
      data: { aspirationId: a.id, reason: reason as FlagReason, detail, source: ctx.source, contact, villageId: ctx.villageId ?? null, ipHash: ctx.ipHash ?? null },
    });

    let hidden = false;
    if (reason === "PERSONAL_DATA") {
      const distinct = await tx.aspirationFlag.findMany({ where: { aspirationId: a.id, reason: "PERSONAL_DATA", status: "OPEN" }, select: { source: true, ipHash: true, id: true } });
      const publicFlaggers = new Set(distinct.filter((f) => f.source === "PUBLIC").map((f) => f.ipHash ?? `id:${f.id}`));
      if (ctx.source === "VILLAGE" || publicFlaggers.size >= AUTO_HIDE_PUBLIC_FLAGS) {
        await tx.aspiration.update({
          where: { id: a.id },
          data: { status: "HIDDEN", moderationNote: "Disembunyikan otomatis: dilaporkan memuat data pribadi. Tinjau lalu tayangkan kembali atau hapus." },
        });
        hidden = true;
      }
    }
    return ok({ hidden });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Klaim desa
// ---------------------------------------------------------------------------------------------------------------------
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(desa|kelurahan|kampung|nagari|kabupaten|kab|kota|kecamatan|kec)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Petunjuk kecocokan untuk admin: 0-3 (nama desa, kecamatan, kabupaten cocok). Bukan pengganti pemeriksaan bukti. */
export function claimMatchScore(area: { name: string; district: string; regency: string }, village: { name: string; district: string; regency: string }): number {
  const eq = (a: string, b: string) => {
    const x = norm(a);
    const y = norm(b);
    return x.length > 0 && y.length > 0 && (x === y || x.includes(y) || y.includes(x));
  };
  return Number(eq(area.name, village.name)) + Number(eq(area.district, village.district)) + Number(eq(area.regency, village.regency));
}

export type ClaimActor = { villageId: number; userId: number };

export async function submitClaim(db: PrismaClient, areaSlugValue: string, actor: ClaimActor, raw: unknown): Promise<Result<{ id: number }>> {
  if (!isRecord(raw)) return fail(400, "Data tidak valid.");
  const fieldErrors: Record<string, string> = {};
  const position = tidyText(raw.position).replace(/\s+/g, " ").slice(0, 120);
  if (position.length < 2) fieldErrors.position = "Isi jabatan Anda di desa.";
  const evidence = tidyText(raw.evidenceNote);
  if (evidence.length < LIMITS.claimEvidenceMin) fieldErrors.evidenceNote = `Jelaskan bukti Anda (minimal ${LIMITS.claimEvidenceMin} karakter), mis. tautan situs resmi desa atau nomor SK pengangkatan.`;
  if (evidence.length > LIMITS.claimEvidenceMax) fieldErrors.evidenceNote = `Maksimal ${LIMITS.claimEvidenceMax} karakter.`;
  const phoneRaw = tidyText(raw.contactPhone);
  const phone = phoneRaw ? normalizeWaNumber(phoneRaw) : null;
  if (phoneRaw && !phone) fieldErrors.contactPhone = "Nomor telepon tidak valid.";
  if (Object.keys(fieldErrors).length) return invalid({ errors: Object.values(fieldErrors), fieldErrors });

  return db.$transaction(async (tx) => {
    const area = await tx.aspirationArea.findUnique({ where: { slug: areaSlugValue }, select: { id: true, villageId: true } });
    if (!area) return fail(404, "Halaman desa tidak ditemukan.");
    if (area.villageId != null) return fail(409, area.villageId === actor.villageId ? "Desa Anda sudah mengelola halaman ini." : "Halaman ini sudah dikelola desa lain. Hubungi tim Klandesa bila ini keliru.");
    const owned = await tx.aspirationArea.findUnique({ where: { villageId: actor.villageId }, select: { id: true } });
    if (owned) return fail(409, "Desa Anda sudah mengelola halaman aspirasi wilayah lain.");
    const pending = await tx.villageClaim.findFirst({ where: { villageId: actor.villageId, status: "PENDING" }, select: { id: true } });
    if (pending) return fail(409, "Permohonan klaim Anda sebelumnya masih menunggu verifikasi.");
    const claim = await tx.villageClaim.create({
      data: { areaId: area.id, villageId: actor.villageId, userId: actor.userId, position, contactPhone: phone, evidenceNote: evidence },
      select: { id: true },
    });
    return ok({ id: claim.id });
  });
}

/** Status klaim terbaru milik sebuah desa (untuk dasbor): wilayah terkelola, atau permohonan yang sedang berjalan. */
export async function villageClaimState(db: Db, villageId: number) {
  const [area, claim] = await Promise.all([
    db.aspirationArea.findUnique({ where: { villageId }, select: { slug: true, name: true, district: true, regency: true, province: true, claimedAt: true } }),
    db.villageClaim.findFirst({ where: { villageId }, orderBy: { id: "desc" }, select: { id: true, status: true, reviewNote: true, createdAt: true, area: { select: { slug: true, name: true, district: true, regency: true } } } }),
  ]);
  return { area, claim };
}
