import { NextRequest, NextResponse } from "next/server";
import { checkRegionalRateLimit } from "@/lib/regional-rate-limit";
import { clientIp, corsHeaders, metaOf, mirrorErrorResponse, successHeaders } from "@/lib/pangan/http";
import { isDateInWindow } from "@/lib/pangan/mirror-policy";
import { mirror } from "@/lib/pangan/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = checkRegionalRateLimit(ip, "pangan_het");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      {
        status: 429,
        headers: { ...corsHeaders, "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  let tanggal = "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    tanggal = String(form?.get("tanggal") ?? "").trim();
  } else {
    const body = (await req.json().catch(() => null)) as {
      tanggal?: string;
    } | null;
    tanggal = String(body?.tanggal ?? "").trim();
  }
  if (!isDateInWindow(tanggal)) {
    return NextResponse.json(
      { error: "tanggal wajib format YYYY-MM-DD, tidak di masa depan, maksimal 400 hari ke belakang" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const result = await mirror.getHet(tanggal);
    const meta = metaOf(result);
    return NextResponse.json(
      { input: { tanggal }, data: result.payload, meta },
      { headers: successHeaders(meta) },
    );
  } catch (e) {
    return mirrorErrorResponse(e, "Gagal mengambil data HET");
  }
}
