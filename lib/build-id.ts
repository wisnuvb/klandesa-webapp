import fs from "fs";
import path from "path";

let cachedBuildId: string | null = null;

/**
 * ID unik yang dibuat Next.js setiap `next build` (file .next/BUILD_ID).
 * Dibaca sekali per proses server lalu di-cache di memori — tidak ada I/O
 * berulang meski dipanggil tiap request. Di `next dev` file ini tidak ada,
 * jadi dikembalikan nilai tetap "dev" (sengaja tidak pernah cocok dipakai
 * untuk fitur yang hanya relevan di production).
 */
export function getAppBuildId(): string {
  if (cachedBuildId) return cachedBuildId;
  try {
    cachedBuildId = fs
      .readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8")
      .trim();
  } catch {
    cachedBuildId = "dev";
  }
  return cachedBuildId;
}
