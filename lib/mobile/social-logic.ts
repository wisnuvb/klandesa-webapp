/** Logika murni sosial desa (tanpa DB). Lihat docs/MOBILE_V2_PRODUCT_SPEC.md §14. */

export const POST_CATEGORIES = ["kegiatan", "usaha", "info", "lainnya"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];
export const isPostCategory = (v: unknown): v is PostCategory => (POST_CATEGORIES as readonly string[]).includes(v as string);

export const REPORT_REASONS = ["hoaks", "sara", "kasar", "penipuan", "pribadi", "lainnya"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const isReportReason = (v: unknown): v is ReportReason => (REPORT_REASONS as readonly string[]).includes(v as string);

export type SocialMode = "off" | "post" | "pre";

/** Village.settings.mobile.social.mode — default "off": desa harus mengaktifkan dan memilih mode moderasi. */
export function readSocialMode(settings: unknown): SocialMode {
  const root = settings && typeof settings === "object" && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  const mobile = root.mobile && typeof root.mobile === "object" ? (root.mobile as Record<string, unknown>) : {};
  const social = mobile.social && typeof mobile.social === "object" ? (mobile.social as Record<string, unknown>) : {};
  return social.mode === "post" || social.mode === "pre" ? social.mode : "off";
}

export function readCustomBannedWords(settings: unknown): string[] {
  const root = settings && typeof settings === "object" && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  const mobile = root.mobile && typeof root.mobile === "object" ? (root.mobile as Record<string, unknown>) : {};
  const social = mobile.social && typeof mobile.social === "object" ? (mobile.social as Record<string, unknown>) : {};
  return Array.isArray(social.bannedWords) ? social.bannedWords.filter((w): w is string => typeof w === "string").map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 3).slice(0, 200) : [];
}

export const MAX_POST_CHARS = 1000;
export const MAX_COMMENT_CHARS = 500;
export const MAX_POST_PHOTOS = 4;
export const EDIT_WINDOW_MS = 15 * 60_000;
export const HIDE_REPORT_THRESHOLD = 3;
export const NEW_ACCOUNT_DAYS = 7;
export const NEW_ACCOUNT_POSTS_PER_DAY = 3;
export const POSTS_PER_DAY = 10;
export const COMMENTS_PER_HOUR = 30;
export const FEED_PAGE_SIZE = 15;
/// Jumlah suka yang memicu notifikasi ke penulis (hindari membanjiri notifikasi tiap suka).
export const LIKE_MILESTONES = new Set([1, 5, 10, 25, 50, 100]);

export function dailyPostLimit(accountCreatedAt: Date, now = new Date()): number {
  const ageDays = (now.getTime() - accountCreatedAt.getTime()) / 86_400_000;
  return ageDays < NEW_ACCOUNT_DAYS ? NEW_ACCOUNT_POSTS_PER_DAY : POSTS_PER_DAY;
}

export const canEditPost = (createdAt: Date, now = Date.now()) => now - createdAt.getTime() <= EDIT_WINDOW_MS;

/** Rapikan teks: buang karakter kontrol, maksimal dua baris kosong beruntun, trim. */
export function cleanText(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"]);
const YT_ID = /^[\w-]{11}$/;

/** ID video dari URL YouTube (watch, youtu.be, shorts, embed, live). Selain YouTube → null. */
export function parseYouTubeId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol) || !YT_HOSTS.has(u.hostname.toLowerCase())) return null;
  let id: string | null = null;
  if (u.hostname.toLowerCase().endsWith("youtu.be")) id = u.pathname.split("/")[1] ?? null;
  else if (u.pathname === "/watch") id = u.searchParams.get("v");
  else {
    const m = /^\/(shorts|embed|live|v)\/([\w-]{11})/.exec(u.pathname);
    id = m ? m[2]! : null;
  }
  return id && YT_ID.test(id) ? id : null;
}

const URL_RE = /\bhttps?:\/\/[^\s]+/gi;

