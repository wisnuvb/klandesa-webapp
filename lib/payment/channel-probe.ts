/**
 * Uji kanal LinkQu: membuat satu tagihan uji kecil (tidak pernah dibayar, kedaluwarsa sendiri) untuk melihat apakah kanal
 * diterima akun merchant. Dipakai skrip CLI dan panel admin.
 */
import { LinkquClient } from "@/lib/linkqu/client";
import { getLinkquExpiredMinutesFromNow } from "@/lib/linkqu/datetime";
import { getLinkquBaseUrl, getLinkquConfig } from "@/lib/billing/linkqu";
import {
  LINKQU_EWALLET_CHANNELS,
  LINKQU_QRIS_CODE,
  LINKQU_VA_CHANNELS,
  ewalletChannelCode,
  listAllLinkquChannels,
  vaChannelCode,
} from "@/lib/payment/linkqu-channels";

/** Di atas minimum semua kanal (e-wallet 15.000). */
const PROBE_AMOUNT = 20_000;

export type ProbeKind = "ok" | "rejected" | "error";
export type ProbeResult = {
  code: string;
  label: string;
  kind: ProbeKind;
  /** Teks singkat untuk admin. `error` = gangguan/tidak bisa disimpulkan (kanal TIDAK boleh dimatikan karenanya). */
  message: string;
};

export type LinkquMode = "sandbox" | "production" | "unconfigured";

export function getLinkquMode(): { mode: LinkquMode; host: string | null } {
  const url = getLinkquBaseUrl();
  if (!url) return { mode: "unconfigured", host: null };
  try {
    const host = new URL(url).host;
    return { mode: /(^|\.)api\.linkqu\.id$/i.test(host) ? "production" : "sandbox", host };
  } catch {
    return { mode: "unconfigured", host: null };
  }
}

let seq = 0;
const reff = () => `${Date.now()}${String(++seq % 10000).padStart(4, "0")}`;

export async function probeChannel(client: LinkquClient, code: string): Promise<ProbeResult> {
  const info = listAllLinkquChannels().find((c) => c.code === code);
  const label = info?.label ?? code;
  if (!info) return { code, label, kind: "error", message: "Kode kanal tidak dikenal" };

  const common = {
    amount: PROBE_AMOUNT,
    partnerReff: reff(),
    customerId: "probe",
    customerName: "Uji Kanal",
    customerEmail: "probe@example.com",
    customerPhone: "081234567890",
    expired: getLinkquExpiredMinutesFromNow(5),
    callbackUrl: "https://example.invalid/api/billing/linkqu/callback",
  };

  try {
    if (code === LINKQU_QRIS_CODE) await client.createQris(common);
    else if (info.method === "va") {
      const bank = LINKQU_VA_CHANNELS.find((c) => vaChannelCode(c) === code)!;
      await client.createVa({ ...common, bankCode: bank.linkquBankCode });
    } else {
      const w = LINKQU_EWALLET_CHANNELS.find((c) => ewalletChannelCode(c) === code)!;
      await client.createEwallet({ ...common, retailCode: w.retailCode, ewalletPhone: "081234567890" });
    }
    return { code, label, kind: "ok", message: "Diterima LinkQu" };
  } catch (e) {
    const r = (e as { linkquResponse?: Record<string, unknown> }).linkquResponse;
    const rc = r?.response_code;
    // Tanpa response_code = gangguan jaringan/CDN (mis. HTTP 522), bukan penolakan kanal: jangan disimpulkan.
    if (rc == null || rc === "") {
      return { code, label, kind: "error", message: "LinkQu tidak merespons dengan benar, coba uji lagi nanti" };
    }
    const desc = String(r?.response_desc ?? (e instanceof Error ? e.message : "")).slice(0, 120);
    return { code, label, kind: "rejected", message: `RC ${rc}: ${desc}` };
  }
}

/** Uji beberapa kanal (maks 4 sekaligus agar tidak membebani LinkQu). */
export async function probeChannels(codes: string[]): Promise<ProbeResult[]> {
  const client = new LinkquClient(getLinkquConfig());
  const out: ProbeResult[] = [];
  for (let i = 0; i < codes.length; i += 4) {
    out.push(...(await Promise.all(codes.slice(i, i + 4).map((c) => probeChannel(client, c)))));
  }
  return out;
}
