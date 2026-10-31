import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Village } from "@prisma/client";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";

function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/**
 * Lane campuran: sesi app desa (ketat) atau `FINANCE_API_KEY` + `villageId` di body.
 * Penolakan dari `requireVillageApiContext` (izin, akun nonaktif, langganan, konteks desa) berlaku apa adanya;
 * hanya "tidak ada sesi" (401) yang boleh jatuh ke kunci layanan.
 */
export async function resolveFinanceWriteVillage(
  req: NextRequest,
  body: { villageId?: unknown },
): Promise<
  | { ok: true; village: Village; userId?: number }
  | { ok: false; response: NextResponse }
> {
  const apiKeyHeader = req.headers.get("x-api-key");
  const validApiKey = process.env.FINANCE_API_KEY;
  const keyAuth = Boolean(validApiKey && apiKeyHeader && safeEqual(apiKeyHeader, validApiKey));

  const loaded = await requireVillageApiContext(req);
  if (loaded.ok) {
    return {
      ok: true,
      village: loaded.ctx.village,
      userId: loaded.ctx.userId,
    };
  }

  if (loaded.response.status !== 401) {
    return { ok: false, response: loaded.response };
  }

  if (keyAuth) {
    const vid = Number(body.villageId);
    if (!Number.isFinite(vid)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "villageId wajib untuk otentikasi service" },
          { status: 400 },
        ),
      };
    }
    const village = await prisma.village.findUnique({ where: { id: vid } });
    if (!village) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 }),
      };
    }
    return { ok: true, village };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}
