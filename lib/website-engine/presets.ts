import type { WebsiteTemplateStructureV1 } from "@/lib/website-engine/types";

export type BuiltinPreset = {
  key: string;
  name: string;
  structure: WebsiteTemplateStructureV1;
};

export const BUILTIN_PRESETS: BuiltinPreset[] = [
  {
    key: "standard_village",
    name: "Standar Desa",
    structure: {
      version: 1,
      pages: {
        home: {
          sections: [
            { kind: "hero" },
            { kind: "features" },
            { kind: "stats" },
            { kind: "gallery" },
            { kind: "news", limit: 6 },
            { kind: "cta" },
            { kind: "contact" },
          ],
        },
      },
    },
  },
  {
    key: "news_first",
    name: "Berita Prioritas",
    structure: {
      version: 1,
      pages: {
        home: {
          sections: [
            { kind: "news", limit: 10, title: "Berita Terkini" },
            { kind: "contact" },
          ],
        },
      },
    },
  },
];

export function findBuiltinPreset(key: string): BuiltinPreset | null {
  const k = String(key || "").trim();
  if (!k) return null;
  return BUILTIN_PRESETS.find((p) => p.key === k) ?? null;
}
