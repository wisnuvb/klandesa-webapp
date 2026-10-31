import { buildLlmsTxt } from "@/lib/api-v1/spec";

/** Panduan ringkas untuk alat AI (publik, tanpa kunci): hanya dokumentasi, tidak memuat data desa. */
export async function GET(req: Request) {
  return new Response(buildLlmsTxt(new URL(req.url).origin), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
