import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { createApiKey, listApiKeys, MAX_ACTIVE_KEYS_PER_VILLAGE } from "@/lib/api-keys/keys";
import { API_SCOPES, parseScopes } from "@/lib/api-keys/scopes";

const adminOnly = () => NextResponse.json({ error: "Hanya admin desa yang dapat mengelola kunci API." }, { status: 403 });

/** Daftar kunci API desa ini (tanpa rahasia) dan katalog akses yang bisa dipilih. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (ctx.dbUser.role !== "admin") return adminOnly();

    return NextResponse.json({
      maxActive: MAX_ACTIVE_KEYS_PER_VILLAGE,
      scopes: Object.entries(API_SCOPES).map(([id, s]) => ({ id, ...s })),
      keys: await listApiKeys(prisma, ctx.village.id),
    });
  } catch (e) {
    console.error("GET /api/developer/keys error:", e);
    return NextResponse.json({ error: "Gagal memuat kunci API" }, { status: 500 });
  }
}

/** Buat kunci: { name, scopes[], expiresInDays? }. Rahasia kunci hanya muncul di respons ini, sekali. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (ctx.dbUser.role !== "admin") return adminOnly();

    const body = await req.json().catch(() => null);
    const scopes = parseScopes(body?.scopes);
    if (!scopes.ok) return NextResponse.json({ error: scopes.error }, { status: 422 });
    const expiresInDays = body?.expiresInDays == null || body.expiresInDays === "" ? null : Number(body.expiresInDays);

    const result = await createApiKey(prisma, {
      villageId: ctx.village.id,
      userId: ctx.userId ?? null,
      name: typeof body?.name === "string" ? body.name : "",
      scopes: scopes.scopes,
      expiresInDays,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    // Rahasia kunci tidak pernah masuk jejak audit.
    await auditWeb(req, ctx, "create", "api_keys", result.key.id, { name: result.key.name, prefix: result.key.prefix, scopes: result.key.scopes, expiresAt: result.key.expiresAt });
    return NextResponse.json({ success: true, secret: result.secret, key: result.key }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("POST /api/developer/keys error:", e);
    return NextResponse.json({ error: "Gagal membuat kunci API" }, { status: 500 });
  }
}
