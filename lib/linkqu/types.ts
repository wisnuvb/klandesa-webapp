/**
 * Linkqu Payment Gateway - Types
 * @see docs/linkqu.json
 */

export type LinkquPaymentMethod = "qris" | "va" | "ewallet";

export interface LinkquConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  pin: string;
  signatureKey: string;
  callbackUrl: string;
}

export interface LinkquCreatePaymentParams {
  amount: number;
  partnerReff: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  expired: string; // format: yyyyMMddHHmmss
  remark?: string;
  billTitle?: string;
  /** Only for VA */
  bankCode?: string;
  /** Only for E-Wallet: PAYDANA, PAYLINKAJA, PAYSHOPEEPAY */
  retailCode?: string;
  /** Only for E-Wallet */
  ewalletPhone?: string;
}

/** Response from Linkqu create transaction - dynamic per payment type */
export interface LinkquCreatePaymentResponse {
  rc?: string;
  message?: string;
  response_code?: string;
  response_desc?: string;
  status?: string;
  transaction_id?: string;
  virtual_account?: string;
  va_number?: string;
  va_code?: string;
  bank_code?: string;
  bank_name?: string;
  url_payment?: string;
  payment_url?: string;
  imageqris?: string;
  qris_text?: string;
  qr_content?: string;
  qr_url?: string;
  partner_reff2?: string;
  retail_name?: string;
  data?: Record<string, unknown>;
}

/** Callback payload from Linkqu when payment is received */
export interface LinkquCallbackPayload {
  partner_reff?: string;
  partner_reff2?: string;
  amount?: number;
  status?: string;
  message?: string;
  transaction_id?: string;
  va_number?: string;
  va_code?: string;
  bank_code?: string;
  payment_date?: string;
  transaction_time?: string;
  username?: string;
  type?: string;
  signature?: string;
  [key: string]: unknown;
}
