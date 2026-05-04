import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { requireVillageAdminResponse } from "@/lib/access-policy";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import {
  parseCustomization,
  resolveEffectiveLayout,
  resolveEffectiveStructure,
  resolveEffectiveSiteSeo,
  resolveEffectiveTheme,
} from "@/lib/website-engine/normalize";
import { parseTemplateStructureManifest } from "@/lib/website-engine/manifest";
import { listPresetOptions } from "@/lib/website-engine/preset-options";
import {
  applyEngineConfigPatch,
  parseEngineConfigPatchBody,
} from "@/lib/website-engine/config-patch";
import {
  getAllowedSectionKinds,
  sectionSchemaForTemplate,
} from "@/lib/website-engine/site-sections";
import { getTemplatePack } from "@/lib/website-engine/template-packs/registry";
import {
  cleanWebsiteSectionInput,
  sanitizeV2StructureOverride,
  validateRawV2PagesSlugInput,
} from "@/lib/website-engine/resolved-structure";
import { checkWebsiteEnginePatchLimit } from "@/lib/website-engine/engine-rate-limit";
import type { WebsiteSection } from "@/lib/website-engine/types";
import { invalidateTenantPublicPageCache } from "@/lib/website-engine/site-renderer";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const forbidden = requireVillageAdminResponse(loaded.ctx.session);
    if (forbidden) return forbidden;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const subscription = await prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      include: { template: true },
    });
    if (!subscription?.template) {
      return NextResponse.json(
        { error: "Website belum aktif" },
        { status: 404 },
      );
    }

    const structure = subscription.template.structure;
    const manifest = parseTemplateStructureManifest(structure);
    const customization = parseCustomization(subscription.customization);
    const effective = resolveEffectiveStructure({
      templateStructure: structure,
      customization: subscription.customization,
    });
    const effective_theme = resolveEffectiveTheme({
      templateStructure: structure,
      customization: subscription.customization,
    });
    const effective_layout = resolveEffectiveLayout({
      templateStructure: structure,
      customization: subscription.customization,
    });

    const allowedKinds = getAllowedSectionKinds(manifest.capabilities);
    const section_schema = sectionSchemaForTemplate(
      manifest.templateKey,
      allowedKinds,
    );
    const pack = getTemplatePack(manifest.templateKey);

    return NextResponse.json({
      template: {
        id: subscription.template.id,
        name: subscription.template.name,
      },
      template_key: manifest.templateKey,
      template_pack: {
        id: pack.id,
        hero_variants: [...pack.heroVariants],
      },
      capabilities: manifest.capabilities,
      theme_defaults: manifest.themeDefaults,
      layout_defaults: manifest.layoutDefaults,
      customization,
      effective_structure: effective,
      effective_theme,
      effective_layout,
      effective_site_seo: resolveEffectiveSiteSeo(
        subscription.customization,
        structure,
      ),
      presets: listPresetOptions(structure),
      allowed_section_kinds: allowedKinds,
      section_schema,
    });
  } catch (e) {
    console.error("GET /api/website/engine/config error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const forbidden = requireVillageAdminResponse(loaded.ctx.session);
    if (forbidden) return forbidden;

    const rl = checkWebsiteEnginePatchLimit(clientIp(req));
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan, coba lagi nanti." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        },
      );
    }

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const subscription = await prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      select: {
        id: true,
        customization: true,
        template: { select: { structure: true } },
      },
    });
    if (!subscription?.template) {
      return NextResponse.json({ error: "Website belum aktif" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = parseEngineConfigPatchBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    let patch = parsed.patch;
    const manifest = parseTemplateStructureManifest(subscription.template.structure);
    const templateKey = manifest.templateKey;
    const caps = manifest.capabilities;

    if (patch.overrides && typeof patch.overrides === "object") {
      const ov = patch.overrides as Record<string, unknown>;
      if (ov.version === 2) {
        const slugErr = validateRawV2PagesSlugInput(ov.pages);
        if (slugErr) {
          return NextResponse.json({ error: slugErr }, { status: 400 });
        }
        const cleaned = sanitizeV2StructureOverride(ov, templateKey, caps);
        patch = { ...patch, overrides: cleaned };
      } else {
        const pages = ov.pages as Record<string, unknown> | undefined;
        const home = pages?.home as Record<string, unknown> | undefined;
        const sections = home?.sections;
        if (Array.isArray(sections)) {
          const allowed = new Set(getAllowedSectionKinds(caps));
          const normalized: WebsiteSection[] = [];
          for (const raw of sections) {
            const s = cleanWebsiteSectionInput(raw, templateKey, allowed);
            if (s) normalized.push(s);
          }
          patch = {
            ...patch,
            overrides: {
              ...ov,
              pages: {
                ...(typeof pages === "object" && pages ? pages : {}),
                home: {
                  ...(typeof home === "object" && home ? home : {}),
                  sections: normalized,
                },
              },
            },
          };
        }
      }
    }

    const nextCustomization = applyEngineConfigPatch(subscription.customization, patch);

    const updated = await prisma.websiteSubscription.update({
      where: { id: subscription.id },
      data: { customization: nextCustomization as never },
      select: { customization: true },
    });

    invalidateTenantPublicPageCache(village.id);

    return NextResponse.json({ ok: true, customization: parseCustomization(updated.customization) });
  } catch (e) {
    console.error("PATCH /api/website/engine/config error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
