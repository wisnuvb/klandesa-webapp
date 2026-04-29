import type { ResolvedEngineStructure } from "@/lib/website-engine/types";

export const THEME_PALETTE_SWATCHES = [
  "#0f766e",
  "#0d9488",
  "#1d4ed8",
  "#7c3aed",
  "#b45309",
  "#be123c",
  "#0f172a",
  "#15803d",
  "#c2410c",
  "#4f46e5",
] as const;

export function emptyEngine(): ResolvedEngineStructure {
  return {
    version: 2,
    nav: [{ label: "Beranda", href: "/", external: false }],
    pages: [
      {
        id: "home",
        slug: "",
        title: "Beranda",
        sections: [],
      },
    ],
  };
}
