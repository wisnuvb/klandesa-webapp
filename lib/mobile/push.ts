import { prisma } from "@/lib/prisma";
import type { MobileAccountType } from "./tokens";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type PushMessage = { title: string; body?: string | null; deepLink?: string | null };

/**
 * Kirim push lewat Expo Push Service ke semua perangkat aktif akun. Tidak pernah melempar:
 * kegagalan push tak boleh menggagalkan aksi utama (mis. menyetujui surat).
 */
export async function sendPushToAccount(
  accountType: MobileAccountType,
  accountId: number,
  msg: PushMessage,
): Promise<void> {
  try {
    const tokens = await prisma.deviceToken.findMany({
      where: { accountType, accountId, disabledAt: null },
      select: { id: true, expoToken: true },
      take: 10,
    });
    if (tokens.length === 0) return;

    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify(
        tokens.map((t) => ({
          to: t.expoToken,
          title: msg.title,
          body: msg.body ?? undefined,
          sound: "default",
          channelId: "default",
          data: msg.deepLink ? { deepLink: msg.deepLink } : undefined,
        })),
      ),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { data?: Array<{ status: string; details?: { error?: string } }> };
    const dead = (json.data ?? [])
      .map((t, i) => (t.status === "error" && t.details?.error === "DeviceNotRegistered" ? tokens[i]!.id : null))
      .filter((v): v is bigint => v !== null);
    if (dead.length) {
      await prisma.deviceToken.updateMany({ where: { id: { in: dead } }, data: { disabledAt: new Date() } });
    }
  } catch (e) {
    console.error("sendPushToAccount failed:", e);
  }
}
