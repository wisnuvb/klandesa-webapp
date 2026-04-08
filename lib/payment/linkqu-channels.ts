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

export const LINKQU_VA_CHANNELS: LinkquVaChannel[] = [];

export const LINKQU_EWALLET_CHANNELS: LinkquEwalletChannel[] = [];

export function resolveLinkquBankCode(channelId: string): string | null {
  const found = LINKQU_VA_CHANNELS.find((c) => c.id === channelId && c.enabled);
  return found?.linkquBankCode ?? null;
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

