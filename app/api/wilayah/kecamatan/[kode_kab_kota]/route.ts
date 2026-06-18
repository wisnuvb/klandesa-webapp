import { NextRequest, NextResponse } from "next/server";
import { checkRegionalRateLimit } from "@/lib/regional-rate-limit";
import {
  fetchKecamatanList,
  isWilayahCode,
} from "@/lib/pangan/region-master";

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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ kode_kab_kota: string }> },
) {
  const ip = clientIp(req);
  const rl = checkRegionalRateLimit(ip, "wilayah_kecamatan");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      {
        status: 429,
        headers: { ...corsHeaders, "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const { kode_kab_kota } = await params;
  const kode = String(kode_kab_kota ?? "").trim();
  if (!isWilayahCode(kode, "kab_kota")) {
    return NextResponse.json(
      { error: "kode_kab_kota tidak valid" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const rows = await fetchKecamatanList(kode);
    return NextResponse.json(
      { kode_kab_kota: kode, data: rows },
      { headers: corsHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal mengambil data kecamatan" },
      { status: 502, headers: corsHeaders },
    );
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ kode_kab_kota: string }> },
) {
  return handler(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ kode_kab_kota: string }> },
) {
  return handler(req, ctx);
}
