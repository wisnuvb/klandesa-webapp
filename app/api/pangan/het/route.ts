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

function isDateString(v: string): boolean {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v);
}

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
  if (!isDateString(tanggal)) {
    return NextResponse.json(
      { error: "tanggal wajib format YYYY-MM-DD" },
      { status: 400, headers: corsHeaders },
    );
  }

  const url =
    "https://api-sp2kp.kemendag.go.id/report/api/average-price/generate-perbandingan-harga-het-ha";

  const form = new FormData();
  form.append("tanggal", tanggal);

  try {
    const upstream = await fetch(url, { method: "POST", body: form });
    const text = await upstream.text();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Gagal mengambil data HET", upstream_status: upstream.status },
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
      { input: { tanggal }, data },
      { headers: corsHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal terhubung ke server sumber" },
      { status: 502, headers: corsHeaders },
    );
  }
}
