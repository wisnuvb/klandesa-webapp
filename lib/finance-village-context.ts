import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Village } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";

/**
 * Lane campuran: sesi app desa (ketat), JWT internal (bukan regional), atau `FINANCE_API_KEY` + `villageId` di body.
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
  const keyAuth = Boolean(validApiKey && apiKeyHeader === validApiKey);

  const loaded = await requireVillageApiContext(req);
  if (loaded.ok) {
    return {
      ok: true,
      village: loaded.ctx.village,
      userId: loaded.ctx.userId,
    };
  }

  const token = await getToken({ req, secret: authOptions.secret });
  if (
    token &&
    token.accountType !== "regional" &&
    typeof token.villageId === "number"
  ) {
    const village = await prisma.village.findUnique({
      where: { id: token.villageId },
    });
    if (village) {
      return { ok: true, village };
    }
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
