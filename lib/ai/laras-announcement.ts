import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { cleanOutbound, sanitizeForPrompt } from "@/lib/ai/laras-guard";
import {
  ACTION_TTL_SEC,
  ANNOUNCEMENT_ACTION_CATEGORIES,
  signAction,
  type ActionCard,
  type AnnouncementPublishPayload,
} from "@/lib/ai/laras-actions";
import { MAX_ANNOUNCEMENTS_PER_USER_PER_DAY } from "@/lib/mobile/resident-logic";

/**
 * Menyusun dan menerbitkan pengumuman desa lewat Laras (usulan → konfirmasi).
 * Model tidak punya cara menyimpan draf: tabel pengumuman tidak mengenal status draf, jadi konfirmasi = TERBIT (tayang di
 * website desa dan aplikasi warga). Karena itu kartu menampilkan isi lengkap, dan notifikasi massal ke seluruh warga sengaja
 * TIDAK disertakan (dampaknya jauh lebih besar; tetap lewat menu Pengumuman).
 */

export const TITLE_MIN = 3;
export const TITLE_MAX = 200;
export const CONTENT_MIN = 3;
export const CONTENT_MAX = 4000;
export const RECENT_LIMIT = 10;
const DUPLICATE_WINDOW_DAYS = 30;
const IDEMPOTENCY_WINDOW_MS = ACTION_TTL_SEC * 1000;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_ACTION_CATEGORIES)[number];

export type AnnouncementCheck =
  | { ok: true; title: string; content: string; category: AnnouncementCategory; pinned: boolean; redacted: number; warnings: string[] }
  | { ok: false; error: string };

/** Aturan usulan (murni), selaras dengan jalur staf mobile: judul 3–200, isi 3–4000, kategori baku. NIK/telepon disamarkan. */
export function validateAnnouncementProposal(args: {
  title: string;
  content: string;
  category: string;
  pinned?: boolean;
}): AnnouncementCheck {
  const t = cleanOutbound(args.title ?? "");
  const c = cleanOutbound(args.content ?? "");
  const title = t.text.replace(/\s+/g, " ").trim();
  const content = c.text.replace(/\r\n/g, "\n").trim();

  if (!(ANNOUNCEMENT_ACTION_CATEGORIES as readonly string[]).includes(args.category)) {
    return { ok: false, error: `Kategori harus salah satu dari: ${ANNOUNCEMENT_ACTION_CATEGORIES.join(", ")}.` };
  }
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return { ok: false, error: `Judul harus ${TITLE_MIN}–${TITLE_MAX} karakter.` };
  }
  if (content.length < CONTENT_MIN || content.length > CONTENT_MAX) {
    return { ok: false, error: `Isi pengumuman harus ${CONTENT_MIN}–${CONTENT_MAX} karakter.` };
  }
  return {
    ok: true,
    title,
    content,
    category: args.category as AnnouncementCategory,
    pinned: args.pinned === true,
    redacted: t.redacted + c.redacted,
    warnings: Array.from(new Set([...t.warnings, ...c.warnings])),
  };
}

export function announcementWarnings(opts: { outbound: string[]; duplicateTitle: boolean }): string[] {
  const out = [...opts.outbound];
  if (opts.duplicateTitle) {
    out.push(`Judul yang sama sudah terbit dalam ${DUPLICATE_WINDOW_DAYS} hari terakhir.`);
  }
  return out;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

async function quotaLeft(villageId: number, userId: number): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const used = await prisma.announcement.count({ where: { villageId, createdById: userId, createdAt: { gte: since } } });
  return Math.max(0, MAX_ANNOUNCEMENTS_PER_USER_PER_DAY - used);
}

/** Untuk model: pengumuman terbaru (agar tidak dobel dan gaya bahasanya selaras) + sisa kuota terbit pengguna hari ini. */
export async function listRecentAnnouncementsForAi(villageId: number, userId: number) {
  const [rows, left] = await Promise.all([
    prisma.announcement.findMany({
      where: { villageId },
      orderBy: { publishDate: "desc" },
      take: RECENT_LIMIT,
      select: { id: true, title: true, category: true, isPinned: true, isActive: true, publishDate: true, content: true },
    }),
    quotaLeft(villageId, userId),
  ]);
  const now = Date.now();
  return {
    sisa_kuota_terbit_hari_ini: left,
    kategori_yang_valid: [...ANNOUNCEMENT_ACTION_CATEGORIES],
    pengumuman_terbaru: rows.map((a) => ({
      judul: sanitizeForPrompt(a.title, 120),
      kategori: a.category,
      disematkan: a.isPinned,
      aktif: a.isActive,
      umur_hari: Math.floor((now - a.publishDate.getTime()) / 86_400_000),
      cuplikan: sanitizeForPrompt(a.content, 160),
    })),
    catatan:
      "Pengumuman yang Anda usulkan akan LANGSUNG tayang untuk publik (website desa dan aplikasi warga) begitu dikonfirmasi; " +
      "tidak ada status draf. Hanya tulis fakta yang diberikan pengguna atau ada di data; jangan mengarang tanggal, tempat, nominal, atau nama.",
  };
}