export type EmbedProvider = "youtube" | "tiktok" | "facebook" | "x";
export type EmbedLink = { provider: EmbedProvider; /** URL kanonik (tanpa pelacak) */ url: string; /** ID video YouTube */ id?: string };

const TIKTOK_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]);
// l.facebook.com / lm.facebook.com sengaja tidak termasuk: itu pengalih tautan keluar.
const FACEBOOK_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.watch"]);
const X_HOSTS = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"]);

/**
 * Tautan yang boleh disematkan di postingan: YouTube, TikTok, Facebook, atau X. Hostname harus persis ada di daftar
 * (bukan sekadar mengandung nama), memakai https, tanpa kredensial/port. Mengembalikan URL kanonik tanpa parameter pelacak.
 */
export function parseEmbedLink(raw: unknown): EmbedLink | null {
  if (typeof raw !== "string") return null;
  const yt = parseYouTubeId(raw);
  if (yt) return { provider: "youtube", url: youtubeWatchUrl(yt), id: yt };

  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  const host = u.hostname.toLowerCase();
  const path = u.pathname.replace(/\/+$/, "");

  if (TIKTOK_HOSTS.has(host)) {
    const short = host.startsWith("vm.") || host.startsWith("vt.");
    const ok = short ? /^\/[\w-]{5,20}$/.test(path) : /^\/@[\w.]{1,40}\/(video|photo)\/\d{6,25}$/.test(path) || /^\/t\/[\w-]{5,20}$/.test(path);
    return ok ? { provider: "tiktok", url: `https://${host}${path}` } : null;
  }
  if (FACEBOOK_HOSTS.has(host)) {
    if (host === "fb.watch") return /^\/[\w-]{4,20}$/.test(path) ? { provider: "facebook", url: `https://fb.watch${path}` } : null;
    if (path === "/watch") {
      const v = u.searchParams.get("v");
      return v && /^\d{5,25}$/.test(v) ? { provider: "facebook", url: `https://www.facebook.com/watch/?v=${v}` } : null;
    }
    const ok = /^\/(reel\/\d{5,25}|share\/[vrp]\/[\w-]{5,40}|[\w.-]{1,80}\/(videos|posts)\/[\w.-]{5,80})$/.test(path);
    return ok ? { provider: "facebook", url: `https://www.facebook.com${path}` } : null;
  }
  if (X_HOSTS.has(host)) {
    const m = /^\/(\w{1,15}|i)\/status\/(\d{5,25})$/.exec(path);
    return m ? { provider: "x", url: `https://x.com/${m[1]}/status/${m[2]}` } : null;
  }
  return null;
}

/** Pisahkan tautan sematan pertama yang valid dari teks; teks yang tersisa tidak boleh memuat tautan lain. */
export function splitEmbed(text: string): { text: string; link: EmbedLink | null } {
  let link: EmbedLink | null = null;
  const stripped = text.replace(URL_RE, (m) => {
    const found = parseEmbedLink(m.replace(/[),.;!?]+$/, ""));
    if (found && !link) {
      link = found;
      return "";
    }
    return m;
  });
  return { text: stripped.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(), link };
}

export const EMBED_LABEL: Record<EmbedProvider, string> = { youtube: "YouTube", tiktok: "TikTok", facebook: "Facebook", x: "X" };

const TLD = "com|net|org|id|co|xyz|info|me|link|site|top|online|shop|store|biz|cc|ly|gl";
const BARE_LINK_RE = new RegExp(`(https?:\\/\\/|www\\.|\\b(wa\\.me|t\\.me|bit\\.ly|tinyurl\\.com|s\\.id)\\b|\\b[a-z0-9-]{2,}\\.(${TLD})(\\/|\\b))`, "i");

/** Tautan selain YouTube tidak diizinkan (cegah spam, penipuan, phishing). */
export function containsDisallowedLink(text: string): boolean {
  return BARE_LINK_RE.test(text);
}

const DEFAULT_BANNED = ["judi online", "slot gacor", "togel", "situs slot", "pinjol", "pinjaman online", "jual akun", "bokep", "porno", "open bo", "obat kuat", "jasa hack"];

