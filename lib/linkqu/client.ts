/**
 * Linkqu Payment Gateway Client
 * Reusable service for integration with Linkqu PGW
 * @see docs/linkqu.json
 */

import {
  type LinkquConfig,
  type LinkquCreatePaymentParams,
  type LinkquCreatePaymentResponse,
} from "./types";
import {
  generateLinkquSignature,
  LINKQU_PATH_VA,
  LINKQU_PATH_QRIS,
  LINKQU_PATH_EWALLET,
  SIGNATURE_PATH_VA,
  SIGNATURE_PATH_QRIS,
  SIGNATURE_PATH_EWALLET,
} from "./signature";
import { logger } from "@/lib/logger";

export class LinkquClient {
  private readonly config: LinkquConfig;

  constructor(config: LinkquConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return this.config.baseUrl.replace(/\/$/, "");
  }

  private async request<T>(
    path: string,
    method: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const bodyForLog = { ...body };
    if (bodyForLog.signature) (bodyForLog as Record<string, unknown>).signature = "[REDACTED]";
    if (bodyForLog.pin) (bodyForLog as Record<string, unknown>).pin = "[REDACTED]";

    logger.debug(
      { url, method, path, body: bodyForLog, clientIdPreview: this.config.clientId?.slice(0, 8) },
      "[LinkQu] Request"
    );

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "client-id": this.config.clientId,
        "client-secret": this.config.clientSecret,
      },
      body: JSON.stringify(body),
    });

    const rawText = await res.text();
    let data: T & { rc?: string; message?: string };
    try {
      data = JSON.parse(rawText) as T & { rc?: string; message?: string };
    } catch {
      data = {} as T & { rc?: string; message?: string };
    }

    const linkquStatus = (data as { status?: string }).status;
    const responseCode = (data as { response_code?: string }).response_code;
    const responseDesc = (data as { response_desc?: string }).response_desc;

    logger.debug(
      {
        url,
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        linkquStatus,
        responseCode,
        responseDesc,
        body: data,
        rawPreview: rawText?.slice?.(0, 300),
      },
      "[LinkQu] Response"
    );

    // HTTP error (4xx, 5xx)
    if (!res.ok) {
      const errMsg =
        (data as { message?: string }).message ||
        responseDesc ||
        (data as { rc?: string }).rc ||
        `Linkqu API error: ${res.status}`;
      const err = new Error(errMsg) as Error & { linkquResponse?: object };
      err.linkquResponse = data as object;
      logger.warn(
        { status: res.status, url, linkquResponse: data },
        "[LinkQu] API error"
      );
      throw err;
    }

    // LinkQu returns 200 but transaction can be FAILED (e.g. 501 Signature Not Valid)
    if (linkquStatus === "FAILED" || responseCode === "501") {
      const errMsg = responseDesc || `LinkQu transaction failed: ${responseCode}`;
      const err = new Error(errMsg) as Error & { linkquResponse?: object };
      err.linkquResponse = data as object;
      logger.warn(
        { url, linkquStatus, responseCode, responseDesc, linkquResponse: data },
        "[LinkQu] Transaction FAILED"
      );
      throw err;
    }

    return data;
  }

  /**
   * Create QRIS payment
   */
  async createQris(params: LinkquCreatePaymentParams): Promise<LinkquCreatePaymentResponse> {
    const amountInt = Math.round(Number(params.amount));
    const signature = generateLinkquSignature(
      "qris",
      SIGNATURE_PATH_QRIS,
      "POST",
      {
        amount: String(amountInt),
        expired: params.expired,
        partnerReff: params.partnerReff,
        customerId: params.customerId,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        clientId: this.config.clientId,
      },
      this.config.signatureKey
    );

    const body: Record<string, unknown> = {
      amount: amountInt,
      partner_reff: String(params.partnerReff),
      customer_id: String(params.customerId),
      customer_name: String(params.customerName ?? ""),
      customer_email: String(params.customerEmail ?? ""),
      customer_phone: String(params.customerPhone ?? ""),
      expired: String(params.expired),
      username: String(this.config.username),
      pin: String(this.config.pin),
      signature,
      url_callback: String(this.config.callbackUrl),
    };

    return this.request<LinkquCreatePaymentResponse>(LINKQU_PATH_QRIS, "POST", body);
  }

  /**
   * Create Virtual Account payment
   */
  async createVa(
    params: LinkquCreatePaymentParams & { bankCode: string }
  ): Promise<LinkquCreatePaymentResponse> {
    const amountInt = Math.round(Number(params.amount));
    const signature = generateLinkquSignature(
      "va",
      SIGNATURE_PATH_VA,
      "POST",
      {
        amount: String(amountInt),
        expired: params.expired,
        partnerReff: params.partnerReff,
        customerId: params.customerId,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        clientId: this.config.clientId,
        bankCode: params.bankCode,
      },
      this.config.signatureKey
    );

    // Body according to documentation - strict data type (amount: number, others: string)
    const body: Record<string, unknown> = {
      amount: amountInt,
      partner_reff: String(params.partnerReff),
      customer_id: String(params.customerId),
      customer_name: String(params.customerName ?? ""),
      customer_email: String(params.customerEmail ?? ""),
      customer_phone: String(params.customerPhone ?? ""),
      expired: String(params.expired),
      username: String(this.config.username),
      pin: String(this.config.pin),
      bank_code: String(params.bankCode),
      signature,
      url_callback: String(this.config.callbackUrl),
    };
    if (params.remark) body.remark = String(params.remark);

    return this.request<LinkquCreatePaymentResponse>(LINKQU_PATH_VA, "POST", body);
  }

  /**
   * Create E-Wallet payment (DANA, LinkAja, ShopeePay)
   * retailCode: PAYDANA | PAYLINKAJA | PAYSHOPEEPAY
   */
  async createEwallet(
    params: LinkquCreatePaymentParams & {
      retailCode: "PAYDANA" | "PAYLINKAJA" | "PAYSHOPEEPAY";
      ewalletPhone: string;
    }
  ): Promise<LinkquCreatePaymentResponse> {
    const amountInt = Math.round(Number(params.amount));
    const signature = generateLinkquSignature(
      "ewallet",
      SIGNATURE_PATH_EWALLET,
      "POST",
      {
        amount: String(amountInt),
        expired: params.expired,
        partnerReff: params.partnerReff,
        customerId: params.customerId,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        clientId: this.config.clientId,
        retailCode: params.retailCode,
        ewalletPhone: params.ewalletPhone,
      },
      this.config.signatureKey
    );

    const body: Record<string, unknown> = {
      amount: amountInt,
      partner_reff: String(params.partnerReff),
      customer_id: String(params.customerId),
      customer_name: String(params.customerName ?? ""),
      customer_email: String(params.customerEmail ?? ""),
      customer_phone: String(params.customerPhone ?? ""),
      ewallet_phone: String(params.ewalletPhone),
      expired: String(params.expired),
      username: String(this.config.username),
      pin: String(this.config.pin),
      retail_code: String(params.retailCode),
      signature,
      url_callback: String(this.config.callbackUrl),
    };
    if (params.billTitle) body.bill_title = String(params.billTitle);

    return this.request<LinkquCreatePaymentResponse>(
      LINKQU_PATH_EWALLET,
      "POST",
      body
    );
  }
}
