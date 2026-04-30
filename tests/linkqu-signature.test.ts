import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import {
  generateLinkquSignature,
  verifyLinkquCallbackSignature,
  SIGNATURE_PATH_QRIS,
  SIGNATURE_PATH_VA,
  SIGNATURE_PATH_EWALLET,
} from "../lib/linkqu/signature";

/** Mirror LinkQu second-value cleaning (alphanumeric only, lowercased). */
function clean(value: string | number | undefined | null): string {
  return String(value ?? "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
}

test("generateLinkquSignature qris matches HMAC(path+method+secondValue)", () => {
  const key = "test-linkqu-signature-key-32bytes!!";
  const params = {
    amount: "150000",
    expired: "20260430143000",
    partnerReff: "INV-DESA-001",
    customerId: "42",
    customerName: "Desa Contoh",
    customerEmail: "adm@desa.id",
    clientId: "clientIdAbc",
  };
  const secondValue = [
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
  const signToString = `${SIGNATURE_PATH_QRIS}POST${secondValue}`;
  const expected = createHmac("sha256", key).update(signToString).digest("hex");
  assert.equal(
    generateLinkquSignature("qris", SIGNATURE_PATH_QRIS, "POST", params, key),
    expected,
  );
});

test("generateLinkquSignature va includes bank_code in secondValue", () => {
  const key = "va-test-key-hmac-sha256-secret000";
  const params = {
    amount: "200000",
    expired: "20260430150000",
    partnerReff: "INV-VA-1",
    customerId: "1",
    customerName: "User",
    customerEmail: "u@x.id",
    clientId: "cid",
    bankCode: "BCA",
  };
  const secondValue = [
    params.amount,
    params.expired,
    params.bankCode,
    params.partnerReff,
    params.customerId,
    params.customerName,
    params.customerEmail,
    params.clientId,
  ]
    .map(clean)
    .join("");
  const signToString = `${SIGNATURE_PATH_VA}POST${secondValue}`;
  const expected = createHmac("sha256", key).update(signToString).digest("hex");
  assert.equal(
    generateLinkquSignature("va", SIGNATURE_PATH_VA, "POST", params, key),
    expected,
  );
});

test("generateLinkquSignature ewallet includes retail_code and ewallet_phone", () => {
  const key = "ewallet-test-key-hmac-secret00";
  const params = {
    amount: "75000",
    expired: "20260430160000",
    partnerReff: "INV-EW-1",
    customerId: "7",
    customerName: "Dana User",
    customerEmail: "d@d.id",
    clientId: "cidE",
    retailCode: "PAYDANA" as const,
    ewalletPhone: "081234567890",
  };
  const secondValue = [
    params.amount,
    params.expired,
    params.retailCode,
    params.partnerReff,
    params.customerId,
    params.customerName,
    params.customerEmail,
    params.ewalletPhone,
    params.clientId,
  ]
    .map(clean)
    .join("");
  const signToString = `${SIGNATURE_PATH_EWALLET}POST${secondValue}`;
  const expected = createHmac("sha256", key).update(signToString).digest("hex");
  assert.equal(
    generateLinkquSignature(
      "ewallet",
      SIGNATURE_PATH_EWALLET,
      "POST",
      params,
      key,
    ),
    expected,
  );
});

test("verifyLinkquCallbackSignature QRIS branch (partner_reff + amount + username)", () => {
  const key = "callback-secret-key-sha256-xxxx";
  const payload = {
    partner_reff: "INV-QRIS-999",
    amount: 100_000,
    username: "linkqu_username_1",
    va_code: "QRIS",
    va_number: "",
  };
  const signToString = [payload.partner_reff, payload.amount, payload.username]
    .map(clean)
    .join("");
  const sig = createHmac("sha256", key).update(signToString).digest("hex");
  assert.equal(verifyLinkquCallbackSignature(payload, sig, key), true);
  assert.equal(verifyLinkquCallbackSignature(payload, "deadbeef".repeat(8), key), false);
});

test("verifyLinkquCallbackSignature VA branch uses va_number", () => {
  const key = "va-callback-secret-hmac-sha25600";
  const payload = {
    partner_reff: "INV-VA-222",
    amount: 88_888,
    va_number: "1234567890123456",
    username: "merch_user",
    va_code: "BCA",
  };
  const signToString = [
    payload.partner_reff,
    payload.amount,
    payload.va_number,
    payload.username,
  ]
    .map(clean)
    .join("");
  const sig = createHmac("sha256", key).update(signToString).digest("hex");
  assert.equal(verifyLinkquCallbackSignature(payload, sig, key), true);
});

test("verifyLinkquCallbackSignature rejects missing signature", () => {
  assert.equal(
    verifyLinkquCallbackSignature(
      { partner_reff: "A", username: "B", amount: 1 },
      undefined,
      "key",
    ),
    false,
  );
});
