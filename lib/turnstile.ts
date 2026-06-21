import { NextRequest, NextResponse } from "next/server";
import { isTurnstileProduction } from "@/lib/turnstile-config";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  if (process.env.TURNSTILE_SKIP === "true") return false;
  if (!isTurnstileProduction()) return false;
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

function clientIp(req: NextRequest): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return req.headers.get("x-real-ip") ?? undefined;
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isTurnstileEnabled()) {
    return { success: true };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY!.trim();
  const trimmed = String(token ?? "").trim();
  if (!trimmed) {
    return { success: false, error: "Token Turnstile wajib" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", trimmed);
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      "error-codes"?: string[];
    } | null;

    if (data?.success) return { success: true };
    const codes = data?.["error-codes"]?.join(", ") ?? "verifikasi gagal";
    return { success: false, error: codes };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Turnstile error";
    return { success: false, error: message };
  }
}

export async function requireTurnstile(
  req: NextRequest,
  token: string | null | undefined,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const result = await verifyTurnstileToken(token, clientIp(req));
  if (result.success) return { ok: true };

  const trimmed = String(token ?? "").trim();
  if (!trimmed && isTurnstileEnabled()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Verifikasi keamanan wajib", code: "TURNSTILE_REQUIRED" },
        { status: 400 },
      ),
    };
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "Verifikasi keamanan gagal. Silakan coba lagi.",
        code: "TURNSTILE_FAILED",
        detail: result.error,
      },
      { status: 403 },
    ),
  };
}
