import { clientIpOf } from "@/lib/rbac/client-ip";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { isValidNik, normalizeNik } from "@/lib/nik-validation";
import { isVillageSubscriptionActive } from "@/lib/subscription";
import { resolvePublicEnrollmentSummary } from "@/lib/social-benefit-public-label";
import {
  SOCIAL_PROGRAM_NATIONAL_RESOURCES,
  SOCIAL_PROGRAM_PUBLIC_DISCLAIMERS,
} from "@/lib/social-benefit-national-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  // X-Real-IP (diisi nginx) lalu entri TERAKHIR XFF; entri pertama bisa dipalsukan klien (lib/rbac/client-ip.ts).
  return clientIpOf(req);
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/** POST JSON { "nik": "..." } → ringkasan entri untuk NIK tersebut (tenant subscription aktif). */
export async function POST(req: NextRequest) {
  // Endpoint publik tanpa login yang mengonfirmasi status penerima bansos per NIK: batas harus dibagi antar worker (tabel
  // mobile_rate_limits; limiter memori per proses = batas x jumlah worker) dan memakai IP yang tak bisa dipalsukan klien.
  const ip = clientIp(req);
  const [short, hourly] = await Promise.all([
    checkRateLimitDb(limiterKey("sb-check-10m", ip), { max: 20, windowMs: 10 * 60_000 }),
    checkRateLimitDb(limiterKey("sb-check-1h", ip), { max: 60, windowMs: 60 * 60_000 }),
  ]);
  const rl = !short.ok ? short : hourly;
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      {
        status: 429,
        headers: { ...corsHeaders, "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const baseMeta = () => ({
    disclaimers: SOCIAL_PROGRAM_PUBLIC_DISCLAIMERS,
    nationalResources: SOCIAL_PROGRAM_NATIONAL_RESOURCES,
    entries: [] as unknown[],
    messageForUser:
      "Jika Anda terdaftar lewat Pemdes Anda, nama program beserta wilayah desa bisa muncul di bawah.",
  });

  try {
    const body = (await req.json().catch(() => null)) as { nik?: unknown } | null;
    const raw = normalizeNik(body?.nik);
    if (!isValidNik(raw)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Format NIK tidak valid. Mohon gunakan tepat 16 digit angka.",
          ...baseMeta(),
        },
        { status: 400, headers: corsHeaders },
      );
    }

    const nik = raw;

    const rows = await prisma.socialBenefitBeneficiary.findMany({
      where: {
        nik,
        program: {
          isActive: true,
          village: { isActive: true },
        },
      },
      include: {
        program: {
          include: {
            village: {
              select: {
                name: true,
                district: true,
                regency: true,
                province: true,
                subscriptionStatus: true,
                subscriptionExpiry: true,
              },
            },
          },
        },
      },
      orderBy: [{ program: { sortOrder: "asc" } }, { id: "asc" }],
      take: 50,
    });

    const filtered = rows.filter((r) =>
      isVillageSubscriptionActive(r.program.village),
    );

    const entries = filtered.map((r) => ({
      programName: r.program.name,
      periodLabel: r.program.periodLabel,
      enrollmentSummary: resolvePublicEnrollmentSummary({
        status: r.status,
        publicNote: r.publicNote,
      }),
      locality: {
        villageName: r.program.village.name,
        district: r.program.village.district,
        regency: r.program.village.regency,
        province: r.program.village.province,
      },
    }));

    return NextResponse.json(
      {
        ok: true,
        ...baseMeta(),
        entries,
        messageForUser:
          entries.length === 0
            ? "Tidak ditemukan pencocokan atas NIK Anda pada catatan desa yang menggunakan layanan ini, atau Anda belum dicatatkan untuk tahap/program yang sedang dibuka oleh Pemdes Anda."
            : "Informasi ini merupakan ringkas dari catatan perangkat desa terkait. Untuk kepastian teknis per program pusat mohon konsultasi layanan Kemensos/tautan resmi lain.",
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error("POST /api/public/social-benefits/check", e);
    return NextResponse.json(
      {
        ok: false,
        error: "Maaf layanan sedang gagal menjawab. Coba lagi nanti.",
        ...baseMeta(),
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
