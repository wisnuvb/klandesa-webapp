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

function isCode(v: string): boolean {
  return /^[0-9]{2,4}$/.test(v);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = checkRegionalRateLimit(ip, "pangan_harga");
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
  const input = {
    tanggal: "",
    tanggal_pembanding: "",
    kode_provinsi: "",
    kode_kab_kota: "",
  };

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    input.tanggal = String(form?.get("tanggal") ?? "").trim();
    input.tanggal_pembanding = String(
      form?.get("tanggal_pembanding") ?? "",
    ).trim();
    input.kode_provinsi = String(form?.get("kode_provinsi") ?? "").trim();
    input.kode_kab_kota = String(form?.get("kode_kab_kota") ?? "").trim();
  } else {
    const body = (await req.json().catch(() => null)) as {
      tanggal?: string;
      tanggal_pembanding?: string;
      kode_provinsi?: string | number;
      kode_kab_kota?: string | number;
    } | null;
    input.tanggal = String(body?.tanggal ?? "").trim();
    input.tanggal_pembanding = String(body?.tanggal_pembanding ?? "").trim();
    input.kode_provinsi = String(body?.kode_provinsi ?? "").trim();
    input.kode_kab_kota = String(body?.kode_kab_kota ?? "").trim();
  }

  const tanggal = input.tanggal;
  const tanggal_pembanding = input.tanggal_pembanding;
  const kode_provinsi = input.kode_provinsi;
  const kode_kab_kota = input.kode_kab_kota;

  if (!isDateString(tanggal) || !isDateString(tanggal_pembanding)) {
    return NextResponse.json(
      { error: "tanggal dan tanggal_pembanding wajib format YYYY-MM-DD" },
      { status: 400, headers: corsHeaders },
    );
  }
  if (!isCode(kode_provinsi)) {
    return NextResponse.json(
      { error: "kode_provinsi tidak valid" },
      { status: 400, headers: corsHeaders },
    );
  }
  if (!isCode(kode_kab_kota)) {
    return NextResponse.json(
      { error: "kode_kab_kota tidak valid" },
      { status: 400, headers: corsHeaders },
    );
  }

  const url =
    "https://api-sp2kp.kemendag.go.id/report/api/average-price/generate-perbandingan-harga";

  const form = new FormData();
  form.append("tanggal", tanggal);
  form.append("tanggal_pembanding", tanggal_pembanding);
  form.append("kode_provinsi", kode_provinsi);
  form.append("kode_kab_kota", kode_kab_kota);

  try {
    const upstream = await fetch(url, { method: "POST", body: form });
    const text = await upstream.text();

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: "Gagal mengambil data harga",
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
      {
        input: { tanggal, tanggal_pembanding, kode_provinsi, kode_kab_kota },
        data,
      },
      { headers: corsHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal terhubung ke server sumber" },
      { status: 502, headers: corsHeaders },
    );
  }
}
