type DnsJsonAnswer = {
  name?: string;
  type?: number;
  TTL?: number;
  data?: string;
};

type DnsJsonResponse = {
  Status?: number;
  Answer?: DnsJsonAnswer[];
};

function stripTxtQuotes(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (v.includes('" "')) {
    return v.replaceAll('" "', "").replaceAll('"', "");
  }
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  return v.replaceAll('"', "");
}

export async function resolveTxtRecords(
  name: string,
): Promise<{ ok: true; records: string[] } | { ok: false; error: string }> {
  const url = new URL("https://cloudflare-dns.com/dns-query");
  url.searchParams.set("name", name);
  url.searchParams.set("type", "TXT");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { accept: "application/dns-json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `DNS lookup gagal (HTTP ${res.status})` };
    }
    const json = (await res.json()) as DnsJsonResponse;
    const answers = Array.isArray(json.Answer) ? json.Answer : [];
    const records = answers
      .map((a) => (a?.data ? stripTxtQuotes(String(a.data)) : ""))
      .filter(Boolean);
    return { ok: true, records };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DNS lookup gagal";
    return { ok: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}
