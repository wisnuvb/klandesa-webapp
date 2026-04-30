import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import type { WebsiteDomain } from "@prisma/client";
import {
  buildDnsTxtVerificationName,
  generateVerificationToken,
  normalizeHostname,
  validateHostnameFqdn,
  validateSubdomainLabel,
} from "@/lib/domain/validators";
import { isAllowedMainHostname } from "@/lib/subdomain";
import { createWebsiteDomainEvent } from "@/lib/domain/service";

type DomainDto = {
  id: number;
  hostname: string;
  type: "subdomain" | "custom";
  status: string;
  is_primary: boolean;
  verified_at?: string;
  ssl_status: string;
  created_at: string;
  last_error?: string;
};

function websiteRootDomain(): string {
  return (process.env.WEBSITE_ROOT_DOMAIN ?? "klandesa.id")
    .trim()
    .toLowerCase();
}

function requireVillageAdmin(session: unknown) {
  const role = (session as { user?: { role?: string } } | null)?.user?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function buildDnsGuidance(params: {
  domainType: "subdomain" | "custom";
  hostname: string;
  token?: string;
}) {
  const root = websiteRootDomain();
  const cnameTarget = (process.env.WEBSITE_CNAME_TARGET ?? root)
    .trim()
    .toLowerCase();
  const aTarget = (process.env.WEBSITE_A_TARGET ?? "").trim();
  const isApex = params.hostname.split(".").length === 2;

  if (params.domainType === "subdomain") {
    return {
      kind: "subdomain",
      dns: [
        {
          type: "A",
          name: "*",
          value: aTarget || "IP_SERVER",
          note: "Pastikan wildcard subdomain diarahkan ke server Klandesa",
        },
        {
          type: "A",
          name: "@",
          value: aTarget || "IP_SERVER",
          note: "Root domain juga harus mengarah ke server Klandesa",
        },
      ],
      ssl: {
        mode: "managed",
        note: "SSL untuk subdomain mengikuti konfigurasi infrastruktur Klandesa (jika memakai reverse proxy/CDN).",
      },
    };
  }

  return {
    kind: "custom_domain",
    verification: params.token
      ? {
          type: "TXT",
          name: buildDnsTxtVerificationName(params.hostname),
          value: params.token,
          note: "Setelah TXT record terpasang, lakukan verifikasi dari dashboard.",
        }
      : undefined,
    pointing: isApex
      ? [
          {
            type: aTarget ? "A" : "A",
            name: "@",
            value: aTarget || "IP_SERVER",
            note: aTarget
              ? "Apex domain diarahkan ke IP server."
              : "Apex domain harus diarahkan ke IP server. Jika DNS provider mendukung CNAME flattening/ALIAS, bisa gunakan CNAME ke target di bawah.",
          },
          {
            type: "CNAME",
            name: "www",
            value: cnameTarget,
            note: "Opsional: arahkan www ke target yang sama untuk mendukung www.domain.com",
          },
        ]
      : [
          {
            type: "CNAME",
            name: params.hostname.split(".")[0],
            value: cnameTarget,
            note: "Subdomain custom diarahkan ke target CNAME.",
          },
        ],
    ssl: {
      mode: "manual_or_proxy",
      note: "Jika DNS provider menyediakan proxy/CDN (mis. Cloudflare), aktifkan SSL/TLS Full (Strict) dan pastikan origin mengarah ke Klandesa.",
    },
  };
}

type DomainRow = Pick<
  WebsiteDomain,
  | "id"
  | "hostname"
  | "type"
  | "status"
  | "isPrimary"
  | "verifiedAt"
  | "sslStatus"
  | "createdAt"
  | "lastError"
>;

function toDto(row: DomainRow): DomainDto {
  const type = row.type === "subdomain" ? "subdomain" : "custom";
  return {
    id: row.id,
    hostname: row.hostname,
    type,
    status: row.status,
    is_primary: row.isPrimary,
    verified_at: row.verifiedAt ? row.verifiedAt.toISOString() : undefined,
    ssl_status: row.sslStatus,
    created_at: row.createdAt.toISOString(),
    last_error: row.lastError ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, session } = loaded.ctx;
    const forbidden = requireVillageAdmin(session);
    if (forbidden) return forbidden;
    if (!isVillageSubscriptionActive(village))
      return subscriptionBlockedResponse(village);

    const rows = await prisma.websiteDomain.findMany({
      where: { villageId: village.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ domains: rows.map(toDto) });
  } catch (e) {
    console.error("GET /api/website/domains error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, session } = loaded.ctx;
    const forbidden = requireVillageAdmin(session);
    if (forbidden) return forbidden;

    if (!isVillageSubscriptionActive(village))
      return subscriptionBlockedResponse(village);

    const body = await req.json().catch(() => ({}));
    const domainType = String(body.type ?? "");
    const value = String(body.value ?? "");
    const makePrimary = body.is_primary === true;

    if (domainType !== "subdomain" && domainType !== "custom") {
      return NextResponse.json({ error: "type tidak valid" }, { status: 400 });
    }

    const root = websiteRootDomain();

    let hostname: string;
    let status: string;
    let verificationToken: string | null = null;
    let verificationMethod: string | null = null;
    let instructions: unknown = null;

    if (domainType === "subdomain") {
      const v = validateSubdomainLabel(value);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      hostname = `${v.value}.${root}`;
      status = "active";
      instructions = buildDnsGuidance({ domainType: "subdomain", hostname });
    } else {
      const v = validateHostnameFqdn(value);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      hostname = normalizeHostname(v.value);
      if (isAllowedMainHostname(hostname)) {
        return NextResponse.json(
          { error: "Domain tidak valid" },
          { status: 400 },
        );
      }
      status = "pending_verification";
      verificationToken = generateVerificationToken();
      verificationMethod = "dns_txt";
      instructions = buildDnsGuidance({
        domainType: "custom",
        hostname,
        token: verificationToken,
      });
    }

    const exists = await prisma.websiteDomain.findUnique({
      where: { hostname },
    });
    if (exists && exists.villageId !== village.id) {
      return NextResponse.json(
        { error: "Domain sudah digunakan" },
        { status: 409 },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      if (makePrimary) {
        await tx.websiteDomain.updateMany({
          where: { villageId: village.id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const row = exists
        ? await tx.websiteDomain.update({
            where: { id: exists.id },
            data: {
              type: domainType,
              status,
              isPrimary: makePrimary || exists.isPrimary,
              verificationMethod,
              verificationToken,
              verificationRequestedAt:
                domainType === "custom" ? new Date() : null,
              lastError: null,
            },
          })
        : await tx.websiteDomain.create({
            data: {
              villageId: village.id,
              hostname,
              type: domainType,
              status,
              isPrimary: makePrimary,
              verificationMethod,
              verificationToken,
              verificationRequestedAt:
                domainType === "custom" ? new Date() : null,
              dnsConfig: instructions as never,
              sslStatus: domainType === "subdomain" ? "active" : "pending",
            },
          });

      if (domainType === "subdomain") {
        await tx.village.update({
          where: { id: village.id },
          data: { website: hostname },
        });
      }

      return row;
    });

    await createWebsiteDomainEvent({
      domainId: created.id,
      kind: "created",
      message: "Domain didaftarkan",
      meta: { type: domainType, hostname },
    });

    return NextResponse.json(
      {
        ok: true,
        domain: toDto(created),
        instructions,
        next:
          domainType === "custom"
            ? { verify: { method: "dns_txt" } }
            : { verify: null },
      },
      { status: exists ? 200 : 201 },
    );
  } catch (e) {
    console.error("POST /api/website/domains error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