export type ProposeAnnouncementResult =
  | { ok: true; card: ActionCard; forModel: Record<string, unknown> }
  | { ok: false; error: string };

export async function proposeAnnouncement(
  ctx: { villageId: number; userId: number },
  args: { title: string; content: string; category: string; pinned?: boolean },
  now = new Date(),
): Promise<ProposeAnnouncementResult> {
  const check = validateAnnouncementProposal(args);
  if (!check.ok) return check;

  if ((await quotaLeft(ctx.villageId, ctx.userId)) <= 0) {
    return { ok: false, error: "Kuota terbit pengumuman pengguna ini hari ini sudah habis. Coba lagi besok." };
  }

  const since = new Date(now.getTime() - DUPLICATE_WINDOW_DAYS * 86_400_000);
  const recentTitles = await prisma.announcement.findMany({
    where: { villageId: ctx.villageId, createdAt: { gte: since } },
    select: { title: true },
    take: 200,
  });
  const duplicateTitle = recentTitles.some((r) => norm(r.title) === norm(check.title));

  const exp = Math.floor(now.getTime() / 1000) + ACTION_TTL_SEC;
  const payload: AnnouncementPublishPayload = {
    v: 1,
    t: "announcement_publish",
    u: ctx.userId,
    vi: ctx.villageId,
    ti: check.title,
    co: check.content,
    ca: check.category,
    pn: check.pinned,
    e: exp,
  };
  const hash = createHash("sha1").update(`${check.title}\n${check.content}`).digest("hex").slice(0, 10);
  const card: ActionCard = {
    key: `announcement_publish:${hash}`,
    type: "announcement_publish",
    token: signAction(payload),
    badge: "Usulan: terbitkan pengumuman",
    icon: "message",
    tone: "default",
    confirmLabel: "Terbitkan sekarang",
    doneText: "Pengumuman terbit di website desa dan aplikasi warga.",
    heading: check.title,
    subheading: `${check.category}${check.pinned ? " · Disematkan di atas" : ""} · Langsung tayang untuk publik setelah dikonfirmasi`,
    noteLabel: "Isi pengumuman: ",
    note: check.content,
    warnings: announcementWarnings({ outbound: check.warnings, duplicateTitle }),
    evidenceLabel: "",
    evidence: "",
    batchable: false,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
  return {
    ok: true,
    card,
    forModel: {
      status: "usulan_disiapkan",
      belum_dijalankan: true,
      judul: check.title,
      instruksi:
        "Usulan tampil sebagai kartu berisi isi lengkap. JANGAN katakan sudah terbit; katakan menunggu konfirmasi perangkat desa, dan bahwa setelah dikonfirmasi pengumuman langsung tayang untuk publik.",
    },
  };
}

export type AnnouncementExecuteResult =
  | { ok: true; summary: string }
  | { ok: false; status: 400 | 409; error: string };

/** Terbitkan pengumuman yang sudah dikonfirmasi. Idempoten: konfirmasi ganda tidak membuat pengumuman ganda. */
export async function executeAnnouncementPublish(
  payload: AnnouncementPublishPayload,
  actor: { userId: number; ip: string | null; userAgent: string | null },
): Promise<AnnouncementExecuteResult> {
  const check = validateAnnouncementProposal({ title: payload.ti, content: payload.co, category: payload.ca, pinned: payload.pn });
  if (!check.ok) return { ok: false, status: 400, error: check.error };

  // Idempoten: judul+isi yang sama dari pengguna yang sama dalam masa berlaku usulan dianggap sudah terbit.
  const dup = await prisma.announcement.findFirst({
    where: {
      villageId: payload.vi,
      createdById: actor.userId,
      title: check.title,
      content: check.content,
      createdAt: { gte: new Date(Date.now() - IDEMPOTENCY_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (dup) return { ok: true, summary: `Pengumuman #${dup.id} sudah terbit sebelumnya.` };

  if ((await quotaLeft(payload.vi, actor.userId)) <= 0) {
    return { ok: false, status: 409, error: "Batas pengumuman hari ini tercapai. Coba lagi besok." };
  }

  const created = await prisma.announcement.create({
    data: {
      villageId: payload.vi,
      title: check.title,
      content: check.content,
      category: check.category,
      isPinned: check.pinned,
      createdById: actor.userId,
    },
    select: { id: true },
  });

  try {
    await prisma.auditLog.create({
      data: {
        villageId: payload.vi,
        userId: actor.userId,
        action: "create",
        entity: "announcements",
        entityId: String(created.id),
        // Hanya judul & metadata; isi pengumuman tidak dicatat.
        metadata: { via: "laras", title: check.title, category: check.category, pinned: check.pinned } as never,
        ipAddress: actor.ip?.slice(0, 50) ?? null,
        userAgent: actor.userAgent?.slice(0, 500) ?? null,
      },
    });
  } catch (e) {
    console.error("audit laras announcement failed", e);
  }
  return { ok: true, summary: `Pengumuman #${created.id} terbit.` };
}
