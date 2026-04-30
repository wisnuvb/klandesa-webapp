import { NextRequest, NextResponse } from "next/server";
import { checkRegionalRateLimit } from "@/lib/regional-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function isProvCode(code: string): boolean {
  return /^[0-9]{2}$/.test(code);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ kode_provinsi: string }> },
) {
  const ip = clientIp(req);
  const rl = checkRegionalRateLimit(ip, "pangan_kab_kota");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      {
        status: 429,
        headers: { ...corsHeaders, "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const { kode_provinsi } = await params;
  const kode = String(kode_provinsi ?? "").trim();
  if (!isProvCode(kode)) {
    return NextResponse.json(
      { error: "kode_provinsi tidak valid" },
      { status: 400, headers: corsHeaders },
    );
  }

  const url = `https://api-sp2kp.kemendag.go.id/master/api/wilayah/kab-kota/${encodeURIComponent(
    kode,
  )}?`;

  try {
    const upstream = await fetch(url, { method: "GET" });
    const text = await upstream.text();

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: "Gagal mengambil data kab/kota",
          upstream_status: upstream.status,
        },
        { status: 502, headers: corsHeaders },
      );
    }

    let data: unknown = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return NextResponse.json(
      { kode_provinsi: kode, data },
      { headers: corsHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal terhubung ke server sumber" },
      { status: 502, headers: corsHeaders },
    );
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ kode_provinsi: string }> },
) {
  return handler(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ kode_provinsi: string }> },
) {
  return handler(req, ctx);
}
