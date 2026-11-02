import { NextRequest, NextResponse } from "next/server";
import { checkRegionalRateLimit } from "@/lib/regional-rate-limit";
import { clientIp, corsHeaders, metaOf, mirrorErrorResponse, successHeaders } from "@/lib/pangan/http";
import { isDateInWindow } from "@/lib/pangan/mirror-policy";
import { mirror } from "@/lib/pangan/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if (!isDateInWindow(tanggal) || !isDateInWindow(tanggal_pembanding)) {
    return NextResponse.json(
      { error: "tanggal dan tanggal_pembanding wajib format YYYY-MM-DD, tidak di masa depan, maksimal 400 hari ke belakang" },
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

  if (!(await mirror.isKnownKabKota(kode_provinsi, kode_kab_kota))) {
    return NextResponse.json(
      { error: "kode_kab_kota tidak dikenal untuk provinsi ini" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const result = await mirror.getHarga({
      tanggal,
      tanggalPembanding: tanggal_pembanding,
      kodeProvinsi: kode_provinsi,
      kodeKabKota: kode_kab_kota,
    });
    const meta = metaOf(result);
    return NextResponse.json(
      {
        input: { tanggal, tanggal_pembanding, kode_provinsi, kode_kab_kota },
        data: result.payload,
        meta,
      },
      { headers: successHeaders(meta) },
    );
  } catch (e) {
    return mirrorErrorResponse(e, "Gagal mengambil data harga");
  }
}
