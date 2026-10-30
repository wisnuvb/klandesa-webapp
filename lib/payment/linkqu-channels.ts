import { channelUnavailableReason } from "./channel-health";

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

/** Normalisasi nomor HP Indonesia ke format lokal 08xxxxxxxxxx; null bila tidak valid. */
export function normalizeIdPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`;
  else if (digits.startsWith("8")) digits = `0${digits}`;
  return /^08\d{8,11}$/.test(digits) ? digits : null;
}

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


/* ------------------------------------------------------------------ */
/* Ketersediaan kanal                                                   */
/* ------------------------------------------------------------------ */

export type LinkquChannelGroup = "QRIS" | "EWALLET" | "VA";

/** Batas nominal per transaksi menurut aturan LinkQu (sama dengan korkal-fe). */
export const LINKQU_AMOUNT_LIMITS: Record<LinkquChannelGroup, { min: number; max: number }> = {
  QRIS: { min: 1_000, max: 20_000_000 },
  EWALLET: { min: 15_000, max: 2_500_000 },
  VA: { min: 10_000, max: 2_000_000_000 },
};

export const LINKQU_QRIS_CODE = "QRIS";
export const vaChannelCode = (c: Pick<LinkquVaChannel, "id">) => `VA_${c.id.toUpperCase()}`;
export const ewalletChannelCode = (c: Pick<LinkquEwalletChannel, "retailCode">) => c.retailCode;

/**
 * Kode kanal yang ditutup lewat env tanpa deploy ulang, mis. `LINKQU_DISABLED_CHANNELS="VA_DANAMON,PAYSHOPEEPAY"`.
 * Isi dari hasil `scripts/linkqu-probe-channels.ts`. `PAYSHOPEE` diterima sebagai alias `PAYSHOPEEPAY`.
 */
function disabledByEnv(): ReadonlySet<string> {
  return new Set(
    (process.env.LINKQU_DISABLED_CHANNELS ?? "")
      .split(",")
      .map((x) => x.trim().toUpperCase().replace(/^PAYSHOPEE$/, "PAYSHOPEEPAY"))
      .filter(Boolean),
  );
}

const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export type ChannelAvailability = { available: boolean; reason?: string };

/** Satu pintu penilaian: env, kesehatan runtime, lalu batas nominal. */
export function evaluateLinkquChannel(
  code: string,
  group: LinkquChannelGroup,
  amountIdr?: number,
  now = Date.now(),
  /** Kanal yang dimatikan admin platform lewat panel (kode -> catatan internal). Dimuat async oleh pemanggil. */
  adminDisabled?: ReadonlySet<string>,
): ChannelAvailability {
  if (disabledByEnv().has(code) || adminDisabled?.has(code)) {
    return { available: false, reason: "Sedang tidak tersedia" };
  }
  const runtime = channelUnavailableReason(code, now);
  if (runtime) return { available: false, reason: runtime };
  if (amountIdr != null) {
    const { min, max } = LINKQU_AMOUNT_LIMITS[group];
    const rounded = Math.round(amountIdr);
    if (rounded < min) return { available: false, reason: `Minimum ${rp(min)}` };
    if (rounded > max) return { available: false, reason: `Maksimum ${rp(max)}` };
  }
  return { available: true };
}

export type LinkquPaymentOptions = {
  methods: Record<"qris" | "va" | "ewallet", ChannelAvailability>;
  banks: Array<{ id: string; label: string; linkquBankCode: string } & ChannelAvailability>;
  ewallets: Array<{ id: string; label: string; retailCode: LinkquEwalletRetailCode } & ChannelAvailability>;
};

/** Semua pilihan pembayaran beserta ketersediaannya untuk nominal tertentu. Hanya dipanggil di server (membaca env). */
export function listLinkquPaymentOptions(amountIdr?: number, adminDisabled?: ReadonlySet<string>): LinkquPaymentOptions {
  const now = Date.now();
  const qris = evaluateLinkquChannel(LINKQU_QRIS_CODE, "QRIS", amountIdr, now, adminDisabled);
  const banks = LINKQU_VA_CHANNELS.filter((c) => c.enabled).map((c) => ({
    id: c.id,
    label: c.label,
    linkquBankCode: c.linkquBankCode,
    ...evaluateLinkquChannel(vaChannelCode(c), "VA", amountIdr, now, adminDisabled),
  }));
  const ewallets = LINKQU_EWALLET_CHANNELS.filter((c) => c.enabled).map((c) => ({
    id: c.id,
    label: c.label,
    retailCode: c.retailCode,
    ...evaluateLinkquChannel(ewalletChannelCode(c), "EWALLET", amountIdr, now, adminDisabled),
  }));

  // Satu metode tersedia bila ada minimal satu kanal di dalamnya yang tersedia; alasan diambil dari kanal pertama.
  const summarize = (list: ChannelAvailability[]): ChannelAvailability =>
    list.some((x) => x.available) ? { available: true } : { available: false, reason: list[0]?.reason ?? "Sedang tidak tersedia" };

  return { methods: { qris, va: summarize(banks), ewallet: summarize(ewallets) }, banks, ewallets };
}

/** Penilaian satu pilihan konkret dari checkout (dipakai server sebelum memanggil LinkQu). */
export function evaluateCheckoutChannel(
  input: { paymentMethod: "qris" | "va" | "ewallet"; bankCode?: string; retailCode?: string },
  amountIdr: number,
  adminDisabled?: ReadonlySet<string>,
): ChannelAvailability & { label: string } {
  const now = Date.now();
  if (input.paymentMethod === "qris") {
    return { ...evaluateLinkquChannel(LINKQU_QRIS_CODE, "QRIS", amountIdr, now, adminDisabled), label: "QRIS" };
  }
  if (input.paymentMethod === "va") {
    const c = LINKQU_VA_CHANNELS.find((x) => x.enabled && x.linkquBankCode === input.bankCode);
    if (!c) return { available: false, reason: "Bank tidak dikenal", label: "Virtual Account" };
    return { ...evaluateLinkquChannel(vaChannelCode(c), "VA", amountIdr, now, adminDisabled), label: `Virtual Account ${c.label}` };
  }
  const c = LINKQU_EWALLET_CHANNELS.find((x) => x.enabled && x.retailCode === input.retailCode);
  if (!c) return { available: false, reason: "E-wallet tidak dikenal", label: "E-Wallet" };
  return { ...evaluateLinkquChannel(ewalletChannelCode(c), "EWALLET", amountIdr, now, adminDisabled), label: c.label };
}

/** Kode kanal konkret untuk menandai kesehatan setelah LinkQu menolak/menerima. */
export function checkoutChannelCode(input: { paymentMethod: "qris" | "va" | "ewallet"; bankCode?: string; retailCode?: string }): string | null {
  if (input.paymentMethod === "qris") return LINKQU_QRIS_CODE;
  if (input.paymentMethod === "va") {
    const c = LINKQU_VA_CHANNELS.find((x) => x.linkquBankCode === input.bankCode);
    return c ? vaChannelCode(c) : null;
  }
  return input.retailCode ?? null;
}

/* ------------------------------------------------------------------ */
/* Registri kanal (untuk panel admin & uji kanal)                       */
/* ------------------------------------------------------------------ */

export type LinkquChannelInfo = {
  code: string;
  label: string;
  group: LinkquChannelGroup;
  /** Metode di dialog pembayaran: qris | va | ewallet. */
  method: "qris" | "va" | "ewallet";
};

export function listAllLinkquChannels(): LinkquChannelInfo[] {
  return [
    { code: LINKQU_QRIS_CODE, label: "QRIS", group: "QRIS", method: "qris" },
    ...LINKQU_EWALLET_CHANNELS.filter((c) => c.enabled).map((c) => ({
      code: ewalletChannelCode(c),
      label: c.label,
      group: "EWALLET" as const,
      method: "ewallet" as const,
    })),
    ...LINKQU_VA_CHANNELS.filter((c) => c.enabled).map((c) => ({
      code: vaChannelCode(c),
      label: `Virtual Account ${c.label}`,
      group: "VA" as const,
      method: "va" as const,
    })),
  ];
}

export function isKnownLinkquChannelCode(code: string): boolean {
  return listAllLinkquChannels().some((c) => c.code === code);
}

/** Kode kanal yang ditutup lewat env (untuk ditampilkan sebagai "dikunci" di panel admin). */
export function envDisabledChannelCodes(): ReadonlySet<string> {
  return disabledByEnv();
}
