import { createHmac, timingSafeEqual } from "crypto";
import { getResolvedAuthSecret } from "@/lib/auth-secret";

/**
 * Usulan aksi Laras. Model hanya MENGUSULKAN; tidak ada yang berubah sampai pengguna menekan konfirmasi.
 * Usulan dibawa sebagai token bertanda tangan HMAC (tanpa tabel baru): klien tidak bisa memalsukan isi, memakainya untuk
 * pengguna/desa lain, atau memakainya setelah kedaluwarsa. Eksekusi tetap idempoten (update bersyarat di server).
 */

export const ACTION_TTL_SEC = 15 * 60;
/** Cukup untuk isi pengumuman 4000 karakter (UTF-8 + base64). */
export const MAX_TOKEN_LENGTH = 24_000;

export type MailDecisionPayload = {
  v: 1;
  t: "mail_decision";
  /** userId yang boleh mengonfirmasi */
  u: number;
  /** villageId */
  vi: number;
  /** id permohonan (string karena BigInt) */
  r: string;
  d: "approve" | "reject";
  n: string;
  /** kedaluwarsa, epoch detik */
  e: number;
};

export type ReportActionPayload = {
  v: 1;
  t: "report_action";
  u: number;
  vi: number;
  /** id laporan (string karena BigInt) */
  r: string;
  /** status tujuan; kosong = hanya menambah tanggapan */
  s: "" | "PROCESS" | "DONE" | "REJECT";
  /** tanggapan/alasan untuk pelapor */
  m: string;
  e: number;
};

export const ANNOUNCEMENT_ACTION_CATEGORIES = ["Pengumuman", "Berita", "Event"] as const;

export type AnnouncementPublishPayload = {
  v: 1;
  t: "announcement_publish";
  u: number;
  vi: number;
  /** judul */
  ti: string;
  /** isi */
  co: string;
  /** kategori */
  ca: (typeof ANNOUNCEMENT_ACTION_CATEGORIES)[number];
  /** disematkan */
  pn: boolean;
  e: number;
};

export type ActionPayload = MailDecisionPayload | ReportActionPayload | AnnouncementPublishPayload;
export type ActionType = ActionPayload["t"];

/**
 * Isi kartu untuk MANUSIA (boleh memuat nama pemohon; tidak pernah dikirim ke model). Sengaja generik agar satu komponen UI
 * melayani semua jenis aksi: teks dan nada sudah ditentukan server.
 */
export type ActionCard = {
  key: string;
  type: ActionType;
  token: string;
  badge: string;
  icon: "check" | "x" | "message";
  tone: "default" | "destructive";
  confirmLabel: string;
  doneText: string;
  heading: string;
  subheading: string;
  noteLabel: string;
  note: string;
  /** Kutipan teks tulisan warga yang melatarbelakangi usulan (tak tepercaya; hanya untuk dibaca manusia). Kosong bila tak ada. */
  evidenceLabel: string;
  evidence: string;
  /** Boleh dikonfirmasi massal. Ditentukan server: persetujuan/penolakan/penerbitan tidak pernah boleh massal. */
  batchable: boolean;
  warnings: string[];
  expiresAt: string;
};

function derivedKey(secret: string): string {
  return createHmac("sha256", secret).update("klandesa-laras-action-v1").digest("hex");
}

function mac(body: string, secret: string): string {
  return createHmac("sha256", derivedKey(secret)).update(body).digest("base64url");
}

export function signAction(payload: ActionPayload, secret = getResolvedAuthSecret()): string {
  if (!secret) throw new Error("AUTH_SECRET belum diset");
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${mac(body, secret)}`;
}

export type VerifyResult =
  | { ok: true; payload: ActionPayload }
  | { ok: false; reason: "invalid" | "expired" };

export function verifyAction(
  token: unknown,
  secret = getResolvedAuthSecret(),
  nowSec = Math.floor(Date.now() / 1000),
): VerifyResult {
  if (!secret || typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: "invalid" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "invalid" };
  const [body, sig] = parts as [string, string];
  const expected = Buffer.from(mac(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: "invalid" };
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const p = payload as (Partial<MailDecisionPayload> & Partial<ReportActionPayload> & Partial<AnnouncementPublishPayload>) | null;
  const base = !!p && p.v === 1 && Number.isInteger(p.u) && Number.isInteger(p.vi) && Number.isInteger(p.e);
  const hasRef = base && typeof p!.r === "string" && /^\d{1,18}$/.test(p!.r);
  const validMail =
    hasRef && p!.t === "mail_decision" && (p!.d === "approve" || p!.d === "reject") && typeof p!.n === "string";
  const validReport =
    hasRef &&
    p!.t === "report_action" &&
    (p!.s === "" || p!.s === "PROCESS" || p!.s === "DONE" || p!.s === "REJECT") &&
    typeof p!.m === "string";
  const validAnnouncement =
    base &&
    p!.t === "announcement_publish" &&
    typeof p!.ti === "string" &&
    p!.ti.length >= 3 &&
    p!.ti.length <= 200 &&
    typeof p!.co === "string" &&
    p!.co.length >= 3 &&
    p!.co.length <= 4000 &&
    (ANNOUNCEMENT_ACTION_CATEGORIES as readonly string[]).includes(p!.ca as string) &&
    typeof p!.pn === "boolean";
  if (!validMail && !validReport && !validAnnouncement) return { ok: false, reason: "invalid" };
  if ((p!.e as number) < nowSec) return { ok: false, reason: "expired" };
  return { ok: true, payload: p as ActionPayload };
}
