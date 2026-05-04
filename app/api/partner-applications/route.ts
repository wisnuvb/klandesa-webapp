import { NextRequest, NextResponse } from "next/server";

import {
  parseAppsScriptWebAppUrl,
  postAppsScriptWebhook,
} from "@/lib/apps-script-webhook";
import { prisma } from "@/lib/prisma";

/**
 * Pendaftaran mitra → Google Apps Script (Web App URL).
 * Contoh skrip: scripts/partner-mitra-webhook.gs — env: [.env.example](/.env.example)
 */
const MAX_LEN = {
  name: 120,
  email: 254,
  phone: 40,
  region: 200,
  message: 2000,
} as const;

function basicEmailOk(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const appsScriptUrl = process.env.GOOGLE_FORM_PARTNER_APPS_SCRIPT_URL?.trim();
    const secret = process.env.GOOGLE_FORM_PARTNER_APPS_SCRIPT_SECRET?.trim();

    const body = (await req.json().catch(() => null)) as
      | {
          name?: string;
          email?: string;
          phone?: string;
          region?: string;
          message?: string;
          website?: string;
        }
      | null;

    if (body?.website && String(body.website).trim() !== "") {
      return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
    }

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const region = String(body?.region ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!name || !email || !phone || !region || !message) {
      return NextResponse.json(
        { error: "Nama, email, nomor HP, wilayah, dan pesan wajib diisi" },
        { status: 400 },
      );
    }

    if (!basicEmailOk(email)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }

    if (name.length > MAX_LEN.name || email.length > MAX_LEN.email) {
      return NextResponse.json({ error: "Data terlalu panjang" }, { status: 400 });
    }
    if (phone.length > MAX_LEN.phone || region.length > MAX_LEN.region) {
      return NextResponse.json({ error: "Data terlalu panjang" }, { status: 400 });
    }
    if (message.length > MAX_LEN.message) {
      return NextResponse.json({ error: "Pesan terlalu panjang" }, { status: 400 });
    }

    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const ipAddress = forwardedFor.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    await prisma.partnerApplication.create({
      data: {
        name,
        email,
        phone,
        region,
        message,
        source: "karir",
        meta: {
          ipAddress,
          userAgent,
        },
      },
    });

    let spreadsheetSynced = false;
    if (appsScriptUrl) {
      const webhook = parseAppsScriptWebAppUrl(appsScriptUrl);
      if (webhook) {
        const result = await postAppsScriptWebhook(webhook, secret, {
          name,
          email,
          phone,
          region,
          message,
        });
        spreadsheetSynced = result.accepted;
        if (!result.accepted) {
          console.error("Partner application spreadsheet sync failed", {
            webhookHttpStatus: result.httpStatus,
            parsedOk: result.parsedOk,
            parsedError: result.parsedError,
          });
        }
      } else {
        console.error("Invalid GOOGLE_FORM_PARTNER_APPS_SCRIPT_URL");
      }
    }

    return NextResponse.json({ ok: true, spreadsheetSynced }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan server. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
