import { LinkquClient, type LinkquConfig } from "@/lib/linkqu";

function requiredEnv(label: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) throw new Error(`Missing env: ${label}`);
  return v;
}

/** Mendukung `LINKQU_URL` (sama dengan korkal-fe) maupun `LINKQU_BASE_URL` lama. */
export function getLinkquBaseUrl(): string | undefined {
  return process.env.LINKQU_URL?.trim() || process.env.LINKQU_BASE_URL?.trim() || undefined;
}

export function getLinkquConfig(): LinkquConfig {
  return {
    baseUrl: requiredEnv("LINKQU_URL", getLinkquBaseUrl()),
    clientId: requiredEnv("LINKQU_CLIENT_ID", process.env.LINKQU_CLIENT_ID),
    clientSecret: requiredEnv("LINKQU_CLIENT_SECRET", process.env.LINKQU_CLIENT_SECRET),
    username: requiredEnv("LINKQU_USERNAME", process.env.LINKQU_USERNAME),
    pin: requiredEnv("LINKQU_PIN", process.env.LINKQU_PIN),
    signatureKey: requiredEnv("LINKQU_SIGNATURE_KEY", process.env.LINKQU_SIGNATURE_KEY),
  };
}

export function getLinkquClient(): LinkquClient {
  return new LinkquClient(getLinkquConfig());
}
