import type { NextRequest } from "next/server";
import { readAppSession } from "@/auth";

/**
 * Alias ke readAppSession(req) — dipakai di Route Handler API.
 */
export async function getApiSession(req: NextRequest) {
  return readAppSession(req);
}
