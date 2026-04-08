import { LinkquClient, type LinkquConfig } from "@/lib/linkqu";

function requiredEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

export function getLinkquConfig(): LinkquConfig {
  return {
    baseUrl: requiredEnv("LINKQU_BASE_URL"),
    clientId: requiredEnv("LINKQU_CLIENT_ID"),
    clientSecret: requiredEnv("LINKQU_CLIENT_SECRET"),
    username: requiredEnv("LINKQU_USERNAME"),
    pin: requiredEnv("LINKQU_PIN"),
    signatureKey: requiredEnv("LINKQU_SIGNATURE_KEY"),
    callbackUrl: requiredEnv("LINKQU_CALLBACK_URL"),
  };
}

export function getLinkquClient(): LinkquClient {
  return new LinkquClient(getLinkquConfig());
}

