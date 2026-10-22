import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireSocial } from "@/lib/mobile/social";
import { notifyVillageStaff } from "@/lib/mobile/notify";
import { isOwnReportPhotoUrl } from "@/lib/mobile/report-logic";
import {
  MAX_POST_PHOTOS, checkPostContent, cleanText, dailyPostLimit, initialPostStatus, isPostCategory, parseYouTubeId, splitYouTube,
} from "@/lib/mobile/social-logic";
import { getSpacesConfig } from "@/lib/spaces";

async function fetchYouTubeTitle(id: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: unknown };
    return typeof j.title === "string" ? j.title.slice(0, 200) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const g = await requireSocial(req, { write: true });
  if (!g.ok) return g.response;
  const { s } = g;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const category = body?.category;
  if (!isPostCategory(category)) return mobileError("INVALID_REQUEST", "Pilih jenis postingan.", 400);

  const rawText = cleanText(body?.content);
  // Tautan YouTube bisa di kolom `youtubeUrl` atau ditempel di dalam teks; hanya satu video.
  const split = splitYouTube(rawText);
  const explicitId = body?.youtubeUrl ? parseYouTubeId(body.youtubeUrl) : null;
  if (body?.youtubeUrl && !explicitId) return mobileError("INVALID_REQUEST", "Tautan video harus dari YouTube.", 400, { field: "youtubeUrl" });
  const youtubeId = explicitId ?? split.youtubeId;
  const text = split.text;

  const photos = Array.isArray(body?.photos) ? (body.photos as unknown[]) : [];
  const cdn = getSpacesConfig().cdnBaseUrl;
  if (photos.length > MAX_POST_PHOTOS || !photos.every((u) => isOwnReportPhotoUrl(u, cdn, s.ctx.village.code, "mobile-social"))) {
    return mobileError("INVALID_REQUEST", `Foto tidak valid. Maksimal ${MAX_POST_PHOTOS} foto.`, 400);
  }
  if (photos.length > 0 && youtubeId) return mobileError("INVALID_REQUEST", "Pilih foto atau video YouTube, tidak keduanya.", 400);

  const check = checkPostContent(text, { hasMedia: photos.length > 0, hasVideo: !!youtubeId, customBanned: s.bannedWords });
  if (!check.ok) return mobileError("INVALID_REQUEST", check.message, 400, { field: "content" });

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const today = await prisma.socialPost.count({ where: { authorType: "citizen", authorId: s.account.id, createdAt: { gte: since } } });
  const limit = dailyPostLimit(s.account.createdAt);
  if (today >= limit) {
    return mobileError("RATE_LIMITED", `Batas ${limit} postingan per hari tercapai${limit < 10 ? " (akun baru dibatasi dulu)" : ""}. Coba lagi besok.`, 429);
  }

  const status = initialPostStatus(s.mode);
  const created = await prisma.socialPost.create({
    data: {
      villageId: s.ctx.villageId, authorType: "citizen", authorId: s.account.id, authorName: s.account.name, authorRt: s.account.rt,
      content: text, category, status,
      youtubeId, youtubeTitle: youtubeId ? await fetchYouTubeTitle(youtubeId) : null,
      media: { create: (photos as string[]).map((url, i) => ({ url, sortOrder: i })) },
    },
  });
  if (status === "PENDING") {
    void notifyVillageStaff(s.ctx.villageId, "forum", { type: "system", title: "Postingan warga menunggu persetujuan", body: s.account.name, deepLink: "/staff/moderasi" });
  }
  return NextResponse.json({ id: Number(created.id), status }, { status: 201 });
}