function normalizeForFilter(s: string): string {
  return s
    .toLowerCase()
    .replace(/[@]/g, "a").replace(/[$]/g, "s")
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kata/frasa terlarang pertama yang ditemukan (daftar bawaan + milik desa), atau null. */
export function findBannedWord(text: string, custom: string[] = []): string | null {
  const hay = ` ${normalizeForFilter(text)} `;
  for (const w of [...DEFAULT_BANNED, ...custom]) {
    const n = normalizeForFilter(w);
    if (n && hay.includes(` ${n} `)) return w;
  }
  return null;
}

export function extractHashtags(text: string, max = 5): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(^|\s)#([\p{L}\p{N}_]{2,30})/gu)) {
    out.add(m[2]!.toLowerCase());
    if (out.size >= max) break;
  }
  return [...out];
}

export type ContentCheck = { ok: true } | { ok: false; message: string };

export function checkPostContent(text: string, opts: { hasMedia: boolean; hasVideo: boolean; customBanned?: string[] }): ContentCheck {
  if (!text && !opts.hasMedia && !opts.hasVideo) return { ok: false, message: "Tulis sesuatu, tambah foto, atau tempel tautan video." };
  if (text.length > MAX_POST_CHARS) return { ok: false, message: `Maksimal ${MAX_POST_CHARS} huruf.` };
  if (containsDisallowedLink(text)) return { ok: false, message: "Hanya satu tautan YouTube, TikTok, Facebook, atau X yang diizinkan di Warga." };
  const banned = findBannedWord(text, opts.customBanned);
  if (banned) return { ok: false, message: "Postingan memuat kata/topik yang dilarang di komunitas desa. Periksa aturan komunitas." };
  return { ok: true };
}

export function checkCommentContent(text: string, customBanned: string[] = []): ContentCheck {
  if (text.length < 1) return { ok: false, message: "Tulis komentar dulu." };
  if (text.length > MAX_COMMENT_CHARS) return { ok: false, message: `Maksimal ${MAX_COMMENT_CHARS} huruf.` };
  if (containsDisallowedLink(text)) return { ok: false, message: "Tautan tidak diizinkan di komentar." };
  if (findBannedWord(text, customBanned)) return { ok: false, message: "Komentar memuat kata yang dilarang di komunitas desa." };
  return { ok: true };
}

export function initialPostStatus(mode: SocialMode): "PUBLISHED" | "PENDING" {
  return mode === "pre" ? "PENDING" : "PUBLISHED";
}

/** Cursor feed = id post terakhir (BigInt string). Tidak valid → null (halaman pertama). */
export function parseCursor(raw: unknown): bigint | null {
  return typeof raw === "string" && /^\d{1,18}$/.test(raw) ? BigInt(raw) : null;
}

export const FEED_FILTERS = ["all", "rt", "kegiatan", "usaha", "foto", "saved"] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];
export const isFeedFilter = (v: unknown): v is FeedFilter => (FEED_FILTERS as readonly string[]).includes(v as string);

export const COMMUNITY_RULES = [
  "Hormati sesama warga. Dilarang kata kasar, menghina, atau mengancam.",
  "Dilarang SARA, ujaran kebencian, dan politik praktis/kampanye.",
  "Jangan menyebar kabar yang belum jelas kebenarannya (hoaks) atau membuka data pribadi orang lain.",
  "Jangan memotret atau mengunggah foto anak tanpa izin orang tuanya.",
  "Dilarang menawarkan judi, pinjaman online, atau barang terlarang, serta penipuan.",
  "Konten yang melanggar akan disembunyikan perangkat desa, dan akun bisa dibisukan atau diblokir.",
] as const;

/** Nama tampilan ramah privasi: "Siti Aminah Putri" → "Siti A." */
export function displayName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Warga";
  const first = parts[0]!.charAt(0).toUpperCase() + parts[0]!.slice(1).toLowerCase();
  return parts.length > 1 ? `${first} ${parts[1]!.charAt(0).toUpperCase()}.` : first;
}

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
