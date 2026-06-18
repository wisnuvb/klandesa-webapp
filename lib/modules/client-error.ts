import type { PackageTier } from "./entitlements";

export type ModuleNotEntitledInfo = {
  code: "MODULE_NOT_ENTITLED";
  message: string;
  module?: string;
  requiredTier?: PackageTier | null;
  addonMonthlyFee?: number | null;
  billingUrl?: string;
};

export class ModuleNotEntitledError extends Error {
  readonly info: ModuleNotEntitledInfo;

  constructor(info: ModuleNotEntitledInfo) {
    super(info.message);
    this.name = "ModuleNotEntitledError";
    this.info = info;
  }
}

const TIER_PATTERN =
  /\b(starter|profesional|enterprise)\b/i;

export function parseModuleNotEntitledBody(
  body: unknown,
): ModuleNotEntitledInfo | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.code !== "MODULE_NOT_ENTITLED") return null;

  const message =
    typeof record.error === "string"
      ? record.error
      : "Modul belum termasuk paket langganan Anda.";

  const requiredTierRaw = record.requiredTier;
  const requiredTier =
    typeof requiredTierRaw === "string" &&
    (requiredTierRaw === "starter" ||
      requiredTierRaw === "profesional" ||
      requiredTierRaw === "enterprise")
      ? requiredTierRaw
      : extractTierFromMessage(message);

  return {
    code: "MODULE_NOT_ENTITLED",
    message,
    module: typeof record.module === "string" ? record.module : undefined,
    requiredTier,
    addonMonthlyFee:
      typeof record.addonMonthlyFee === "number"
        ? record.addonMonthlyFee
        : null,
    billingUrl:
      typeof record.billingUrl === "string" ? record.billingUrl : undefined,
  };
}

function extractTierFromMessage(message: string): PackageTier | null {
  const match = message.match(TIER_PATTERN);
  if (!match) return null;
  const tier = match[1].toLowerCase();
  if (tier === "starter" || tier === "profesional" || tier === "enterprise") {
    return tier;
  }
  return null;
}

export function isModuleNotEntitledMessage(message: string): boolean {
  return (
    message.includes("Modul tidak termasuk paket") ||
    message.includes("Modul belum termasuk paket")
  );
}

export function parseModuleNotEntitledFromMessage(
  message: string,
): ModuleNotEntitledInfo | null {
  if (!isModuleNotEntitledMessage(message)) return null;
  return {
    code: "MODULE_NOT_ENTITLED",
    message,
    requiredTier: extractTierFromMessage(message),
  };
}

/** Lempar error dari body respons API non-2xx. */
export function throwApiError(body: unknown, fallback = "Gagal memuat data"): never {
  const entitled = parseModuleNotEntitledBody(body);
  if (entitled) throw new ModuleNotEntitledError(entitled);

  const message =
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).error === "string"
      ? ((body as Record<string, unknown>).error as string)
      : fallback;

  throw new Error(message);
}

export type AsyncPageError = string | ModuleNotEntitledInfo;

export function normalizeAsyncError(error: unknown): AsyncPageError | null {
  if (!error) return null;
  if (typeof error === "string") {
    return parseModuleNotEntitledFromMessage(error) ?? error;
  }
  if (error instanceof ModuleNotEntitledError) return error.info;
  if (error instanceof Error) {
    return parseModuleNotEntitledFromMessage(error.message) ?? error.message;
  }
  return "Gagal memuat data";
}
