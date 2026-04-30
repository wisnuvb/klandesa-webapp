export type AppsScriptWebhookResult = {
  accepted: boolean;
  httpStatus: number;
  rawBody: string;
  parsedOk: boolean | null;
  parsedError: string | null;
};

/** Web App Apps Script wajib HTTPS ke hostname script.google.com */
export function parseAppsScriptWebAppUrl(urlString: string): URL | null {
  try {
    const u = new URL(urlString.trim());
    if (u.protocol !== "https:" || u.hostname !== "script.google.com") {
      return null;
    }
    return u;
  } catch {
    return null;
  }
}

export async function postAppsScriptWebhook(
  url: URL,
  secret: string | undefined,
  payload: Record<string, string>,
): Promise<AppsScriptWebhookResult> {
  const bodyPayload = {
    ...payload,
    ...(secret ? { webhookSecret: secret } : {}),
  };

  const asRes = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "X-Klandesa-Webhook-Secret": secret } : {}),
    },
    body: JSON.stringify(bodyPayload),
    redirect: "follow",
    cache: "no-store",
  });

  const text = await asRes.text();
  let parsed: { ok?: boolean; error?: string } | null = null;
  try {
    parsed = JSON.parse(text) as { ok?: boolean; error?: string };
  } catch {
    parsed = null;
  }

  const accepted = asRes.ok && parsed?.ok === true;

  return {
    accepted,
    httpStatus: asRes.status,
    rawBody: text,
    parsedOk: parsed?.ok ?? null,
    parsedError: parsed?.error ?? null,
  };
}
