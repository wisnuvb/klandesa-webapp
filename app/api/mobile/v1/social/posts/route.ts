import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireSocial } from "@/lib/mobile/social";
import { notifyVillageStaff } from "@/lib/mobile/notify";
import { isOwnReportPhotoUrl } from "@/lib/mobile/report-logic";
import {
  EMBED_LABEL, MAX_POST_PHOTOS, checkPostContent, cleanText, dailyPostLimit, initialPostStatus, isPostCategory, parseEmbedLink, splitEmbed,
  type EmbedLink,
} from "@/lib/mobile/social-logic";
import { getSpacesConfig } from "@/lib/spaces";

/** oEmbed memakai host tetap; URL dari pengguna hanya menjadi parameter query terenkode (tidak pernah di-fetch langsung). */
async function oembed(endpoint: string, url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${endpoint}${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(4000), redirect: "error" });
    return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Judul tampilan best-effort. Facebook tidak punya oEmbed publik (butuh token), jadi tanpa judul. */
async function fetchEmbedTitle(link: EmbedLink): Promise<string | null> {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null);
  if (link.provider === "youtube") return str((await oembed("https://www.youtube.com/oembed?format=json&url=", link.url))?.title);
  if (link.provider === "tiktok") {
    const j = await oembed("https://www.tiktok.com/oembed?url=", link.url);
    return str(j?.title) ?? (str(j?.author_name) ? `Video TikTok oleh ${str(j?.author_name)}` : null);
  }
  if (link.provider === "x") {
    const author = str((await oembed("https://publish.twitter.com/oembed?omit_script=1&url=", link.url))?.author_name);
    return author ? `Postingan di X oleh ${author}` : null;
  }
  return null;
}

/** Kolom tautan untuk SocialPost. YouTube tetap mengisi kolom lama agar kompatibel dengan data dan aplikasi lama. */
async function embedColumns(link: EmbedLink) {
  const title = await fetchEmbedTitle(link);
  return {
    linkProvider: link.provider, linkUrl: link.url, linkTitle: title,
    ...(link.provider === "youtube" ? { youtubeId: link.id ?? null, youtubeTitle: title } : {}),
  };
}

export async function POST(req: NextRequest) {
  const g = await requireSocial(req, { write: true });
  if (!g.ok) return g.response;
  const { s } = g;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const category = body?.category;
  if (!isPostCategory(category)) return mobileError("INVALID_REQUEST", "Pilih jenis postingan.", 400);

  const rawText = cleanText(body?.content);
  // Tautan sematan bisa di kolom `linkUrl` (atau `youtubeUrl` dari aplikasi lama) atau ditempel di dalam teks; hanya satu.
  const split = splitEmbed(rawText);
  const rawLink = body?.linkUrl ?? body?.youtubeUrl;
  const explicit = rawLink ? parseEmbedLink(rawLink) : null;
  if (rawLink && !explicit) {
    return mobileError("INVALID_REQUEST", `Tautan harus berupa tautan ${Object.values(EMBED_LABEL).join(", ")} yang lengkap.`, 400, { field: "linkUrl" });
  }
  const link = explicit ?? split.link;
  const text = split.text;

  const photos = Array.isArray(body?.photos) ? (body.photos as unknown[]) : [];
  const cdn = getSpacesConfig().cdnBaseUrl;
  if (photos.length > MAX_POST_PHOTOS || !photos.every((u) => isOwnReportPhotoUrl(u, cdn, s.ctx.village.code, "mobile-social"))) {
    return mobileError("INVALID_REQUEST", `Foto tidak valid. Maksimal ${MAX_POST_PHOTOS} foto.`, 400);
  }
  if (photos.length > 0 && link) return mobileError("INVALID_REQUEST", "Pilih foto atau tautan video, tidak keduanya.", 400);

  const check = checkPostContent(text, { hasMedia: photos.length > 0, hasVideo: !!link, customBanned: s.bannedWords });
  if (!check.ok) return mobileError("INVALID_REQUEST", check.message, 400, { field: "content" });

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const today = await prisma.socialPost.count({ where: { authorType: s.me.type, authorId: s.account.id, createdAt: { gte: since } } });
  const limit = dailyPostLimit(s.account.createdAt);
  if (today >= limit) {
    return mobileError("RATE_LIMITED", `Batas ${limit} postingan per hari tercapai${limit < 10 ? " (akun baru dibatasi dulu)" : ""}. Coba lagi besok.`, 429);
  }

  // Perangkat desa tepercaya: postingannya langsung tayang, tanpa antre pra-moderasi.
  const status = s.me.type === "staff" ? "PUBLISHED" : initialPostStatus(s.mode);
  const created = await prisma.socialPost.create({
    data: {
      villageId: s.ctx.villageId, authorType: s.me.type, authorId: s.account.id, authorName: s.account.name, authorRt: s.account.rt,
      content: text, category, status,
      ...(link ? await embedColumns(link) : {}),
      media: { create: (photos as string[]).map((url, i) => ({ url, sortOrder: i })) },
    },
  });
  if (status === "PENDING") {
    void notifyVillageStaff(s.ctx.villageId, "forum", { type: "system", title: "Postingan warga menunggu persetujuan", body: s.account.name, deepLink: "/staff/moderasi" });
  }
  return NextResponse.json({ id: Number(created.id), status }, { status: 201 });
}
