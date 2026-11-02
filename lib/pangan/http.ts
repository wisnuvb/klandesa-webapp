import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MirrorError, toMirrorError, type MirrorResult, type MirrorSource } from "./mirror";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export type PanganMeta = { fetched_at: string; stale: boolean; source: MirrorSource };

export function metaOf(r: Pick<MirrorResult, "fetchedAt" | "stale" | "source">): PanganMeta {
  return { fetched_at: r.fetchedAt.toISOString(), stale: r.stale, source: r.source };
}

/** Header untuk respons sukses. `cacheable` hanya untuk GET data referensi yang jarang berubah. */
export function successHeaders(meta: PanganMeta, cacheable = false): Record<string, string> {
  const h: Record<string, string> = { ...corsHeaders, "x-data-source": meta.source };
  if (cacheable && !meta.stale) {
    h["Cache-Control"] = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
  }
  return h;
}

/** 504 untuk sumber yang tidak merespons tepat waktu, 502 untuk kegagalan sumber lainnya. */
export function mirrorErrorResponse(e: unknown, message: string) {
  const err: MirrorError = toMirrorError(e);
  return NextResponse.json(
    { error: message, reason: err.message },
    {
      status: err.status,
      headers: { ...corsHeaders, "Retry-After": "5", "Cache-Control": "no-store" },
    },
  );
}
