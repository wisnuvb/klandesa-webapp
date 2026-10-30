import { createHmac, timingSafeEqual } from "crypto";

/**
 * Generate HMAC-SHA256 signature untuk Linkqu API
 * @see https://www.linkqu.id/en/support/panduan-signatur-untuk-api-linkqu/
 * Align with NestJS LinkQuSignatureGenerator implementation
 *
 * Formula: path + method + secondValue — secondValue menyertakan clientId (dan field lain per tipe).
 * secondValue: lowercase, alphanumeric only
 */

type SignatureType = "va" | "qris" | "ewallet";

const REGEX_ALPHANUM = /[^0-9a-zA-Z]/g;

/** Clean & lowercase - according to NestJS cleanAndLowercase */
function clean(value: string | number | undefined | null): string {
  return String(value ?? "").replace(REGEX_ALPHANUM, "").toLowerCase();
}

function buildSecondValue(
  type: SignatureType,
  params: {
    amount: string | number;
    expired: string;
    partnerReff: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    clientId: string;
    bankCode?: string;
    retailCode?: string;
    ewalletPhone?: string;
  }
): string {
  // VA Other Bank: amount, expired, bank_code, partner_reff, customer_id, customer_name, customer_email, clientId (per LinkQu doc)
  if (type === "va") {
    return [
      params.amount,
      params.expired,
      params.bankCode ?? "",
      params.partnerReff,
      params.customerId,
      params.customerName,
      params.customerEmail,
      params.clientId,
    ]
      .map(clean)
      .join("");
  }

  // E-Wallet: amount, expired, retail_code, partner_reff, customer_id, customer_name, customer_email, ewallet_phone, clientId (per LinkQu doc)
  if (type === "ewallet") {
    return [
      params.amount,
      params.expired,
      params.retailCode ?? "",
      params.partnerReff,
      params.customerId,
      params.customerName,
      params.customerEmail,
      params.ewalletPhone ?? "",
      params.clientId,
    ]
      .map(clean)
      .join("");
  }

  // QRIS: amount, expired, partner_reff, customer_id, customer_name, customer_email, clientId (according to NestJS docs/signature.ts)
  return [
    params.amount,
    params.expired,
    params.partnerReff,
    params.customerId,
    params.customerName,
    params.customerEmail,
    params.clientId,
  ]
    .map(clean)
    .join("");
}

export function generateLinkquSignature(
  type: SignatureType,
  path: string,
  method: string,
  params: {
    amount: string | number;
    expired: string;
    partnerReff: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    clientId: string;
    bankCode?: string;
    retailCode?: string;
    ewalletPhone?: string;
  },
  signatureKey: string
): string {
  const secondValue = buildSecondValue(type, params);
  // LinkQu docs: buildkey = path + method + secondvalue (clientId already inside secondvalue)
  const signToString = `${path}${method}${secondValue}`;
  return createHmac("sha256", signatureKey).update(signToString).digest("hex");
}

/**
 * Path for SIGNATURE (from Linkqu documentation - List Path)
 * NOT path URL API - this is only for signature calculation
 * @see https://www.linkqu.id/en/support/panduan-signatur-untuk-api-linkqu/
 */
export const SIGNATURE_PATH_VA = "/transaction/create/va";
export const SIGNATURE_PATH_QRIS = "/transaction/create/qris";
export const SIGNATURE_PATH_EWALLET = "/transaction/create/paymentewallet";

/** Full path for URL API (with linkqu-partner prefix) */
export const LINKQU_PATH_VA = "/linkqu-partner/transaction/create/va";
export const LINKQU_PATH_QRIS = "/linkqu-partner/transaction/create/qris";
export const LINKQU_PATH_EWALLET =
  "/linkqu-partner/transaction/create/paymentewallet";

const NON_VA_CODES = new Set([
  "QRIS",
  "PAYDANA",
  "PAYLINKAJA",
  "PAYSHOPEE",
  "PAYSHOPEEPAY",
  "PAYGOPAY",
  "PAYOVO",
  "LINKAJA",
  "CREDITCARD",
]);

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a.toLowerCase(), "utf8");
  const bb = Buffer.from(b.trim().toLowerCase(), "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Verify callback signature from Linkqu
 * Formula by type: VA/Retail = partner_reff.amount.va_number.username
 *                  QRIS/E-Wallet = partner_reff.amount.username
 * LinkQu menandatangani string mentah (korkal-fe), tetapi dokumentasi signature create membersihkan
 * karakter non-alfanumerik; kedua bentuk diterima (keduanya butuh signature key rahasia).
 * @see docs/linkqu.json - Callback Transaction Received
 */
export function verifyLinkquCallbackSignature(
  payload: {
    partner_reff?: string;
    amount?: number | string;
    va_number?: string;
    username?: string;
    va_code?: string;
  },
  receivedSignature: string | undefined,
  signatureKey: string
): boolean {
  if (!receivedSignature || !signatureKey) return false;

  const partnerReff = String(payload.partner_reff ?? "");
  const username = String(payload.username ?? "");
  if (!partnerReff || !username) return false;

  const rawAmount = String(payload.amount ?? "");
  const amounts = new Set([rawAmount]);
  if (rawAmount !== "" && Number.isFinite(Number(rawAmount))) {
    amounts.add(String(Math.round(Number(rawAmount))));
  }

  const vaCode = String(payload.va_code ?? "").toUpperCase();
  const vaNumber = String(payload.va_number ?? "");
  const withoutVa = NON_VA_CODES.has(vaCode) || !vaNumber;

  const candidates = new Set<string>();
  for (const amount of amounts) {
    const parts = withoutVa
      ? [partnerReff, amount, username]
      : [partnerReff, amount, vaNumber, username];
    candidates.add(parts.join(""));
    candidates.add(parts.map(clean).join(""));
  }

  for (const signToString of candidates) {
    const expected = createHmac("sha256", signatureKey).update(signToString).digest("hex");
    if (safeEqualHex(expected, receivedSignature)) return true;
  }
  return false;
}
