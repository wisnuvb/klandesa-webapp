import { NextResponse } from "next/server";
import { buildOpenApi } from "@/lib/api-v1/spec";

/** Spesifikasi OpenAPI 3.1 (publik, tanpa kunci): hanya dokumentasi, tidak memuat data desa. */
export async function GET(req: Request) {
  return NextResponse.json(buildOpenApi(new URL(req.url).origin), { headers: { "Cache-Control": "public, max-age=300" } });
}
