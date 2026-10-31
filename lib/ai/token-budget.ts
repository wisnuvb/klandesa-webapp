import { prisma } from "@/lib/prisma";
import { limiterKey } from "@/lib/mobile/rate-limit";

/**
 * Anggaran token Laras. Kredit tetap 1 per pertanyaan (harga mudah dipahami pengguna), tetapi biaya model sebenarnya
 * bergantung pada token. Karena itu pemakaian token dicatat dan dibatasi per pengguna per 24 jam, memakai tabel
 * `mobile_rate_limits` (tanpa tabel baru; `count` = jumlah token).
 */
export const DEFAULT_DAILY_TOKEN_CAP = 800_000;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ADD = 2_000_000;

export function getDailyTokenCap(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.LARAS_DAILY_TOKEN_CAP);
  return Number.isFinite(n) && n >= 10_000 ? Math.floor(n) : DEFAULT_DAILY_TOKEN_CAP;
}

/** Perkiraan kasar token dari jumlah karakter (Bahasa Indonesia ≈ 3,5 karakter/token). */
export function estimateTokens(chars: number): number {
  return Math.ceil(Math.max(0, chars) / 3.5);
}

const keyFor = (userId: number) => limiterKey("laras:tokens", userId);

export async function readTokensUsed(userId: number, now = Date.now()): Promise<number> {
  const row = await prisma.mobileRateLimit.findUnique({
    where: { key: keyFor(userId) },
    select: { count: true, windowStart: true },
  });
  if (!row || now - row.windowStart.getTime() >= WINDOW_MS) return 0;
  return row.count;
}

export type BudgetCheck = { ok: true; used: number; cap: number } | { ok: false; used: number; cap: number };

export async function checkTokenBudget(userId: number, cap = getDailyTokenCap()): Promise<BudgetCheck> {
  const used = await readTokensUsed(userId);
  return used >= cap ? { ok: false, used, cap } : { ok: true, used, cap };
}

/** Tambahkan pemakaian (atomik). Jendela 24 jam dimulai dari pemakaian pertama. */
export async function addTokensUsed(userId: number, tokens: number, now = new Date()): Promise<void> {
  if (!Number.isFinite(tokens) && tokens !== Infinity) return; // NaN
  const n = Math.min(MAX_ADD, Math.max(0, Math.floor(tokens)));
  if (n <= 0) return;
  const cutoff = new Date(now.getTime() - WINDOW_MS);
  await prisma.$executeRaw`
    INSERT INTO mobile_rate_limits (\`key\`, \`count\`, windowStart) VALUES (${keyFor(userId)}, ${n}, ${now})
    ON DUPLICATE KEY UPDATE
      \`count\` = IF(windowStart < ${cutoff}, ${n}, \`count\` + ${n}),
      windowStart = IF(windowStart < ${cutoff}, ${now}, windowStart)`;
}
