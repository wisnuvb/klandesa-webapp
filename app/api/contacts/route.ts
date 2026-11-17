import { clientIpOrNull } from "@/lib/rbac/client-ip";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import {
  parseAppsScriptWebAppUrl,
  postAppsScriptWebhook,
} from "@/lib/apps-script-webhook";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeReferralCode, trackReferralEvent } from "@/lib/referrals/tracking";
import { requireTurnstile } from "@/lib/turnstile";
import { notifyOwnerContactReceived } from "@/lib/notifications/owner-notify";

function firstIp(req: NextRequest): string | null {
  return clientIpOrNull(req);
}

function resolveContactEmail(email: string, phone: string): string | null {
  if (email) return email;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 8) return `kontak+${digits}@inbound.klandesa.id`;
  return null;
}

function normalizeContactSource(value: unknown): string {
  const raw = String(value ?? "landing")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return (raw || "landing").slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          name?: string;
          email?: string;
          phone?: string;
          subject?: string;
          message?: string;
          referralCode?: string;
          sourcePath?: string;
          source?: string;
          turnstileToken?: string;
        }
      | null;

    const turnstile = await requireTurnstile(req, body?.turnstileToken);
    if (!turnstile.ok) return turnstile.response;

    const name = String(body?.name ?? "").trim();
    const emailInput = String(body?.email ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();
    const referralCode = normalizeReferralCode(body?.referralCode);
    const sourcePath = String(body?.sourcePath ?? "/").trim();
    const source = normalizeContactSource(body?.source);
    const email = resolveContactEmail(emailInput, phone);

    if (!name || !subject || !message) {
      return NextResponse.json(
        { error: "name, subject, message wajib diisi" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "email atau nomor telepon wajib diisi" },
        { status: 400 }
      );
    }

    const created = await prisma.contact.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
        source,
        ipAddress: firstIp(req),
        userAgent: req.headers.get("user-agent"),
      },
      select: { id: true, createdAt: true },
    });

    await trackReferralEvent(req, {
      code: referralCode,
      action: "contact_submit",
      sourcePath,
      name,
      email,
      phone,
      subject,
      metadata: {
        contactId: String(created.id),
        messagePreview: message.slice(0, 160),
      },
    });

    // Email ke pemilik (tidak menunggu dan tidak pernah menggagalkan pengiriman formulir).
    void notifyOwnerContactReceived({
      id: String(created.id),
      name,
      phone: phone || null,
      email,
      subject,
      message,
      source,
      sourcePath: sourcePath || null,
      receivedAt: created.createdAt,
    });

    const sheetUrl = process.env.GOOGLE_APPS_SCRIPT_CONTACT_URL?.trim();
    const sheetSecret = process.env.GOOGLE_APPS_SCRIPT_CONTACT_SECRET?.trim();
    if (sheetUrl) {
      const webhook = parseAppsScriptWebAppUrl(sheetUrl);
      if (webhook) {
        const sync = await postAppsScriptWebhook(webhook, sheetSecret, {
          name,
          email,
          phone: phone || "",
          subject,
          message,
        });
        if (!sync.accepted) {
          console.error(
            "[contacts] Apps Script (Spreadsheet) sync gagal:",
            sync.httpStatus,
            sync.rawBody.slice(0, 400),
          );
        }
      } else {
        console.error(
          "[contacts] GOOGLE_APPS_SCRIPT_CONTACT_URL tidak valid (harus https://script.google.com/...).",
        );
      }
    }

    return NextResponse.json(
      { ok: true, id: String(created.id), createdAt: created.createdAt.toISOString() },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const SOURCE_RE = /^[a-z0-9_-]{1,50}$/;

/**
 * Daftar kontak masuk untuk konsol admin platform. Saring: `responded` (true/false), `source`, `q` (nama, telepon, email, atau
 * isi pesan mengandung teks). Urut id turun; kursor `cursor` = id terakhir; `limit` maks 100. `counts` tidak ikut saringan.
 */
export async function GET(req: NextRequest) {
  try {
    // Pesan formulir kontak landing milik platform (lintas desa): hanya admin platform, bukan admin desa mana pun.
    const auth = await requirePlatformSession(req);
    if (!auth.ok) return auth.response;

    const sp = req.nextUrl.searchParams;
    const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

    const responded = sp.get("responded");
    const where: Prisma.ContactWhereInput = {};
    if (responded === "true") where.isResponded = true;
    else if (responded === "false") where.isResponded = false;

    const source = sp.get("source")?.trim().toLowerCase();
    if (source) {
      if (!SOURCE_RE.test(source)) return bad("source tidak valid.");
      where.source = source;
    }

    const q = sp.get("q")?.trim().slice(0, 100);
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { message: { contains: q } },
      ];
    }

    const cursorRaw = sp.get("cursor");
    if (cursorRaw) {
      if (!/^\d{1,18}$/.test(cursorRaw)) return bad("cursor tidak valid.");
      where.id = { lt: BigInt(cursorRaw) };
    }

    const limitRaw = Number(sp.get("limit") ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), MAX_LIMIT) : DEFAULT_LIMIT;

    const [rows, total, unresponded, unrespondedAds] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { id: "desc" },
        take: limit + 1,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subject: true,
          message: true,
          source: true,
          isResponded: true,
          respondedAt: true,
          respondedByUserId: true,
          createdAt: true,
        },
      }),
      prisma.contact.count(),
      prisma.contact.count({ where: { isResponded: false } }),
      prisma.contact.count({ where: { isResponded: false, source: "iklan-meta" } }),
    ]);

    const page = rows.slice(0, limit);
    return NextResponse.json({
      contacts: page.map((c) => ({
        id: String(c.id),
        name: c.name,
        email: c.email,
        phone: c.phone,
        subject: c.subject,
        message: c.message,
        source: c.source,
        isResponded: c.isResponded,
        respondedAt: c.respondedAt?.toISOString() ?? null,
        respondedByUserId: c.respondedByUserId,
        createdAt: c.createdAt.toISOString(),
      })),
      nextCursor: rows.length > limit ? String(page[page.length - 1]!.id) : null,
      counts: { total, unresponded, unrespondedAds },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
