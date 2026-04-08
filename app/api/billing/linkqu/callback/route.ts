import { NextRequest, NextResponse } from "next/server";
import { handleLinkquCallback } from "@/lib/billing/service";
import type { LinkquCallbackPayload } from "@/lib/linkqu";

async function parseBody(req: NextRequest): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData();
    const out: Record<string, unknown> = {};
    for (const [k, v] of form.entries()) out[k] = v;
    return out;
  }
  return (await req.json().catch(() => ({}))) as Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req);
    const result = await handleLinkquCallback(
      body as unknown as LinkquCallbackPayload,
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json(
      { ok: true, invoiceStatus: result.invoiceStatus },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
