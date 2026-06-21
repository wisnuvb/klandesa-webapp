export type LinkquEwalletRetailCode = "PAYDANA" | "PAYLINKAJA" | "PAYSHOPEEPAY";

export type LinkquVaChannel = {
  id: string;
  label: string;
  enabled: boolean;
  linkquBankCode: string;
};

export type LinkquEwalletChannel = {
  id: string;
  label: string;
  enabled: boolean;
  retailCode: LinkquEwalletRetailCode;
};

/**
 * Kode bank mengikuti pola umum Linkqu / kode BI (3 digit).
 * Sesuaikan dengan daftar resmi dari dashboard Linkqu jika API menolak kode tertentu.
 */
export const LINKQU_VA_CHANNELS: LinkquVaChannel[] = [
  { id: "bri", label: "BRI", enabled: true, linkquBankCode: "002" },
  { id: "mandiri", label: "Bank Mandiri", enabled: true, linkquBankCode: "008" },
  { id: "bni", label: "BNI", enabled: true, linkquBankCode: "009" },
  { id: "danamon", label: "Danamon", enabled: true, linkquBankCode: "011" },
  { id: "permata", label: "Permata", enabled: true, linkquBankCode: "013" },
  { id: "bca", label: "BCA", enabled: true, linkquBankCode: "014" },
  { id: "cimb", label: "CIMB Niaga", enabled: true, linkquBankCode: "022" },
];

export const LINKQU_EWALLET_CHANNELS: LinkquEwalletChannel[] = [
  { id: "dana", label: "DANA", enabled: true, retailCode: "PAYDANA" },
  { id: "linkaja", label: "LinkAja", enabled: true, retailCode: "PAYLINKAJA" },
  {
    id: "shopeepay",
    label: "ShopeePay",
    enabled: true,
    retailCode: "PAYSHOPEEPAY",
  },
];

export function resolveLinkquBankCode(channelId: string): string | null {
  const found = LINKQU_VA_CHANNELS.find((c) => c.id === channelId && c.enabled);
  return found?.linkquBankCode ?? null;
}

export function linkquBankLabel(linkquBankCode: string): string | null {
  const found = LINKQU_VA_CHANNELS.find(
    (c) => c.linkquBankCode === linkquBankCode && c.enabled,
  );
  return found?.label ?? null;
}

export function isAllowedLinkquVaBankCode(linkquBankCode: string): boolean {
  return LINKQU_VA_CHANNELS.some(
    (c) => c.enabled && c.linkquBankCode === linkquBankCode,
  );
}

export function validateLinkquCheckoutInput(input: {
  paymentMethod: "qris" | "va" | "ewallet";
  bankCode?: string;
  retailCode?: string;
  ewalletPhone?: string;
}): { ok: true } | { ok: false; error: string } {
  if (input.paymentMethod === "qris") return { ok: true };
  if (input.paymentMethod === "va") {
    if (!input.bankCode) return { ok: false, error: "bankCode wajib untuk VA" };
    return { ok: true };
  }
  if (!input.retailCode) return { ok: false, error: "retailCode wajib untuk E-Wallet" };
  if (!input.ewalletPhone) return { ok: false, error: "ewalletPhone wajib untuk E-Wallet" };
  return { ok: true };
}

