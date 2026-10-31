import { NextResponse } from "next/server";
import { requireApiKey, RATE_LIMIT_PER_MINUTE } from "@/lib/api-keys/auth";
import { ALL_API_SCOPES } from "@/lib/api-keys/scopes";

/** Siapa saya? Desa, nama kunci, scope, dan batas laju untuk kunci yang dipakai. Cara tercepat menguji kunci; berlaku untuk kunci sah mana pun. */
export async function GET(req: Request) {
  const auth = await requireApiKey(req, null);
  if (!auth.ok) return auth.response;
  const { key, village } = auth.ctx;
  return auth.respond(
    NextResponse.json({
      village: { id: village.id, code: village.code, name: village.name },
      key: { name: key.name, prefix: key.prefix, scopes: key.scopes, expiresAt: key.expiresAt?.toISOString() ?? null },
      rateLimit: { perMinute: RATE_LIMIT_PER_MINUTE },
      availableScopes: ALL_API_SCOPES,
    }),
  );
}
