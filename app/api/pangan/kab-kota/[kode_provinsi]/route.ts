import { NextRequest, NextResponse } from "next/server";
import { checkRegionalRateLimit } from "@/lib/regional-rate-limit";
import { clientIp, corsHeaders, metaOf, mirrorErrorResponse, successHeaders } from "@/lib/pangan/http";
import { kabKotaPayload } from "@/lib/pangan/mirror";
import { mirror } from "@/lib/pangan/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    const result = await mirror.getKabKota(kode);
    const meta = metaOf(result);
    return NextResponse.json(
      { kode_provinsi: kode, data: kabKotaPayload(result.rows), meta },
      { headers: successHeaders(meta, true) },
    );
  } catch (e) {
    return mirrorErrorResponse(e, "Gagal mengambil data kab/kota");
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
