import { NextRequest } from "next/server";
import { mobileError } from "@/lib/mobile/context";
import { registerWithCode } from "@/lib/mobile/citizen-register";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  return registerWithCode(req, body);
}
