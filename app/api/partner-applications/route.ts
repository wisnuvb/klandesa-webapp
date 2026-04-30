import { NextRequest, NextResponse } from "next/server";

import {
  parseAppsScriptWebAppUrl,
  postAppsScriptWebhook,
} from "@/lib/apps-script-webhook";

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

    if (!appsScriptUrl) {
      return NextResponse.json(
        {
          error:
            "Pendaftaran mitra belum dikonfigurasi. Set GOOGLE_FORM_PARTNER_APPS_SCRIPT_URL di environment.",
        },
        { status: 503 },
      );
    }

    const webhook = parseAppsScriptWebAppUrl(appsScriptUrl);
    if (!webhook) {
      return NextResponse.json(
        {
          error:
            "GOOGLE_FORM_PARTNER_APPS_SCRIPT_URL harus HTTPS ke script.google.com (URL Web App /exec).",
        },
        { status: 503 },
      );
    }

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

    const result = await postAppsScriptWebhook(webhook, secret, {
      name,
      email,
      phone,
      region,
      message,
    });

    if (!result.accepted) {
      const dev = process.env.NODE_ENV === "development";
      return NextResponse.json(
        {
          error: "Gagal mengirim pendaftaran. Coba lagi nanti.",
          ...(dev
            ? {
                _debug: {
                  webhookHttpStatus: result.httpStatus,
                  webhookBody: result.rawBody.slice(0, 500),
                  parsedOk: result.parsedOk,
                  parsedError: result.parsedError,
                },
              }
            : {}),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan server. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
